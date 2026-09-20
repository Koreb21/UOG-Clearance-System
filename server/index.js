'use strict';

require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const QRCode = require('qrcode');
const multer = require('multer');
const { createHash } = require('crypto');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

// ── MongoDB ──────────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB  = process.env.MONGODB_DB  || 'ugclear';

let mongoClient;
let mongoDb;

async function initStore() {
  // Enable TLS only when requested via environment or when using mongodb+srv URIs
  const useTls = (process.env.MONGODB_TLS === 'true') || /^mongodb\+srv:\/\//i.test(MONGODB_URI);
  const tlsAllowInvalid = (process.env.MONGODB_TLS_ALLOW_INVALID === 'true');
  mongoClient = new MongoClient(MONGODB_URI, {
    tls: useTls,
    tlsAllowInvalidCertificates: tlsAllowInvalid,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  await mongoClient.connect();
  mongoDb = mongoClient.db(MONGODB_DB);
  const col = mongoDb.collection('app_store');
  const doc = await col.findOne({ _id: 'singleton' });
  if (!doc || !doc.data || !doc.data.initialized) {
    const db = seed(emptyDb());
    await writeDb(db);
    await syncCollections(db);
    console.log('[UGClear] MongoDB database seeded with initial data.');
  } else {
    await syncCollections(doc.data);
    console.log('[UGClear] MongoDB database loaded successfully.');
  }
  console.log(`[UGClear] Connected to MongoDB: ${MONGODB_DB}`);

  // Ensure persisted admin password matches the desired bootstrap password (helps when DB was seeded earlier)
  try {
    const desiredAdminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin@123';
    const current = await readDb();
    if (current && Array.isArray(current.users)) {
      const admin = current.users.find(u => u.username === 'admin');
      let updated = false;
      if (admin) {
        if (admin.password !== desiredAdminPassword) {
          admin.password = desiredAdminPassword;
          updated = true;
        }
      } else {
        // Create a minimal admin record if missing
        current.users.unshift({ id: 'u-admin', username: 'admin', password: desiredAdminPassword, role: 'SYSTEM_ADMIN', campusId: 'TEWODROS', email: 'admin@uog.edu.et', staffId: 'UGR/ADM/001', active: true, mustChangePassword: false });
        updated = true;
      }
      if (updated) {
        await writeDb(current);
        console.log('[UGClear] Admin account normalized to BOOTSTRAP_ADMIN_PASSWORD (value hidden).');
      }
    }
  } catch (e) {
    console.warn('[UGClear] Admin normalization skipped:', e && e.message ? e.message : e);
  }
}

function emptyDb() {
  return { users: [], students: [], requests: [], checks: [], liabilities: [], certificates: [], inquiries: [], payments: [], messages: [], departments: [], batches: [], prospectiveStudents: [], passwordResetTokens: [], initialized: false };
}

async function readDb() {
  const col = mongoDb.collection('app_store');
  const doc = await col.findOne({ _id: 'singleton' });
  if (!doc || !doc.data) { const db = seed(emptyDb()); await writeDb(db); return db; }
  const db = doc.data;
  if (!db.messages) db.messages = [];
  if (!db.passwordResetTokens) db.passwordResetTokens = [];
  if (!db.departments) db.departments = [];
  if (!db.batches) db.batches = [];
  if (!db.prospectiveStudents) db.prospectiveStudents = [];
  if (!db.certificates) db.certificates = [];
  if (!db.inquiries) db.inquiries = [];
  return db;
}

const ENTITY_COLLECTIONS = [
  'users', 'students', 'requests', 'checks', 'liabilities',
  'payments', 'certificates', 'departments', 'batches',
  'prospectiveStudents', 'messages', 'inquiries'
];

async function syncCollections(db) {
  await Promise.all(ENTITY_COLLECTIONS.map(async (key) => {
    const items = db[key];
    if (!Array.isArray(items)) return;
    const col = mongoDb.collection(key);
    await col.deleteMany({});
    if (items.length > 0) {
      const docs = items.map((item, i) => ({
        ...item,
        _seq: i,
        ...(item.password ? { password: '[hidden]' } : {}),
        ...(item.base64Qr ? { base64Qr: '[binary data]' } : {}),
      }));
      await col.insertMany(docs, { ordered: false });
    }
  }));
}

async function writeDb(db) {
  const col = mongoDb.collection('app_store');
  await col.replaceOne(
    { _id: 'singleton' },
    { _id: 'singleton', data: db, updated_at: new Date() },
    { upsert: true }
  );
  syncCollections(db).catch(err => console.error('[UGClear] syncCollections error:', err));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10); }
function isoNow() { return new Date().toISOString(); }
function sha256(str) { return createHash('sha256').update(str).digest('hex'); }
function generateOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }
function nowPlusMs(ms) { return new Date(Date.now() + ms).toISOString(); }

// ── Token helpers ─────────────────────────────────────────────────────────────

function makeToken(userId) {
  return 'mock_' + Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64');
}

function userFromToken(token, db) {
  try {
    if (!token || !token.startsWith('mock_')) return null;
    const { userId } = JSON.parse(Buffer.from(token.slice(5), 'base64').toString('utf8'));
    return db.users.find(u => u.id === userId) || null;
  } catch { return null; }
}

function extractToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// ── QR Code ───────────────────────────────────────────────────────────────────

async function generateQrBase64(data) {
  const text = [
    'UGClear — University of Gondar', 'OFFICIAL CLEARANCE CERTIFICATE', '',
    `Student: ${data.fullName}`, `ID: ${data.studentId}`, `Program: ${data.program || '—'}`,
    `Campus: ${data.campus}`, `Cleared: ${data.clearedDate}`, `Request: ${data.requestNumber}`,
    '', `Verify Hash: ${data.hash}`,
  ].join('\n');
  try {
    const dataUrl = await QRCode.toDataURL(text, { width: 400, margin: 2, color: { dark: '#001e40', light: '#ffffff' }, errorCorrectionLevel: 'M' });
    return dataUrl.replace('data:image/png;base64,', '');
  } catch {
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CLEARANCE_ORDER = ['DEPARTMENT_HEAD', 'LIBRARY', 'CAFE', 'PROCTOR', 'STUDENT_DEAN'];
const CHECK_CODES = ['DEPARTMENT_HEAD', 'LIBRARY', 'CAFE', 'PROCTOR', 'STUDENT_DEAN'];
const ROLE_TO_CHECK = { DEPARTMENT_HEAD: 'DEPARTMENT_HEAD', LIBRARIAN: 'LIBRARY', CAFE_STAFF: 'CAFE', PROCTOR: 'PROCTOR', STUDENT_DEAN: 'STUDENT_DEAN' };
const MESSAGEABLE_ROLES = ['LIBRARIAN', 'PROCTOR', 'CAFE_STAFF', 'DEPARTMENT_HEAD', 'STUDENT_DEAN', 'FINANCE_OFFICER', 'MAIN_REGISTRAR', 'SYSTEM_ADMIN'];

// ── Business logic helpers ────────────────────────────────────────────────────

function enforceApprovalOrder(checkCode, clearanceRequestId, db) {
  const idx = CLEARANCE_ORDER.indexOf(checkCode);
  if (idx < 0) return;
  const predecessors = CLEARANCE_ORDER.slice(0, idx);
  const allChecks = db.checks.filter(c => c.clearanceRequestId === clearanceRequestId);
  const blockedBy = predecessors.find(code => { const c = allChecks.find(x => x.checkCode === code); return !c || c.status !== 'CLEARED'; });
  if (blockedBy) throw { status: 400, message: `Clearance must be approved by ${blockedBy.replace(/_/g, ' ')} first.` };
}

function computeRequestStatus(checks) {
  if (checks.every(c => c.status === 'CLEARED')) return 'CLEARED';
  if (checks.some(c => c.status === 'FLAGGED' || c.status === 'FAILED')) return 'FLAGGED';
  if (checks.some(c => c.status === 'AWAITING_FINANCE')) return 'AWAITING_FINANCE';
  if (checks.some(c => c.status === 'IN_REVIEW')) return 'IN_REVIEW';
  return 'PENDING';
}

function buildStatusPayload(req, student, db) {
  const checks = db.checks.filter(c => c.clearanceRequestId === req.id);
  const liabilities = db.liabilities.filter(l => l.clearanceRequestId === req.id);
  const payments = db.payments.filter(p => p.clearanceRequestId === req.id);
  const certificate = db.certificates.find(c => c.clearanceRequestId === req.id) || null;
  return {
    request: { id: req.id, requestNumber: req.requestNumber, studentId: req.studentId, campusId: req.campusId, semester: req.semester, academicYearLabel: req.academicYearLabel, requestType: req.requestType, status: req.status, submittedAt: req.submittedAt },
    student: { studentId: student.studentId, firstName: student.firstName, middleName: student.middleName, lastName: student.lastName, gender: student.gender, phone: student.phone, email: student.email, campusId: student.campusId, academicDepartmentId: student.academicDepartmentId, program: student.program, academicYear: student.academicYear, graduationYear: student.graduationYear, hasProfileImage: false, profileImageUrl: null, hasIdCardImage: false, idCardImageUrl: null },
    checks, liabilities, payments, certificate,
  };
}

function requireAuth(token, db) {
  if (!token) throw { status: 401, message: 'Authentication required.' };
  const u = userFromToken(token, db);
  if (!u) throw { status: 401, message: 'Session expired. Please sign in again.' };
  if (!u.active) throw { status: 403, message: 'Account is deactivated.' };
  return u;
}

function studentForUser(user, db) {
  if (user.role !== 'STUDENT' || !user.studentId) return null;
  return db.students.find(s => s.studentId === user.studentId) || null;
}

// ── Role-based access control ─────────────────────────────────────────────────

const ROLES = {
  STUDENT:    ['STUDENT'],
  STAFF:      ['LIBRARIAN', 'PROCTOR', 'CAFE_STAFF', 'DEPARTMENT_HEAD', 'STUDENT_DEAN',
                'FINANCE_OFFICER', 'MAIN_REGISTRAR', 'SYSTEM_ADMIN'],
  FINANCE:    ['FINANCE_OFFICER', 'SYSTEM_ADMIN'],
  REGISTRAR:  ['MAIN_REGISTRAR', 'SYSTEM_ADMIN'],
  ADMIN:      ['SYSTEM_ADMIN'],
};

function requireRole(user, allowedRoles) {
  if (!allowedRoles.includes(user.role)) {
    throw { status: 403, message: `Access denied. Required role: ${allowedRoles.join(' or ')}.` };
  }
}

function guard(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const db = await readDb();
      const user = requireAuth(extractToken(req), db);
      requireRole(user, allowedRoles);
      next();
    } catch (e) {
      if (e && e.status) res.status(e.status).json({ message: e.message || 'Error' });
      else { console.error('[UGClear] guard error', e); res.status(500).json({ message: 'Internal server error.' }); }
    }
  };
}

// ── Seed data ─────────────────────────────────────────────────────────────────

function seed(db) {
  const T = 'TEWODROS', M = 'MARAKI', F = 'FASIL';
  const mu = o => ({ email: null, campusId: null, departmentId: null, studentId: null, staffId: null, active: true, mustChangePassword: false, ...o });
  const ms = o => ({ middleName: null, gender: null, phone: null, email: null, academicDepartmentId: null, program: null, academicYear: null, graduationYear: null, profileImageUrl: null, hasProfileImage: false, status: 'ACTIVE', ...o });

  db.users = [
    mu({ id: 'u-admin', username: 'admin', password: 'admin@123', role: 'SYSTEM_ADMIN', campusId: T, email: 'admin@uog.edu.et', staffId: 'UGR/ADM/001' }),
    mu({ id: 'u-s1', username: 'student1', password: 'student123', role: 'STUDENT', campusId: T, studentId: 'UGR/01234/15', email: 'abel.tesfaye@uog.edu.et' }),
    mu({ id: 'u-s2', username: 'student2', password: 'student123', role: 'STUDENT', campusId: T, studentId: 'UGR/01235/15', email: 'meron.haile@uog.edu.et' }),
    mu({ id: 'u-s3', username: 'student3', password: 'student123', role: 'STUDENT', campusId: M, studentId: 'UGR/01236/15', email: 'dawit.bekele@uog.edu.et' }),
    mu({ id: 'u-lib', username: 'librarian', password: 'staff123', role: 'LIBRARIAN', campusId: T, email: 'librarian@uog.edu.et', staffId: 'TEW/LIB/001' }),
    mu({ id: 'u-pro', username: 'proctor', password: 'staff123', role: 'PROCTOR', campusId: T, email: 'proctor@uog.edu.et', staffId: 'TEW/PRO/001' }),
    mu({ id: 'u-caf', username: 'cafe', password: 'staff123', role: 'CAFE_STAFF', campusId: T, email: 'cafe@uog.edu.et', staffId: 'TEW/CAF/001' }),
    mu({ id: 'u-dep', username: 'depthead', password: 'staff123', role: 'DEPARTMENT_HEAD', campusId: T, email: 'depthead@uog.edu.et', staffId: 'TEW/DPT/001' }),
    mu({ id: 'u-dea', username: 'dean', password: 'staff123', role: 'STUDENT_DEAN', campusId: T, email: 'dean@uog.edu.et', staffId: 'TEW/DEN/001' }),
    mu({ id: 'u-fin', username: 'finance', password: 'finance123', role: 'FINANCE_OFFICER', campusId: T, email: 'finance@uog.edu.et', staffId: 'TEW/FIN/001' }),
    mu({ id: 'u-reg', username: 'registrar', password: 'reg123', role: 'MAIN_REGISTRAR', campusId: T, email: 'registrar@uog.edu.et', staffId: 'TEW/REG/001' }),
    mu({ id: 'u-lib-m', username: 'librarian_m', password: 'staff123', role: 'LIBRARIAN', campusId: M, email: 'librarian.m@uog.edu.et', staffId: 'MAR/LIB/001' }),
    mu({ id: 'u-reg-m', username: 'registrar_m', password: 'reg123', role: 'MAIN_REGISTRAR', campusId: M, email: 'registrar.m@uog.edu.et', staffId: 'MAR/REG/001' }),
    mu({ id: 'u-pro-m', username: 'proctor_m', password: 'staff123', role: 'PROCTOR', campusId: M, email: 'proctor.m@uog.edu.et', staffId: 'MAR/PRO/001' }),
    mu({ id: 'u-caf-m', username: 'cafe_m', password: 'staff123', role: 'CAFE_STAFF', campusId: M, email: 'cafe.m@uog.edu.et', staffId: 'MAR/CAF/001' }),
    mu({ id: 'u-dep-m', username: 'depthead_m', password: 'staff123', role: 'DEPARTMENT_HEAD', campusId: M, email: 'depthead.m@uog.edu.et', staffId: 'MAR/DPT/001' }),
    mu({ id: 'u-dea-m', username: 'dean_m', password: 'staff123', role: 'STUDENT_DEAN', campusId: M, email: 'dean.m@uog.edu.et', staffId: 'MAR/DEN/001' }),
    mu({ id: 'u-fin-m', username: 'finance_m', password: 'finance123', role: 'FINANCE_OFFICER', campusId: M, email: 'finance.m@uog.edu.et', staffId: 'MAR/FIN/001' }),
    mu({ id: 'u-lib-f', username: 'librarian_f', password: 'staff123', role: 'LIBRARIAN', campusId: F, email: 'librarian.f@uog.edu.et', staffId: 'FAS/LIB/001' }),
    mu({ id: 'u-reg-f', username: 'registrar_f', password: 'reg123', role: 'MAIN_REGISTRAR', campusId: F, email: 'registrar.f@uog.edu.et', staffId: 'FAS/REG/001' }),
  ];

  db.students = [
    ms({ id: 'st-1', studentId: 'UGR/01234/15', firstName: 'Abel', lastName: 'Tesfaye', campusId: T, program: 'Computer Science', academicYear: 4, graduationYear: 2026, email: 'abel.tesfaye@uog.edu.et', gender: 'M' }),
    ms({ id: 'st-2', studentId: 'UGR/01235/15', firstName: 'Meron', lastName: 'Haile', campusId: T, program: 'Electrical Engineering', academicYear: 3, graduationYear: 2027, email: 'meron.haile@uog.edu.et', gender: 'F' }),
    ms({ id: 'st-3', studentId: 'UGR/01236/15', firstName: 'Dawit', lastName: 'Bekele', campusId: M, program: 'Law', academicYear: 4, graduationYear: 2026, email: 'dawit.bekele@uog.edu.et', gender: 'M' }),
  ];

  db.messages = [
    { id: uid(), fromUserId: 'u-reg', fromUsername: 'registrar', fromRole: 'MAIN_REGISTRAR', toUserId: null, toUsername: null, campusId: T, subject: 'Clearance Season Begins', body: 'Dear all staff, the clearance season for this semester has officially started. Please process student requests promptly and update your queue daily.', sentAt: new Date(Date.now() - 2 * 86400000).toISOString(), readAt: null, deletedBySender: false, deletedByRecipient: false, isBroadcast: true, attachments: null },
    { id: uid(), fromUserId: 'u-lib', fromUsername: 'librarian', fromRole: 'LIBRARIAN', toUserId: 'u-reg', toUsername: 'registrar', campusId: T, subject: 'Outstanding Book Returns', body: 'Hello Registrar, we have 3 students with outstanding book returns. I have flagged them in the system.', sentAt: new Date(Date.now() - 86400000).toISOString(), readAt: null, deletedBySender: false, deletedByRecipient: false, isBroadcast: false, attachments: null },
  ];

  db.requests = [
    { id: 'cr-1', requestNumber: 'CLR-2026-001', studentId: 'UGR/01234/15', campusId: T, semester: 'Second', academicYearLabel: '2025/26', requestType: 'GRADUATION', status: 'IN_REVIEW', submittedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: 'cr-2', requestNumber: 'CLR-2026-002', studentId: 'UGR/01235/15', campusId: T, semester: 'Second', academicYearLabel: '2025/26', requestType: 'SEMESTER', status: 'IN_REVIEW', submittedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  ];

  db.checks = [
    { id: 'chk-lib-1', clearanceRequestId: 'cr-1', checkCode: 'LIBRARY', status: 'AWAITING_FINANCE', reviewedBy: 'u-lib', reviewedAt: new Date(Date.now() - 4 * 86400000).toISOString(), comment: 'Outstanding book fee' },
    { id: 'chk-pro-1', clearanceRequestId: 'cr-1', checkCode: 'PROCTOR', status: 'CLEARED', reviewedBy: 'u-pro', reviewedAt: new Date(Date.now() - 4 * 86400000).toISOString(), comment: null },
    { id: 'chk-caf-1', clearanceRequestId: 'cr-1', checkCode: 'CAFE', status: 'AWAITING_FINANCE', reviewedBy: 'u-caf', reviewedAt: new Date(Date.now() - 2 * 86400000).toISOString(), comment: 'Unpaid cafeteria bill' },
    { id: 'chk-dep-1', clearanceRequestId: 'cr-1', checkCode: 'DEPARTMENT_HEAD', status: 'CLEARED', reviewedBy: 'u-dep', reviewedAt: new Date(Date.now() - 4 * 86400000).toISOString(), comment: null },
    { id: 'chk-dea-1', clearanceRequestId: 'cr-1', checkCode: 'STUDENT_DEAN', status: 'CLEARED', reviewedBy: 'u-dea', reviewedAt: new Date(Date.now() - 4 * 86400000).toISOString(), comment: null },
    { id: 'chk-lib-2', clearanceRequestId: 'cr-2', checkCode: 'LIBRARY', status: 'AWAITING_FINANCE', reviewedBy: 'u-lib', reviewedAt: new Date(Date.now() - 2 * 86400000).toISOString(), comment: 'Damaged book replacement fee' },
    { id: 'chk-pro-2', clearanceRequestId: 'cr-2', checkCode: 'PROCTOR', status: 'CLEARED', reviewedBy: 'u-pro', reviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(), comment: null },
    { id: 'chk-caf-2', clearanceRequestId: 'cr-2', checkCode: 'CAFE', status: 'CLEARED', reviewedBy: 'u-caf', reviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(), comment: null },
    { id: 'chk-dep-2', clearanceRequestId: 'cr-2', checkCode: 'DEPARTMENT_HEAD', status: 'CLEARED', reviewedBy: 'u-dep', reviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(), comment: null },
    { id: 'chk-dea-2', clearanceRequestId: 'cr-2', checkCode: 'STUDENT_DEAN', status: 'CLEARED', reviewedBy: 'u-dea', reviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(), comment: null },
  ];

  db.liabilities = [
    { id: 'liab-1', clearanceRequestId: 'cr-1', studentId: 'UGR/01234/15', campusId: T, departmentCheckCode: 'LIBRARY', category: 'Book Fee', itemName: 'Outstanding Book Return', description: 'Late return fee for database textbook', amount: 250, currency: 'ETB', status: 'PENDING', paymentRequired: true },
    { id: 'liab-2', clearanceRequestId: 'cr-1', studentId: 'UGR/01234/15', campusId: T, departmentCheckCode: 'CAFE', category: 'Cafeteria', itemName: 'Cafeteria Balance', description: 'Unpaid meal charges Feb 2026', amount: 480, currency: 'ETB', status: 'PENDING', paymentRequired: true },
    { id: 'liab-3', clearanceRequestId: 'cr-2', studentId: 'UGR/01235/15', campusId: T, departmentCheckCode: 'LIBRARY', category: 'Book Fee', itemName: 'Damaged Book Replacement', description: 'Physics lab manual replacement', amount: 350, currency: 'ETB', status: 'PENDING', paymentRequired: true },
  ];

  db.payments = [
    { id: 'pay-1', clearanceRequestId: 'cr-1', studentId: 'UGR/01234/15', liabilityIds: ['liab-1'], provider: 'MANUAL', txRef: 'TXN-AB12CD', providerReference: 'Bank Slip #8921', departmentCheckCode: 'LIBRARY', amount: 250, currency: 'ETB', status: 'VERIFIED', verifiedAt: new Date(Date.now() - 1 * 86400000).toISOString(), receiptNumber: 'RCP-XJ9K2M', receiptSignature: null, receiptIssuedAt: new Date(Date.now() - 1 * 86400000).toISOString() },
    { id: 'pay-2', clearanceRequestId: 'standalone', studentId: 'UGR/01235/15', liabilityIds: [], provider: 'MANUAL', txRef: 'TXN-EF34GH', providerReference: 'Cash payment', departmentCheckCode: 'FINANCE', amount: 1200, currency: 'ETB', status: 'VERIFIED', verifiedAt: new Date(Date.now() - 2 * 86400000).toISOString(), receiptNumber: 'RCP-PL7QRS', receiptSignature: null, receiptIssuedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'pay-3', clearanceRequestId: 'cr-2', studentId: 'UGR/01235/15', liabilityIds: ['liab-3'], provider: 'MANUAL', txRef: 'TXN-IJ56KL', providerReference: 'Bank Transfer #4451', departmentCheckCode: 'LIBRARY', amount: 350, currency: 'ETB', status: 'VERIFIED', verifiedAt: new Date(Date.now() - 0.5 * 86400000).toISOString(), receiptNumber: 'RCP-NM3WXY', receiptSignature: null, receiptIssuedAt: new Date(Date.now() - 0.5 * 86400000).toISOString() },
  ];

  db.departments = [
    { id: 'd-cs', code: 'CS', name: 'Computer Science', type: 'ACADEMIC', campusId: T, active: true },
    { id: 'd-ee', code: 'EE', name: 'Electrical Engineering', type: 'ACADEMIC', campusId: T, active: true },
    { id: 'd-law', code: 'LAW', name: 'Law', type: 'ACADEMIC', campusId: M, active: true },
    { id: 'd-lib', code: 'LIB', name: 'Library', type: 'CLEARANCE', campusId: T, active: true },
    { id: 'd-fin', code: 'FIN', name: 'Finance', type: 'CLEARANCE', campusId: T, active: true },
    { id: 'd-dor', code: 'DOR', name: 'Dormitory', type: 'CLEARANCE', campusId: T, active: true },
    { id: 'd-reg', code: 'REG', name: 'Registrar', type: 'CLEARANCE', campusId: T, active: true },
    { id: 'd-ict', code: 'ICT', name: 'ICT', type: 'CLEARANCE', campusId: T, active: true },
    { id: 'd-cafe', code: 'CAF', name: 'Cafeteria', type: 'CLEARANCE', campusId: T, active: true },
    { id: 'd-dean', code: 'DEAN', name: 'College Dean', type: 'CLEARANCE', campusId: T, active: true },
    { id: 'd-proc', code: 'PRO', name: 'Proctor', type: 'CLEARANCE', campusId: T, active: true },
  ];

  db.batches = [
    { id: 'batch-tew-1', name: 'Tewodros 2025 New Admits', campusId: T, submittedBy: 'registrar', submittedAt: isoNow(), status: 'PENDING', studentCount: 3, importedAt: null, importedBy: null, importedCount: 0 },
    { id: 'batch-mar-1', name: 'Maraki 2025 New Admits', campusId: M, submittedBy: 'registrar_m', submittedAt: isoNow(), status: 'PENDING', studentCount: 2, importedAt: null, importedBy: null, importedCount: 0 },
  ];

  db.prospectiveStudents = [
    { id: 'ps-1', batchId: 'batch-tew-1', firstName: 'Abebe', fatherName: 'Kebede', lastName: 'Tadesse', gender: 'MALE', age: 22, email: 'abebe.tadesse@uog.edu.et', department: 'Computer Science', academicYear: 2025, campusId: T },
    { id: 'ps-2', batchId: 'batch-tew-1', firstName: 'Meron', fatherName: 'Haile', lastName: 'Girma', gender: 'FEMALE', age: 21, email: 'meron.girma@uog.edu.et', department: 'Electrical Engineering', academicYear: 2025, campusId: T },
    { id: 'ps-3', batchId: 'batch-tew-1', firstName: 'Dawit', fatherName: 'Bekele', lastName: 'Molla', gender: 'MALE', age: 23, email: 'dawit.molla@uog.edu.et', department: 'Computer Science', academicYear: 2025, campusId: T },
    { id: 'ps-4', batchId: 'batch-mar-1', firstName: 'Selam', fatherName: 'Abebe', lastName: 'Negash', gender: 'FEMALE', age: 20, email: 'selam.negash@uog.edu.et', department: 'Law', academicYear: 2025, campusId: M },
    { id: 'ps-5', batchId: 'batch-mar-1', firstName: 'Yonas', fatherName: 'Tadesse', lastName: 'Worku', gender: 'MALE', age: 22, email: 'yonas.worku@uog.edu.et', department: 'Law', academicYear: 2025, campusId: M },
  ];

  db.initialized = true;
  return db;
}

// ── Express setup ─────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res); } catch (e) {
      if (e && e.status) res.status(e.status).json({ message: e.message || 'Error' });
      else { console.error('[UGClear]', e); res.status(500).json({ message: 'Internal server error.' }); }
    }
  };
}

const r = express.Router();

// ─── Role guards (applied before any route handler in each group) ─────────────

r.use('/student',    guard(...ROLES.STUDENT));
r.use('/students',   guard(...ROLES.STUDENT));
r.use('/staff',      guard(...ROLES.STAFF));
r.use('/finance',    guard(...ROLES.FINANCE));
r.use('/registrar',  guard(...ROLES.REGISTRAR));
r.use('/admin',      guard(...ROLES.ADMIN));
r.use('/departments', guard(...ROLES.STAFF));
r.use('/messages',   guard(...ROLES.STAFF));
r.use('/payments',   guard(...ROLES.STUDENT));

// ─── Auth ─────────────────────────────────────────────────────────────────────

r.post('/auth/login', wrap(async (req, res) => {
  const db = await readDb();
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) throw { status: 401, message: 'Invalid username or password.' };
  if (!user.active) throw { status: 403, message: 'Account is deactivated.' };
  res.json({ accessToken: makeToken(user.id), tokenType: 'Bearer', userId: user.id, username: user.username, role: user.role, campusId: user.campusId, mustChangePassword: user.mustChangePassword });
}));

r.get('/auth/me', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  res.json({ userId: user.id, username: user.username, email: user.email, role: user.role, campusId: user.campusId, departmentId: user.departmentId, studentId: user.studentId, staffId: user.staffId || null });
}));

r.put('/auth/me/profile', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  if (req.body.email) user.email = req.body.email;
  await writeDb(db);
  res.json({ userId: user.id, username: user.username, email: user.email, role: user.role, campusId: user.campusId, departmentId: user.departmentId, studentId: user.studentId, staffId: user.staffId || null });
}));

r.post('/auth/change-password', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  if (user.password !== req.body.currentPassword) throw { status: 400, message: 'Current password is incorrect.' };
  user.password = req.body.newPassword;
  user.mustChangePassword = false;
  await writeDb(db);
  res.json({});
}));

r.post('/auth/request-password-reset', wrap(async (req, res) => {
  const db = await readDb();
  const email = (req.body.email || '').trim().toLowerCase();
  const identifier = (req.body.identifier || '').trim().toLowerCase();
  const user = db.users.find(u => (u.email && u.email.toLowerCase() === email) || u.username.toLowerCase() === identifier || u.studentId === identifier);
  if (!user) { res.json({ message: 'If an account exists, a verification code was sent.' }); return; }
  const recent = db.passwordResetTokens.filter(t => t.userId === user.id && t.createdAt > new Date(Date.now() - 15 * 60000).toISOString());
  if (recent.length >= 3) throw { status: 429, message: 'Too many requests. Please try again in 15 minutes.' };
  const otp = generateOtp();
  db.passwordResetTokens.push({ id: uid(), userId: user.id, email: user.email || email, tokenHash: sha256(otp), expiresAt: nowPlusMs(3600000), usedAt: null, createdAt: isoNow(), ipAddress: null });
  await writeDb(db);
  res.json({ message: 'If an account exists, a verification code was sent.', _debug_otp: otp, recipientEmail: user.email || email });
}));

r.post('/auth/verify-reset-code', wrap(async (req, res) => {
  const db = await readDb();
  const email = (req.body.email || '').trim().toLowerCase();
  const code = (req.body.code || '').trim();
  const rec = db.passwordResetTokens.find(t => (t.email || '').toLowerCase() === email && t.tokenHash === sha256(code) && !t.usedAt && t.expiresAt > isoNow());
  if (!rec) throw { status: 400, message: 'Invalid or expired verification code.' };
  res.json({ valid: true });
}));

r.post('/auth/reset-password', wrap(async (req, res) => {
  const db = await readDb();
  const email = (req.body.email || '').trim().toLowerCase();
  const code = (req.body.code || '').trim();
  const newPassword = req.body.newPassword || '';
  if (!newPassword || newPassword.length < 6) throw { status: 400, message: 'Password must be at least 6 characters.' };
  const rec = db.passwordResetTokens.find(t => (t.email || '').toLowerCase() === email && t.tokenHash === sha256(code) && !t.usedAt && t.expiresAt > isoNow());
  if (!rec) throw { status: 400, message: 'Invalid or expired verification code.' };
  const user = db.users.find(u => u.id === rec.userId);
  if (!user) throw { status: 404, message: 'User not found.' };
  user.password = newPassword;
  user.mustChangePassword = false;
  rec.usedAt = isoNow();
  await writeDb(db);
  res.json({ message: 'Password reset successfully.' });
}));

r.post('/auth/reset-password-complete', wrap(async (req, res) => {
  const db = await readDb();
  const email = (req.body.email || '').trim().toLowerCase();
  const code = (req.body.code || '').trim();
  const newPassword = req.body.newPassword || '';
  if (!newPassword || newPassword.length < 6) throw { status: 400, message: 'Password must be at least 6 characters.' };
  const rec = db.passwordResetTokens.find(t => (t.email || '').toLowerCase() === email && t.tokenHash === sha256(code) && !t.usedAt && t.expiresAt > isoNow());
  if (!rec) throw { status: 400, message: 'Invalid or expired verification code.' };
  const user = db.users.find(u => u.id === rec.userId);
  if (!user) throw { status: 404, message: 'User not found.' };
  user.password = newPassword;
  user.mustChangePassword = false;
  rec.usedAt = isoNow();
  await writeDb(db);
  res.json({ message: 'Password reset successfully.' });
}));

// ─── Student ──────────────────────────────────────────────────────────────────

r.get('/student/clearance-requests', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: 'No student profile found.' };
  res.json(db.requests.filter(r => r.studentId === student.studentId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
}));

r.post('/student/clearance-requests', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: 'No student profile found.' };
  const existing = db.requests.filter(r => r.studentId === student.studentId && r.status !== 'CLOSED' && r.status !== 'CLEARED');
  if (existing.length > 0) throw { status: 400, message: 'You already have an active clearance request.' };
  const reqId = uid();
  const reqNum = 'CLR-' + String(Math.floor(Math.random() * 90000) + 10000);
  const unpaidLiab = db.liabilities.filter(l => l.studentId === student.studentId && !['PAID', 'CLEARED', 'WAIVED'].includes(l.status));
  const flaggedCodes = new Set(unpaidLiab.map(l => l.departmentCheckCode));
  const newReq = { id: reqId, requestNumber: reqNum, studentId: student.studentId, campusId: student.campusId, semester: req.body.semester, academicYearLabel: req.body.academicYearLabel, requestType: req.body.requestType, status: flaggedCodes.size > 0 ? 'FLAGGED' : 'PENDING', submittedAt: isoNow() };
  db.requests.push(newReq);
  for (const code of CHECK_CODES) {
    if (flaggedCodes.has(code)) {
      const items = unpaidLiab.filter(l => l.departmentCheckCode === code).map(l => l.itemName + ' (' + l.amount.toFixed(2) + ' ETB)').join(', ');
      db.checks.push({ id: uid(), clearanceRequestId: reqId, checkCode: code, status: 'FLAGGED', reviewedBy: null, reviewedAt: null, comment: 'Unpaid liabilities: ' + items });
    } else {
      db.checks.push({ id: uid(), clearanceRequestId: reqId, checkCode: code, status: 'PENDING', reviewedBy: null, reviewedAt: null, comment: null });
    }
  }
  await writeDb(db);
  res.json(newReq);
}));

r.get('/student/clearance-requests/:id/status', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: 'No student profile found.' };
  const cr = db.requests.find(r => r.id === req.params.id && r.studentId === student.studentId);
  if (!cr) throw { status: 404, message: 'Clearance request not found.' };
  res.json(buildStatusPayload(cr, student, db));
}));

r.get('/student/inquiries', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) { res.json([]); return; }
  res.json(db.inquiries.filter(i => i.studentId === student.studentId));
}));

r.post('/student/inquiries', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: 'No student profile found.' };
  const inq = { id: uid(), clearanceRequestId: req.body.clearanceRequestId, studentId: student.studentId, campusId: student.campusId, targetCheckCode: req.body.targetCheckCode, message: req.body.message, response: null, status: 'OPEN', respondedAt: null, createdAt: isoNow() };
  db.inquiries.push(inq);
  await writeDb(db);
  res.json(inq);
}));

r.post('/student/payments/initiate-chapa', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: 'Not a student.' };
  const liabilities = db.liabilities.filter(l => (req.body.liabilityIds || []).includes(l.id));
  const total = liabilities.reduce((s, l) => s + l.amount, 0);
  const payment = { id: uid(), clearanceRequestId: req.body.clearanceRequestId, studentId: student.studentId, liabilityIds: req.body.liabilityIds || [], provider: 'CHAPA', txRef: 'TX-' + uid().slice(0, 8).toUpperCase(), providerReference: null, departmentCheckCode: liabilities[0]?.departmentCheckCode || null, amount: total, currency: 'ETB', status: 'PENDING', verifiedAt: null, receiptNumber: null, receiptSignature: null, receiptIssuedAt: null };
  db.payments.push(payment);
  await writeDb(db);
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5000';
  const origin = `${proto}://${host}`;
  const sName = encodeURIComponent([student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '));
  res.json({ payment, checkoutUrl: `${origin}/chapa-sandbox?tx_ref=${encodeURIComponent(payment.txRef)}&amount=${total}&currency=ETB&name=${sName}&return_url=${encodeURIComponent(origin)}`, callbackUrl: `${origin}/api/v1/payments/chapa/callback`, returnUrl: origin });
}));

r.post('/student/payments/verify-chapa', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const { txRef, status, providerReference } = req.body;
  const payment = db.payments.find(p => p.txRef === txRef);
  if (!payment) throw { status: 404, message: 'Payment not found.' };
  const success = status === 'success' || status === 'completed';
  payment.status = success ? 'VERIFIED' : 'FAILED';
  payment.providerReference = providerReference || 'MOCK-' + uid().slice(0, 6).toUpperCase();
  payment.verifiedAt = success ? isoNow() : null;
  if (success) {
    for (const lid of payment.liabilityIds) {
      const liab = db.liabilities.find(l => l.id === lid);
      if (liab) { liab.status = 'PAID'; const chk = db.checks.find(c => c.clearanceRequestId === payment.clearanceRequestId && c.checkCode === liab.departmentCheckCode); if (chk && chk.status === 'AWAITING_FINANCE') chk.status = 'PAID_PENDING_DEPARTMENT_APPROVAL'; }
    }
    const cr = db.requests.find(r => r.id === payment.clearanceRequestId);
    if (cr) cr.status = computeRequestStatus(db.checks.filter(c => c.clearanceRequestId === cr.id));
  }
  await writeDb(db);
  res.json(payment);
}));

// ─── Staff ────────────────────────────────────────────────────────────────────

r.get('/staff/queue', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const checkCode = ROLE_TO_CHECK[user.role];
  if (!checkCode) { res.json([]); return; }
  const results = [];
  for (const chk of db.checks) {
    if (chk.checkCode !== checkCode || chk.status === 'CLEARED') continue;
    const cr = db.requests.find(r => r.id === chk.clearanceRequestId);
    if (!cr || cr.campusId !== user.campusId) continue;
    const st = db.students.find(s => s.studentId === cr.studentId);
    if (!st) continue;
    const unpaidCount = db.liabilities.filter(l => l.studentId === cr.studentId && l.departmentCheckCode === checkCode && !['PAID','CLEARED','WAIVED'].includes(l.status)).length;
    results.push({ checkId: chk.id, checkCode: chk.checkCode, checkStatus: chk.status === 'PENDING' && unpaidCount > 0 ? 'FLAGGED' : chk.status, clearanceRequestId: cr.id, requestNumber: cr.requestNumber, requestType: cr.requestType, requestStatus: cr.status, studentId: st.studentId, studentName: st.firstName + ' ' + st.lastName, campusId: cr.campusId, submittedAt: cr.submittedAt, unpaidCount });
  }
  res.json(results);
}));

r.get('/staff/students', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  res.json(db.students.filter(s => s.campusId === user.campusId).map(s => ({ id: s.id, studentId: s.studentId, firstName: s.firstName, middleName: s.middleName, lastName: s.lastName, gender: s.gender, phone: s.phone, email: s.email, campusId: s.campusId, academicDepartmentId: s.academicDepartmentId, program: s.program, academicYear: s.academicYear, graduationYear: s.graduationYear, profileImageUrl: null, idCardImageUrl: null, status: s.status })));
}));

r.get('/staff/students/:studentId/clearance-requests', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  res.json(db.requests.filter(r => r.studentId === req.params.studentId));
}));

r.get('/staff/students/:studentId/clearance-requests/:requestId', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const cr = db.requests.find(r => r.id === req.params.requestId && r.studentId === req.params.studentId);
  if (!cr) throw { status: 404, message: 'Request not found.' };
  const student = db.students.find(s => s.studentId === req.params.studentId);
  if (!student) throw { status: 404, message: 'Student not found.' };
  res.json(buildStatusPayload(cr, student, db));
}));

r.post('/staff/checks/:checkId/review', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const chk = db.checks.find(c => c.id === req.params.checkId);
  if (!chk) throw { status: 404, message: 'Check not found.' };
  if (req.body.status === 'CLEARED') enforceApprovalOrder(chk.checkCode, chk.clearanceRequestId, db);
  chk.status = req.body.status;
  chk.comment = req.body.comment || null;
  chk.reviewedBy = user.id;
  chk.reviewedAt = isoNow();
  const cr = db.requests.find(r => r.id === chk.clearanceRequestId);
  if (cr) cr.status = computeRequestStatus(db.checks.filter(c => c.clearanceRequestId === cr.id));
  await writeDb(db);
  res.json(chk);
}));

r.post('/staff/checks/:checkId/quick-approve', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const chk = db.checks.find(c => c.id === req.params.checkId);
  if (!chk) throw { status: 404, message: 'Check not found.' };
  chk.status = 'CLEARED';
  chk.comment = req.body.comment || null;
  chk.reviewedBy = user.id;
  chk.reviewedAt = isoNow();
  const cr = db.requests.find(r => r.id === chk.clearanceRequestId);
  if (cr) cr.status = computeRequestStatus(db.checks.filter(c => c.clearanceRequestId === cr.id));
  await writeDb(db);
  res.json(chk);
}));

r.post('/staff/liabilities', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const b = req.body;
  const liability = { id: uid(), clearanceRequestId: b.clearanceRequestId || undefined, studentId: b.studentId, campusId: user.campusId || '', departmentCheckCode: b.departmentCheckCode, category: b.category || null, itemName: b.itemName, description: b.description || null, amount: b.amount, currency: 'ETB', status: 'PENDING', paymentRequired: b.paymentRequired };
  db.liabilities.push(liability);
  if (b.clearanceRequestId) {
    const chk = db.checks.find(c => c.clearanceRequestId === b.clearanceRequestId && c.checkCode === b.departmentCheckCode);
    if (chk && chk.status !== 'CLEARED') { chk.status = 'AWAITING_FINANCE'; chk.comment = `Liability added: ${b.itemName} (${b.amount} ETB)`; chk.reviewedBy = user.id; chk.reviewedAt = isoNow(); const cr = db.requests.find(r => r.id === b.clearanceRequestId); if (cr) cr.status = computeRequestStatus(db.checks.filter(c => c.clearanceRequestId === cr.id)); }
  }
  await writeDb(db);
  res.json(liability);
}));

r.get('/staff/clearance-queue/all', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const checkCode = ROLE_TO_CHECK[user.role];
  if (!checkCode) { res.json([]); return; }
  const results = [];
  for (const cr of db.requests) {
    if (cr.campusId !== user.campusId || cr.status === 'CLOSED') continue;
    const chk = db.checks.find(c => c.clearanceRequestId === cr.id && c.checkCode === checkCode);
    if (!chk) continue;
    const st = db.students.find(s => s.studentId === cr.studentId);
    if (!st) continue;
    const allL = db.liabilities.filter(l => l.studentId === cr.studentId && l.departmentCheckCode === checkCode);
    const unpaidL = allL.filter(l => !['PAID','CLEARED','WAIVED'].includes(l.status));
    const isFlagged = chk.status === 'FLAGGED' || chk.status === 'FAILED' || unpaidL.length > 0;
    results.push({ checkId: chk.id, checkCode: chk.checkCode, checkStatus: isFlagged && chk.status === 'PENDING' ? 'FLAGGED' : chk.status, clearanceRequestId: cr.id, requestNumber: cr.requestNumber, requestStatus: cr.status, submittedAt: cr.submittedAt, studentId: st.studentId, studentName: st.firstName + ' ' + st.lastName, program: st.program || null, campusId: cr.campusId, totalFines: unpaidL.reduce((s, l) => s + l.amount, 0), unpaidCount: unpaidL.length, liabilityCount: allL.length });
  }
  res.json(results.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
}));

r.get('/staff/inquiries', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const checkCode = ROLE_TO_CHECK[user.role];
  res.json(db.inquiries.filter(i => { if (checkCode && i.targetCheckCode !== checkCode) return false; const cr = db.requests.find(r => r.id === i.clearanceRequestId); return cr?.campusId === user.campusId; }));
}));

r.post('/staff/inquiries/:id/respond', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const inq = db.inquiries.find(i => i.id === req.params.id);
  if (!inq) throw { status: 404, message: 'Inquiry not found.' };
  inq.response = req.body.response;
  inq.status = req.body.status;
  inq.respondedAt = isoNow();
  await writeDb(db);
  res.json(inq);
}));

// ─── Finance ──────────────────────────────────────────────────────────────────

r.get('/finance/payments', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  res.json(db.payments.filter(p => p.clearanceRequestId === req.query.clearanceRequestId));
}));

r.get('/finance/flagged-students', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const targetCampus = req.query.campusId || user.campusId || '';
  const targetStatuses = ['AWAITING_FINANCE', 'PAID_PENDING_DEPARTMENT_APPROVAL', 'FLAGGED'];
  const result = [];
  for (const chk of db.checks.filter(c => targetStatuses.includes(c.status))) {
    const cr = db.requests.find(r => r.id === chk.clearanceRequestId);
    if (!cr || (targetCampus && cr.campusId !== targetCampus)) continue;
    const st = db.students.find(s => s.studentId === cr.studentId);
    const liab = db.liabilities.find(l => l.clearanceRequestId === cr.id && l.departmentCheckCode === chk.checkCode);
    result.push({ checkId: chk.id, checkCode: chk.checkCode, checkStatus: chk.status, clearanceRequestId: cr.id, requestNumber: cr.requestNumber, requestType: cr.requestType, requestStatus: cr.status, studentId: cr.studentId, studentName: st ? `${st.firstName} ${st.lastName}` : cr.studentId, campusId: cr.campusId, submittedAt: cr.submittedAt, liabilityItemName: liab?.itemName, liabilityAmount: liab?.amount, liabilityCurrency: liab?.currency, liabilityDescription: liab?.description, staffComment: chk.comment });
  }
  res.json(result);
}));

r.post('/finance/payments/record', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const b = req.body;
  const liabs = db.liabilities.filter(l => (b.liabilityIds || []).includes(l.id));
  const total = liabs.reduce((s, l) => s + l.amount, 0);
  const payment = { id: uid(), clearanceRequestId: b.clearanceRequestId, studentId: b.studentId, liabilityIds: b.liabilityIds || [], provider: 'MANUAL', txRef: 'MANUAL-' + uid().slice(0, 8).toUpperCase(), providerReference: b.providerReference, departmentCheckCode: liabs[0]?.departmentCheckCode || null, amount: total, currency: 'ETB', status: 'VERIFIED', verifiedAt: isoNow(), receiptNumber: 'RCP-' + uid().slice(0, 6).toUpperCase(), receiptSignature: null, receiptIssuedAt: isoNow() };
  db.payments.push(payment);
  for (const lid of (b.liabilityIds || [])) { const l = db.liabilities.find(x => x.id === lid); if (l) { l.status = 'PAID'; const chk = db.checks.find(c => c.clearanceRequestId === b.clearanceRequestId && c.checkCode === l.departmentCheckCode); if (chk && chk.status === 'AWAITING_FINANCE') chk.status = 'PAID_PENDING_DEPARTMENT_APPROVAL'; } }
  const cr = db.requests.find(r => r.id === b.clearanceRequestId);
  if (cr) cr.status = computeRequestStatus(db.checks.filter(c => c.clearanceRequestId === cr.id));
  await writeDb(db);
  res.json(payment);
}));

r.post('/finance/payments/record-standalone', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const b = req.body;
  const payment = { id: uid(), clearanceRequestId: b.clearanceRequestId || 'standalone', studentId: b.studentId, liabilityIds: b.liabilityId ? [b.liabilityId] : [], provider: 'MANUAL', txRef: b.txId, providerReference: b.referenceNumber || null, departmentCheckCode: 'FINANCE', amount: b.amountPaid, currency: 'ETB', status: 'VERIFIED', verifiedAt: new Date(b.paymentDate).toISOString(), receiptNumber: b.receiptNumber, receiptSignature: null, receiptIssuedAt: isoNow() };
  db.payments.push(payment);
  if (b.liabilityId) { const l = db.liabilities.find(x => x.id === b.liabilityId); if (l) { l.status = 'PAID'; if (b.clearanceRequestId) { const chk = db.checks.find(c => c.clearanceRequestId === b.clearanceRequestId && c.checkCode === l.departmentCheckCode); if (chk && chk.status === 'AWAITING_FINANCE') chk.status = 'PAID_PENDING_DEPARTMENT_APPROVAL'; const cr = db.requests.find(r => r.id === b.clearanceRequestId); if (cr) cr.status = computeRequestStatus(db.checks.filter(c => c.clearanceRequestId === cr.id)); } } }
  await writeDb(db);
  res.json(payment);
}));

r.post('/finance/checks/:checkId/revoke-approval', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const chk = db.checks.find(c => c.id === req.params.checkId);
  if (!chk) throw { status: 404, message: 'Check not found.' };
  db.liabilities.filter(l => l.clearanceRequestId === chk.clearanceRequestId && l.departmentCheckCode === chk.checkCode && l.status === 'PAID' && l.paymentRequired).forEach(l => { l.status = 'PENDING'; });
  const reason = req.body.reason || '';
  chk.status = 'AWAITING_FINANCE';
  chk.comment = 'Finance has stopped clearance. Payment disputed.' + (reason ? ' Reason: ' + reason : '');
  chk.reviewedAt = isoNow();
  const cr = db.requests.find(r => r.id === chk.clearanceRequestId);
  if (cr) cr.status = 'IN_REVIEW';
  await writeDb(db);
  res.json(chk);
}));

r.get('/finance/payment-history', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const targetCampus = req.query.campusId || user.campusId || '';
  const manual = db.payments.filter(p => p.provider === 'MANUAL' || p.provider === 'STANDALONE');
  if (!targetCampus) { res.json(manual); return; }
  res.json(manual.filter(p => { const cr = db.requests.find(r => r.id === p.clearanceRequestId); if (cr) return cr.campusId === targetCampus; const st = db.students.find(s => s.studentId === p.studentId); return st?.campusId === targetCampus; }));
}));

r.get('/finance/payments/lookup', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const ref = (req.query.ref || '').trim().toUpperCase();
  if (!ref) throw { status: 400, message: 'ref is required' };
  const payment = db.payments.find(p => p.txRef.toUpperCase() === ref || (p.receiptNumber || '').toUpperCase() === ref || (p.providerReference || '').toUpperCase() === ref);
  if (!payment) throw { status: 404, message: 'No payment found for that reference.' };
  const st = db.students.find(s => s.studentId === payment.studentId);
  let checkId = null, checkStatus = null;
  if (payment.clearanceRequestId && payment.departmentCheckCode) { const chk = db.checks.find(c => c.clearanceRequestId === payment.clearanceRequestId && c.checkCode === payment.departmentCheckCode); if (chk) { checkId = chk.id; checkStatus = chk.status; } }
  res.json({ id: payment.id, txRef: payment.txRef, receiptNumber: payment.receiptNumber, providerReference: payment.providerReference, provider: payment.provider, amount: payment.amount, currency: payment.currency, status: payment.status === 'SUCCESS' ? 'VERIFIED' : payment.status, verifiedAt: payment.verifiedAt, receiptIssuedAt: payment.receiptIssuedAt, departmentCheckCode: payment.departmentCheckCode, clearanceRequestId: payment.clearanceRequestId || null, checkId, checkStatus, student: st ? { studentId: st.studentId, fullName: [st.firstName, st.middleName, st.lastName].filter(Boolean).join(' '), program: st.program || '—', academicYear: st.academicYear || '—', email: st.email || '—', campusId: st.campusId } : null });
}));

// ─── Registrar ────────────────────────────────────────────────────────────────

r.get('/registrar/queue', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  res.json(db.requests.filter(r => { if (r.campusId !== user.campusId) return false; const checks = db.checks.filter(c => c.clearanceRequestId === r.id); return checks.length > 0 && checks.every(c => c.status === 'CLEARED'); }));
}));

r.get('/registrar/statistics', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const campusReqs = db.requests.filter(r => r.campusId === user.campusId);
  const cleared = campusReqs.filter(r => r.status === 'CLEARED').length;
  const bm = {};
  campusReqs.forEach(r => { db.checks.filter(c => c.clearanceRequestId === r.id && c.status !== 'CLEARED').forEach(c => { bm[c.checkCode] = (bm[c.checkCode] || 0) + 1; }); });
  const be = Object.entries(bm).sort((a, b) => b[1] - a[1]);
  res.json({ total_requests: campusReqs.length, cleared_requests: cleared, clearance_percentage: campusReqs.length > 0 ? (cleared / campusReqs.length) * 100 : 0, most_common_bottleneck: be[0]?.[0] || '—', bottleneck_count: be[0]?.[1] || 0, pending_count: campusReqs.filter(r => r.status === 'PENDING').length, in_review_count: campusReqs.filter(r => r.status === 'IN_REVIEW').length, flagged_count: campusReqs.filter(r => r.status === 'FLAGGED').length });
}));

r.get('/registrar/all-clearances', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  res.json(db.requests.filter(r => r.campusId === user.campusId).map(cr => {
    const st = db.students.find(s => s.studentId === cr.studentId);
    const checks = db.checks.filter(c => c.clearanceRequestId === cr.id);
    const cleared = checks.filter(c => c.status === 'CLEARED').length;
    const cert = db.certificates.find(c => c.clearanceRequestId === cr.id);
    return { request_id: cr.id, request_number: cr.requestNumber, student: { studentId: cr.studentId, firstName: st?.firstName || 'Unknown', lastName: st?.lastName || '', middleName: st?.middleName || null, program: st?.program || null }, status: cr.status, submitted_at: cr.submittedAt, progress_percentage: checks.length > 0 ? Math.round((cleared / checks.length) * 100) : 0, checks: checks.map(c => ({ id: c.id, checkCode: c.checkCode, status: c.status })), has_certificate: cert != null };
  }));
}));

r.post('/registrar/clearances/:id/certificate', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const cr = db.requests.find(r => r.id === req.params.id);
  if (!cr) throw { status: 404, message: 'Request not found.' };
  const checks = db.checks.filter(c => c.clearanceRequestId === req.params.id);
  if (!checks.every(c => c.status === 'CLEARED')) throw { status: 400, message: 'All departments must approve before generating a certificate.' };
  const existing = db.certificates.find(c => c.clearanceRequestId === req.params.id);
  if (existing) { res.json(existing); return; }
  const st = db.students.find(s => s.studentId === cr.studentId);
  const hash = Buffer.from(req.params.id + cr.studentId + isoNow()).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
  const clearedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const campusNames = { TEWODROS: 'Atse Tewodros Campus', MARAKI: 'Maraki Campus', FASIL: 'Atse Fasil Campus' };
  const qrBase64 = await generateQrBase64({ studentId: cr.studentId, fullName: st ? `${st.firstName} ${st.lastName}` : cr.studentId, program: st?.program || null, campus: campusNames[cr.campusId] || cr.campusId, clearedDate, requestNumber: cr.requestNumber, hash });
  const cert = { id: uid(), clearanceRequestId: req.params.id, studentId: cr.studentId, campusId: cr.campusId, hash, signedPayload: JSON.stringify({ requestId: req.params.id, studentId: cr.studentId, hash, generatedAt: isoNow() }), base64Qr: qrBase64, generatedAt: isoNow() };
  db.certificates.push(cert);
  cr.status = 'CLEARED';
  await writeDb(db);
  res.json(cert);
}));

r.post('/registrar/clearances/:id/send-certificate', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const cert = db.certificates.find(c => c.clearanceRequestId === req.params.id);
  if (!cert) throw { status: 404, message: 'Certificate not found. Generate it first.' };
  res.json({ message: 'Certificate sent to student successfully.', certificateId: cert.id });
}));

r.post('/registrar/clearance-requests/:id/close', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const cr = db.requests.find(r => r.id === req.params.id);
  if (!cr) throw { status: 404, message: 'Request not found.' };
  cr.status = 'CLOSED';
  await writeDb(db);
  res.json({});
}));

r.post('/registrar/qr/verify', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const cert = db.certificates.find(c => c.hash === (req.body.hash || ''));
  if (!cert) { res.json({ valid: false, clearanceRequestId: '', studentId: '', message: 'Invalid QR code. Certificate not found.' }); return; }
  res.json({ valid: true, clearanceRequestId: cert.clearanceRequestId, studentId: cert.studentId, message: 'Certificate verified successfully. This is an authentic UGClear certificate.' });
}));

r.post('/registrar/student-batches', upload.single('file'), wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  if (!req.file) { res.json({ status: 'error', message: 'No file uploaded.' }); return; }
  const text = req.file.buffer.toString('utf8');
  const rows = text.split(/\r?\n/).map(r => r.trim()).filter(r => r.length > 0);
  if (rows.length < 2) { res.json({ status: 'error', message: 'CSV is empty or missing data rows.' }); return; }
  const hdr = rows[0].split(',').map(c => c.trim().toLowerCase());
  const idx = n => { const i = hdr.findIndex(h => h === n.toLowerCase() || h.replace(/[_ ]/g,'') === n.toLowerCase().replace(/[_ ]/g,'')); return i >= 0 ? i : -1; };
  const iF = idx('firstname'), iFa = idx('fathername'), iL = idx('lastname'), iG = idx('gender'), iA = idx('age'), iD = idx('department'), iE = idx('email'), iY = idx('academicyear'), iC = idx('campus');
  if (iF === -1 || iL === -1 || iC === -1 || iY === -1) { res.json({ status: 'error', message: 'CSV header must include firstName, lastName, academicYear, and campus.' }); return; }
  const dataRows = rows.slice(1);
  const batchId = uid();
  const batch = { id: batchId, name: (req.file.originalname || 'batch').replace(/\.csv$/i, ''), campusId: user.campusId || 'TEWODROS', submittedBy: user.username, submittedAt: isoNow(), status: 'PENDING', importedAt: null, importedBy: null, importedCount: 0, studentCount: dataRows.length };
  const prospective = [];
  for (const row of dataRows) {
    const cols = row.split(',').map(c => c.trim());
    const firstName = cols[iF] || '', lastName = cols[iL] || '';
    if (!firstName || !lastName) continue;
    const academicYear = cols[iY] ? parseInt(cols[iY], 10) || null : null;
    const campusRaw = (cols[iC] || '').toUpperCase().replace(/\s+/g,'').replace(/CAMPUS/g,'');
    const campusId = ['TEWODROS','MARAKI','FASIL'].includes(campusRaw) ? campusRaw : (user.campusId || 'TEWODROS');
    prospective.push({ id: uid(), batchId, firstName, fatherName: iFa >= 0 ? (cols[iFa] || null) : null, lastName, gender: iG >= 0 ? (cols[iG] || null) : null, age: iA >= 0 ? (parseInt(cols[iA], 10) || null) : null, email: iE >= 0 ? (cols[iE] || null) : null, department: iD >= 0 ? (cols[iD] || null) : null, academicYear, campusId });
  }
  batch.studentCount = prospective.length;
  db.batches.push(batch);
  db.prospectiveStudents.push(...prospective);
  await writeDb(db);
  res.json({ status: 'ok', batchId, studentCount: prospective.length, message: `${prospective.length} prospective students submitted.` });
}));

// ─── Admin ────────────────────────────────────────────────────────────────────

r.get('/admin/students', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  res.json(db.students.map(s => ({ id: s.id, studentId: s.studentId, firstName: s.firstName, middleName: s.middleName, lastName: s.lastName, gender: s.gender, phone: s.phone, email: s.email, campusId: s.campusId, academicDepartmentId: s.academicDepartmentId, program: s.program, academicYear: s.academicYear, graduationYear: s.graduationYear, profileImageUrl: null, idCardImageUrl: null, status: s.status })));
}));

r.post('/admin/students', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const b = req.body;
  if (db.students.find(s => s.studentId === b.studentId)) throw { status: 400, message: 'Student ID already exists.' };
  const student = { id: uid(), studentId: b.studentId, firstName: b.firstName, middleName: b.middleName || null, lastName: b.lastName, gender: b.gender || null, phone: b.phone || null, email: b.email || null, campusId: b.campusId, academicDepartmentId: b.academicDepartmentId || null, program: b.program || null, academicYear: b.academicYear || null, graduationYear: b.graduationYear || null, profileImageUrl: null, hasProfileImage: false, status: 'ACTIVE' };
  db.students.push(student);
  db.users.push({ id: uid(), username: b.studentId, password: b.temporaryPassword || 'student123', email: b.email || null, role: 'STUDENT', campusId: b.campusId, departmentId: null, studentId: b.studentId, staffId: null, active: true, mustChangePassword: true });
  await writeDb(db);
  res.json({ ...student, profileImageUrl: null, idCardImageUrl: null });
}));

r.put('/admin/students/:studentId', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const student = db.students.find(s => s.studentId === req.params.studentId);
  if (!student) throw { status: 404, message: 'Student not found.' };
  const b = req.body;
  Object.assign(student, { firstName: b.firstName ?? student.firstName, middleName: b.middleName ?? null, lastName: b.lastName ?? student.lastName, gender: b.gender ?? student.gender, phone: b.phone ?? student.phone, email: b.email ?? student.email, campusId: b.campusId ?? student.campusId, academicDepartmentId: b.academicDepartmentId ?? student.academicDepartmentId, program: b.program ?? student.program, academicYear: b.academicYear ?? student.academicYear, graduationYear: b.graduationYear ?? student.graduationYear });
  await writeDb(db);
  res.json({ ...student, profileImageUrl: null, idCardImageUrl: null });
}));

r.patch('/admin/students/:studentId/activate', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const student = db.students.find(s => s.studentId === req.params.studentId);
  if (!student) throw { status: 404, message: 'Student not found.' };
  student.status = req.body.active ? 'ACTIVE' : 'INACTIVE';
  const user = db.users.find(u => u.studentId === req.params.studentId);
  if (user) user.active = req.body.active;
  await writeDb(db);
  res.json({ ...student, profileImageUrl: null, idCardImageUrl: null });
}));

r.delete('/admin/students/:studentId', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  db.students = db.students.filter(s => s.studentId !== req.params.studentId);
  db.users = db.users.filter(u => u.studentId !== req.params.studentId);
  await writeDb(db);
  res.json({});
}));

r.patch('/admin/students/:studentId/reset-password', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const user = db.users.find(u => u.studentId === req.params.studentId);
  if (!user) throw { status: 404, message: 'User not found.' };
  user.password = req.body.newPassword;
  user.mustChangePassword = true;
  await writeDb(db);
  res.json({});
}));

r.post('/admin/students/import', upload.single('file'), wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  if (!req.file) { res.json({ totalRows: 0, importedCount: 0, failedCount: 0, errors: ['No file uploaded.'] }); return; }
  const text = req.file.buffer.toString('utf8');
  const rows = text.split(/\r?\n/).map(r => r.trim()).filter(r => r.length > 0);
  if (rows.length < 2) { res.json({ totalRows: 0, importedCount: 0, failedCount: 0, errors: ['CSV is empty.'] }); return; }
  const dataRows = rows.slice(1);
  let imported = 0, failed = 0;
  const errors = [];
  for (let i = 0; i < dataRows.length; i++) {
    const cols = dataRows[i].split(',');
    if (cols.length < 12) { failed++; errors.push(`Row ${i+2}: insufficient columns`); continue; }
    const [studentId, firstName, middleName, lastName, gender, phone, email, campusId, academicDepartmentId, program, academicYear, graduationYear, password] = cols.map(c => c.trim());
    if (!studentId || !firstName || !lastName) { failed++; errors.push(`Row ${i+2}: missing required fields`); continue; }
    if (db.students.find(s => s.studentId === studentId)) { failed++; errors.push(`Row ${i+2}: ID ${studentId} already exists`); continue; }
    db.students.push({ id: uid(), studentId, firstName, middleName: middleName || null, lastName, gender: gender || null, phone: phone || null, email: email || null, campusId: campusId || 'TEWODROS', academicDepartmentId: academicDepartmentId || null, program: program || null, academicYear: academicYear ? parseInt(academicYear, 10) : null, graduationYear: graduationYear ? parseInt(graduationYear, 10) : null, profileImageUrl: null, hasProfileImage: false, status: 'ACTIVE' });
    db.users.push({ id: uid(), username: studentId, password: password || 'student123', email: email || null, role: 'STUDENT', campusId: campusId || 'TEWODROS', departmentId: null, studentId, staffId: null, active: true, mustChangePassword: true });
    imported++;
  }
  await writeDb(db);
  res.json({ totalRows: dataRows.length, importedCount: imported, failedCount: failed, errors });
}));

r.post('/admin/students/:studentId/profile-image', upload.single('file'), (req, res) => res.json({ message: 'Image upload not supported.' }));
r.post('/admin/students/:studentId/id-card-image', upload.single('file'), (req, res) => res.json({ message: 'Image upload not supported.' }));

r.get('/admin/staff-users', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  res.json(db.users.filter(u => u.role !== 'STUDENT').map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, campusId: u.campusId, departmentId: u.departmentId, active: u.active, mustChangePassword: u.mustChangePassword })));
}));

r.post('/admin/staff-users', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const b = req.body;
  if (db.users.find(u => u.username === b.username)) throw { status: 400, message: 'Username already exists.' };
  const user = { id: uid(), username: b.username, password: b.temporaryPassword || 'staff123', email: b.email || null, role: b.role, campusId: b.campusId, departmentId: b.departmentId || null, studentId: null, staffId: null, active: true, mustChangePassword: true };
  db.users.push(user);
  await writeDb(db);
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, campusId: user.campusId, departmentId: user.departmentId, active: true, mustChangePassword: true });
}));

r.put('/admin/staff-users/:userId', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const user = db.users.find(u => u.id === req.params.userId);
  if (!user) throw { status: 404, message: 'User not found.' };
  const b = req.body;
  Object.assign(user, { username: b.username ?? user.username, email: b.email ?? user.email, role: b.role ?? user.role, campusId: b.campusId ?? user.campusId, departmentId: b.departmentId ?? user.departmentId });
  await writeDb(db);
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, campusId: user.campusId, departmentId: user.departmentId, active: user.active, mustChangePassword: user.mustChangePassword });
}));

r.patch('/admin/staff-users/:userId/activate', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const user = db.users.find(u => u.id === req.params.userId);
  if (!user) throw { status: 404, message: 'User not found.' };
  user.active = req.body.active;
  await writeDb(db);
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, campusId: user.campusId, departmentId: user.departmentId, active: user.active, mustChangePassword: user.mustChangePassword });
}));

r.delete('/admin/staff-users/:userId', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  db.users = db.users.filter(u => u.id !== req.params.userId);
  await writeDb(db);
  res.json({});
}));

r.patch('/admin/staff-users/:userId/reset-password', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const user = db.users.find(u => u.id === req.params.userId);
  if (!user) throw { status: 404, message: 'User not found.' };
  user.password = req.body.newPassword;
  user.mustChangePassword = true;
  await writeDb(db);
  res.json({});
}));

r.get('/admin/student-batches', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  res.json(db.batches.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map(b => ({ id: b.id, name: b.name, campusId: b.campusId, submittedBy: b.submittedBy, submittedAt: b.submittedAt, status: b.status, studentCount: b.studentCount, importedAt: b.importedAt, importedBy: b.importedBy, importedCount: b.importedCount })));
}));

r.get('/admin/student-batches/:batchId', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const batch = db.batches.find(b => b.id === req.params.batchId);
  if (!batch) throw { status: 404, message: 'Batch not found.' };
  const students = db.prospectiveStudents.filter(s => s.batchId === req.params.batchId).map(s => ({ id: s.id, firstName: s.firstName, fatherName: s.fatherName, lastName: s.lastName, gender: s.gender, age: s.age, email: s.email, department: s.department, academicYear: s.academicYear, campusId: s.campusId }));
  res.json({ batch: { id: batch.id, name: batch.name, campusId: batch.campusId, submittedBy: batch.submittedBy, submittedAt: batch.submittedAt, status: batch.status, studentCount: batch.studentCount, importedAt: batch.importedAt, importedBy: batch.importedBy, importedCount: batch.importedCount }, students });
}));

r.post('/admin/student-batches/:batchId/import', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const batch = db.batches.find(b => b.id === req.params.batchId);
  if (!batch) throw { status: 404, message: 'Batch not found.' };
  if (batch.status === 'IMPORTED') throw { status: 400, message: 'Batch already imported.' };
  const prospectives = db.prospectiveStudents.filter(s => s.batchId === req.params.batchId);
  let imported = 0, failed = 0;
  const errors = [], generatedCredentials = [];
  const nextIdx = db.students.length + 1;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < prospectives.length; i++) {
    const p = prospectives[i];
    if (!p.firstName || !p.lastName) { failed++; errors.push(`Row ${i+1}: missing name`); continue; }
    const year = p.academicYear || new Date().getFullYear();
    const studentId = `UGR/${String(nextIdx + i).padStart(5, '0')}/${String(year).slice(-2)}`;
    if (db.students.find(s => s.studentId === studentId)) { failed++; errors.push(`Row ${i+1}: ID ${studentId} already exists`); continue; }
    const password = String(year).slice(-2) + Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    db.students.push({ id: uid(), studentId, firstName: p.firstName, middleName: p.fatherName, lastName: p.lastName, gender: p.gender, phone: null, email: p.email, campusId: p.campusId, academicDepartmentId: p.department, program: null, academicYear: year, graduationYear: year + 4, profileImageUrl: null, hasProfileImage: false, status: 'ACTIVE' });
    db.users.push({ id: uid(), username: studentId, password, email: p.email, role: 'STUDENT', campusId: p.campusId, departmentId: null, studentId, staffId: null, active: true, mustChangePassword: true });
    generatedCredentials.push({ firstName: p.firstName, fatherName: p.fatherName, lastName: p.lastName, studentId, password });
    imported++;
  }
  batch.status = 'IMPORTED'; batch.importedAt = isoNow(); batch.importedBy = user.username; batch.importedCount = imported;
  await writeDb(db);
  res.json({ batchId: req.params.batchId, totalRows: prospectives.length, importedCount: imported, failedCount: failed, errors, generatedCredentials });
}));

// ─── Database Overview (MongoDB collections viewer) ────────────────────────────

r.get('/admin/db-overview', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const LABEL = {
    users: 'users', students: 'students', requests: 'clearanceRequests',
    checks: 'clearanceChecks', liabilities: 'liabilities', payments: 'payments',
    certificates: 'certificates', departments: 'departments', batches: 'studentBatches',
    prospectiveStudents: 'prospectiveStudents', messages: 'messages', inquiries: 'inquiries',
  };
  const entries = await Promise.all(
    ENTITY_COLLECTIONS.map(async (key) => {
      const col = mongoDb.collection(key);
      const [count, docs] = await Promise.all([
        col.countDocuments(),
        col.find({}, { projection: { _seq: 0 } }).limit(200).toArray(),
      ]);
      return [key, { name: LABEL[key] || key, count, data: docs }];
    })
  );
  const collections = Object.fromEntries(entries);
  res.json({
    database: MONGODB_DB,
    mongoUri: MONGODB_URI.replace(/:([^@]+)@/, ':***@'),
    totalCollections: ENTITY_COLLECTIONS.length,
    collections
  });
}));

// ─── Campuses & Departments ───────────────────────────────────────────────────

r.get('/campuses', (req, res) => res.json([
  { id: 'TEWODROS', name: 'Atse Tewodros Campus', code: 'TEWODROS' },
  { id: 'MARAKI', name: 'Maraki Campus', code: 'MARAKI' },
  { id: 'FASIL', name: 'Atse Fasil Campus', code: 'FASIL' },
]));

r.get('/departments', wrap(async (req, res) => {
  const db = await readDb();
  let depts = db.departments;
  if (req.query.campusId) depts = depts.filter(d => d.campusId === req.query.campusId);
  if (req.query.type) depts = depts.filter(d => d.type === req.query.type);
  res.json(depts.map(d => ({ id: d.id, code: d.code, name: d.name, type: d.type, campusId: d.campusId, active: d.active })));
}));

r.post('/departments', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const dept = { id: uid(), code: req.body.code, name: req.body.name, type: req.body.type, campusId: req.body.campusId, active: req.body.active !== false };
  db.departments.push(dept);
  await writeDb(db);
  res.json(dept);
}));

r.get('/departments/assigned-staff', wrap(async (req, res) => {
  const db = await readDb();
  const deptId = req.query.departmentId;
  res.json(db.users.filter(u => u.role !== 'STUDENT' && u.departmentId === deptId).map(u => ({ id: u.id, username: u.username, role: u.role })));
}));

r.post('/departments/assign-staff', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const user = db.users.find(u => u.id === req.body.userId);
  if (!user) throw { status: 404, message: 'User not found' };
  user.departmentId = req.body.departmentId;
  await writeDb(db);
  res.json({ id: user.id, username: user.username, role: user.role });
}));

r.put('/departments/:deptId', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const dept = db.departments.find(d => d.id === req.params.deptId);
  if (!dept) throw { status: 404, message: 'Department not found' };
  Object.assign(dept, req.body);
  await writeDb(db);
  res.json({ id: dept.id, code: dept.code, name: dept.name, type: dept.type, campusId: dept.campusId, active: dept.active });
}));

r.patch('/departments/:deptId/toggle', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const dept = db.departments.find(d => d.id === req.params.deptId);
  if (!dept) throw { status: 404, message: 'Department not found' };
  dept.active = !dept.active;
  await writeDb(db);
  res.json({ id: dept.id, code: dept.code, name: dept.name, type: dept.type, campusId: dept.campusId, active: dept.active });
}));

// ─── Messages ─────────────────────────────────────────────────────────────────

r.get('/messages/contacts', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  res.json(db.users.filter(u => {
    if (u.id === user.id || !MESSAGEABLE_ROLES.includes(u.role)) return false;
    if (user.role === 'MAIN_REGISTRAR') return u.role === 'SYSTEM_ADMIN';
    if (user.role !== 'SYSTEM_ADMIN' && u.role === 'MAIN_REGISTRAR') return false;
    return u.campusId === user.campusId || user.role === 'SYSTEM_ADMIN';
  }).map(u => ({ id: u.id, username: u.username, role: u.role, campusId: u.campusId })));
}));

r.get('/messages/inbox', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  res.json(db.messages.filter(m => !m.deletedByRecipient && ((m.toUserId === user.id) || (m.isBroadcast && m.campusId === user.campusId && m.fromUserId !== user.id))).sort((a, b) => b.sentAt.localeCompare(a.sentAt)));
}));

r.get('/messages/sent', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  res.json(db.messages.filter(m => m.fromUserId === user.id && !m.deletedBySender).sort((a, b) => b.sentAt.localeCompare(a.sentAt)));
}));

r.post('/messages', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const b = req.body;
  const isBroadcast = !!b.isBroadcast;
  const toUser = !isBroadcast ? db.users.find(u => u.id === b.toUserId) : null;
  const msg = { id: uid(), fromUserId: user.id, fromUsername: user.username, fromRole: user.role, toUserId: isBroadcast ? null : (b.toUserId || null), toUsername: isBroadcast ? null : (toUser?.username || null), campusId: user.campusId || '', subject: b.subject, body: b.body, sentAt: isoNow(), readAt: null, deletedBySender: false, deletedByRecipient: false, isBroadcast, attachments: b.attachments || null };
  db.messages.push(msg);
  await writeDb(db);
  res.json(msg);
}));

r.patch('/messages/:msgId/read', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const msg = db.messages.find(m => m.id === req.params.msgId);
  if (msg) msg.readAt = isoNow();
  await writeDb(db);
  res.json({});
}));

r.delete('/messages/:msgId', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const msg = db.messages.find(m => m.id === req.params.msgId);
  if (msg) { if (msg.fromUserId === user.id) msg.deletedBySender = true; else msg.deletedByRecipient = true; }
  await writeDb(db);
  res.json({});
}));

r.post('/messages/delete-batch', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  for (const id of (req.body.ids || [])) { const msg = db.messages.find(m => m.id === id); if (msg) { if (msg.fromUserId === user.id) msg.deletedBySender = true; else msg.deletedByRecipient = true; } }
  await writeDb(db);
  res.json({});
}));

// ─── Payments scan ────────────────────────────────────────────────────────────

r.post('/payments/scan', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const cert = db.certificates.find(c => c.hash === (req.body.hash || ''));
  if (!cert) { res.json({ valid: false, message: 'Certificate not found.' }); return; }
  res.json({ valid: true, clearanceRequestId: cert.clearanceRequestId, studentId: cert.studentId });
}));

// ─── Route aliases (match web/mobile api.ts paths) ────────────────────────────

// Student routes: /students/me/... → /student/...
r.get('/students/me/clearance-requests', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: 'No student profile found.' };
  res.json(db.requests.filter(rq => rq.studentId === student.studentId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
}));

r.post('/students/me/clearance-requests', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: 'No student profile found.' };
  const existing = db.requests.filter(rq => rq.studentId === student.studentId && rq.status !== 'CLOSED' && rq.status !== 'CLEARED');
  if (existing.length > 0) throw { status: 400, message: 'You already have an active clearance request.' };
  const reqId = uid();
  const reqNum = 'CLR-' + String(Math.floor(Math.random() * 90000) + 10000);
  const unpaidLiab = db.liabilities.filter(l => l.studentId === student.studentId && !['PAID', 'CLEARED', 'WAIVED'].includes(l.status));
  const flaggedCodes = new Set(unpaidLiab.map(l => l.departmentCheckCode));
  const newReq = { id: reqId, requestNumber: reqNum, studentId: student.studentId, campusId: student.campusId, semester: req.body.semester, academicYearLabel: req.body.academicYearLabel, requestType: req.body.requestType, status: flaggedCodes.size > 0 ? 'FLAGGED' : 'PENDING', submittedAt: isoNow() };
  db.requests.push(newReq);
  for (const code of CHECK_CODES) {
    if (flaggedCodes.has(code)) {
      const items = unpaidLiab.filter(l => l.departmentCheckCode === code).map(l => l.itemName + ' (' + l.amount.toFixed(2) + ' ETB)').join(', ');
      db.checks.push({ id: uid(), clearanceRequestId: reqId, checkCode: code, status: 'FLAGGED', reviewedBy: null, reviewedAt: null, comment: 'Unpaid liabilities: ' + items });
    } else {
      db.checks.push({ id: uid(), clearanceRequestId: reqId, checkCode: code, status: 'PENDING', reviewedBy: null, reviewedAt: null, comment: null });
    }
  }
  await writeDb(db);
  res.json(newReq);
}));

r.get('/students/me/clearance-requests/:id/status', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: 'No student profile found.' };
  const cr = db.requests.find(rq => rq.id === req.params.id && rq.studentId === student.studentId);
  if (!cr) throw { status: 404, message: 'Clearance request not found.' };
  res.json(buildStatusPayload(cr, student, db));
}));

r.get('/students/me/inquiries', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) { res.json([]); return; }
  res.json(db.inquiries.filter(i => i.studentId === student.studentId));
}));

r.post('/students/me/inquiries', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: 'No student profile found.' };
  const inq = { id: uid(), clearanceRequestId: req.body.clearanceRequestId, studentId: student.studentId, campusId: student.campusId, targetCheckCode: req.body.targetCheckCode, message: req.body.message, response: null, status: 'OPEN', respondedAt: null, createdAt: isoNow() };
  db.inquiries.push(inq);
  await writeDb(db);
  res.json(inq);
}));

// Payment aliases
r.post('/payments/chapa/initiate', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const student = studentForUser(user, db);
  if (!student) throw { status: 403, message: 'Not a student.' };
  const liabilities = db.liabilities.filter(l => (req.body.liabilityIds || []).includes(l.id));
  const total = liabilities.reduce((s, l) => s + l.amount, 0);
  const payment = { id: uid(), clearanceRequestId: req.body.clearanceRequestId, studentId: student.studentId, liabilityIds: req.body.liabilityIds || [], provider: 'CHAPA', txRef: 'TX-' + uid().slice(0, 8).toUpperCase(), providerReference: null, departmentCheckCode: liabilities[0]?.departmentCheckCode || null, amount: total, currency: 'ETB', status: 'PENDING', verifiedAt: null, receiptNumber: null, receiptSignature: null, receiptIssuedAt: null };
  db.payments.push(payment);
  await writeDb(db);
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5000';
  const origin = `${proto}://${host}`;
  const sName = encodeURIComponent([student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '));
  res.json({ payment, checkoutUrl: `${origin}/chapa-sandbox?tx_ref=${encodeURIComponent(payment.txRef)}&amount=${total}&currency=ETB&name=${sName}&return_url=${encodeURIComponent(origin)}`, callbackUrl: `${origin}/api/v1/payments/chapa/callback`, returnUrl: origin });
}));

r.patch('/payments/chapa/verify/:txRef', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const txRef = req.params.txRef;
  const payment = db.payments.find(p => p.txRef === txRef);
  if (!payment) throw { status: 404, message: 'Payment not found.' };
  const { status, providerReference } = req.body;
  const success = status === 'success' || status === 'completed' || status === 'SUCCESS';
  payment.status = success ? 'VERIFIED' : 'FAILED';
  payment.providerReference = providerReference || 'MOCK-' + uid().slice(0, 6).toUpperCase();
  payment.verifiedAt = success ? isoNow() : null;
  if (success) {
    for (const lid of payment.liabilityIds) {
      const liab = db.liabilities.find(l => l.id === lid);
      if (liab) { liab.status = 'PAID'; const chk = db.checks.find(c => c.clearanceRequestId === payment.clearanceRequestId && c.checkCode === liab.departmentCheckCode); if (chk && chk.status === 'AWAITING_FINANCE') chk.status = 'PAID_PENDING_DEPARTMENT_APPROVAL'; }
    }
    const cr = db.requests.find(rq => rq.id === payment.clearanceRequestId);
    if (cr) cr.status = computeRequestStatus(db.checks.filter(c => c.clearanceRequestId === cr.id));
  }
  await writeDb(db);
  res.json(payment);
}));

// Finance aliases
r.get('/finance/payments/history', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const targetCampus = req.query.campusId || user.campusId || '';
  const manual = db.payments.filter(p => p.provider === 'MANUAL' || p.provider === 'STANDALONE');
  if (!targetCampus) { res.json(manual); return; }
  res.json(manual.filter(p => { const cr = db.requests.find(rq => rq.id === p.clearanceRequestId); if (cr) return cr.campusId === targetCampus; const st = db.students.find(s => s.studentId === p.studentId); return st?.campusId === targetCampus; }));
}));

r.post('/finance/payments/manual', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const b = req.body;
  const liabs = db.liabilities.filter(l => (b.liabilityIds || []).includes(l.id));
  const total = liabs.reduce((s, l) => s + l.amount, 0);
  const payment = { id: uid(), clearanceRequestId: b.clearanceRequestId, studentId: b.studentId, liabilityIds: b.liabilityIds || [], provider: 'MANUAL', txRef: 'MANUAL-' + uid().slice(0, 8).toUpperCase(), providerReference: b.providerReference, departmentCheckCode: liabs[0]?.departmentCheckCode || null, amount: total, currency: 'ETB', status: 'VERIFIED', verifiedAt: isoNow(), receiptNumber: 'RCP-' + uid().slice(0, 6).toUpperCase(), receiptSignature: null, receiptIssuedAt: isoNow() };
  db.payments.push(payment);
  for (const lid of (b.liabilityIds || [])) { const l = db.liabilities.find(x => x.id === lid); if (l) { l.status = 'PAID'; const chk = db.checks.find(c => c.clearanceRequestId === b.clearanceRequestId && c.checkCode === l.departmentCheckCode); if (chk && chk.status === 'AWAITING_FINANCE') chk.status = 'PAID_PENDING_DEPARTMENT_APPROVAL'; } }
  const cr = db.requests.find(rq => rq.id === b.clearanceRequestId);
  if (cr) cr.status = computeRequestStatus(db.checks.filter(c => c.clearanceRequestId === cr.id));
  await writeDb(db);
  res.json(payment);
}));

// Staff aliases
r.get('/staff/clearance-requests', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const { studentId } = req.query;
  if (!studentId) { res.json([]); return; }
  res.json(db.requests.filter(rq => rq.studentId === studentId));
}));

r.get('/staff/clearance', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const { studentId, clearanceRequestId } = req.query;
  if (!studentId || !clearanceRequestId) throw { status: 400, message: 'studentId and clearanceRequestId are required.' };
  const cr = db.requests.find(rq => rq.id === clearanceRequestId && rq.studentId === studentId);
  if (!cr) throw { status: 404, message: 'Request not found.' };
  const student = db.students.find(s => s.studentId === studentId);
  if (!student) throw { status: 404, message: 'Student not found.' };
  res.json(buildStatusPayload(cr, student, db));
}));

r.get('/staff/clearance-queue', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const checkCode = ROLE_TO_CHECK[user.role];
  if (!checkCode) { res.json([]); return; }
  const results = [];
  for (const cr of db.requests) {
    if (cr.campusId !== user.campusId || cr.status === 'CLOSED') continue;
    const chk = db.checks.find(c => c.clearanceRequestId === cr.id && c.checkCode === checkCode);
    if (!chk) continue;
    const st = db.students.find(s => s.studentId === cr.studentId);
    if (!st) continue;
    const allL = db.liabilities.filter(l => l.studentId === cr.studentId && l.departmentCheckCode === checkCode);
    const unpaidL = allL.filter(l => !['PAID', 'CLEARED', 'WAIVED'].includes(l.status));
    const isFlagged = chk.status === 'FLAGGED' || chk.status === 'FAILED' || unpaidL.length > 0;
    results.push({ checkId: chk.id, checkCode: chk.checkCode, checkStatus: isFlagged && chk.status === 'PENDING' ? 'FLAGGED' : chk.status, clearanceRequestId: cr.id, requestNumber: cr.requestNumber, requestStatus: cr.status, submittedAt: cr.submittedAt, studentId: st.studentId, studentName: st.firstName + ' ' + st.lastName, program: st.program || null, campusId: cr.campusId, totalFines: unpaidL.reduce((s, l) => s + l.amount, 0), unpaidCount: unpaidL.length, liabilityCount: allL.length });
  }
  res.json(results.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
}));

r.get('/staff/flagged', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const targetCampus = req.query.campusId || user.campusId || '';
  const targetStatuses = ['AWAITING_FINANCE', 'PAID_PENDING_DEPARTMENT_APPROVAL', 'FLAGGED'];
  const result = [];
  for (const chk of db.checks.filter(c => targetStatuses.includes(c.status))) {
    const cr = db.requests.find(rq => rq.id === chk.clearanceRequestId);
    if (!cr || (targetCampus && cr.campusId !== targetCampus)) continue;
    const st = db.students.find(s => s.studentId === cr.studentId);
    const liab = db.liabilities.find(l => l.clearanceRequestId === cr.id && l.departmentCheckCode === chk.checkCode);
    result.push({ checkId: chk.id, checkCode: chk.checkCode, checkStatus: chk.status, clearanceRequestId: cr.id, requestNumber: cr.requestNumber, requestType: cr.requestType, requestStatus: cr.status, studentId: cr.studentId, studentName: st ? `${st.firstName} ${st.lastName}` : cr.studentId, campusId: cr.campusId, submittedAt: cr.submittedAt, liabilityItemName: liab?.itemName, liabilityAmount: liab?.amount, liabilityCurrency: liab?.currency, liabilityDescription: liab?.description, staffComment: chk.comment });
  }
  res.json(result);
}));

r.patch('/staff/checks/:checkId/review', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const chk = db.checks.find(c => c.id === req.params.checkId);
  if (!chk) throw { status: 404, message: 'Check not found.' };
  if (req.body.status === 'CLEARED') enforceApprovalOrder(chk.checkCode, chk.clearanceRequestId, db);
  chk.status = req.body.status;
  chk.comment = req.body.comment || null;
  chk.reviewedBy = user.id;
  chk.reviewedAt = isoNow();
  const cr = db.requests.find(rq => rq.id === chk.clearanceRequestId);
  if (cr) cr.status = computeRequestStatus(db.checks.filter(c => c.clearanceRequestId === cr.id));
  await writeDb(db);
  res.json(chk);
}));

r.patch('/staff/checks/:checkId/quick-approve', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const chk = db.checks.find(c => c.id === req.params.checkId);
  if (!chk) throw { status: 404, message: 'Check not found.' };
  chk.status = 'CLEARED';
  chk.comment = req.body.comment || null;
  chk.reviewedBy = user.id;
  chk.reviewedAt = isoNow();
  const cr = db.requests.find(rq => rq.id === chk.clearanceRequestId);
  if (cr) cr.status = computeRequestStatus(db.checks.filter(c => c.clearanceRequestId === cr.id));
  await writeDb(db);
  res.json(chk);
}));

r.patch('/staff/checks/:checkId/revoke-payment', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const chk = db.checks.find(c => c.id === req.params.checkId);
  if (!chk) throw { status: 404, message: 'Check not found.' };
  db.liabilities.filter(l => l.clearanceRequestId === chk.clearanceRequestId && l.departmentCheckCode === chk.checkCode && l.status === 'PAID' && l.paymentRequired).forEach(l => { l.status = 'PENDING'; });
  const reason = req.body.reason || '';
  chk.status = 'AWAITING_FINANCE';
  chk.comment = 'Finance has stopped clearance. Payment disputed.' + (reason ? ' Reason: ' + reason : '');
  chk.reviewedAt = isoNow();
  const cr = db.requests.find(rq => rq.id === chk.clearanceRequestId);
  if (cr) cr.status = 'IN_REVIEW';
  await writeDb(db);
  res.json(chk);
}));

// Registrar aliases
r.get('/registrar/clearance-requests', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  res.json(db.requests.filter(rq => { if (rq.campusId !== user.campusId) return false; const checks = db.checks.filter(c => c.clearanceRequestId === rq.id); return checks.length > 0 && checks.every(c => c.status === 'CLEARED'); }));
}));

r.get('/registrar/clearance-requests/statistics', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  const campusReqs = db.requests.filter(rq => rq.campusId === user.campusId);
  const cleared = campusReqs.filter(rq => rq.status === 'CLEARED').length;
  const bm = {};
  campusReqs.forEach(rq => { db.checks.filter(c => c.clearanceRequestId === rq.id && c.status !== 'CLEARED').forEach(c => { bm[c.checkCode] = (bm[c.checkCode] || 0) + 1; }); });
  const be = Object.entries(bm).sort((a, b) => b[1] - a[1]);
  res.json({ total_requests: campusReqs.length, cleared_requests: cleared, clearance_percentage: campusReqs.length > 0 ? (cleared / campusReqs.length) * 100 : 0, most_common_bottleneck: be[0]?.[0] || '—', bottleneck_count: be[0]?.[1] || 0, pending_count: campusReqs.filter(rq => rq.status === 'PENDING').length, in_review_count: campusReqs.filter(rq => rq.status === 'IN_REVIEW').length, flagged_count: campusReqs.filter(rq => rq.status === 'FLAGGED').length });
}));

r.get('/registrar/clearance-requests/all-students', wrap(async (req, res) => {
  const db = await readDb();
  const user = requireAuth(extractToken(req), db);
  res.json(db.requests.filter(rq => rq.campusId === user.campusId).map(cr => {
    const st = db.students.find(s => s.studentId === cr.studentId);
    const checks = db.checks.filter(c => c.clearanceRequestId === cr.id);
    const clearedCount = checks.filter(c => c.status === 'CLEARED').length;
    const cert = db.certificates.find(c => c.clearanceRequestId === cr.id);
    return { request_id: cr.id, request_number: cr.requestNumber, student: { studentId: cr.studentId, firstName: st?.firstName || 'Unknown', lastName: st?.lastName || '', middleName: st?.middleName || null, program: st?.program || null }, status: cr.status, submitted_at: cr.submittedAt, progress_percentage: checks.length > 0 ? Math.round((clearedCount / checks.length) * 100) : 0, checks: checks.map(c => ({ id: c.id, checkCode: c.checkCode, status: c.status })), has_certificate: cert != null };
  }));
}));

r.post('/registrar/clearance-requests/:id/generate-certificate', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const cr = db.requests.find(rq => rq.id === req.params.id);
  if (!cr) throw { status: 404, message: 'Request not found.' };
  const checks = db.checks.filter(c => c.clearanceRequestId === req.params.id);
  if (!checks.every(c => c.status === 'CLEARED')) throw { status: 400, message: 'All departments must approve before generating a certificate.' };
  const existing = db.certificates.find(c => c.clearanceRequestId === req.params.id);
  if (existing) { res.json(existing); return; }
  const st = db.students.find(s => s.studentId === cr.studentId);
  const hash = Buffer.from(req.params.id + cr.studentId + isoNow()).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
  const clearedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const campusNames = { TEWODROS: 'Atse Tewodros Campus', MARAKI: 'Maraki Campus', FASIL: 'Atse Fasil Campus' };
  const qrBase64 = await generateQrBase64({ studentId: cr.studentId, fullName: st ? `${st.firstName} ${st.lastName}` : cr.studentId, program: st?.program || null, campus: campusNames[cr.campusId] || cr.campusId, clearedDate, requestNumber: cr.requestNumber, hash });
  const cert = { id: uid(), clearanceRequestId: req.params.id, studentId: cr.studentId, campusId: cr.campusId, hash, signedPayload: JSON.stringify({ requestId: req.params.id, studentId: cr.studentId, hash, generatedAt: isoNow() }), base64Qr: qrBase64, generatedAt: isoNow() };
  db.certificates.push(cert);
  cr.status = 'CLEARED';
  await writeDb(db);
  res.json(cert);
}));

r.post('/registrar/clearance-requests/:id/send-certificate', wrap(async (req, res) => {
  const db = await readDb();
  requireAuth(extractToken(req), db);
  const cert = db.certificates.find(c => c.clearanceRequestId === req.params.id);
  if (!cert) throw { status: 404, message: 'Certificate not found. Generate it first.' };
  res.json({ message: 'Certificate sent to student successfully.', certificateId: cert.id });
}));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({ status: 'ok', database: 'mongodb', dbName: MONGODB_DB, timestamp: isoNow() }));
app.use('/api/v1', r);

// ─── Start ────────────────────────────────────────────────────────────────────

initStore().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[UGClear] Backend server listening on port ${PORT}`);
    console.log(`[UGClear] Database: MongoDB — ${MONGODB_DB}`);
    console.log('[UGClear] Accounts: student1/student123 | librarian/staff123 | finance/finance123 | registrar/reg123 | admin/admin@123');
  });
}).catch(err => {
  console.error('[UGClear] Failed to start:', err);
  process.exit(1);
});
