import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useChildren } from "@/hooks/useChildren";
import { useActiveChild, setActiveChild } from "@/hooks/useActiveChild";
import { track } from "@/lib/analytics";
import { useDemoContext } from "@/contexts/DemoContext";

interface Props {
  variant: "sidebar" | "mobile" | "pill";
}

export default function ChildSwitcher({ variant }: Props) {
  const [open, setOpenRaw] = useState(false);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: children } = useChildren();
  const activeChild = useActiveChild();
  const ref = useRef<HTMLDivElement>(null);
  const { isDemoMode, demoScenario, dismissDemoSwitchPrompt } = useDemoContext();

  function setOpen(next: boolean | ((prev: boolean) => boolean)) {
    setOpenRaw(next);
    // Any interaction with the switcher dismisses the multi-child nudge
    if (isDemoMode) dismissDemoSwitchPrompt();
  }

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenRaw(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!activeChild) return null;

  const isMulti = (children?.length ?? 0) > 1;

  function handleSelect(childId: string) {
    const fromName = activeChild?.name;
    const toChild = children?.find((c) => c.id === childId);

    if (childId === activeChild?.id) {
      setOpen(false);
      return;
    }
    setActiveChild(childId, qc);

    if (isDemoMode) {
      track("demo_child_switched", {
        from_child_name: fromName,
        to_child_name: toChild?.name,
        scenario: demoScenario,
      });
    } else {
      track("child_switched", { new_child_id: childId });
    }
    setOpen(false);
  }

  function handleAddChild() {
    setOpen(false);
    navigate("/onboarding/add-child");
  }

  // ── Sidebar variant ──────────────────────────────────────────────────────────
  if (variant === "sidebar") {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => isMulti && setOpen((v) => !v)}
          className={[
            "flex items-center gap-1 text-[11px] font-medium rounded-full transition-colors px-1 py-0.5 -ml-1",
            isMulti
              ? "hover:bg-primary/10 cursor-pointer"
              : "cursor-default",
          ].join(" ")}
          style={{ color: "var(--terracotta)" }}
        >
          <span>Tracking for {activeChild.name}</span>
          {isMulti && (
            <ChevronDown
              className="w-3 h-3 flex-shrink-0"
              style={{
                transform: open ? "rotate(180deg)" : undefined,
                transition: "transform 0.15s ease",
              }}
            />
          )}
        </button>

        {open && isMulti && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[180px] max-h-60 overflow-y-auto">
            {children?.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => handleSelect(child.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
              >
                <span className="flex-1 text-xs font-medium text-foreground truncate">
                  {child.name}
                </span>
                {child.id === activeChild.id && (
                  <Check className="w-3 h-3 flex-shrink-0" style={{ color: "var(--terracotta)" }} />
                )}
              </button>
            ))}
            {!isDemoMode && (
              <div className="border-t border-border/60 mt-1 pt-1">
                <button
                  type="button"
                  onClick={handleAddChild}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-accent transition-colors"
                  style={{ color: "var(--terracotta)" }}
                >
                  <Plus className="w-3 h-3 flex-shrink-0" />
                  Add another child
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Pill variant (page-level "Viewing:" indicator) ──────────────────────────
  if (variant === "pill") {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => isMulti && setOpen((v) => !v)}
          className={[
            "flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
            isMulti ? "hover:bg-accent cursor-pointer" : "cursor-default",
          ].join(" ")}
          style={{
            borderColor: "color-mix(in srgb, var(--terracotta) 40%, transparent)",
            color: "var(--terracotta)",
            backgroundColor: "color-mix(in srgb, var(--terracotta) 8%, transparent)",
          }}
        >
          <span>Viewing: {activeChild.name}</span>
          {isMulti && (
            <ChevronDown
              className="w-3 h-3 flex-shrink-0"
              style={{
                transform: open ? "rotate(180deg)" : undefined,
                transition: "transform 0.15s ease",
              }}
            />
          )}
        </button>

        {open && isMulti && (
          <div className="absolute right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[180px] max-h-60 overflow-y-auto">
            {children?.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => handleSelect(child.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
              >
                <span className="flex-1 text-xs font-medium text-foreground truncate">
                  {child.name}
                </span>
                {child.id === activeChild.id && (
                  <Check className="w-3 h-3 flex-shrink-0" style={{ color: "var(--terracotta)" }} />
                )}
              </button>
            ))}
            {!isDemoMode && (
              <div className="border-t border-border/60 mt-1 pt-1">
                <button
                  type="button"
                  onClick={handleAddChild}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-accent transition-colors"
                  style={{ color: "var(--terracotta)" }}
                >
                  <Plus className="w-3 h-3 flex-shrink-0" />
                  Add another child
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Mobile variant ───────────────────────────────────────────────────────────
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => isMulti && setOpen((v) => !v)}
        className={[
          "flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors",
          isMulti ? "hover:bg-accent cursor-pointer" : "cursor-default",
        ].join(" ")}
        style={{ borderColor: "var(--terracotta)", color: "var(--terracotta)" }}
      >
        <span>{activeChild.name}</span>
        {isMulti && (
          <ChevronDown
            className="w-3 h-3 flex-shrink-0"
            style={{
              transform: open ? "rotate(180deg)" : undefined,
              transition: "transform 0.15s ease",
            }}
          />
        )}
      </button>

      {open && isMulti && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[180px] max-h-60 overflow-y-auto">
          {children?.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => handleSelect(child.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
            >
              <span className="flex-1 text-xs font-medium text-foreground truncate">
                {child.name}
              </span>
              {child.id === activeChild.id && (
                <Check className="w-3 h-3 flex-shrink-0" style={{ color: "var(--terracotta)" }} />
              )}
            </button>
          ))}
          {!isDemoMode && (
            <div className="border-t border-border/60 mt-1 pt-1">
              <button
                type="button"
                onClick={handleAddChild}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-accent transition-colors"
                style={{ color: "var(--terracotta)" }}
              >
                <Plus className="w-3 h-3 flex-shrink-0" />
                Add another child
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
