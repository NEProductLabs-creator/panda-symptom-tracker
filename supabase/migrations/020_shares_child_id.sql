-- Migration 020: Add child_id to shares so a share link is scoped to one child.
--
-- The column is nullable so that:
--   • existing shares keep working (server resolves to the user's first child at
--     read time)
--   • the POST /api/shares endpoint can still create a link without a child_id
--     (server falls back to the lowest sort_order non-archived child)

ALTER TABLE public.shares
  ADD COLUMN IF NOT EXISTS child_id TEXT
  REFERENCES public.children(id) ON DELETE CASCADE;

-- Backfill: assign existing share rows to the user's lowest sort_order
-- non-archived child so the child filter returns sensible data immediately.
UPDATE public.shares s
SET    child_id = (
         SELECT id
         FROM   public.children
         WHERE  user_id     = s.user_id
           AND  is_archived = false
         ORDER  BY sort_order ASC
         LIMIT  1
       )
WHERE  s.child_id IS NULL;
