"use client";
import { useEffect, useState } from "react";
import { authService } from "@/services/auth.service";

export function useCurrentUser() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .verify()
      .then((res) => {
        setEmail(res.email);
        setRole(res.role);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { email, role, loading };
}
