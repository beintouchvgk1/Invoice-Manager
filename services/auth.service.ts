import { http } from "./http";

export const authService = {
  login: (username: string, password: string) =>
    http.post<{ username: string }>("/api/auth/login", { username, password }),
  logout: () => http.post<{ loggedOut: true }>("/api/auth/logout"),
  verify: () => http.get<{ username: string }>("/api/auth/verify"),
};
