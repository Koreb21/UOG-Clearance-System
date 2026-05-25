// ─────────────────────────────────────────────────────────────────────────────
// UGClear Mock Backend
// Intercepts all /api/v1/* fetch calls and serves data from localStorage.
// Installed once at app startup; no real server required.
// ─────────────────────────────────────────────────────────────────────────────
import QRCode from "qrcode";

const DB_KEY = "ugc_mock_db_v7";
const CHECK_CODES = ["LIBRARY", "PROCTOR", "CAFE", "DEPARTMENT_HEAD", "STUDENT_DEAN"] as const;
type CheckCode = typeof CHECK_CODES[number];

const ROLE_TO_CHECK: Record<string, CheckCode> = {
  LIBRARIAN: "LIBRARY",
  PROCTOR: "PROCTOR",
  CAFE_STAFF: "CAFE",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  STUDENT_DEAN: "STUDENT_DEAN",
};

const MESSAGEABLE_ROLES = ["LIBRARIAN", "PROCTOR", "CAFE_STAFF", "DEPARTMENT_HEAD", "STUDENT_DEAN", "FINANCE_OFFICER", "MAIN_REGISTRAR", "SYSTEM_ADMIN"];

// ── Types ────────────────────────────────────────────────────────────────────

interface DbUser {
  id: string;
  username: string;
  password: string;
  email: string | null;
  role: string;
  campusId: string | null;
  departmentId: string | null;
  studentId: string | null;
  active: boolean;
  mustChangePassword: boolean;
}

interface DbStudent {
  id: string;
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
  profileImageUrl: string | null;
  hasProfileImage: boolean;
  status: string;
}

interface DbRequest {
  id: string;
  requestNumber: string;
  studentId: string;
  campusId: string;
  semester: string;
  academicYearLabel: string;
  requestType: string;
  status: string;
  submittedAt: string;
}

interface DbCheck {
  id: string;
  clearanceRequestId: string;
  checkCode: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  comment: string | null;
}

interface DbLiability {
  id: string;
  clearanceRequestId?: string;
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
}

interface DbCertificate {
  id: string;
  clearanceRequestId: string;
  studentId: string;
  campusId: string;
  hash: string;
  signedPayload: string;
  base64Qr: string;
  generatedAt: string;
}

interface DbInquiry {
  id: string;
  clearanceRequestId: string;
  studentId: string;
  campusId: string;
  targetCheckCode: string;
  message: string;
  response: string | null;
  status: string;
  respondedAt: string | null;
  createdAt: string;
}

interface DbPayment {
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
}

interface DbMessage {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromRole: string;
  toUserId: string | null;
  toUsername: string | null;
  campusId: string;
  subject: string;
  body: string;
  sentAt: string;
  readAt: string | null;
  deletedBySender: boolean;
  deletedByRecipient: boolean;
  isBroadcast: boolean;
  attachments: Array<{ name: string; type: string; size: number; data: string }> | null;
}

interface DbDepartment {
  id: string;
  code: string;
  name: string;
  type: "ACADEMIC" | "CLEARANCE";
  campusId: string;
  active: boolean;
}

interface DbProspectiveStudent {
  id: string;
  batchId: string;
  firstName: string;
  fatherName: string | null;
  lastName: string;
  gender: string | null;
  age: number | null;
  email: string | null;
  department: string | null;
  academicYear: number | null;
  campusId: string;
}

interface DbStudentBatch {
  id: string;
  name: string;
  campusId: string;
  submittedBy: string;
  submittedAt: string;
  status: "PENDING" | "IMPORTED" | "REJECTED";
  importedAt: string | null;
  importedBy: string | null;
  importedCount: number;
  studentCount: number;
}

interface DbPasswordResetToken {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  ipAddress: string | null;
}

interface Db {
  users: DbUser[];
  students: DbStudent[];
  requests: DbRequest[];
  checks: DbCheck[];
  liabilities: DbLiability[];
  certificates: DbCertificate[];
  inquiries: DbInquiry[];
  payments: DbPayment[];
  messages: DbMessage[];
  departments: DbDepartment[];
  batches: DbStudentBatch[];
  prospectiveStudents: DbProspectiveStudent[];
  passwordResetTokens: DbPasswordResetToken[];
  initialized: boolean;
}

// ── Storage ──────────────────────────────────────────────────────────────────

function readDb(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Db;
      if (!parsed.messages) parsed.messages = [];
      if (!parsed.passwordResetTokens) parsed.passwordResetTokens = [];
      return parsed;
    }
  } catch {/* */}
  return { users: [], students: [], requests: [], checks: [], liabilities: [], certificates: [], inquiries: [], payments: [], messages: [], departments: [], batches: [], prospectiveStudents: [], passwordResetTokens: [], initialized: false };
}

function writeDb(db: Db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

function isoNow() { return new Date().toISOString(); }

// ── QR Code generation ───────────────────────────────────────────────────────

async function generateQrBase64(data: {
  studentId: string;
  fullName: string;
  program: string | null;
  campus: string;
  clearedDate: string;
  requestNumber: string;
  hash: string;
}): Promise<string> {
  const text = [
    "UGClear — University of Gondar",
    "OFFICIAL CLEARANCE CERTIFICATE",
    "",
    `Student: ${data.fullName}`,
    `ID: ${data.studentId}`,
    `Program: ${data.program ?? "—"}`,
    `Campus: ${data.campus}`,
    `Cleared: ${data.clearedDate}`,
    `Request: ${data.requestNumber}`,
    "",
    `Verify Hash: ${data.hash}`,
  ].join("\n");

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 400,
      margin: 2,
      color: { dark: "#001e40", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    return dataUrl.replace("data:image/png;base64,", "");
  } catch {
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }
}

// ── Seed data ────────────────────────────────────────────────────────────────

function seed(db: Db): Db {
  const TEWODROS = "TEWODROS";
  const MARAKI = "MARAKI";
  const FASIL = "FASIL";

  const makeUser = (o: Partial<DbUser> & { id: string; username: string; password: string; role: string }): DbUser => ({
    email: null, campusId: null, departmentId: null, studentId: null,
    active: true, mustChangePassword: false, ...o
  });

  const makeStudent = (o: Partial<DbStudent> & { id: string; studentId: string; firstName: string; lastName: string; campusId: string }): DbStudent => ({
    middleName: null, gender: null, phone: null, email: null,
    academicDepartmentId: null, program: null, academicYear: null,
    graduationYear: null, profileImageUrl: null, hasProfileImage: false, status: "ACTIVE", ...o
  });

  db.users = [
    makeUser({ id: "u-admin", username: "admin", password: "admin123", role: "SYSTEM_ADMIN", campusId: TEWODROS, email: "admin@uog.edu.et" }),

    makeUser({ id: "u-s1", username: "student1", password: "student123", role: "STUDENT", campusId: TEWODROS, studentId: "UGR/01234/15", email: "abel.tesfaye@uog.edu.et" }),
    makeUser({ id: "u-s2", username: "student2", password: "student123", role: "STUDENT", campusId: TEWODROS, studentId: "UGR/01235/15", email: "meron.haile@uog.edu.et" }),
    makeUser({ id: "u-s3", username: "student3", password: "student123", role: "STUDENT", campusId: MARAKI, studentId: "UGR/01236/15", email: "dawit.bekele@uog.edu.et" }),

    makeUser({ id: "u-lib", username: "librarian", password: "staff123", role: "LIBRARIAN", campusId: TEWODROS, email: "librarian@uog.edu.et" }),
    makeUser({ id: "u-pro", username: "proctor", password: "staff123", role: "PROCTOR", campusId: TEWODROS, email: "proctor@uog.edu.et" }),
    makeUser({ id: "u-caf", username: "cafe", password: "staff123", role: "CAFE_STAFF", campusId: TEWODROS, email: "cafe@uog.edu.et" }),
    makeUser({ id: "u-dep", username: "depthead", password: "staff123", role: "DEPARTMENT_HEAD", campusId: TEWODROS, email: "depthead@uog.edu.et" }),
    makeUser({ id: "u-dea", username: "dean", password: "staff123", role: "STUDENT_DEAN", campusId: TEWODROS, email: "dean@uog.edu.et" }),
    makeUser({ id: "u-fin", username: "finance", password: "finance123", role: "FINANCE_OFFICER", campusId: TEWODROS, email: "finance@uog.edu.et" }),
    makeUser({ id: "u-reg", username: "registrar", password: "reg123", role: "MAIN_REGISTRAR", campusId: TEWODROS, email: "registrar@uog.edu.et" }),

    makeUser({ id: "u-lib-m", username: "librarian_m", password: "staff123", role: "LIBRARIAN", campusId: MARAKI, email: "librarian.m@uog.edu.et" }),
    makeUser({ id: "u-reg-m", username: "registrar_m", password: "reg123", role: "MAIN_REGISTRAR", campusId: MARAKI, email: "registrar.m@uog.edu.et" }),
    makeUser({ id: "u-pro-m", username: "proctor_m", password: "staff123", role: "PROCTOR", campusId: MARAKI, email: "proctor.m@uog.edu.et" }),
    makeUser({ id: "u-caf-m", username: "cafe_m", password: "staff123", role: "CAFE_STAFF", campusId: MARAKI, email: "cafe.m@uog.edu.et" }),
    makeUser({ id: "u-dep-m", username: "depthead_m", password: "staff123", role: "DEPARTMENT_HEAD", campusId: MARAKI, email: "depthead.m@uog.edu.et" }),
    makeUser({ id: "u-dea-m", username: "dean_m", password: "staff123", role: "STUDENT_DEAN", campusId: MARAKI, email: "dean.m@uog.edu.et" }),
    makeUser({ id: "u-fin-m", username: "finance_m", password: "finance123", role: "FINANCE_OFFICER", campusId: MARAKI, email: "finance.m@uog.edu.et" }),

    makeUser({ id: "u-lib-f", username: "librarian_f", password: "staff123", role: "LIBRARIAN", campusId: FASIL, email: "librarian.f@uog.edu.et" }),
    makeUser({ id: "u-reg-f", username: "registrar_f", password: "reg123", role: "MAIN_REGISTRAR", campusId: FASIL, email: "registrar.f@uog.edu.et" }),
  ];

  db.students = [
    makeStudent({ id: "st-1", studentId: "UGR/01234/15", firstName: "Abel", lastName: "Tesfaye", campusId: TEWODROS, program: "Computer Science", academicYear: 4, graduationYear: 2026, email: "abel.tesfaye@uog.edu.et", gender: "M" }),
    makeStudent({ id: "st-2", studentId: "UGR/01235/15", firstName: "Meron", lastName: "Haile", campusId: TEWODROS, program: "Electrical Engineering", academicYear: 3, graduationYear: 2027, email: "meron.haile@uog.edu.et", gender: "F" }),
    makeStudent({ id: "st-3", studentId: "UGR/01236/15", firstName: "Dawit", lastName: "Bekele", campusId: MARAKI, program: "Law", academicYear: 4, graduationYear: 2026, email: "dawit.bekele@uog.edu.et", gender: "M" }),
  ];

  db.messages = [
    {
      id: uid(), fromUserId: "u-reg", fromUsername: "registrar", fromRole: "MAIN_REGISTRAR",
      toUserId: null, toUsername: null, campusId: TEWODROS,
      subject: "Clearance Season Begins",
      body: "Dear all staff, the clearance season for this semester has officially started. Please process student requests promptly and update your queue daily.",
      sentAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      readAt: null, deletedBySender: false, deletedByRecipient: false, isBroadcast: true,
      attachments: null,
    },
    {
      id: uid(), fromUserId: "u-lib", fromUsername: "librarian", fromRole: "LIBRARIAN",
      toUserId: "u-reg", toUsername: "registrar", campusId: TEWODROS,
      subject: "Outstanding Book Returns",
      body: "Hello Registrar, we have 3 students with outstanding book returns. I have flagged them in the system.",
      sentAt: new Date(Date.now() - 86400000).toISOString(),
      readAt: null, deletedBySender: false, deletedByRecipient: false, isBroadcast: false,
      attachments: null,
    },
  ];

  // ── Sample clearance requests + checks + liabilities (for finance testing)
  const req1: DbRequest = { id: "cr-1", requestNumber: "CLR-2026-001", studentId: "UGR/01234/15", campusId: TEWODROS, semester: "Second", academicYearLabel: "2025/26", requestType: "GRADUATION", status: "IN_REVIEW", submittedAt: new Date(Date.now() - 5 * 86400000).toISOString() };
  const req2: DbRequest = { id: "cr-2", requestNumber: "CLR-2026-002", studentId: "UGR/01235/15", campusId: TEWODROS, semester: "Second", academicYearLabel: "2025/26", requestType: "SEMESTER", status: "IN_REVIEW", submittedAt: new Date(Date.now() - 3 * 86400000).toISOString() };
  db.requests = [req1, req2];

  db.checks = [
    { id: "chk-lib-1", clearanceRequestId: "cr-1", checkCode: "LIBRARY", status: "AWAITING_FINANCE", reviewedBy: "u-lib", reviewedAt: new Date(Date.now() - 4 * 86400000).toISOString(), comment: "Outstanding book fee" },
    { id: "chk-pro-1", clearanceRequestId: "cr-1", checkCode: "PROCTOR", status: "CLEARED", reviewedBy: "u-pro", reviewedAt: new Date(Date.now() - 4 * 86400000).toISOString(), comment: null },
    { id: "chk-caf-1", clearanceRequestId: "cr-1", checkCode: "CAFE", status: "AWAITING_FINANCE", reviewedBy: "u-caf", reviewedAt: new Date(Date.now() - 2 * 86400000).toISOString(), comment: "Unpaid cafeteria bill" },
    { id: "chk-dep-1", clearanceRequestId: "cr-1", checkCode: "DEPARTMENT_HEAD", status: "CLEARED", reviewedBy: "u-dep", reviewedAt: new Date(Date.now() - 4 * 86400000).toISOString(), comment: null },
    { id: "chk-dea-1", clearanceRequestId: "cr-1", checkCode: "STUDENT_DEAN", status: "CLEARED", reviewedBy: "u-dea", reviewedAt: new Date(Date.now() - 4 * 86400000).toISOString(), comment: null },
    { id: "chk-lib-2", clearanceRequestId: "cr-2", checkCode: "LIBRARY", status: "AWAITING_FINANCE", reviewedBy: "u-lib", reviewedAt: new Date(Date.now() - 2 * 86400000).toISOString(), comment: "Damaged book replacement fee" },
    { id: "chk-pro-2", clearanceRequestId: "cr-2", checkCode: "PROCTOR", status: "CLEARED", reviewedBy: "u-pro", reviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(), comment: null },
    { id: "chk-caf-2", clearanceRequestId: "cr-2", checkCode: "CAFE", status: "CLEARED", reviewedBy: "u-caf", reviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(), comment: null },
    { id: "chk-dep-2", clearanceRequestId: "cr-2", checkCode: "DEPARTMENT_HEAD", status: "CLEARED", reviewedBy: "u-dep", reviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(), comment: null },
    { id: "chk-dea-2", clearanceRequestId: "cr-2", checkCode: "STUDENT_DEAN", status: "CLEARED", reviewedBy: "u-dea", reviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(), comment: null },
  ];

  db.liabilities = [
    { id: "liab-1", clearanceRequestId: "cr-1", studentId: "UGR/01234/15", campusId: TEWODROS, departmentCheckCode: "LIBRARY", category: "Book Fee", itemName: "Outstanding Book Return", description: "Late return fee for database textbook", amount: 250, currency: "ETB", status: "PENDING", paymentRequired: true },
    { id: "liab-2", clearanceRequestId: "cr-1", studentId: "UGR/01234/15", campusId: TEWODROS, departmentCheckCode: "CAFE", category: "Cafeteria", itemName: "Cafeteria Balance", description: "Unpaid meal charges Feb 2026", amount: 480, currency: "ETB", status: "PENDING", paymentRequired: true },
    { id: "liab-3", clearanceRequestId: "cr-2", studentId: "UGR/01235/15", campusId: TEWODROS, departmentCheckCode: "LIBRARY", category: "Book Fee", itemName: "Damaged Book Replacement", description: "Physics lab manual replacement", amount: 350, currency: "ETB", status: "PENDING", paymentRequired: true },
  ];

  db.payments = [
    { id: "pay-1", clearanceRequestId: "cr-1", studentId: "UGR/01234/15", liabilityIds: ["liab-1"], provider: "MANUAL", txRef: "TXN-AB12CD", providerReference: "Bank Slip #8921", departmentCheckCode: "LIBRARY", amount: 250, currency: "ETB", status: "VERIFIED", verifiedAt: new Date(Date.now() - 1 * 86400000).toISOString(), receiptNumber: "RCP-XJ9K2M", receiptSignature: null, receiptIssuedAt: new Date(Date.now() - 1 * 86400000).toISOString() },
    { id: "pay-2", clearanceRequestId: "standalone", studentId: "UGR/01235/15", liabilityIds: [], provider: "MANUAL", txRef: "TXN-EF34GH", providerReference: "Cash payment", departmentCheckCode: "FINANCE", amount: 1200, currency: "ETB", status: "VERIFIED", verifiedAt: new Date(Date.now() - 2 * 86400000).toISOString(), receiptNumber: "RCP-PL7QRS", receiptSignature: null, receiptIssuedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: "pay-3", clearanceRequestId: "cr-2", studentId: "UGR/01235/15", liabilityIds: ["liab-3"], provider: "MANUAL", txRef: "TXN-IJ56KL", providerReference: "Bank Transfer #4451", departmentCheckCode: "LIBRARY", amount: 350, currency: "ETB", status: "VERIFIED", verifiedAt: new Date(Date.now() - 0.5 * 86400000).toISOString(), receiptNumber: "RCP-NM3WXY", receiptSignature: null, receiptIssuedAt: new Date(Date.now() - 0.5 * 86400000).toISOString() },
  ];

  db.departments = [
    { id: "d-cs", code: "CS", name: "Computer Science", type: "ACADEMIC", campusId: TEWODROS, active: true },
    { id: "d-ee", code: "EE", name: "Electrical Engineering", type: "ACADEMIC", campusId: TEWODROS, active: true },
    { id: "d-law", code: "LAW", name: "Law", type: "ACADEMIC", campusId: MARAKI, active: true },
    { id: "d-lib", code: "LIB", name: "Library", type: "CLEARANCE", campusId: TEWODROS, active: true },
    { id: "d-fin", code: "FIN", name: "Finance", type: "CLEARANCE", campusId: TEWODROS, active: true },
    { id: "d-dor", code: "DOR", name: "Dormitory", type: "CLEARANCE", campusId: TEWODROS, active: true },
    { id: "d-reg", code: "REG", name: "Registrar", type: "CLEARANCE", campusId: TEWODROS, active: true },
    { id: "d-ict", code: "ICT", name: "ICT", type: "CLEARANCE", campusId: TEWODROS, active: true },
    { id: "d-cafe", code: "CAF", name: "Cafeteria", type: "CLEARANCE", campusId: TEWODROS, active: true },
    { id: "d-dean", code: "DEAN", name: "College Dean", type: "CLEARANCE", campusId: TEWODROS, active: true },
    { id: "d-proc", code: "PRO", name: "Proctor", type: "CLEARANCE", campusId: TEWODROS, active: true },
  ];

  // ── Sample student batches (for admin import testing)
  db.batches = [
    { id: "batch-tew-1", name: "Tewodros 2025 New Admits", campusId: TEWODROS, submittedBy: "registrar", submittedAt: isoNow(), status: "PENDING", studentCount: 3, importedAt: null, importedBy: null, importedCount: 0 },
    { id: "batch-mar-1", name: "Maraki 2025 New Admits", campusId: MARAKI, submittedBy: "registrar_m", submittedAt: isoNow(), status: "PENDING", studentCount: 2, importedAt: null, importedBy: null, importedCount: 0 },
  ];

  db.prospectiveStudents = [
    { id: "ps-1", batchId: "batch-tew-1", firstName: "Abebe", fatherName: "Kebede", lastName: "Tadesse", gender: "MALE", age: 22, email: "abebe.tadesse@uog.edu.et", department: "Computer Science", academicYear: 2025, campusId: TEWODROS },
    { id: "ps-2", batchId: "batch-tew-1", firstName: "Meron", fatherName: "Haile", lastName: "Girma", gender: "FEMALE", age: 21, email: "meron.girma@uog.edu.et", department: "Electrical Engineering", academicYear: 2025, campusId: TEWODROS },
    { id: "ps-3", batchId: "batch-tew-1", firstName: "Dawit", fatherName: "Bekele", lastName: "Molla", gender: "MALE", age: 23, email: "dawit.molla@uog.edu.et", department: "Computer Science", academicYear: 2025, campusId: TEWODROS },
    { id: "ps-4", batchId: "batch-mar-1", firstName: "Selam", fatherName: "Abebe", lastName: "Negash", gender: "FEMALE", age: 20, email: "selam.negash@uog.edu.et", department: "Law", academicYear: 2025, campusId: MARAKI },
    { id: "ps-5", batchId: "batch-mar-1", firstName: "Yonas", fatherName: "Tadesse", lastName: "Worku", gender: "MALE", age: 22, email: "yonas.worku@uog.edu.et", department: "Law", academicYear: 2025, campusId: MARAKI },
  ];

  db.initialized = true;
  return db;
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function makeToken(userId: string): string {
  return "mock_" + btoa(JSON.stringify({ userId, iat: Date.now() }));
}

function userFromToken(token: string, db: Db): DbUser | null {
  try {
    if (!token.startsWith("mock_")) return null;
    const { userId } = JSON.parse(atob(token.slice(5))) as { userId: string };
    return db.users.find((u) => u.id === userId) ?? null;
  } catch {
    return null;
  }
}

function requireAuth(token: string | null, db: Db): DbUser {
  if (!token) throw { status: 401, message: "Authentication required." };
  const u = userFromToken(token, db);
  if (!u) throw { status: 401, message: "Session expired. Please sign in again." };
  return u;
}

function studentForUser(user: DbUser, db: Db): DbStudent | null {
  if (user.role !== "STUDENT" || !user.studentId) return null;
  return db.students.find((s) => s.studentId === user.studentId) ?? null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeRequestStatus(checks: DbCheck[], _liabilities: DbLiability[]): string {
  if (checks.every((c) => c.status === "CLEARED")) return "CLEARED";
  if (checks.some((c) => c.status === "FLAGGED" || c.status === "FAILED")) return "FLAGGED";
  if (checks.some((c) => c.status === "AWAITING_FINANCE")) return "AWAITING_FINANCE";
  if (checks.some((c) => c.status === "IN_REVIEW")) return "IN_REVIEW";
  return "PENDING";
}

function buildStatusPayload(req: DbRequest, student: DbStudent, db: Db) {
  const checks = db.checks.filter((c) => c.clearanceRequestId === req.id);
  const liabilities = db.liabilities.filter((l) => l.clearanceRequestId === req.id);
  const payments = db.payments.filter((p) => p.clearanceRequestId === req.id);
  const certificate = db.certificates.find((c) => c.clearanceRequestId === req.id) ?? null;
  return {
    request: {
      id: req.id, requestNumber: req.requestNumber, studentId: req.studentId,
      campusId: req.campusId, semester: req.semester, academicYearLabel: req.academicYearLabel,
      requestType: req.requestType, status: req.status, submittedAt: req.submittedAt,
    },
    student: {
      studentId: student.studentId, firstName: student.firstName, middleName: student.middleName,
      lastName: student.lastName, gender: student.gender, phone: student.phone, email: student.email,
      campusId: student.campusId, academicDepartmentId: student.academicDepartmentId,
      program: student.program, academicYear: student.academicYear, graduationYear: student.graduationYear,
      hasProfileImage: false, profileImageUrl: null, hasIdCardImage: false, idCardImageUrl: null,
    },
    checks, liabilities, payments, certificate,
  };
}

// ── Route handlers ───────────────────────────────────────────────────────────

function handleLogin(body: { username: string; password: string; expectedCampusId?: string }, db: Db) {
  const user = db.users.find((u) => u.username === body.username && u.password === body.password);
  if (!user) throw { status: 401, message: "Invalid username or password." };
  if (!user.active) throw { status: 403, message: "Account is deactivated." };
  if (body.expectedCampusId && user.campusId && user.campusId !== body.expectedCampusId && user.role !== "SYSTEM_ADMIN") {
    throw { status: 403, message: "CAMPUS_MISMATCH" };
  }
  const token = makeToken(user.id);
  return { accessToken: token, tokenType: "Bearer", userId: user.id, username: user.username, role: user.role, campusId: user.campusId, mustChangePassword: user.mustChangePassword };
}

function handleGetMe(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  return { userId: user.id, username: user.username, email: user.email, role: user.role, campusId: user.campusId, departmentId: user.departmentId, studentId: user.studentId };
}

function handleUpdateProfile(token: string | null, body: { email?: string }, db: Db) {
  const user = requireAuth(token, db);
  if (body.email) user.email = body.email;
  writeDb(db);
  return handleGetMe(token, db);
}

function handleChangePassword(token: string | null, body: { currentPassword: string; newPassword: string }, db: Db) {
  const user = requireAuth(token, db);
  if (user.password !== body.currentPassword) throw { status: 400, message: "Current password is incorrect." };
  user.password = body.newPassword;
  user.mustChangePassword = false;
  writeDb(db);
  return {};
}

// ── SHA-256 helper (sync for mock backend) ───────────────────────────────────
function sha256(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) { h = ((h << 5) - h + text.charCodeAt(i)) | 0; }
  return Math.abs(h).toString(16).padStart(16, "0");
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function nowPlusMs(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

// ── OTP Password Reset ──────────────────────────────────────────────────────
function handleRequestPasswordReset(body: { email: string; identifier?: string }, db: Db) {
  const email = (body.email ?? "").trim().toLowerCase();
  const identifier = (body.identifier ?? "").trim().toLowerCase();
  // Find user by email OR identifier (username/studentId)
  const user = db.users.find((u) => (u.email && u.email.toLowerCase() === email) || u.username.toLowerCase() === identifier || u.studentId === identifier);
  // Always return generic success to prevent enumeration
  if (!user) return { message: "If an account exists, a verification code was sent." };
  // Rate limiting: max 3 requests per user per 15 minutes
  const recentRequests = db.passwordResetTokens.filter((t) => t.userId === user.id && t.createdAt > new Date(Date.now() - 15 * 60 * 1000).toISOString());
  if (recentRequests.length >= 3) throw { status: 429, message: "Too many requests. Please try again in 15 minutes." };
  const otp = generateOtp();
  const tokenHash = sha256(otp);
  const tokenRecord: DbPasswordResetToken = {
    id: uid(), userId: user.id, email: user.email ?? email,
    tokenHash, expiresAt: nowPlusMs(60 * 60 * 1000), usedAt: null,
    createdAt: isoNow(), ipAddress: null,
  };
  db.passwordResetTokens.push(tokenRecord);
  writeDb(db);
  // In real backend, email would be sent here. In mock, we expose OTP in response for testing.
  return { message: "If an account exists, a verification code was sent.", _debug_otp: otp, recipientEmail: user.email ?? email };
}

function handleVerifyResetCode(body: { email: string; code: string }, db: Db) {
  const email = (body.email ?? "").trim().toLowerCase();
  const code = (body.code ?? "").trim();
  const tokenHash = sha256(code);
  const tokenRecord = db.passwordResetTokens.find((t) => t.email?.toLowerCase() === email && t.tokenHash === tokenHash && !t.usedAt && t.expiresAt > isoNow());
  if (!tokenRecord) throw { status: 400, message: "Invalid or expired verification code." };
  return { valid: true };
}

function handleResetPasswordComplete(body: { email: string; code: string; newPassword: string }, db: Db) {
  const email = (body.email ?? "").trim().toLowerCase();
  const code = (body.code ?? "").trim();
  const newPassword = body.newPassword ?? "";
  if (!newPassword || newPassword.length < 6) throw { status: 400, message: "Password must be at least 6 characters." };
  const tokenHash = sha256(code);
  const tokenRecord = db.passwordResetTokens.find((t) => t.email?.toLowerCase() === email && t.tokenHash === tokenHash && !t.usedAt && t.expiresAt > isoNow());
  if (!tokenRecord) throw { status: 400, message: "Invalid or expired verification code." };
  const user = db.users.find((u) => u.id === tokenRecord.userId);
  if (!user) throw { status: 404, message: "User not found." };
  user.password = newPassword;
  user.mustChangePassword = false;
  tokenRecord.usedAt = isoNow();
  writeDb(db);
  return { message: "Password reset successfully." };
}

// Student endpoints
function handleListStudentRequests(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: "No student profile found." };
  return db.requests.filter((r) => r.studentId === student.studentId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

function handleCreateStudentRequest(token: string | null, body: { semester: string; academicYearLabel: string; requestType: string }, db: Db) {
  const user = requireAuth(token, db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: "No student profile found." };
  const existing = db.requests.filter((r) => r.studentId === student.studentId && r.status !== "CLOSED" && r.status !== "CLEARED");
  if (existing.length > 0) throw { status: 400, message: "You already have an active clearance request." };

  const reqId = uid();
  const reqNum = "CLR-" + String(Math.floor(Math.random() * 90000) + 10000);
  const now = isoNow();

  // Cross-check: find ALL unpaid liabilities for this student recorded by any staff
  const unpaidLiabilities = db.liabilities.filter(
    (l) => l.studentId === student.studentId && !["PAID", "CLEARED", "WAIVED"].includes(l.status)
  );
  // Which office check-codes have open debts
  const flaggedCodes = new Set(unpaidLiabilities.map((l) => l.departmentCheckCode));

  const request: DbRequest = {
    id: reqId, requestNumber: reqNum, studentId: student.studentId,
    campusId: student.campusId, semester: body.semester,
    academicYearLabel: body.academicYearLabel, requestType: body.requestType,
    status: flaggedCodes.size > 0 ? "FLAGGED" : "PENDING",
    submittedAt: now
  };
  db.requests.push(request);

  // Create checks — immediately flag offices that have recorded unpaid liabilities
  for (const code of CHECK_CODES) {
    if (flaggedCodes.has(code)) {
      const offenceItems = unpaidLiabilities
        .filter((l) => l.departmentCheckCode === code)
        .map((l) => l.itemName + " (" + l.amount.toFixed(2) + " ETB)")
        .join(", ");
      db.checks.push({
        id: uid(), clearanceRequestId: reqId, checkCode: code,
        status: "FLAGGED",
        reviewedBy: null, reviewedAt: null,
        comment: "Unpaid liabilities on record: " + offenceItems + ". Resolve before clearance can be approved."
      });
    } else {
      db.checks.push({ id: uid(), clearanceRequestId: reqId, checkCode: code, status: "PENDING", reviewedBy: null, reviewedAt: null, comment: null });
    }
  }

  writeDb(db);
  return request;
}

function handleGetStudentStatus(token: string | null, requestId: string, db: Db) {
  const user = requireAuth(token, db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: "No student profile found." };
  const req = db.requests.find((r) => r.id === requestId && r.studentId === student.studentId);
  if (!req) throw { status: 404, message: "Clearance request not found." };
  return buildStatusPayload(req, student, db);
}

function handleListStudentInquiries(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  const student = studentForUser(user, db);
  if (!student) return [];
  return db.inquiries.filter((i) => i.studentId === student.studentId);
}

function handleCreateStudentInquiry(token: string | null, body: { clearanceRequestId: string; targetCheckCode: string; message: string }, db: Db) {
  const user = requireAuth(token, db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: "No student profile found." };
  const inquiry: DbInquiry = { id: uid(), clearanceRequestId: body.clearanceRequestId, studentId: student.studentId, campusId: student.campusId, targetCheckCode: body.targetCheckCode, message: body.message, response: null, status: "OPEN", respondedAt: null, createdAt: isoNow() };
  db.inquiries.push(inquiry);
  writeDb(db);
  return inquiry;
}

// Staff endpoints
function handleStaffQueue(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  const checkCode = ROLE_TO_CHECK[user.role];
  if (!checkCode) return [];
  const results = [];
  for (const check of db.checks) {
    if (check.checkCode !== checkCode) continue;
    if (check.status === "CLEARED") continue;
    const req = db.requests.find((r) => r.id === check.clearanceRequestId);
    if (!req || req.campusId !== user.campusId) continue;
    const student = db.students.find((s) => s.studentId === req.studentId);
    if (!student) continue;
    // Cross-check: student may have unpaid liabilities under this office across all requests
    const unpaidCount = db.liabilities.filter(
      (l) => l.studentId === req.studentId && l.departmentCheckCode === checkCode
        && !["PAID", "CLEARED", "WAIVED"].includes(l.status)
    ).length;
    // Surface as FLAGGED in the queue if there are unpaid liabilities even if check is PENDING
    const effectiveStatus = (check.status === "PENDING" && unpaidCount > 0) ? "FLAGGED" : check.status;
    results.push({ checkId: check.id, checkCode: check.checkCode, checkStatus: effectiveStatus, clearanceRequestId: req.id, requestNumber: req.requestNumber, requestType: req.requestType, requestStatus: req.status, studentId: student.studentId, studentName: student.firstName + " " + student.lastName, campusId: req.campusId, submittedAt: req.submittedAt, unpaidCount });
  }
  return results;
}

function handleStaffStudents(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  return db.students.filter((s) => s.campusId === user.campusId).map((s) => ({
    id: s.id, studentId: s.studentId, firstName: s.firstName, middleName: s.middleName, lastName: s.lastName, gender: s.gender, phone: s.phone, email: s.email, campusId: s.campusId, academicDepartmentId: s.academicDepartmentId, program: s.program, academicYear: s.academicYear, graduationYear: s.graduationYear, profileImageUrl: null, idCardImageUrl: null, status: s.status,
  }));
}

function handleStaffClearanceRequests(token: string | null, studentId: string, db: Db) {
  requireAuth(token, db);
  return db.requests.filter((r) => r.studentId === studentId);
}

function handleStaffGetClearance(token: string | null, studentId: string, requestId: string, db: Db) {
  requireAuth(token, db);
  const req = db.requests.find((r) => r.id === requestId && r.studentId === studentId);
  if (!req) throw { status: 404, message: "Request not found." };
  const student = db.students.find((s) => s.studentId === studentId);
  if (!student) throw { status: 404, message: "Student not found." };
  return buildStatusPayload(req, student, db);
}

function handleReviewCheck(token: string | null, checkId: string, body: { status: string; comment?: string }, db: Db) {
  const user = requireAuth(token, db);
  const check = db.checks.find((c) => c.id === checkId);
  if (!check) throw { status: 404, message: "Check not found." };
  check.status = body.status;
  check.comment = body.comment ?? null;
  check.reviewedBy = user.id;
  check.reviewedAt = isoNow();
  const req = db.requests.find((r) => r.id === check.clearanceRequestId);
  if (req) {
    const allChecks = db.checks.filter((c) => c.clearanceRequestId === req.id);
    req.status = computeRequestStatus(allChecks, db.liabilities.filter((l) => l.clearanceRequestId === req.id));
  }
  writeDb(db);
  return check;
}

function handleCreateLiability(token: string | null, body: { studentId: string; clearanceRequestId?: string; departmentCheckCode: string; itemName: string; category?: string; description?: string; amount: number; paymentRequired: boolean }, db: Db) {
  const user = requireAuth(token, db);
  const liability: DbLiability = { id: uid(), clearanceRequestId: body.clearanceRequestId ?? undefined, studentId: body.studentId, campusId: user.campusId ?? "", departmentCheckCode: body.departmentCheckCode, category: body.category ?? null, itemName: body.itemName, description: body.description ?? null, amount: body.amount, currency: "ETB", status: "PENDING", paymentRequired: body.paymentRequired };
  db.liabilities.push(liability);
  if (body.clearanceRequestId) {
    const check = db.checks.find((c) => c.clearanceRequestId === body.clearanceRequestId && c.checkCode === body.departmentCheckCode);
    if (check && check.status !== "CLEARED") {
      check.status = "AWAITING_FINANCE";
      check.comment = `Liability added: ${body.itemName} (${body.amount} ETB)`;
      check.reviewedBy = user.id;
      check.reviewedAt = isoNow();
      const req = db.requests.find((r) => r.id === body.clearanceRequestId);
      if (req) {
        const allChecks = db.checks.filter((c) => c.clearanceRequestId === req.id);
        req.status = computeRequestStatus(allChecks, db.liabilities.filter((l) => l.clearanceRequestId === req.id));
      }
    }
  }
  writeDb(db);
  return liability;
}

function handleQuickApproveCheck(token: string | null, checkId: string, db: Db) {
  const user = requireAuth(token, db);
  const check = db.checks.find((c) => c.id === checkId);
  if (!check) throw { status: 404, message: "Check not found." };
  // Block if student has ANY unpaid liabilities under this office across all requests
  const req = db.requests.find((r) => r.id === check.clearanceRequestId);
  const unpaid = db.liabilities.filter(
    (l) => l.studentId === (req?.studentId ?? "") && l.departmentCheckCode === check.checkCode
      && !["PAID", "CLEARED", "WAIVED"].includes(l.status)
  );
  if (unpaid.length > 0) throw { status: 400, message: "Cannot approve: student has " + unpaid.length + " unresolved liabilit" + (unpaid.length === 1 ? "y" : "ies") + " on record. Resolve all fines before approving." };
  check.status = "CLEARED";
  check.comment = "Approved via quick approval";
  check.reviewedBy = user.id;
  check.reviewedAt = isoNow();
  const req2 = db.requests.find((r) => r.id === check.clearanceRequestId);
  if (req2) {
    const allChecks = db.checks.filter((c) => c.clearanceRequestId === req2.id);
    req2.status = computeRequestStatus(allChecks, db.liabilities.filter((l) => l.clearanceRequestId === req2.id));
  }
  writeDb(db);
  return check;
}

function handleAllClearanceQueue(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  const checkCode = ROLE_TO_CHECK[user.role];
  if (!checkCode) return [];
  const results = [];
  for (const req of db.requests) {
    if (req.campusId !== user.campusId) continue;
    if (req.status === "CLOSED") continue;
    const check = db.checks.find((c) => c.clearanceRequestId === req.id && c.checkCode === checkCode);
    if (!check) continue;
    const student = db.students.find((s) => s.studentId === req.studentId);
    if (!student) continue;
    // Cross-check ALL unpaid liabilities for this student under this office (across all requests)
    const allStudentLiabilities = db.liabilities.filter(
      (l) => l.studentId === req.studentId && l.departmentCheckCode === checkCode
    );
    const unpaidLiabilities = allStudentLiabilities.filter(
      (l) => !["PAID", "CLEARED", "WAIVED"].includes(l.status)
    );
    const unpaidCount = unpaidLiabilities.length;
    const totalFines = unpaidLiabilities.reduce((s, l) => s + l.amount, 0);
    // isFlagged: check is flagged OR there are unpaid liabilities on record
    const isFlagged = check.status === "FLAGGED" || check.status === "FAILED" || unpaidCount > 0;
    results.push({
      checkId: check.id, checkCode: check.checkCode,
      checkStatus: isFlagged && check.status === "PENDING" ? "FLAGGED" : check.status,
      clearanceRequestId: req.id, requestNumber: req.requestNumber,
      requestStatus: req.status, submittedAt: req.submittedAt,
      studentId: student.studentId, studentName: student.firstName + " " + student.lastName,
      program: student.program ?? null, campusId: req.campusId,
      totalFines, unpaidCount, liabilityCount: allStudentLiabilities.length,
    });
  }
  return results.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

function handleStaffInquiries(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  const checkCode = ROLE_TO_CHECK[user.role];
  return db.inquiries.filter((i) => {
    if (checkCode && i.targetCheckCode !== checkCode) return false;
    const req = db.requests.find((r) => r.id === i.clearanceRequestId);
    return req?.campusId === user.campusId;
  });
}

function handleRespondInquiry(token: string | null, inquiryId: string, body: { response: string; status: string }, db: Db) {
  requireAuth(token, db);
  const inquiry = db.inquiries.find((i) => i.id === inquiryId);
  if (!inquiry) throw { status: 404, message: "Inquiry not found." };
  inquiry.response = body.response;
  inquiry.status = body.status;
  inquiry.respondedAt = isoNow();
  writeDb(db);
  return inquiry;
}

// Finance endpoints
function handleFinancePayments(token: string | null, clearanceRequestId: string, db: Db) {
  requireAuth(token, db);
  return db.payments.filter((p) => p.clearanceRequestId === clearanceRequestId);
}

function handleFlaggedStudents(token: string | null, campusId: string, db: Db) {
  const user = requireAuth(token, db);
  const targetCampus = campusId || user.campusId || "";
  const flaggedChecks = db.checks.filter((c) => c.status === "AWAITING_FINANCE");
  const result: Array<{
    checkId: string; checkCode: string; checkStatus: string;
    clearanceRequestId: string; requestNumber: string; requestType: string;
    requestStatus: string; studentId: string; studentName: string;
    campusId: string; submittedAt: string | null;
    liabilityItemName?: string; liabilityAmount?: number; liabilityCurrency?: string;
    liabilityDescription?: string; staffComment?: string;
  }> = [];
  for (const check of flaggedChecks) {
    const req = db.requests.find((r) => r.id === check.clearanceRequestId);
    if (!req) continue;
    if (targetCampus && req.campusId !== targetCampus) continue;
    const student = db.students.find((s) => s.studentId === req.studentId);
    const liability = db.liabilities.find((l) => l.clearanceRequestId === req.id && l.departmentCheckCode === check.checkCode);
    result.push({
      checkId: check.id,
      checkCode: check.checkCode,
      checkStatus: check.status,
      clearanceRequestId: req.id,
      requestNumber: req.requestNumber,
      requestType: req.requestType,
      requestStatus: req.status,
      studentId: req.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : req.studentId,
      campusId: req.campusId,
      submittedAt: req.submittedAt,
      liabilityItemName: liability?.itemName ?? undefined,
      liabilityAmount: liability?.amount ?? undefined,
      liabilityCurrency: liability?.currency ?? undefined,
      liabilityDescription: liability?.description ?? undefined,
      staffComment: check.comment ?? undefined,
    });
  }
  return result;
}

function handlePaymentHistory(token: string | null, campusId: string, db: Db) {
  const user = requireAuth(token, db);
  const targetCampus = campusId || user.campusId || "";
  const manual = db.payments.filter((p) => p.provider === "MANUAL" || p.provider === "STANDALONE");
  if (!targetCampus) return manual;
  return manual.filter((p) => {
    const req = db.requests.find((r) => r.id === p.clearanceRequestId);
    if (req) return req.campusId === targetCampus;
    const student = db.students.find((s) => s.studentId === p.studentId);
    return student?.campusId === targetCampus;
  });
}

function handleLookupPayment(token: string | null, ref: string, db: Db) {
  requireAuth(token, db);
  if (!ref) throw { status: 400, message: "ref is required" };
  const q = ref.trim().toUpperCase();
  const payment = db.payments.find(
    (p) => p.txRef.toUpperCase() === q || (p.receiptNumber ?? "").toUpperCase() === q
  );
  if (!payment) throw { status: 404, message: "No payment found for that reference." };
  const student = db.students.find((s) => s.studentId === payment.studentId);
  return {
    id: payment.id,
    txRef: payment.txRef,
    receiptNumber: payment.receiptNumber,
    providerReference: payment.providerReference,
    provider: payment.provider,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    verifiedAt: payment.verifiedAt,
    receiptIssuedAt: payment.receiptIssuedAt,
    departmentCheckCode: payment.departmentCheckCode,
    student: student
      ? {
          studentId: student.studentId,
          fullName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
          program: student.program ?? "—",
          academicYear: student.academicYear ?? "—",
          email: student.email ?? "—",
          campusId: student.campusId,
        }
      : null,
  };
}

function handleInitiateChapa(token: string | null, body: { clearanceRequestId: string; liabilityIds: string[] }, db: Db) {
  const user = requireAuth(token, db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: "Not a student." };
  const liabilities = db.liabilities.filter((l) => body.liabilityIds.includes(l.id));
  const total = liabilities.reduce((s, l) => s + l.amount, 0);
  const payment: DbPayment = { id: uid(), clearanceRequestId: body.clearanceRequestId, studentId: student.studentId, liabilityIds: body.liabilityIds, provider: "CHAPA", txRef: "TX-" + uid().slice(0, 8).toUpperCase(), providerReference: null, departmentCheckCode: liabilities[0]?.departmentCheckCode ?? null, amount: total, currency: "ETB", status: "PENDING", verifiedAt: null, receiptNumber: null, receiptSignature: null, receiptIssuedAt: null };
  db.payments.push(payment);
  writeDb(db);
  const returnUrl = window.location.href.split("?")[0];
  const studentName = encodeURIComponent([student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "));
  const sandboxUrl = window.location.origin
    + "/chapa-sandbox?tx_ref=" + encodeURIComponent(payment.txRef)
    + "&amount=" + total
    + "&currency=ETB"
    + "&name=" + studentName
    + "&return_url=" + encodeURIComponent(returnUrl);
  return { payment, checkoutUrl: sandboxUrl, callbackUrl: window.location.origin + "/api/v1/payments/chapa/callback", returnUrl };
}

function handleVerifyChapa(token: string | null, txRef: string, body: { status: string; providerReference?: string }, db: Db) {
  requireAuth(token, db);
  const payment = db.payments.find((p) => p.txRef === txRef);
  if (!payment) throw { status: 404, message: "Payment not found." };
  const success = body.status === "success" || body.status === "completed";
  payment.status = success ? "VERIFIED" : "FAILED";
  payment.providerReference = body.providerReference ?? "MOCK-" + uid().slice(0, 6).toUpperCase();
  payment.verifiedAt = success ? isoNow() : null;
  if (success) {
    for (const liabilityId of payment.liabilityIds) {
      const liability = db.liabilities.find((l) => l.id === liabilityId);
      if (liability) {
        liability.status = "PAID";
        const check = db.checks.find((c) => c.clearanceRequestId === payment.clearanceRequestId && c.checkCode === liability.departmentCheckCode);
        if (check && check.status === "AWAITING_FINANCE") check.status = "PAID_PENDING_DEPARTMENT_APPROVAL";
      }
    }
    const req = db.requests.find((r) => r.id === payment.clearanceRequestId);
    if (req) {
      const allChecks = db.checks.filter((c) => c.clearanceRequestId === req.id);
      req.status = computeRequestStatus(allChecks, db.liabilities.filter((l) => l.clearanceRequestId === req.id));
    }
  }
  writeDb(db);
  return payment;
}

function handleRecordManualPayment(token: string | null, body: { clearanceRequestId: string; studentId: string; liabilityIds: string[]; providerReference: string }, db: Db) {
  const user = requireAuth(token, db);
  const liabilities = db.liabilities.filter((l) => body.liabilityIds.includes(l.id));
  const total = liabilities.reduce((s, l) => s + l.amount, 0);
  const payment: DbPayment = { id: uid(), clearanceRequestId: body.clearanceRequestId, studentId: body.studentId, liabilityIds: body.liabilityIds, provider: "MANUAL", txRef: "MANUAL-" + uid().slice(0, 8).toUpperCase(), providerReference: body.providerReference, departmentCheckCode: liabilities[0]?.departmentCheckCode ?? null, amount: total, currency: "ETB", status: "VERIFIED", verifiedAt: isoNow(), receiptNumber: "RCP-" + uid().slice(0, 6).toUpperCase(), receiptSignature: null, receiptIssuedAt: isoNow() };
  db.payments.push(payment);
  for (const liabilityId of body.liabilityIds) {
    const liability = db.liabilities.find((l) => l.id === liabilityId);
    if (liability) {
      liability.status = "PAID";
      const check = db.checks.find((c) => c.clearanceRequestId === body.clearanceRequestId && c.checkCode === liability.departmentCheckCode);
      if (check && check.status === "AWAITING_FINANCE") check.status = "PAID_PENDING_DEPARTMENT_APPROVAL";
    }
  }
  const req = db.requests.find((r) => r.id === body.clearanceRequestId);
  if (req) {
    const allChecks = db.checks.filter((c) => c.clearanceRequestId === req.id);
    req.status = computeRequestStatus(allChecks, db.liabilities.filter((l) => l.clearanceRequestId === req.id));
  }
  writeDb(db);
  return payment;
}

function handleRecordStandalonePayment(token: string | null, body: { studentFullName: string; studentId: string; yearOfStudy: string; department: string; campusId: string; amountPaid: number; paymentDate: string; referenceNumber: string | null; liabilityId: string | null; clearanceRequestId: string | null; txId: string; receiptNumber: string; recordedBy: string }, db: Db) {
  const user = requireAuth(token, db);
  const payment: DbPayment = {
    id: uid(),
    clearanceRequestId: body.clearanceRequestId ?? "standalone",
    studentId: body.studentId,
    liabilityIds: body.liabilityId ? [body.liabilityId] : [],
    provider: "MANUAL",
    txRef: body.txId,
    providerReference: body.referenceNumber ?? null,
    departmentCheckCode: "FINANCE",
    amount: body.amountPaid,
    currency: "ETB",
    status: "VERIFIED",
    verifiedAt: new Date(body.paymentDate).toISOString(),
    receiptNumber: body.receiptNumber,
    receiptSignature: null,
    receiptIssuedAt: isoNow(),
  };
  db.payments.push(payment);
  if (body.liabilityId) {
    const liability = db.liabilities.find((l) => l.id === body.liabilityId);
    if (liability) {
      liability.status = "PAID";
      if (body.clearanceRequestId) {
        const check = db.checks.find((c) => c.clearanceRequestId === body.clearanceRequestId && c.checkCode === liability.departmentCheckCode);
        if (check && check.status === "AWAITING_FINANCE") check.status = "PAID_PENDING_DEPARTMENT_APPROVAL";
        const req = db.requests.find((r) => r.id === body.clearanceRequestId);
        if (req) {
          const allChecks = db.checks.filter((c) => c.clearanceRequestId === req.id);
          req.status = computeRequestStatus(allChecks, db.liabilities.filter((l) => l.clearanceRequestId === req.id));
        }
      }
    }
  }
  writeDb(db);
  return payment;
}

// Registrar endpoints
function handleRegistrarQueue(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  return db.requests.filter((r) => {
    if (r.campusId !== user.campusId) return false;
    const checks = db.checks.filter((c) => c.clearanceRequestId === r.id);
    return checks.length > 0 && checks.every((c) => c.status === "CLEARED");
  });
}

function handleRegistrarStatistics(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  const campusRequests = db.requests.filter((r) => r.campusId === user.campusId);
  const cleared = campusRequests.filter((r) => r.status === "CLEARED").length;
  const pending = campusRequests.filter((r) => r.status === "PENDING").length;
  const inReview = campusRequests.filter((r) => r.status === "IN_REVIEW").length;
  const flagged = campusRequests.filter((r) => r.status === "FLAGGED").length;
  const bottleneckMap: Record<string, number> = {};
  for (const req of campusRequests) {
    const checks = db.checks.filter((c) => c.clearanceRequestId === req.id && c.status !== "CLEARED");
    for (const check of checks) { bottleneckMap[check.checkCode] = (bottleneckMap[check.checkCode] ?? 0) + 1; }
  }
  const bottleneckEntries = Object.entries(bottleneckMap).sort((a, b) => b[1] - a[1]);
  return { total_requests: campusRequests.length, cleared_requests: cleared, clearance_percentage: campusRequests.length > 0 ? (cleared / campusRequests.length) * 100 : 0, most_common_bottleneck: bottleneckEntries[0]?.[0] ?? "—", bottleneck_count: bottleneckEntries[0]?.[1] ?? 0, pending_count: pending, in_review_count: inReview, flagged_count: flagged };
}

function handleAllStudentClearances(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  return db.requests.filter((r) => r.campusId === user.campusId).map((req) => {
    const student = db.students.find((s) => s.studentId === req.studentId);
    const checks = db.checks.filter((c) => c.clearanceRequestId === req.id);
    const cleared = checks.filter((c) => c.status === "CLEARED").length;
    const cert = db.certificates.find((c) => c.clearanceRequestId === req.id);
    return { request_id: req.id, request_number: req.requestNumber, student: { studentId: req.studentId, firstName: student?.firstName ?? "Unknown", lastName: student?.lastName ?? "", middleName: student?.middleName ?? null, program: student?.program ?? null }, status: req.status, submitted_at: req.submittedAt, progress_percentage: checks.length > 0 ? Math.round((cleared / checks.length) * 100) : 0, checks: checks.map((c) => ({ id: c.id, checkCode: c.checkCode, status: c.status })), has_certificate: cert != null };
  });
}

async function handleGenerateCertificate(token: string | null, requestId: string, db: Db) {
  const user = requireAuth(token, db);
  const req = db.requests.find((r) => r.id === requestId);
  if (!req) throw { status: 404, message: "Request not found." };
  const checks = db.checks.filter((c) => c.clearanceRequestId === requestId);
  if (!checks.every((c) => c.status === "CLEARED")) {
    throw { status: 400, message: "All departments must approve before generating a certificate." };
  }
  const existing = db.certificates.find((c) => c.clearanceRequestId === requestId);
  if (existing) return existing;
  const student = db.students.find((s) => s.studentId === req.studentId);
  const hash = btoa(requestId + req.studentId + isoNow()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
  const clearedDate = new Date().toLocaleDateString("en-ET", { year: "numeric", month: "long", day: "numeric" });
  const campusNames: Record<string, string> = { TEWODROS: "Atse Tewodros Campus", MARAKI: "Maraki Campus", FASIL: "Atse Fasil Campus" };
  const qrBase64 = await generateQrBase64({
    studentId: req.studentId,
    fullName: student ? `${student.firstName} ${student.lastName}` : req.studentId,
    program: student?.program ?? null,
    campus: campusNames[req.campusId] ?? req.campusId,
    clearedDate,
    requestNumber: req.requestNumber,
    hash,
  });
  const cert: DbCertificate = { id: uid(), clearanceRequestId: requestId, studentId: req.studentId, campusId: req.campusId, hash, signedPayload: JSON.stringify({ requestId, studentId: req.studentId, hash, generatedAt: isoNow() }), base64Qr: qrBase64, generatedAt: isoNow() };
  db.certificates.push(cert);
  req.status = "CLEARED";
  writeDb(db);
  return cert;
}

function handleSendCertificate(token: string | null, requestId: string, db: Db) {
  requireAuth(token, db);
  const cert = db.certificates.find((c) => c.clearanceRequestId === requestId);
  if (!cert) throw { status: 404, message: "Certificate not found. Generate it first." };
  return { message: "Certificate sent to student successfully.", certificateId: cert.id };
}

function handleCloseRequest(token: string | null, requestId: string, db: Db) {
  requireAuth(token, db);
  const req = db.requests.find((r) => r.id === requestId);
  if (!req) throw { status: 404, message: "Request not found." };
  req.status = "CLOSED";
  writeDb(db);
  return {};
}

function handleVerifyQr(token: string | null, body: { hash: string }, db: Db) {
  requireAuth(token, db);
  const cert = db.certificates.find((c) => c.hash === body.hash);
  if (!cert) return { valid: false, clearanceRequestId: "", studentId: "", message: "Invalid QR code. Certificate not found." };
  return { valid: true, clearanceRequestId: cert.clearanceRequestId, studentId: cert.studentId, message: "Certificate verified successfully. This is an authentic UGClear certificate." };
}

// Admin endpoints
function handleImportStudentsCsv(token: string | null, file: { name: string; text: string } | null, db: Db) {
  requireAuth(token, db);
  if (!file) return { totalRows: 0, importedCount: 0, failedCount: 0, errors: ["No file uploaded."] };
  const rows = file.text.split(/\r?\n/).map((r) => r.trim()).filter((r) => r.length > 0);
  if (rows.length < 2) return { totalRows: 0, importedCount: 0, failedCount: 0, errors: ["CSV is empty or missing data rows."] };
  const dataRows = rows.slice(1);
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const cols = dataRows[i].split(",");
    if (cols.length < 12) { failed++; errors.push(`Row ${i + 2}: insufficient columns`); continue; }
    const [studentId, firstName, middleName, lastName, gender, phone, email, campusId, academicDepartmentId, program, academicYear, graduationYear, password] = cols.map((c) => c.trim());
    if (!studentId || !firstName || !lastName) { failed++; errors.push(`Row ${i + 2}: missing required fields`); continue; }
    if (db.students.find((s) => s.studentId === studentId)) { failed++; errors.push(`Row ${i + 2}: Student ID ${studentId} already exists`); continue; }
    const student: DbStudent = {
      id: uid(), studentId, firstName, middleName: middleName || null, lastName,
      gender: gender || null, phone: phone || null, email: email || null,
      campusId: campusId || "TEWODROS",
      academicDepartmentId: academicDepartmentId || null,
      program: program || null,
      academicYear: academicYear ? parseInt(academicYear, 10) : null,
      graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
      profileImageUrl: null, hasProfileImage: false, status: "ACTIVE"
    };
    db.students.push(student);
    db.users.push({
      id: uid(), username: studentId, password: password || "student123",
      email: email || null, role: "STUDENT", campusId: student.campusId,
      departmentId: null, studentId, active: true, mustChangePassword: true
    });
    imported++;
  }
  writeDb(db);
  return { totalRows: dataRows.length, importedCount: imported, failedCount: failed, errors };
}

// ── Batch / Prospective Student endpoints ──────────────────────────────────

function generateStudentId(index: number, year: number): string {
  const seq = String(index).padStart(5, "0");
  const yy = String(year).slice(-2);
  return `UGR/${seq}/${yy}`;
}

function randomPassword(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function generatePassword(year: number): string {
  // Generate a password based on the academic year + random characters
  const yy = String(year).slice(-2);
  const random = randomPassword(4);
  return `${yy}${random}`;
}

function handleRegistrarUploadBatch(token: string | null, file: { name: string; text: string } | null, db: Db) {
  const user = requireAuth(token, db);
  if (!file) return { status: "error", message: "No file uploaded." };
  const rows = file.text.split(/\r?\n/).map((r) => r.trim()).filter((r) => r.length > 0);
  if (rows.length < 2) return { status: "error", message: "CSV is empty or missing data rows." };
  const headerCols = rows[0].split(",").map((c) => c.trim().toLowerCase());
  const idx = (name: string) => {
    const normalized = name.toLowerCase();
    const i = headerCols.findIndex((h) => h === normalized || h.replace(/_/g, "").replace(/\s+/g, "") === normalized.replace(/_/g, "").replace(/\s+/g, ""));
    return i >= 0 ? i : -1;
  };
  const idxFirst = idx("firstname");
  const idxFather = idx("fathername");
  const idxLast = idx("lastname");
  const idxGender = idx("gender");
  const idxAge = idx("age");
  const idxDept = idx("department");
  const idxEmail = idx("email");
  const idxYear = idx("academicyear");
  const idxCampus = idx("campus");
  if (idxFirst === -1 || idxLast === -1 || idxCampus === -1 || idxYear === -1) {
    return { status: "error", message: "CSV header must include firstName, lastName, academicYear, and campus. Optional: fatherName, gender, age, department, email." };
  }
  const dataRows = rows.slice(1);
  const batchId = uid();
  const batch: DbStudentBatch = {
    id: batchId,
    name: file.name.replace(/\.csv$/i, ""),
    campusId: user.campusId ?? "TEWODROS",
    submittedBy: user.username,
    submittedAt: isoNow(),
    status: "PENDING",
    importedAt: null,
    importedBy: null,
    importedCount: 0,
    studentCount: dataRows.length,
  };
  const prospective: DbProspectiveStudent[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const cols = dataRows[i].split(",").map((c) => c.trim());
    const firstName = cols[idxFirst] ?? "";
    const lastName = cols[idxLast] ?? "";
    if (!firstName || !lastName) continue;
    const academicYear = cols[idxYear] ? parseInt(cols[idxYear], 10) || null : null;
    const campusId = (cols[idxCampus] ?? "").toUpperCase().replace(/\s+/g, "").replace(/CAMPUS/g, "");
    const normalizedCampus = ["TEWODROS", "MARAKI", "FASIL"].includes(campusId) ? campusId : (user.campusId ?? "TEWODROS");
    prospective.push({
      id: uid(), batchId,
      firstName,
      fatherName: idxFather >= 0 ? (cols[idxFather] || null) : null,
      lastName,
      gender: idxGender >= 0 ? (cols[idxGender] || null) : null,
      age: idxAge >= 0 ? (parseInt(cols[idxAge], 10) || null) : null,
      email: idxEmail >= 0 ? (cols[idxEmail] || null) : null,
      department: idxDept >= 0 ? (cols[idxDept] || null) : null,
      academicYear,
      campusId: normalizedCampus,
    });
  }
  batch.studentCount = prospective.length;
  db.batches.push(batch);
  db.prospectiveStudents.push(...prospective);
  writeDb(db);
  return { status: "ok", batchId, studentCount: prospective.length, message: `${prospective.length} prospective students submitted.` };
}

function handleAdminGetBatches(token: string | null, _params: URLSearchParams, db: Db) {
  requireAuth(token, db);
  return db.batches
    .slice()
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((b) => ({
      id: b.id, name: b.name, campusId: b.campusId, submittedBy: b.submittedBy,
      submittedAt: b.submittedAt, status: b.status, studentCount: b.studentCount,
      importedAt: b.importedAt, importedBy: b.importedBy, importedCount: b.importedCount,
    }));
}

function handleAdminGetBatchDetail(token: string | null, batchId: string, db: Db) {
  requireAuth(token, db);
  const batch = db.batches.find((b) => b.id === batchId);
  if (!batch) throw { status: 404, message: "Batch not found." };
  const students = db.prospectiveStudents.filter((s) => s.batchId === batchId).map((s) => ({
    id: s.id, firstName: s.firstName, fatherName: s.fatherName, lastName: s.lastName,
    gender: s.gender, age: s.age, email: s.email, department: s.department,
    academicYear: s.academicYear, campusId: s.campusId,
  }));
  return {
    batch: {
      id: batch.id, name: batch.name, campusId: batch.campusId, submittedBy: batch.submittedBy,
      submittedAt: batch.submittedAt, status: batch.status, studentCount: batch.studentCount,
      importedAt: batch.importedAt, importedBy: batch.importedBy, importedCount: batch.importedCount,
    },
    students,
  };
}

function handleAdminImportBatch(token: string | null, batchId: string, db: Db) {
  const user = requireAuth(token, db);
  const batch = db.batches.find((b) => b.id === batchId);
  if (!batch) throw { status: 404, message: "Batch not found." };
  if (batch.status === "IMPORTED") throw { status: 400, message: "Batch already imported." };
  const prospectives = db.prospectiveStudents.filter((s) => s.batchId === batchId);
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];
  const nextIndex = db.students.length + 1;
  const generatedCredentials: Array<{ firstName: string; fatherName: string | null; lastName: string; studentId: string; password: string }> = [];
  for (let i = 0; i < prospectives.length; i++) {
    const p = prospectives[i];
    if (!p.firstName || !p.lastName) { failed++; errors.push(`Row ${i + 1}: missing first or last name`); continue; }
    const year = p.academicYear ?? new Date().getFullYear();
    const studentId = generateStudentId(nextIndex + i, year);
    if (db.students.find((s) => s.studentId === studentId)) { failed++; errors.push(`Row ${i + 1}: generated ID ${studentId} already exists`); continue; }
    const password = generatePassword(year);
    const student: DbStudent = {
      id: uid(), studentId, firstName: p.firstName, middleName: p.fatherName, lastName: p.lastName,
      gender: p.gender, phone: null, email: p.email, campusId: p.campusId,
      academicDepartmentId: p.department, program: null, academicYear: year,
      graduationYear: year + 4, profileImageUrl: null, hasProfileImage: false, status: "ACTIVE",
    };
    db.students.push(student);
    db.users.push({
      id: uid(), username: studentId, password,
      email: p.email, role: "STUDENT", campusId: p.campusId,
      departmentId: null, studentId, active: true, mustChangePassword: true,
    });
    generatedCredentials.push({ firstName: p.firstName, fatherName: p.fatherName, lastName: p.lastName, studentId, password });
    imported++;
  }
  batch.status = "IMPORTED";
  batch.importedAt = isoNow();
  batch.importedBy = user.username;
  batch.importedCount = imported;
  writeDb(db);
  return { batchId, totalRows: prospectives.length, importedCount: imported, failedCount: failed, errors, generatedCredentials };
}

function handleAdminStudents(token: string | null, db: Db) {
  requireAuth(token, db);
  return db.students.map((s) => ({ id: s.id, studentId: s.studentId, firstName: s.firstName, middleName: s.middleName, lastName: s.lastName, gender: s.gender, phone: s.phone, email: s.email, campusId: s.campusId, academicDepartmentId: s.academicDepartmentId, program: s.program, academicYear: s.academicYear, graduationYear: s.graduationYear, profileImageUrl: null, idCardImageUrl: null, status: s.status }));
}

function handleAdminCreateStudent(token: string | null, body: Partial<DbStudent>, db: Db) {
  requireAuth(token, db);
  if (db.students.find((s) => s.studentId === body.studentId)) throw { status: 400, message: "Student ID already exists." };
  const student: DbStudent = { id: uid(), studentId: body.studentId!, firstName: body.firstName!, middleName: body.middleName ?? null, lastName: body.lastName!, gender: body.gender ?? null, phone: body.phone ?? null, email: body.email ?? null, campusId: body.campusId!, academicDepartmentId: body.academicDepartmentId ?? null, program: body.program ?? null, academicYear: body.academicYear ?? null, graduationYear: body.graduationYear ?? null, profileImageUrl: null, hasProfileImage: false, status: "ACTIVE" };
  const password = (body as Record<string, string>)["temporaryPassword"] ?? "student123";
  db.students.push(student);
  db.users.push({ id: uid(), username: body.studentId!, password, email: body.email ?? null, role: "STUDENT", campusId: body.campusId!, departmentId: null, studentId: body.studentId!, active: true, mustChangePassword: true });
  writeDb(db);
  return student;
}

function handleAdminStaffUsers(token: string | null, db: Db) {
  requireAuth(token, db);
  return db.users.filter((u) => u.role !== "STUDENT").map((u) => ({ id: u.id, username: u.username, email: u.email, role: u.role, campusId: u.campusId, departmentId: u.departmentId, active: u.active, mustChangePassword: u.mustChangePassword }));
}

function handleAdminCreateStaff(token: string | null, body: { username: string; email?: string; role: string; campusId: string; temporaryPassword?: string }, db: Db) {
  requireAuth(token, db);
  if (db.users.find((u) => u.username === body.username)) throw { status: 400, message: "Username already exists." };
  const user: DbUser = { id: uid(), username: body.username, password: body.temporaryPassword ?? "staff123", email: body.email ?? null, role: body.role, campusId: body.campusId, departmentId: null, studentId: null, active: true, mustChangePassword: true };
  db.users.push(user);
  writeDb(db);
  return { id: user.id, username: user.username, email: user.email, role: user.role, campusId: user.campusId, departmentId: null, active: true, mustChangePassword: true };
}

// Messaging endpoints
function handleGetContacts(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  return db.users
    .filter((u) => {
      if (u.id === user.id) return false;
      if (!MESSAGEABLE_ROLES.includes(u.role)) return false;
      // Registrar can only message SYSTEM_ADMIN
      if (user.role === "MAIN_REGISTRAR") return u.role === "SYSTEM_ADMIN";
      // Non-admin, non-registrar staff cannot message the registrar
      if (user.role !== "SYSTEM_ADMIN" && u.role === "MAIN_REGISTRAR") return false;
      return u.campusId === user.campusId || user.role === "SYSTEM_ADMIN";
    })
    .map((u) => ({ id: u.id, username: u.username, role: u.role, campusId: u.campusId }));
}

function handleGetInbox(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  return db.messages
    .filter((m) => !m.deletedByRecipient && ((m.toUserId === user.id) || (m.isBroadcast && m.campusId === user.campusId && m.fromUserId !== user.id)))
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

function handleGetSent(token: string | null, db: Db) {
  const user = requireAuth(token, db);
  return db.messages
    .filter((m) => m.fromUserId === user.id && !m.deletedBySender)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

function handleSendMessage(token: string | null, body: { toUserId: string | null; subject: string; body: string; isBroadcast: boolean; attachments?: Array<{ name: string; type: string; size: number; data: string }> | null }, db: Db) {
  const user = requireAuth(token, db);
  let toUsername: string | null = null;
  if (body.toUserId) {
    const recipient = db.users.find((u) => u.id === body.toUserId);
    toUsername = recipient?.username ?? null;
  }
  const msg: DbMessage = { id: uid(), fromUserId: user.id, fromUsername: user.username, fromRole: user.role, toUserId: body.isBroadcast ? null : body.toUserId, toUsername: body.isBroadcast ? null : toUsername, campusId: user.campusId ?? "", subject: body.subject, body: body.body, sentAt: isoNow(), readAt: null, deletedBySender: false, deletedByRecipient: false, isBroadcast: body.isBroadcast, attachments: body.attachments ?? null };
  db.messages.push(msg);
  writeDb(db);
  return msg;
}

function handleMarkMessageRead(token: string | null, messageId: string, db: Db) {
  requireAuth(token, db);
  const msg = db.messages.find((m) => m.id === messageId);
  if (msg && !msg.readAt) { msg.readAt = isoNow(); writeDb(db); }
  return msg ?? {};
}

function handleDeleteMessage(token: string | null, messageId: string, body: { asSender: boolean }, db: Db) {
  const user = requireAuth(token, db);
  const msg = db.messages.find((m) => m.id === messageId);
  if (!msg) throw { status: 404, message: "Message not found." };
  if (body.asSender && msg.fromUserId === user.id) msg.deletedBySender = true;
  else msg.deletedByRecipient = true;
  writeDb(db);
  return {};
}

function handleDeleteMessagesBatch(token: string | null, body: { messageIds: string[]; asSender: boolean }, db: Db) {
  const user = requireAuth(token, db);
  for (const id of body.messageIds) {
    const msg = db.messages.find((m) => m.id === id);
    if (!msg) continue;
    if (body.asSender && msg.fromUserId === user.id) msg.deletedBySender = true;
    else msg.deletedByRecipient = true;
  }
  writeDb(db);
  return {};
}

// ── Route dispatcher ──────────────────────────────────────────────────────────

function parseJson(text: string) { try { return JSON.parse(text); } catch { return {}; } }

function getToken(headers: Headers): string | null {
  const auth = headers.get("Authorization") ?? headers.get("authorization");
  if (!auth) return null;
  return auth.replace(/^Bearer\s+/i, "");
}

async function dispatch(method: string, path: string, headers: Headers, bodyText: string, formDataFile?: { name: string; text: string } | null): Promise<{ status: number; body: unknown }> {
  const db = readDb();
  if (!db.initialized) {
    const seeded = seed(db);
    writeDb(seeded);
    return dispatch(method, path, headers, bodyText, formDataFile);
  }

  const body = parseJson(bodyText);
  const token = getToken(headers);
  const [pathOnly, queryString] = path.split("?");
  const params = new URLSearchParams(queryString ?? "");

  try {
    // ── Auth
    if (method === "POST" && pathOnly === "/auth/login") return { status: 200, body: handleLogin(body, db) };
    if (method === "GET" && pathOnly === "/auth/me") return { status: 200, body: handleGetMe(token, db) };
    if (method === "PUT" && pathOnly === "/auth/me/profile") return { status: 200, body: handleUpdateProfile(token, body, db) };
    if (method === "POST" && pathOnly === "/auth/change-password") { handleChangePassword(token, body, db); return { status: 204, body: null }; }
    if (method === "POST" && pathOnly === "/auth/request-password-reset") return { status: 200, body: handleRequestPasswordReset(body, db) };
    if (method === "POST" && pathOnly === "/auth/verify-reset-code") return { status: 200, body: handleVerifyResetCode(body, db) };
    if (method === "POST" && pathOnly === "/auth/reset-password-complete") return { status: 200, body: handleResetPasswordComplete(body, db) };

    // ── Student
    if (method === "GET" && pathOnly === "/students/me/clearance-requests") return { status: 200, body: handleListStudentRequests(token, db) };
    if (method === "POST" && pathOnly === "/students/me/clearance-requests") return { status: 200, body: handleCreateStudentRequest(token, body, db) };
    if (method === "GET" && /^\/students\/me\/clearance-requests\/[^/]+\/status$/.test(pathOnly)) {
      const requestId = pathOnly.split("/")[4];
      return { status: 200, body: handleGetStudentStatus(token, requestId, db) };
    }
    if (method === "GET" && /^\/students\/me\/clearance-requests\/[^/]+\/certificate$/.test(pathOnly)) {
      const requestId = pathOnly.split("/")[4];
      const cert = db.certificates.find((c) => c.clearanceRequestId === requestId);
      if (!cert) throw { status: 404, message: "Certificate not found." };
      return { status: 200, body: cert };
    }
    if (method === "GET" && pathOnly === "/students/me/inquiries") return { status: 200, body: handleListStudentInquiries(token, db) };
    if (method === "POST" && pathOnly === "/students/me/inquiries") return { status: 200, body: handleCreateStudentInquiry(token, body, db) };

    // ── Staff
    if (method === "GET" && pathOnly === "/staff/queue") return { status: 200, body: handleStaffQueue(token, db) };
    if (method === "GET" && pathOnly === "/staff/students") return { status: 200, body: handleStaffStudents(token, db) };
    if (method === "GET" && pathOnly === "/staff/clearance-requests") return { status: 200, body: handleStaffClearanceRequests(token, params.get("studentId") ?? "", db) };
    if (method === "GET" && pathOnly === "/staff/clearance") return { status: 200, body: handleStaffGetClearance(token, params.get("studentId") ?? "", params.get("clearanceRequestId") ?? "", db) };
    if (method === "PATCH" && /^\/staff\/checks\/[^/]+\/review$/.test(pathOnly)) {
      const checkId = pathOnly.split("/")[3];
      return { status: 200, body: handleReviewCheck(token, checkId, body, db) };
    }
    if (method === "POST" && pathOnly === "/staff/liabilities") return { status: 200, body: handleCreateLiability(token, body, db) };
    if (method === "GET" && pathOnly === "/staff/clearance-queue") return { status: 200, body: handleAllClearanceQueue(token, db) };
    if (method === "PATCH" && /^\/staff\/checks\/[^/]+\/quick-approve$/.test(pathOnly)) {
      const checkId = pathOnly.split("/")[3];
      return { status: 200, body: handleQuickApproveCheck(token, checkId, db) };
    }
    if (method === "GET" && pathOnly === "/staff/inquiries") return { status: 200, body: handleStaffInquiries(token, db) };
    if (method === "PATCH" && /^\/staff\/inquiries\/[^/]+\/respond$/.test(pathOnly)) {
      const inquiryId = pathOnly.split("/")[3];
      return { status: 200, body: handleRespondInquiry(token, inquiryId, body, db) };
    }

    // ── Finance
    if (method === "GET" && pathOnly === "/finance/payments") return { status: 200, body: handleFinancePayments(token, params.get("clearanceRequestId") ?? "", db) };
    if (method === "POST" && pathOnly === "/payments/chapa/initiate") return { status: 200, body: handleInitiateChapa(token, body, db) };
    if (method === "PATCH" && /^\/payments\/chapa\/verify\//.test(pathOnly)) {
      const txRef = decodeURIComponent(pathOnly.split("/").pop() ?? "");
      return { status: 200, body: handleVerifyChapa(token, txRef, body, db) };
    }
    if (method === "GET" && pathOnly === "/staff/flagged") return { status: 200, body: handleFlaggedStudents(token, params.get("campusId") ?? "", db) };
    if (method === "POST" && pathOnly === "/finance/payments/manual") return { status: 200, body: handleRecordManualPayment(token, body, db) };
    if (method === "POST" && pathOnly === "/finance/payments/record") return { status: 200, body: handleRecordStandalonePayment(token, body, db) };
    if (method === "GET" && pathOnly === "/finance/payments/history") return { status: 200, body: handlePaymentHistory(token, params.get("campusId") ?? "", db) };
    if (method === "GET" && pathOnly === "/finance/payments/lookup") return { status: 200, body: handleLookupPayment(token, params.get("ref") ?? "", db) };

    // ── Registrar
    if (method === "GET" && pathOnly === "/registrar/clearance-requests") return { status: 200, body: handleRegistrarQueue(token, db) };
    if (method === "GET" && pathOnly === "/registrar/clearance-requests/statistics") return { status: 200, body: handleRegistrarStatistics(token, db) };
    if (method === "GET" && pathOnly === "/registrar/clearance-requests/all-students") return { status: 200, body: handleAllStudentClearances(token, db) };
    if (method === "POST" && /^\/registrar\/clearance-requests\/[^/]+\/generate-certificate$/.test(pathOnly)) {
      const requestId = pathOnly.split("/")[3];
      return { status: 200, body: await handleGenerateCertificate(token, requestId, db) };
    }
    if (method === "POST" && /^\/registrar\/clearance-requests\/[^/]+\/send-certificate$/.test(pathOnly)) {
      const requestId = pathOnly.split("/")[3];
      return { status: 200, body: handleSendCertificate(token, requestId, db) };
    }
    if (method === "POST" && /^\/registrar\/clearance-requests\/[^/]+\/close$/.test(pathOnly)) {
      const requestId = pathOnly.split("/")[3];
      return { status: 200, body: handleCloseRequest(token, requestId, db) };
    }
    if (method === "POST" && pathOnly === "/registrar/qr/verify") return { status: 200, body: handleVerifyQr(token, body, db) };
    if (method === "POST" && pathOnly === "/registrar/student-batches") return { status: 200, body: handleRegistrarUploadBatch(token, formDataFile ?? null, db) };

    // ── Messaging
    if (method === "GET" && pathOnly === "/messages/contacts") return { status: 200, body: handleGetContacts(token, db) };
    if (method === "GET" && pathOnly === "/messages/inbox") return { status: 200, body: handleGetInbox(token, db) };
    if (method === "GET" && pathOnly === "/messages/sent") return { status: 200, body: handleGetSent(token, db) };
    if (method === "POST" && pathOnly === "/messages") return { status: 200, body: handleSendMessage(token, body, db) };
    if (method === "PATCH" && /^\/messages\/[^/]+\/read$/.test(pathOnly)) {
      const messageId = pathOnly.split("/")[2];
      return { status: 200, body: handleMarkMessageRead(token, messageId, db) };
    }
    if (method === "DELETE" && /^\/messages\/[^/]+$/.test(pathOnly)) {
      const messageId = pathOnly.split("/")[2];
      return { status: 200, body: handleDeleteMessage(token, messageId, body, db) };
    }
    if (method === "POST" && pathOnly === "/messages/delete-batch") return { status: 200, body: handleDeleteMessagesBatch(token, body, db) };

    // ── Admin
    if (method === "GET" && pathOnly === "/admin/students") return { status: 200, body: handleAdminStudents(token, db) };
    if (method === "POST" && pathOnly === "/admin/students") return { status: 200, body: handleAdminCreateStudent(token, body, db) };
    if (method === "PUT" && /^\/admin\/students\/[^/]+$/.test(pathOnly)) {
      const studentId = decodeURIComponent(pathOnly.split("/").pop() ?? "");
      const student = db.students.find((s) => s.studentId === studentId);
      if (!student) throw { status: 404, message: "Student not found." };
      Object.assign(student, body); writeDb(db); return { status: 200, body: student };
    }
    if (method === "PATCH" && /^\/admin\/students\/[^/]+\/activate$/.test(pathOnly)) {
      const studentId = decodeURIComponent(pathOnly.split("/")[3]);
      const student = db.students.find((s) => s.studentId === studentId);
      const user = db.users.find((u) => u.studentId === studentId);
      if (student) { student.status = body.active ? "ACTIVE" : "INACTIVE"; }
      if (user) { user.active = body.active; }
      if (student || user) { writeDb(db); }
      return { status: 200, body: student ?? null };
    }
    if (method === "PATCH" && /^\/admin\/students\/[^/]+\/reset-password$/.test(pathOnly)) {
      const studentId = decodeURIComponent(pathOnly.split("/")[3]);
      const user = db.users.find((u) => u.studentId === studentId);
      if (user) { user.password = body.newPassword; writeDb(db); }
      return { status: 204, body: null };
    }
    if (method === "DELETE" && /^\/admin\/students\/[^/]+$/.test(pathOnly)) {
      const studentId = decodeURIComponent(pathOnly.split("/").pop() ?? "");
      db.students = db.students.filter((s) => s.studentId !== studentId);
      db.users = db.users.filter((u) => u.studentId !== studentId);
      writeDb(db); return { status: 204, body: null };
    }
    if (method === "POST" && /^\/admin\/students\/[^/]+\/(profile|id-card)-image$/.test(pathOnly)) return { status: 200, body: {} };
    if (method === "GET" && pathOnly === "/admin/staff-users") return { status: 200, body: handleAdminStaffUsers(token, db) };
    if (method === "POST" && pathOnly === "/admin/staff-users") return { status: 200, body: handleAdminCreateStaff(token, body, db) };
    if (method === "PUT" && /^\/admin\/staff-users\/[^/]+$/.test(pathOnly)) {
      const userId = decodeURIComponent(pathOnly.split("/").pop() ?? "");
      const user = db.users.find((u) => u.id === userId);
      if (!user) throw { status: 404, message: "User not found." };
      Object.assign(user, body); writeDb(db); return { status: 200, body: user };
    }
    if (method === "PATCH" && /^\/admin\/staff-users\/[^/]+\/activate$/.test(pathOnly)) {
      const userId = decodeURIComponent(pathOnly.split("/")[3]);
      const user = db.users.find((u) => u.id === userId);
      if (user) { user.active = body.active; writeDb(db); }
      return { status: 200, body: user };
    }
    if (method === "PATCH" && /^\/admin\/staff-users\/[^/]+\/reset-password$/.test(pathOnly)) {
      const userId = decodeURIComponent(pathOnly.split("/")[3]);
      const user = db.users.find((u) => u.id === userId);
      if (user) { user.password = body.newPassword; writeDb(db); }
      return { status: 204, body: null };
    }
    if (method === "DELETE" && /^\/admin\/staff-users\/[^/]+$/.test(pathOnly)) {
      const userId = decodeURIComponent(pathOnly.split("/").pop() ?? "");
      db.users = db.users.filter((u) => u.id !== userId);
      writeDb(db); return { status: 204, body: null };
    }
    if (method === "POST" && pathOnly === "/admin/students/import") return { status: 200, body: handleImportStudentsCsv(token, formDataFile ?? null, db) };
    if (method === "GET" && pathOnly === "/admin/student-batches") return { status: 200, body: handleAdminGetBatches(token, params, db) };
    if (method === "GET" && /^\/admin\/student-batches\//.test(pathOnly) && !pathOnly.endsWith("/import")) {
      const batchId = pathOnly.split("/")[3];
      return { status: 200, body: handleAdminGetBatchDetail(token, batchId, db) };
    }
    if (method === "POST" && /^\/admin\/student-batches\/[^/]+\/import$/.test(pathOnly)) {
      const batchId = pathOnly.split("/")[3];
      return { status: 200, body: handleAdminImportBatch(token, batchId, db) };
    }

    // ── Campus / Departments
    if (method === "GET" && pathOnly === "/campuses") return { status: 200, body: [{ id: "TEWODROS", code: "TEWODROS", name: "Atse Tewodros Campus", active: true }, { id: "MARAKI", code: "MARAKI", name: "Maraki Campus", active: true }, { id: "FASIL", code: "FASIL", name: "Atse Fasil Campus", active: true }] };
    if (method === "GET" && pathOnly === "/departments") return { status: 200, body: db.departments.map((d) => ({ id: d.id, code: d.code, name: d.name, type: d.type, campusId: d.campusId, active: d.active })) };
    if (method === "POST" && pathOnly === "/departments") {
      const dept: DbDepartment = { id: uid(), code: body.code, name: body.name, type: body.type, campusId: body.campusId, active: body.active ?? true };
      db.departments.push(dept); writeDb(db);
      return { status: 200, body: { id: dept.id, code: dept.code, name: dept.name, type: dept.type, campusId: dept.campusId, active: dept.active } };
    }
    if (method === "PUT" && /^\/departments\/[^/]+$/.test(pathOnly)) {
      const deptId = pathOnly.split("/").pop() ?? "";
      const dept = db.departments.find((d) => d.id === deptId);
      if (dept) { Object.assign(dept, body); writeDb(db); return { status: 200, body: { id: dept.id, code: dept.code, name: dept.name, type: dept.type, campusId: dept.campusId, active: dept.active } }; }
      return { status: 404, body: { message: "Department not found" } };
    }
    if (method === "PATCH" && /^\/departments\/[^/]+\/toggle$/.test(pathOnly)) {
      const deptId = pathOnly.split("/")[2];
      const dept = db.departments.find((d) => d.id === deptId);
      if (dept) { dept.active = !dept.active; writeDb(db); return { status: 200, body: { id: dept.id, code: dept.code, name: dept.name, type: dept.type, campusId: dept.campusId, active: dept.active } }; }
      return { status: 404, body: { message: "Department not found" } };
    }
    if (method === "GET" && pathOnly === "/departments/assigned-staff") {
      const deptId = params.get("departmentId");
      const assigned = db.users.filter((u) => u.role !== "STUDENT" && u.departmentId === deptId).map((u) => ({ id: u.id, username: u.username, role: u.role }));
      return { status: 200, body: assigned };
    }
    if (method === "POST" && pathOnly === "/departments/assign-staff") {
      const user = db.users.find((u) => u.id === body.userId);
      if (user) { user.departmentId = body.departmentId; writeDb(db); return { status: 200, body: { id: user.id, username: user.username, role: user.role } }; }
      return { status: 404, body: { message: "User not found" } };
    }

    return { status: 404, body: { message: "Endpoint not found: " + method + " " + pathOnly } };
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e?.status) return { status: e.status, body: { message: e.message ?? "Error" } };
    console.error("[MockBackend]", err);
    return { status: 500, body: { message: "Internal mock backend error." } };
  }
}

// ── Fetch interceptor ─────────────────────────────────────────────────────────

const API_PREFIX = "/api/v1";

export function installMockBackend() {
  const realFetch = window.fetch.bind(window);

  window.fetch = async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    const urlObj = new URL(url, window.location.origin);
    const pathname = urlObj.pathname;

    if (!pathname.startsWith(API_PREFIX)) return realFetch(input, init);

    const apiPath = pathname.slice(API_PREFIX.length) + (urlObj.search ? urlObj.search : "");
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : {}));
    let bodyText = "";
    let formDataFile: { name: string; text: string } | null = null;
    if (init?.body) {
      if (typeof init.body === "string") bodyText = init.body;
      else if (init.body instanceof FormData) {
        for (const [, value] of init.body.entries()) {
          if (value instanceof File) {
            try {
              const text = await value.text();
              formDataFile = { name: value.name, text };
            } catch {/* */}
          }
        }
        bodyText = "{}";
      }
      else bodyText = String(init.body);
    } else if (input instanceof Request) {
      try { bodyText = await input.clone().text(); } catch {/* */}
    }

    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 60));

    const { status, body } = await dispatch(method, apiPath, headers, bodyText, formDataFile);
    const responseBody = body == null ? null : JSON.stringify(body);
    return new Response(responseBody, { status, headers: { "Content-Type": "application/json" } });
  };

  console.info("[UGClear] Mock backend active. Accounts — student1/student123 | librarian/staff123 | proctor/staff123 | cafe/staff123 | depthead/staff123 | dean/staff123 | finance/finance123 | registrar/reg123 | admin/admin123");
}
