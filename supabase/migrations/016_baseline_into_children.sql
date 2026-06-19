-- Migration 016: Collapse child_baseline singleton into children.baseline column
-- Rationale: baseline is 1-to-1 with a child; storing it as a JSONB column on
-- children eliminates a separate table and a join, and makes per-child scoping
-- unambiguous.

-- 1. Add baseline column to children (nullable JSONB)
ALTER TABLE children ADD COLUMN IF NOT EXISTS baseline JSONB;

-- 2. Backfill: attach each user's stored baseline to their lowest sort_order
--    non-archived child.  If a user has multiple children only the first one
--    (by sort_order ASC) receives the baseline — matching the pre-migration
--    behaviour where there was a single baseline per user.
UPDATE children c
SET    baseline = cb.data
FROM   child_baseline cb
WHERE  cb.user_id = c.user_id
  AND  c.id = (
         SELECT id
         FROM   children
         WHERE  user_id  = cb.user_id
           AND  is_archived = false
         ORDER  BY sort_order ASC
         LIMIT  1
       );

-- 3. Drop the now-redundant table
DROP TABLE IF EXISTS child_baseline;
