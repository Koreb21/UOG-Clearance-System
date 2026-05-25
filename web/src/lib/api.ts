import type {
  Campus,
  ChapaInitiation,
  ClearanceRequest,
  ClearanceStatus,
  CurrentUserResponse,
  BulkImportResult,
  Department,
  Inquiry,
  LoginResponse,
  QrVerificationResponse,
  StaffUser,
  StaffQueueItem,
  PaymentRecord,
  StudentSummary
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

const BACKEND_DOWN_HINT =
  "The system is temporarily unavailable. Please try again in a few moments or contact the Registrar's Office for assistance.";

type SessionInvalidListener = () => void;
const sessionInvalidListeners = new Set<SessionInvalidListener>();

/** Called when an authenticated request receives HTTP 401 — keeps auth state aligned across the app. */
export function subscribeSessionInvalid(listener: SessionInvalidListener) {
  sessionInvalidListeners.add(listener);
  return () => {
    sessionInvalidListeners.delete(listener);
  };
}

function notifySessionInvalid() {
  sessionInvalidListeners.forEach((listener) => listener());
}

function looksLikeDevProxyCouldNotReachApi(status: number, body: string): boolean {
  if (status === 502 || status === 503 || status === 504) {
    return true;
  }
  const b = body.toLowerCase();
  return (
    status === 500 &&
    (b.includes("econnrefused") ||
      b.includes("proxy error") ||
      b.includes("aggregateerror") ||
      b.includes("socket hang up") ||
      b.includes("connect econnrefused") ||
      b.trim().length === 0)
  );
}

export function toApiUrl(path?: string | null) {
  if (!path) {
    return null;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const origin = API_BASE_URL.replace(/\/api\/v1$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {})
      }
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Network error";
    void detail;
    throw new Error(`Unable to connect to the UGClear system. ${BACKEND_DOWN_HINT}`);
  }

  const text = await response.text();

  if (!response.ok) {
    if (response.status === 401 && token) {
      notifySessionInvalid();
    }
    if (looksLikeDevProxyCouldNotReachApi(response.status, text)) {
      throw new Error(
        `Unable to connect to the UGClear system. ${BACKEND_DOWN_HINT}`
      );
    }

    let message = "Request failed";

    try {
      const errorBody = (text ? JSON.parse(text) : {}) as { message?: string; error?: string };
      message = errorBody.message?.trim() || message;
      if (!errorBody.message?.trim()) {
        if (response.status === 401) {
          message = "Your session expired or credentials were rejected. Please sign in again.";
        } else if (response.status === 403) {
          message =
            errorBody.error === "FORBIDDEN"
              ? "Access denied. If you just signed in, try again or contact the administrator."
              : "Access denied.";
        } else if (response.status === 500) {
          message = `Something went wrong on our end. ${BACKEND_DOWN_HINT}`;
        }
      }
    } catch {
      message = response.statusText || text.trim().slice(0, 200) || message;
      if (response.status === 401) {
        message = "Authentication required. Please sign in again.";
      } else if (response.status === 403) {
        message = "Access denied.";
      } else if (response.status === 500) {
        message = `Something went wrong on our end. ${BACKEND_DOWN_HINT}`;
      }
    }

    throw new Error(message);
  }

  if (response.status === 204 || !text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const api = {
  login: (username: string, password: string, expectedCampusId?: string | null) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        ...(expectedCampusId != null && expectedCampusId !== ""
          ? { expectedCampusId }
          : {})
      })
    }),
  getCurrentUser: (token: string) =>
    request<CurrentUserResponse>("/auth/me", { method: "GET" }, token),
  updateMyProfile: (token: string, payload: { email?: string }) =>
    request<CurrentUserResponse>("/auth/me/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    }, token),
  listAdminStudents: (token: string) =>
    request<StudentSummary[]>("/admin/students", { method: "GET" }, token),
  createStudent: (
    token: string,
    payload: {
      studentId: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      gender?: string;
      phone?: string;
      email?: string;
      campusId: string;
      academicDepartmentId?: string;
      program?: string;
      academicYear: number;
      graduationYear: number;
      temporaryPassword?: string;
    }
  ) =>
    request<StudentSummary>(
      "/admin/students",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    ),
  updateStudent: (
    token: string,
    studentId: string,
    payload: {
      firstName: string;
      middleName?: string;
      lastName: string;
      gender?: string;
      phone?: string;
      email?: string;
      campusId: string;
      academicDepartmentId?: string;
      program?: string;
      academicYear: number;
      graduationYear: number;
    }
  ) =>
    request<StudentSummary>(
      `/admin/students/${encodeURIComponent(studentId)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload)
      },
      token
    ),
  setStudentActive: (token: string, studentId: string, active: boolean) =>
    request<StudentSummary>(
      `/admin/students/${encodeURIComponent(studentId)}/activate`,
      {
        method: "PATCH",
        body: JSON.stringify({ active })
      },
      token
    ),
  importStudentsCsv: (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return fetch(`${API_BASE_URL}/admin/students/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }).then(async (response) => {
      if (!response.ok) {
        if (response.status === 401) {
          notifySessionInvalid();
        }
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? "Unable to import students");
      }
      return (await response.json()) as BulkImportResult;
    });
  },
  uploadStudentProfileImage: (token: string, studentId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return fetch(`${API_BASE_URL}/admin/students/${studentId}/profile-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }).then(async (response) => {
      if (!response.ok) {
        if (response.status === 401) {
          notifySessionInvalid();
        }
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? "Unable to upload profile image");
      }
      return response.json();
    });
  },
  uploadStudentIdCardImage: (token: string, studentId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return fetch(`${API_BASE_URL}/admin/students/${studentId}/id-card-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }).then(async (response) => {
      if (!response.ok) {
        if (response.status === 401) {
          notifySessionInvalid();
        }
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? "Unable to upload ID card image");
      }
      return response.json();
    });
  },
  listStaffUsers: (token: string) =>
    request<StaffUser[]>("/admin/staff-users", { method: "GET" }, token),
  createStaffUser: (
    token: string,
    payload: {
      username: string;
      email?: string;
      role: Exclude<
        StaffUser["role"],
        never
      >;
      campusId: string;
      departmentId?: string;
      temporaryPassword?: string;
    }
  ) =>
    request<StaffUser>(
      "/admin/staff-users",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    ),
  updateStaffUser: (
    token: string,
    userId: string,
    payload: {
      username: string;
      email?: string;
      role: Exclude<StaffUser["role"], never>;
      campusId: string;
      departmentId?: string;
    }
  ) =>
    request<StaffUser>(
      `/admin/staff-users/${encodeURIComponent(userId)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload)
      },
      token
    ),
  setStaffUserActive: (token: string, userId: string, active: boolean) =>
    request<StaffUser>(
      `/admin/staff-users/${encodeURIComponent(userId)}/activate`,
      {
        method: "PATCH",
        body: JSON.stringify({ active })
      },
      token
    ),
  deleteStaffUser: (token: string, userId: string) =>
    request<void>(
      `/admin/staff-users/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
      token
    ),
  resetStaffPassword: (token: string, userId: string, newPassword: string) =>
    request<void>(
      `/admin/staff-users/${encodeURIComponent(userId)}/reset-password`,
      { method: "PATCH", body: JSON.stringify({ newPassword }) },
      token
    ),
  deleteStudent: (token: string, studentId: string) =>
    request<void>(
      `/admin/students/${encodeURIComponent(studentId)}`,
      { method: "DELETE" },
      token
    ),
  resetStudentPassword: (token: string, studentId: string, newPassword: string) =>
    request<void>(
      `/admin/students/${encodeURIComponent(studentId)}/reset-password`,
      { method: "PATCH", body: JSON.stringify({ newPassword }) },
      token
    ),
  listCampuses: (token: string) =>

    request<Campus[]>("/campuses", { method: "GET" }, token),
  listDepartments: (token: string, campusId?: string) =>
    request<Department[]>(
      `/departments${campusId ? `?campusId=${encodeURIComponent(campusId)}` : ""}`,
      { method: "GET" },
      token
    ),
  createDepartment: (token: string, payload: { code: string; name: string; type: "ACADEMIC" | "CLEARANCE"; campusId: string; active?: boolean }) =>
    request<Department>("/departments", { method: "POST", body: JSON.stringify(payload) }, token),
  updateDepartment: (token: string, id: string, payload: Partial<{ code: string; name: string; type: "ACADEMIC" | "CLEARANCE"; campusId: string; active: boolean }>) =>
    request<Department>(`/departments/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  toggleDepartment: (token: string, id: string) =>
    request<Department>(`/departments/${encodeURIComponent(id)}/toggle`, { method: "PATCH" }, token),
  listAssignedStaff: (token: string, departmentId: string) =>
    request<Array<{ id: string; username: string; role: string }>>(`/departments/assigned-staff?departmentId=${encodeURIComponent(departmentId)}`, { method: "GET" }, token),
  assignStaffToDepartment: (token: string, payload: { userId: string; departmentId: string }) =>
    request<{ id: string; username: string; role: string }>("/departments/assign-staff", { method: "POST", body: JSON.stringify(payload) }, token),
  listStaffStudents: (token: string) =>
    request<StudentSummary[]>("/staff/students", { method: "GET" }, token),
  listStaffQueue: (token: string) =>
    request<StaffQueueItem[]>("/staff/queue", { method: "GET" }, token),
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
    request<ClearanceStatus>(
      `/students/me/clearance-requests/${requestId}/status`,
      { method: "GET" },
      token
    ),
  getStudentCertificate: (token: string, requestId: string) =>
    request(`/students/me/clearance-requests/${requestId}/certificate`, { method: "GET" }, token),
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
  initiateChapaPayment: (
    token: string,
    payload: { clearanceRequestId: string; liabilityIds: string[] }
  ) =>
    request<ChapaInitiation>(
      "/payments/chapa/initiate",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    ),
  listFinancePayments: (token: string, clearanceRequestId: string) =>
    request<PaymentRecord[]>(
      `/finance/payments?clearanceRequestId=${encodeURIComponent(clearanceRequestId)}`,
      { method: "GET" },
      token
    ),
  listPaymentHistory: (token: string, campusId?: string) =>
    request<PaymentRecord[]>(
      `/finance/payments/history?${campusId ? `campusId=${encodeURIComponent(campusId)}` : ""}`,
      { method: "GET" },
      token
    ),
  lookupPaymentByRef: (token: string, ref: string) =>
    request<{
      id: string;
      txRef: string;
      receiptNumber: string | null;
      providerReference: string | null;
      provider: string;
      amount: number;
      currency: string;
      status: string;
      verifiedAt: string | null;
      receiptIssuedAt: string | null;
      departmentCheckCode: string | null;
      clearanceRequestId: string | null;
      checkId: string | null;
      checkStatus: string | null;
      student: {
        studentId: string;
        fullName: string;
        program: string;
        academicYear: string | number;
        email: string;
        campusId: string;
      } | null;
    }>(
      `/finance/payments/lookup?ref=${encodeURIComponent(ref)}`,
      { method: "GET" },
      token
    ),
  getFlaggedStudents: (token: string, campusId?: string) =>
    request<StaffQueueItem[]>(
      `/staff/flagged?${campusId ? `campusId=${encodeURIComponent(campusId)}` : ""}`,
      { method: "GET" },
      token
    ),
  revokeFinanceApproval: (token: string, checkId: string, reason?: string) =>
    request(
      `/staff/checks/${encodeURIComponent(checkId)}/revoke-payment`,
      {
        method: "PATCH",
        body: JSON.stringify({ reason: reason ?? "" })
      },
      token
    ),
  recordManualPayment: (
    token: string,
    payload: {
      clearanceRequestId: string;
      studentId: string;
      liabilityIds: string[];
      providerReference: string;
      note?: string;
    }
  ) =>
    request(
      "/finance/payments/manual",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    ),
  verifyChapaPayment: (
    token: string,
    txRef: string,
    payload: { status: string; providerReference?: string; message?: string }
  ) =>
    request(
      `/payments/chapa/verify/${encodeURIComponent(txRef)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload)
      },
      token
    ),
  listVisibleStudentRequests: (token: string, studentId: string) =>
    request<ClearanceRequest[]>(
      `/staff/clearance-requests?studentId=${encodeURIComponent(studentId)}`,
      { method: "GET" },
      token
    ),
  listStaffInquiries: (token: string) =>
    request<Inquiry[]>("/staff/inquiries", { method: "GET" }, token),
  respondToInquiry: (
    token: string,
    inquiryId: string,
    payload: { response: string; status: "OPEN" | "ANSWERED" | "CLOSED" }
  ) =>
    request<Inquiry>(
      `/staff/inquiries/${encodeURIComponent(inquiryId)}/respond`,
      {
        method: "PATCH",
        body: JSON.stringify(payload)
      },
      token
    ),
  getVisibleStudentStatus: (token: string, studentId: string, requestId: string) =>
    request<ClearanceStatus>(
      `/staff/clearance?studentId=${encodeURIComponent(studentId)}&clearanceRequestId=${encodeURIComponent(requestId)}`,
      { method: "GET" },
      token
    ),
  createLiability: (
    token: string,
    payload: {
      studentId: string;
      clearanceRequestId?: string;
      departmentCheckCode: string;
      itemName: string;
      category?: string;
      description?: string;
      amount: number;
      paymentRequired: boolean;
    }
  ) =>
    request(
      "/staff/liabilities",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    ),
  reviewCheck: (
    token: string,
    checkId: string,
    payload: { status: string; comment?: string }
  ) =>
    request(
      `/staff/checks/${checkId}/review`,
      {
        method: "PATCH",
        body: JSON.stringify(payload)
      },
      token
    ),
  quickApproveCheck: (token: string, checkId: string) =>
    request(
      `/staff/checks/${checkId}/quick-approve`,
      { method: "PATCH", body: JSON.stringify({}) },
      token
    ),
  listAllClearanceQueue: (token: string) =>
    request<Array<{
      checkId: string;
      checkCode: string;
      checkStatus: string;
      clearanceRequestId: string;
      requestNumber: string;
      requestStatus: string;
      submittedAt: string;
      studentId: string;
      studentName: string;
      program: string | null;
      campusId: string;
      totalFines: number;
      unpaidCount: number;
      liabilityCount: number;
    }>>("/staff/clearance-queue", { method: "GET" }, token),
  listRegistrarQueue: (token: string) =>
    request<ClearanceRequest[]>("/registrar/clearance-requests", { method: "GET" }, token),
  getRegistrarStatistics: (token: string) =>
    request<{
      total_requests: number;
      cleared_requests: number;
      clearance_percentage: number;
      most_common_bottleneck: string;
      bottleneck_count: number;
      pending_count: number;
      in_review_count: number;
      flagged_count: number;
    }>("/registrar/clearance-requests/statistics", { method: "GET" }, token),
  listAllStudentClearances: (token: string) =>
    request<Array<{
      request_id: string;
      request_number: string;
      student: {
        studentId: string;
        firstName: string;
        lastName: string;
        middleName?: string;
        program?: string;
      };
      status: string;
      submitted_at: string;
      progress_percentage: number;
      checks: Array<{
        id: string;
        checkCode: string;
        status: string;
      }>;
      has_certificate: boolean;
    }>>("/registrar/clearance-requests/all-students", { method: "GET" }, token),
  generateCertificate: (token: string, requestId: string) =>
    request(
      `/registrar/clearance-requests/${requestId}/generate-certificate`,
      { method: "POST" },
      token
    ),
  sendCertificateToStudent: (token: string, requestId: string, message?: string) =>
    request(
      `/registrar/clearance-requests/${requestId}/send-certificate`,
      {
        method: "POST",
        body: JSON.stringify({ notification_message: message || "" })
      },
      token
    ),
  verifyQr: (token: string, hash: string) =>
    request<QrVerificationResponse>(
      "/registrar/qr/verify",
      {
        method: "POST",
        body: JSON.stringify({ hash })
      },
      token
    ),
  closeRequestByRegistrar: (token: string, requestId: string) =>
    request(
      `/registrar/clearance-requests/${requestId}/close`,
      { method: "POST" },
      token
    ),
  uploadProspectiveBatch: (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE_URL}/registrar/student-batches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    }).then(async (response) => {
      if (!response.ok) {
        if (response.status === 401) notifySessionInvalid();
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? "Unable to upload batch");
      }
      return (await response.json()) as { status: string; batchId: string; studentCount: number; message: string };
    });
  },
  listStudentBatches: (token: string) =>
    request<Array<{
      id: string; name: string; campusId: string; submittedBy: string; submittedAt: string;
      status: string; studentCount: number; importedAt: string | null; importedBy: string | null; importedCount: number;
    }>>("/admin/student-batches", { method: "GET" }, token),
  getBatchDetail: (token: string, batchId: string) =>
    request<{
      batch: { id: string; name: string; campusId: string; submittedBy: string; submittedAt: string; status: string; studentCount: number; importedAt: string | null; importedBy: string | null; importedCount: number };
      students: Array<{ id: string; firstName: string; fatherName: string | null; lastName: string; gender: string | null; age: number | null; email: string | null; department: string | null; academicYear: number | null; campusId: string }>;
    }>(`/admin/student-batches/${encodeURIComponent(batchId)}`, { method: "GET" }, token),
  importBatch: (token: string, batchId: string) =>
    request<{
      batchId: string; totalRows: number; importedCount: number; failedCount: number; errors: string[];
      generatedCredentials: Array<{ firstName: string; fatherName: string | null; lastName: string; studentId: string; password: string }>;
    }>(`/admin/student-batches/${encodeURIComponent(batchId)}/import`, { method: "POST" }, token),
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
    request<{ message: string; _debug_otp?: string; recipientEmail?: string }>(
      "/auth/request-password-reset",
      {
        method: "POST",
        body: JSON.stringify({ email })
      }
    ),
  verifyResetCode: (email: string, code: string) =>
    request(
      "/auth/verify-reset-code",
      {
        method: "POST",
        body: JSON.stringify({ email, code })
      }
    ),
  resetPassword: (email: string, code: string, newPassword: string) =>
    request(
      "/auth/reset-password-complete",
      {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword })
      }
    ),
  recordStandalonePayment: (
    token: string,
    payload: {
      studentFullName: string;
      studentId: string;
      yearOfStudy: string;
      department: string;
      campusId: string;
      amountPaid: number;
      paymentDate: string;
      referenceNumber: string | null;
      liabilityId: string | null;
      clearanceRequestId: string | null;
      txId: string;
      receiptNumber: string;
      recordedBy: string;
    }
  ) =>
    request<PaymentRecord>(
      "/finance/payments/record",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    )
};
