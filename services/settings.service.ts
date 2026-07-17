import { http } from "./http";
import type { Settings } from "@/lib/types";

export const settingsService = {
  get: () => http.get<Settings>("/api/settings"),
  update: (data: Partial<Settings>) => http.put<Settings>("/api/settings", data),
};
