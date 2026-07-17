import { http } from "./http";
import type { Payment } from "@/lib/types";

export const paymentService = {
  list: () => http.get<Payment[]>("/api/payments"),
  create: (data: Partial<Payment>) => http.post<Payment>("/api/payments", data),
  update: (id: string, data: Partial<Payment>) => http.put<Payment>(`/api/payments/${id}`, data),
  remove: (id: string) => http.del<{ deleted: true }>(`/api/payments/${id}`),
};
