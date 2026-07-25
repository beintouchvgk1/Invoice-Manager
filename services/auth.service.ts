import { http } from "./http";

export const authService = {
  login: (email: string, password: string) =>
    http.post<{ email: string; role: string }>("/api/auth/login", { email, password }),
  logout: () => http.post<{ loggedOut: true }>("/api/auth/logout"),
  verify: () => http.get<{ email: string; role: string; permissions: string[] }>("/api/auth/verify"),
};
