"use client";
import { useEffect } from "react";
import { precacheRoutes } from "@/lib/offline/precacheRoutes";

// Mounted only in app/(app)/layout.tsx — i.e. only ever runs on an already-
// authenticated page, so the auth cookie is valid and every route below
// returns its real content instead of middleware's redirect-to-login.
//
// Static routes only. Dynamic ones (/ledger/[clientId], /invoices/[id]/edit)
// can't be listed ahead of time — CacheWarmer precaches those per-entity once
// it knows which clients/invoices actually exist.
const STATIC_ROUTES = [
  "/dashboard",
  "/invoices",
  "/invoices/new",
  "/customers",
  "/groups",
  "/payments",
  "/reports",
  "/settings",
  "/roles",
  "/users",
];

export function RoutePrecache() {
  useEffect(() => {
    void precacheRoutes(STATIC_ROUTES);
  }, []);
  return null;
}
