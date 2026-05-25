const AUTH_TOKEN_KEY = "clearance-web.auth-token";

export const storage = {
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};
