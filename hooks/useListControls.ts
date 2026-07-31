"use client";
import { useMemo, useState } from "react";
import type { ListControls } from "@/lib/types";

const DEFAULT_LIMIT = 10;

// Takes an already-filtered array (page applies its own dropdown filters first)
// and layers free-text search + pagination on top. `searchText` extracts the
// searchable string from an item — kept explicit per caller rather than guessing
// which fields matter for a given resource.
export function useListControls<T>(items: T[], searchText: (item: T) => string): ListControls<T> {
  const [search, setSearchRaw] = useState("");
  const [page, setPageRaw] = useState(1);
  const [limit, setLimitRaw] = useState(DEFAULT_LIMIT);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => searchText(item).toLowerCase().includes(q));
  }, [items, search, searchText]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(
    () => filtered.slice((safePage - 1) * limit, safePage * limit),
    [filtered, safePage, limit]
  );

  function setSearch(v: string) {
    setSearchRaw(v);
    setPageRaw(1);
  }

  function setLimit(v: number) {
    setLimitRaw(v);
    setPageRaw(1);
  }

  return { search, setSearch, page: safePage, setPage: setPageRaw, limit, setLimit, filtered, paged, total, totalPages };
}
