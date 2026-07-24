import { http } from "./http";
import type { User } from "@/lib/types";

export const userService = {
  list: () => http.get<User[]>("/api/users"),
  create: (payload: { email: string; password: string; phone?: string; roleId: string }) =>
    http.post<User>("/api/users", payload),
  update: (id: string, payload: Partial<{ email: string; password: string; phone: string; roleId: string; isActive: boolean }>) =>
    http.put<User>(`/api/users/${id}`, payload),
  remove: (id: string) => http.del<{ deleted: true }>(`/api/users/${id}`),
};
