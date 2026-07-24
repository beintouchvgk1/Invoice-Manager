import { http } from "./http";
import type { Role } from "@/lib/types";

export const roleService = {
  list: () => http.get<Role[]>("/api/roles"),
  create: (payload: { name: string; description?: string }) => http.post<Role>("/api/roles", payload),
  update: (id: string, payload: Partial<Pick<Role, "name" | "description" | "isActive">>) =>
    http.put<Role>(`/api/roles/${id}`, payload),
  remove: (id: string) => http.del<{ deleted: true }>(`/api/roles/${id}`),
};
