export type UserRole =
  | "STUDENT"
  | "LIBRARIAN"
  | "PROCTOR"
  | "CAFE_STAFF"
  | "DEPARTMENT_HEAD"
  | "STUDENT_DEAN"
  | "FINANCE_OFFICER"
  | "MAIN_REGISTRAR"
  | "SYSTEM_ADMIN";

export type AuthUser = {
  userId: string;
  username: string;
  role: UserRole;
  campusId: string | null;
  departmentId: string | null;
  studentId: string | null;
  mustChangePassword?: boolean;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  userId: string;
  username: string;
  role: UserRole;
  campusId: string | null;
  mustChangePassword: boolean;
};

export type CurrentUserResponse = AuthUser;

export type ClearanceRequest = {
  id: string;
  requestNumber: string;
  studentId: string;
  campusId: string;
  semester: string;
  academicYearLabel: string;
  requestType: "SEMESTER" | "FINAL" | "WITHDRAWAL";
  status: string;
  submittedAt: string;
};

export type ClearanceCheck = {
  id: string;
  clearanceRequestId: string;
  checkCode: string;
  status:
    | "PENDING"
    | "IN_REVIEW"
    | "AWAITING_FINANCE"
    | "PAID_PENDING_DEPARTMENT_APPROVAL"
    | "FLAGGED"
    | "FAILED"
    | "CLEARED";
  reviewedBy: string | null;
  reviewedAt: string | null;
  comment: string | null;
};

export type Liability = {
  id: string;
  clearanceRequestId: string;
  studentId: string;
  campusId: string;
  departmentCheckCode: string;
  category: string | null;
  itemName: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  paymentRequired: boolean;
};

export type PaymentRecord = {
  id: string;
  clearanceRequestId: string;
  studentId: string;
  liabilityIds: string[];
  provider: string;
  txRef: string;
  providerReference: string | null;
  departmentCheckCode: string | null;
  amount: number;
  currency: string;
  status: string;
  verifiedAt: string | null;
  receiptNumber: string | null;
  receiptSignature: string | null;
  receiptIssuedAt: string | null;
};

export type StudentIdentity = {
  studentId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  campusId: string;
  academicDepartmentId: string | null;
  program: string | null;
  academicYear: number | null;
  graduationYear: number | null;
  hasProfileImage: boolean;
  profileImageUrl: string | null;
  hasIdCardImage: boolean;
  idCardImageUrl: string | null;
};

export type QrCertificate = {
  id: string;
  clearanceRequestId: string;
  studentId: string;
  campusId: string;
  hash: string;
  signedPayload: string;
  base64Qr: string;
  generatedAt: string;
};

export type ClearanceStatus = {
  request: ClearanceRequest;
  student: StudentIdentity;
  checks: ClearanceCheck[];
  liabilities: Liability[];
  payments: PaymentRecord[];
  certificate: QrCertificate | null;
};

export type ChapaInitiation = {
  payment: PaymentRecord;
  checkoutUrl: string;
  callbackUrl: string;
  returnUrl: string;
};

export type Inquiry = {
  id: string;
  clearanceRequestId: string;
  studentId: string;
  campusId: string;
  targetCheckCode: string;
  message: string;
  response: string | null;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  respondedAt: string | null;
};
