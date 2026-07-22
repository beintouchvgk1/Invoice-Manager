# Data-Fetching Pattern

There is no RTK Query/React Query here — it's a plain three-layer pattern. Follow it exactly for any
new resource so it matches every existing feature (customers, invoices, payments, groups, settings).

## 1. `services/http.ts` (already exists, don't duplicate)
```typescript
export const http = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data?: unknown) => request<T>(url, { method: "POST", body: JSON.stringify(data ?? {}) }),
  put: <T>(url: string, data?: unknown) => request<T>(url, { method: "PUT", body: JSON.stringify(data ?? {}) }),
  del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
```
Throws on non-2xx or `{success:false}` responses — callers just `try/catch`.

## 2. `services/{name}.service.ts`
```typescript
import { http } from "./http";
import type { MyThing } from "@/lib/types";

export const myThingService = {
  list: () => http.get<MyThing[]>("/api/my-things"),
  get: (id: string) => http.get<MyThing>(`/api/my-things/${id}`),
  create: (payload: Partial<MyThing>) => http.post<MyThing>("/api/my-things", payload),
  update: (id: string, payload: Partial<MyThing>) => http.put<MyThing>(`/api/my-things/${id}`, payload),
  remove: (id: string) => http.del<void>(`/api/my-things/${id}`),
};
```

## 3. `hooks/use{Name}.ts`
```typescript
"use client";
import { useCallback, useEffect, useState } from "react";
import { myThingService } from "@/services/myThing.service";
import type { MyThing } from "@/lib/types";

export function useMyThings() {
  const [items, setItems] = useState<MyThing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await myThingService.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { items, loading, error, refresh };
}
```

## 4. Consume in the page
```tsx
const { items, loading, refresh } = useMyThings();
...
{loading ? <SkeletonTable columns={N} rows={6} /> : <MyThingTable items={items} .../>}
```
Call `refresh()` after any create/update/delete so the list stays in sync — this is the existing
pattern everywhere (see `onSaved` callbacks in the modals), don't add a separate cache-invalidation
mechanism.

## Rules
- Never call `fetch`/`http` directly from a component — always through a hook.
- Never introduce a second data-fetching library. If a hook's shape genuinely doesn't fit (rare),
  extend this pattern rather than reaching for something new.
- Mutations belong in a `Modal` component (see existing `*Modal.tsx` files): local form state seeded
  from the record in `useState`, an inline `<Toast kind="err">` on failure, both footer buttons
  disabled while a `busy` flag is true, and `onSaved()` called to let the parent page `refresh()`.
