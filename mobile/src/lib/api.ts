import type {
  ChapaInitiation,
  ClearanceRequest,
  ClearanceStatus,
  CurrentUserResponse,
  Inquiry,
  LoginResponse
} from "../types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const errorBody = (await response.json()) as { message?: string };
      message = errorBody.message ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<void>(
      "/auth/change-password",
      {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      },
      token
    ),
  requestPasswordReset: (email: string) =>
    request<void>("/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ email })
    }),
  verifyResetCode: (email: string, code: string) =>
    request<void>("/auth/verify-reset-code", {
      method: "POST",
      body: JSON.stringify({ email, code })
    }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    request<void>("/auth/reset-password-complete", {
      method: "POST",
      body: JSON.stringify({ email, code, newPassword })
    }),
  getCurrentUser: (token: string) =>
    request<CurrentUserResponse>("/auth/me", { method: "GET" }, token),
  listStudentRequests: (token: string) =>
    request<ClearanceRequest[]>("/students/me/clearance-requests", { method: "GET" }, token),
  createStudentRequest: (
    token: string,
    payload: { semester: string; academicYearLabel: string; requestType: "SEMESTER" | "FINAL" | "WITHDRAWAL" }
  ) =>
    request<ClearanceRequest>(
      "/students/me/clearance-requests",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    ),
  getStudentStatus: (token: string, requestId: string) =>
    request<ClearanceStatus>(`/students/me/clearance-requests/${requestId}/status`, { method: "GET" }, token),
  listStudentInquiries: (token: string) =>
    request<Inquiry[]>("/students/me/inquiries", { method: "GET" }, token),
  createStudentInquiry: (
    token: string,
    payload: { clearanceRequestId: string; targetCheckCode: string; message: string }
  ) =>
    request<Inquiry>(
      "/students/me/inquiries",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    ),
  initiateChapaPayment: (token: string, payload: { clearanceRequestId: string; liabilityIds: string[] }) =>
    request<ChapaInitiation>(
      "/payments/chapa/initiate",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    ),
};

export function toMediaUrl(path?: string | null) {
  if (!path) {
    return null;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const origin = API_BASE_URL.replace(/\/api\/v1$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
