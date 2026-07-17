import { http } from "./http";
import type { Client } from "@/lib/types";

export const customerService = {
  list: (group?: string) => http.get<Client[]>(`/api/clients${group ? `?group=${encodeURIComponent(group)}` : ""}`),
  create: (data: Partial<Client>) => http.post<Client>("/api/clients", data),
  update: (id: string, data: Partial<Client>) => http.put<Client>(`/api/clients/${id}`, data),
  remove: (id: string) => http.del<{ deleted: true }>(`/api/clients/${id}`),
};
