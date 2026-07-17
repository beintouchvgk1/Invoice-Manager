import { http } from "./http";
import type { Group } from "@/lib/types";

export const groupService = {
  list: () => http.get<Group[]>("/api/groups"),
  create: (name: string) => http.post<{ name: string }>("/api/groups", { name }),
  rename: (oldName: string, newName: string) =>
    http.put<{ name: string }>(`/api/groups/${encodeURIComponent(oldName)}`, { name: newName }),
  remove: (name: string) => http.del<{ deleted: true }>(`/api/groups/${encodeURIComponent(name)}`),
};
