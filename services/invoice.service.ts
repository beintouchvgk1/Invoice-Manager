import { http } from "./http";
import type { Invoice } from "@/lib/types";

export const invoiceService = {
  list: (clientId?: string) => http.get<Invoice[]>(`/api/invoices${clientId ? `?clientId=${clientId}` : ""}`),
  get: (id: string) => http.get<Invoice>(`/api/invoices/${id}`),
  create: (data: Partial<Invoice>) => http.post<Invoice>("/api/invoices", data),
  update: (id: string, data: Partial<Invoice>) => http.put<Invoice>(`/api/invoices/${id}`, data),
  remove: (id: string) => http.del<{ deleted: true }>(`/api/invoices/${id}`),
};
