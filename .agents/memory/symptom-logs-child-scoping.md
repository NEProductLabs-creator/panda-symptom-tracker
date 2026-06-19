---
name: Symptom logs child scoping
description: How useSymptomLogs scopes data to the active child while preserving all children's data in localStorage.
---

## The rule

`useSymptomLogs` must NEVER call `storage.saveLogs(nextFiltered)` with only the filtered list. That would silently wipe out other children's logs.

## How to apply

On every write (addLog, deleteLog), the pattern is:
```typescript
const allLogs = storage.getLogs();
const otherLogs = activeChildId
  ? allLogs.filter(l => l.child_id && l.child_id !== activeChildId)
  : [];
storage.saveLogs([...otherLogs, ...nextFiltered]);
```

The `prev` state holds only the active child's filtered logs. localStorage must always hold ALL logs.

**Why:** The hook uses filtered state for display, but localStorage is the single source of truth for offline use. Without this merge step, switching children and then saving a log would permanently delete the other child's data from localStorage.

## Filter logic

```typescript
function filterByChild(logs, childId) {
  if (!childId) return logs; // no active child → show all
  return logs.filter(l => !l.child_id || l.child_id === childId);
}
```

Legacy logs (no `child_id`) are treated as belonging to the current active child. This ensures backwards compatibility after migration 010 runs.

## Two effects, not one

1. `useEffect([userId])` — API sync: fetches server, merges with local, saves ALL, sets filtered state
2. `useEffect([activeChildId])` — re-filter from localStorage when active child switches (no API call)
