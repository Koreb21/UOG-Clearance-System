import React, { useState, useEffect, useMemo, useRef } from "react";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { useToast } from "../components/ToastContext";
import { api, toApiUrl } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import type {
  Campus,
  Department,
  StaffUser,
  StudentSummary,
  UserRole
} from "../types";

type Student = StudentSummary;

type UnifiedUser =
  | { type: "STUDENT"; data: StudentSummary }
  | { type: "STAFF"; data: StaffUser };

const BLANK_CREATE = {
  identifier: "",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  password: "",
  role: "PROCTOR",
  campusId: "",
  departmentId: "",
  academicYear: new Date().getFullYear()
};

type MainTab = "DASHBOARD" | "STUDENTS" | "DEPARTMENTS" | "STUDENT_BATCHES";
type RightTab = "EDIT" | "REGISTER_STUDENT" | "REGISTER_STAFF" | "IMPORT";

export function AdminDashboardPage() {
  const { token } = useAuth();
  const { showToast } = useToast();

  /* ── Shared data ──────────────────────────────────────────── */
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [mainTab, setMainTab] = useState<MainTab>("DASHBOARD");

  /* ── Students tab state ───────────────────────────────────── */
  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentEditModal, setShowStudentEditModal] = useState(false);
  const [showStudentAddModal, setShowStudentAddModal] = useState(false);
  const [showStudentImportModal, setShowStudentImportModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  /* ── User Registry state ──────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null);

  // Edit form
  const [editFirstName, setEditFirstName] = useState("");
  const [editMiddleName, setEditMiddleName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState<string>("");
  const [editCampusId, setEditCampusId] = useState<string>("");
  const [editRole, setEditRole] = useState("");
  const [editAcademicYear, setEditAcademicYear] = useState<number>(new Date().getFullYear());

  const [showResetPw, setShowResetPw] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const [rightPanelTab, setRightPanelTab] = useState<RightTab>("EDIT");
  const [createUserType, setCreateUserType] = useState<"STUDENT" | "STAFF">("STUDENT");
  const [createData, setCreateData] = useState({ ...BLANK_CREATE });

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    totalRows: number; importedCount: number; failedCount: number; errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Student Batches state ────────────────────────────────── */
  const [batches, setBatches] = useState<Array<{ id: string; name: string; campusId: string; submittedBy: string; submittedAt: string; status: string; studentCount: number; importedAt: string | null; importedBy: string | null; importedCount: number }>>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchDetail, setBatchDetail] = useState<{ batch: typeof batches[0]; students: Array<{ id: string; firstName: string; middleName: string | null; lastName: string; gender: string | null; age: number | null; email: string | null; department: string | null; academicYear: number | null; campusId: string }> } | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchImportResult, setBatchImportResult] = useState<{ totalRows: number; importedCount: number; failedCount: number; errors: string[] } | null>(null);

  /* ── Department Management state ──────────────────────────── */
  const [deptSearch, setDeptSearch] = useState("");
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ code: "", name: "", type: "CLEARANCE" as "ACADEMIC" | "CLEARANCE", campusId: "TEWODROS", active: true });
  const [savingDept, setSavingDept] = useState(false);
  const [assignOpenFor, setAssignOpenFor] = useState<Department | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignedStaffMap, setAssignedStaffMap] = useState<Record<string, Array<{ id: string; username: string; role: string }>>>({});

  /* ── helpers ──────────────────────────────────────────────── */
  function getDisplayName(u: UnifiedUser) {
    return u.type === "STUDENT" ? `${u.data.firstName} ${u.data.lastName}`.trim() : u.data.username;
  }
  function getIdentifier(u: UnifiedUser) { return u.type === "STUDENT" ? u.data.studentId : u.data.username; }
  function getCampusId(u: UnifiedUser) { return u.data.campusId ?? ""; }
  function getDepartmentId(u: UnifiedUser) {
    return u.type === "STUDENT" ? u.data.academicDepartmentId ?? "" : u.data.departmentId ?? "";
  }
  function getProfileImageUrl(u: UnifiedUser) { return u.type === "STUDENT" ? u.data.profileImageUrl : null; }
  function isActive(u: UnifiedUser) { return u.type === "STUDENT" ? u.data.status === "ACTIVE" : u.data.active; }

  function departmentOptionsFor(userType: "STUDENT" | "STAFF", campusId: string) {
    const expected = userType === "STUDENT" ? "ACADEMIC" : "CLEARANCE";
    return departments.filter(d => d.type === expected).filter(d => !campusId || d.campusId === campusId).filter(d => d.active).sort((a, b) => a.name.localeCompare(b.name));
  }

  const editDeptOptions = selectedUser ? departmentOptionsFor(selectedUser.type, editCampusId) : [];
  const createDeptOptions = departmentOptionsFor(createUserType, createData.campusId);

  /* ── data loading ─────────────────────────────────────────── */
  const loadData = async (reselect?: { id: string; type: "STUDENT" | "STAFF" }) => {
    if (!token) { setLoading(false); return; }
    try {
      setLoading(true);
      const [c, d, st, su] = await Promise.all([
        api.listCampuses(token),
        api.listDepartments(token),
        api.listAdminStudents(token),
        api.listStaffUsers(token)
      ]);
      setCampuses(c);
      setDepartments(d);
      setStudents(st);
      setStaffUsers(su);
      if (reselect) {
        if (reselect.type === "STUDENT") {
          const found = st.find(s => s.id === reselect.id);
          if (found) setSelectedUser({ type: "STUDENT", data: found });
        } else {
          const found = su.find(s => s.id === reselect.id);
          if (found) setSelectedUser({ type: "STAFF", data: found });
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [token]);

  /* ── batch data loading ─────────────────────────────────── */
  const loadBatches = async () => {
    if (!token) return;
    try { const list = await api.listStudentBatches(token); setBatches(list); } catch (err) { console.error(err); }
  };
  useEffect(() => { if (mainTab === "STUDENT_BATCHES") { loadBatches(); setSelectedBatchId(null); setBatchDetail(null); setBatchImportResult(null); } }, [mainTab]);

  const handleViewBatch = async (batchId: string) => {
    if (!token) return;
    setSelectedBatchId(batchId);
    setBatchImportResult(null);
    try { const detail = await api.getBatchDetail(token, batchId); setBatchDetail(detail); } catch (err: any) { showToast(err.message ?? "Failed to load batch", "error"); }
  };

  const handleBatchImport = async () => {
    if (!token || !selectedBatchId || !batchDetail) return;
    setBatchImporting(true); setBatchImportResult(null);
    try {
      const result = await api.importBatch(token, selectedBatchId);
      setBatchImportResult(result);
      showToast(`${result.importedCount} students imported with auto-generated IDs.`, "success");
      loadBatches();
      const updated = await api.getBatchDetail(token, selectedBatchId);
      setBatchDetail(updated);
      loadData();
    } catch (err: any) { showToast(err.message ?? "Import failed", "error"); }
    finally { setBatchImporting(false); }
  };

  const handleDownloadBatchCsv = () => {
    if (!batchDetail) return;
    const header = "firstName,middleName,lastName,gender,age,department,email,academicYear,campus";
    const rows = batchDetail.students.map(s =>
      [s.firstName, s.middleName ?? "", s.lastName, s.gender ?? "", s.age ?? "", s.department ?? "", s.email ?? "", s.academicYear ?? "", s.campusId].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${batchDetail.batch.name}_students.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── department data loading ──────────────────────────────── */
  const loadAssignedStaff = async (deptId: string) => {
    if (!token) return;
    try {
      const list = await api.listAssignedStaff(token, deptId);
      setAssignedStaffMap(prev => ({ ...prev, [deptId]: list }));
    } catch {/* */}
  };

  useEffect(() => {
    if (mainTab === "DEPARTMENTS") {
      departments.forEach(d => loadAssignedStaff(d.id));
    }
  }, [mainTab, departments.length]);

  /* ── unified user list ────────────────────────────────────── */
  const unifiedList = useMemo(() => {
    let list: UnifiedUser[] = [
      ...students.map(s => ({ type: "STUDENT" as const, data: s })),
      ...staffUsers.map(s => ({ type: "STAFF" as const, data: s }))
    ];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u => {
        if (u.type === "STUDENT") {
          return (`${u.data.firstName} ${u.data.lastName}`.toLowerCase().includes(q) || u.data.studentId.toLowerCase().includes(q));
        }
        return (u.data.username.toLowerCase().includes(q) || u.data.role.toLowerCase().includes(q));
      });
    }
    return list;
  }, [students, staffUsers, searchQuery]);

  /* ── sync edit form when selectedUser changes ─────────────── */
  useEffect(() => {
    if (!selectedUser) return;
    setShowResetPw(false); setNewPassword("");
    if (selectedUser.type === "STUDENT") {
      const s = selectedUser.data;
      setEditFirstName(s.firstName); setEditMiddleName(s.middleName ?? ""); setEditLastName(s.lastName);
      setEditEmail(s.email ?? ""); setEditDepartmentId(s.academicDepartmentId ?? "");
      setEditCampusId(s.campusId); setEditRole("STUDENT"); setEditAcademicYear(s.academicYear ?? new Date().getFullYear());
    } else {
      const s = selectedUser.data;
      setEditFirstName(s.username); setEditMiddleName(""); setEditLastName("");
      setEditEmail(s.email ?? ""); setEditDepartmentId(s.departmentId ?? "");
      setEditCampusId(s.campusId); setEditRole(s.role); setEditAcademicYear(new Date().getFullYear());
    }
  }, [selectedUser]);

  /* ── actions ──────────────────────────────────────────────── */
  const handleUpdateUser = async () => {
    if (!selectedUser || !token) return;
    const reselect = { id: selectedUser.data.id, type: selectedUser.type };
    try {
      if (selectedUser.type === "STUDENT") {
        await api.updateStudent(token, selectedUser.data.studentId, {
          firstName: editFirstName, middleName: editMiddleName || undefined, lastName: editLastName,
          gender: selectedUser.data.gender ?? undefined, phone: selectedUser.data.phone ?? undefined,
          email: editEmail || undefined, campusId: editCampusId || selectedUser.data.campusId,
          academicDepartmentId: editDepartmentId || undefined, program: selectedUser.data.program ?? undefined,
          academicYear: editAcademicYear, graduationYear: selectedUser.data.graduationYear ?? new Date().getFullYear() + 1
        });
      } else {
        await api.updateStaffUser(token, selectedUser.data.id, {
          username: editFirstName, email: editEmail || undefined,
          role: editRole as Exclude<UserRole, "STUDENT">, departmentId: editDepartmentId || undefined,
          campusId: editCampusId || selectedUser.data.campusId
        });
      }
      showToast("Profile updated successfully.", "success"); loadData(reselect);
    } catch (err: any) { showToast("Update failed: " + err.message, "error"); }
  };

  const handleToggleActive = async () => {
    if (!selectedUser || !token) return;
    const reselect = { id: selectedUser.data.id, type: selectedUser.type };
    const nextActive = !isActive(selectedUser);
    try {
      if (selectedUser.type === "STUDENT") await api.setStudentActive(token, selectedUser.data.studentId, nextActive);
      else await api.setStaffUserActive(token, selectedUser.data.id, nextActive);
      showToast(`User ${nextActive ? "activated" : "deactivated"} successfully.`, "success"); loadData(reselect);
    } catch (err: any) { showToast("Status change failed: " + err.message, "error"); }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !token || !newPassword.trim()) return;
    setPwSaving(true);
    try {
      if (selectedUser.type === "STUDENT") await api.resetStudentPassword(token, selectedUser.data.studentId, newPassword.trim());
      else await api.resetStaffPassword(token, selectedUser.data.id, newPassword.trim());
      setNewPassword(""); setShowResetPw(false); showToast("Password reset successfully.", "success");
    } catch (err: any) { showToast("Password reset failed: " + err.message, "error"); }
    finally { setPwSaving(false); }
  };

  /* ── Bulk student actions ─────────────────────────────────── */
  const handleBulkActivate = async (ids: string[]) => {
    if (!token) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(ids.map(id => {
        const s = students.find(st => st.id === id);
        if (!s) return Promise.resolve();
        return api.setStudentActive(token, s.studentId, true);
      }));
      showToast(`${ids.length} student${ids.length !== 1 ? "s" : ""} activated.`, "success");
      setSelectedStudentIds(new Set());
      loadData();
    } catch (err: any) { showToast("Bulk activate failed: " + err.message, "error"); }
    finally { setBulkActionLoading(false); }
  };

  const handleBulkDeactivate = async (ids: string[]) => {
    if (!token) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(ids.map(id => {
        const s = students.find(st => st.id === id);
        if (!s) return Promise.resolve();
        return api.setStudentActive(token, s.studentId, false);
      }));
      showToast(`${ids.length} student${ids.length !== 1 ? "s" : ""} deactivated.`, "success");
      setSelectedStudentIds(new Set());
      loadData();
    } catch (err: any) { showToast("Bulk deactivate failed: " + err.message, "error"); }
    finally { setBulkActionLoading(false); }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!token) return;
    if (!window.confirm(`Permanently delete ${ids.length} student${ids.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(ids.map(id => {
        const s = students.find(st => st.id === id);
        if (!s) return Promise.resolve();
        return api.deleteStudent(token, s.studentId);
      }));
      showToast(`${ids.length} student${ids.length !== 1 ? "s" : ""} deleted.`, "success");
      setSelectedStudentIds(new Set());
      loadData();
    } catch (err: any) { showToast("Bulk delete failed: " + err.message, "error"); }
    finally { setBulkActionLoading(false); }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !token) return;
    if (!window.confirm(`Are you sure you want to permanently delete this ${selectedUser.type === "STUDENT" ? "student" : "staff member"}? This cannot be undone.`)) return;
    setDeletingUser(true);
    try {
      if (selectedUser.type === "STUDENT") await api.deleteStudent(token, selectedUser.data.studentId);
      else await api.deleteStaffUser(token, selectedUser.data.id);
      showToast(`${selectedUser.type === "STUDENT" ? "Student" : "Staff member"} deleted successfully.`, "success");
      setSelectedUser(null); loadData();
    } catch (err: any) { showToast("Delete failed: " + err.message, "error"); }
    finally { setDeletingUser(false); }
  };

  const handleCreate = async () => {
    if (!token) return;
    try {
      if (createUserType === "STUDENT") {
        await api.createStudent(token, {
          studentId: createData.identifier, firstName: createData.firstName, middleName: createData.middleName || undefined,
          lastName: createData.lastName, email: createData.email, campusId: createData.campusId,
          academicDepartmentId: createData.departmentId || undefined, academicYear: createData.academicYear || new Date().getFullYear(),
          graduationYear: new Date().getFullYear() + 1, temporaryPassword: createData.password || undefined
        });
      } else {
        await api.createStaffUser(token, {
          username: createData.identifier, email: createData.email || undefined,
          temporaryPassword: createData.password || undefined, role: createData.role as Exclude<UserRole, "STUDENT">,
          departmentId: createData.departmentId || undefined, campusId: createData.campusId
        });
      }
      setCreateData({ ...BLANK_CREATE });
      showToast(`${createUserType === "STUDENT" ? "Student" : "Staff"} registered successfully.`, "success"); loadData();
    } catch (err: any) { showToast("Registration failed: " + err.message, "error"); }
  };

  const handleImport = async () => {
    if (!token || !importFile) return;
    setImporting(true); setImportResult(null);
    try {
      const result = await api.importStudentsCsv(token, importFile);
      setImportResult(result); loadData(); setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) { showToast("Import failed: " + err.message, "error"); }
    finally { setImporting(false); }
  };

  function downloadTemplate() {
    const header = "studentId,firstName,middleName,lastName,gender,phone,email,campusId,academicDepartmentId,program,academicYear,graduationYear,password";
    const example = "UGR/001/16,Abebe,Bekele,Tadesse,MALE,+251900000000,abebe@uog.edu.et,TEWODROS,,Computer Science,2024,2028,";
    const csv = [header, example].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "student_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Department actions ───────────────────────────────────── */
  const handleSaveDepartment = async () => {
    if (!token) return;
    setSavingDept(true);
    try {
      if (editingDept) {
        await api.updateDepartment(token, editingDept.id, {
          code: deptForm.code, name: deptForm.name, type: deptForm.type, campusId: deptForm.campusId, active: deptForm.active
        });
        showToast("Department updated.", "success");
      } else {
        await api.createDepartment(token, {
          code: deptForm.code, name: deptForm.name, type: deptForm.type, campusId: deptForm.campusId, active: deptForm.active
        });
        showToast("Department created.", "success");
      }
      setShowDeptForm(false); setEditingDept(null);
      setDeptForm({ code: "", name: "", type: "CLEARANCE", campusId: "TEWODROS", active: true });
      loadData();
    } catch (err: any) { showToast("Save failed: " + err.message, "error"); }
    finally { setSavingDept(false); }
  };

  const handleToggleDepartment = async (dept: Department) => {
    if (!token) return;
    try {
      await api.toggleDepartment(token, dept.id);
      showToast(`Department ${dept.active ? "disabled" : "enabled"} successfully.`, "success"); loadData();
    } catch (err: any) { showToast("Toggle failed: " + err.message, "error"); }
  };

  const handleAssignStaff = async () => {
    if (!token || !assignOpenFor || !assignUserId) return;
    try {
      await api.assignStaffToDepartment(token, { userId: assignUserId, departmentId: assignOpenFor.id });
      showToast("Staff assigned to department.", "success");
      setAssignUserId("");
      loadAssignedStaff(assignOpenFor.id);
    } catch (err: any) { showToast("Assignment failed: " + err.message, "error"); }
  };

  const openDeptForm = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({ code: dept.code, name: dept.name, type: dept.type as "ACADEMIC" | "CLEARANCE", campusId: dept.campusId ?? "TEWODROS", active: dept.active });
    } else {
      setEditingDept(null);
      setDeptForm({ code: "", name: "", type: "CLEARANCE", campusId: "TEWODROS", active: true });
    }
    setShowDeptForm(true);
  };

  /* ── shared input class ───────────────────────────────────── */
  const inputCls = "w-full bg-surface-container-high border-none rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/40 transition-shadow";

  const sidebarItems: { tab: MainTab; icon: string; label: string }[] = [
    { tab: "DASHBOARD", icon: "dashboard", label: "Dashboard" },
    { tab: "STUDENTS", icon: "school", label: "Students" },
    { tab: "STUDENT_BATCHES", icon: "upload_file", label: "Student Batches" },
    { tab: "DEPARTMENTS", icon: "corporate_fare", label: "Departments" },
  ];

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div className="bg-background text-on-surface min-h-screen">

      {/* ── TopBar ── */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-20 bg-white/70 backdrop-blur-xl shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)]">
        <div className="flex items-center gap-4">
          <BackButton />
          <div className="w-px h-6 bg-outline-variant/40" />
          <span className="material-symbols-outlined text-primary text-3xl">shield_person</span>
          <h1 className="text-xl font-black text-[#001e40] tracking-tight">Registrar Management</h1>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <SessionControls density="full" className="shrink-0" />
          <div className="w-10 h-10 shrink-0 rounded-full bg-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
          </div>
        </div>
      </header>

      {/* ── Left Sidebar ── */}
      <aside className="w-72 flex flex-col fixed left-0 top-20 bottom-0 bg-surface-container-low p-6 gap-4 z-40 border-r border-surface-container-highest overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white">school</span>
          </div>
          <div>
            <p className="text-lg font-bold text-on-primary-fixed-variant leading-tight">Gondar Registry</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">Admin Control Panel</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {sidebarItems.map(item => (
            <button
              key={item.tab}
              onClick={() => setMainTab(item.tab)}
              className={`flex items-center gap-4 p-3 rounded-lg shadow-sm transition-all text-left ${
                mainTab === item.tab
                  ? "bg-white text-primary font-bold"
                  : "text-on-surface-variant hover:bg-white/60 hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm font-medium uppercase tracking-[0.05em]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-outline-variant/20">
          <p className="text-[10px] text-on-surface-variant text-center">V2.1.0 • SECURE SESSION</p>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="ml-72 px-8 pb-12 min-h-screen bg-surface" style={{ paddingTop: 'calc(5rem + 2rem)' }}>

        {/* ════════════════════════ DASHBOARD TAB ════════════════════════ */}
        {mainTab === "DASHBOARD" && (
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="md:col-span-2 bg-gradient-to-br from-primary to-primary-container p-8 rounded-2xl text-white shadow-lg flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">System Dashboard</h2>
                <p className="text-primary-fixed opacity-80 text-sm">
                  Centralised authority for University of Gondar staff and student credentials.
                </p>
              </div>
              <div className="flex items-center gap-4 mt-8">
                <button onClick={() => setMainTab("STUDENTS")} className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:bg-white/30 shadow-lg border border-white/20">
                  <span className="material-symbols-outlined text-lg">school</span> Students
                </button>
                <button onClick={() => setMainTab("DEPARTMENTS")} className="bg-secondary-container text-on-secondary-container px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:brightness-105 shadow-lg">
                  <span className="material-symbols-outlined text-lg">corporate_fare</span> Departments
                </button>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between shadow-sm border border-surface-container">
              <span className="material-symbols-outlined text-primary text-3xl">groups</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total Students</p>
                <p className="text-4xl font-black text-primary">{students.length.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-green-600 font-bold">
                <span className="material-symbols-outlined text-sm">check_circle</span><span>Loaded from DB</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between shadow-sm border border-surface-container">
              <span className="material-symbols-outlined text-secondary text-3xl">badge</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total Staff</p>
                <p className="text-4xl font-black text-primary">{staffUsers.length.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">check_circle</span><span>All records verified</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between shadow-sm border border-surface-container">
              <span className="material-symbols-outlined text-tertiary text-3xl">corporate_fare</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Departments</p>
                <p className="text-4xl font-black text-primary">{departments.length.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">check_circle</span><span>Offices & Colleges</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between shadow-sm border border-surface-container">
              <span className="material-symbols-outlined text-error text-3xl">domain_disabled</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Inactive Users</p>
                <p className="text-4xl font-black text-error">{[...students.filter(s => s.status !== "ACTIVE"), ...staffUsers.filter(s => !s.active)].length.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">warning</span><span>Requires attention</span>
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════ STUDENTS TAB ════════════════════════ */}
        {mainTab === "STUDENTS" && (() => {
          const filteredStudents = students.filter(s => {
            if (!studentSearch) return true;
            const q = studentSearch.toLowerCase();
            return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q);
          });
          const allFilteredIds = filteredStudents.map(s => s.id);
          const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedStudentIds.has(id));
          const someSelected = allFilteredIds.some(id => selectedStudentIds.has(id));
          const selectionCount = allFilteredIds.filter(id => selectedStudentIds.has(id)).length;
          const selectedIds = allFilteredIds.filter(id => selectedStudentIds.has(id));

          const toggleOne = (id: string) => {
            setSelectedStudentIds(prev => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            });
          };
          const toggleAll = () => {
            if (allSelected) {
              setSelectedStudentIds(prev => { const next = new Set(prev); allFilteredIds.forEach(id => next.delete(id)); return next; });
            } else {
              setSelectedStudentIds(prev => { const next = new Set(prev); allFilteredIds.forEach(id => next.add(id)); return next; });
            }
          };

          return (
            <div className="space-y-6">
              {/* Header */}
              <section className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-primary tracking-tight">Student Management</h2>
                  <p className="text-sm text-on-surface-variant mt-1">View and manage all registered students across campuses.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setImportResult(null); setShowStudentImportModal(true); }} className="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-surface-container transition-all">
                    <span className="material-symbols-outlined text-base">upload_file</span> Import CSV
                  </button>
                  <button onClick={() => { setCreateUserType("STUDENT"); setCreateData({ ...BLANK_CREATE }); setShowStudentAddModal(true); }} className="bg-primary text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md hover:bg-primary-container hover:text-on-primary-container transition-all">
                    <span className="material-symbols-outlined text-base">person_add</span> Add Student
                  </button>
                </div>
              </section>

              {/* Search */}
              <div className="bg-surface-container-low p-4 rounded-2xl flex gap-4 items-center">
                <div className="relative flex-grow">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} type="text" placeholder="Search by Name, ID, or Email..." className="w-full pl-12 pr-4 py-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-primary/40 text-sm shadow-sm transition-shadow" />
                </div>
              </div>

              {/* Bulk Action Bar */}
              {selectionCount > 0 && (
                <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3 shadow-sm">
                  <div className="flex items-center gap-2 flex-grow">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-black">{selectionCount}</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{selectionCount} student{selectionCount !== 1 ? "s" : ""} selected</span>
                    <button onClick={() => setSelectedStudentIds(new Set())} className="text-xs text-on-surface-variant hover:text-on-surface ml-1 underline underline-offset-2 transition-colors">Clear</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkActivate(selectedIds)}
                      disabled={bulkActionLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-green-100 text-green-800 hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span> Activate
                    </button>
                    <button
                      onClick={() => handleBulkDeactivate(selectedIds)}
                      disabled={bulkActionLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">block</span> Deactivate
                    </button>
                    <button
                      onClick={() => handleBulkDelete(selectedIds)}
                      disabled={bulkActionLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-error-container text-error hover:bg-error hover:text-white transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">delete</span> Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Students Table */}
              <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-surface-container">
                <div className="px-6 py-4 border-b border-surface-container flex justify-between items-center bg-surface-container-low/30">
                  <h3 className="text-sm font-bold text-on-primary-fixed-variant uppercase tracking-wider">Active Registry</h3>
                  <span className="text-xs text-on-surface-variant">{loading ? "Loading..." : `Showing ${filteredStudents.length} students`}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                            onChange={toggleAll}
                            className="w-4 h-4 rounded accent-primary cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Student</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Role</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Campus</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Department</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Year</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {filteredStudents.map(s => {
                        const campusInfo = campuses.find(c => c.code === s.campusId);
                        const deptInfo = departments.find(d => d.id === s.academicDepartmentId);
                        const imgUrl = s.profileImageUrl;
                        const active = s.status === "ACTIVE";
                        const isChecked = selectedStudentIds.has(s.id);
                        return (
                          <tr key={s.id} className={`transition-colors ${isChecked ? "bg-primary/5" : "hover:bg-primary-fixed/10"}`}>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleOne(s.id)}
                                className="w-4 h-4 rounded accent-primary cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/10 shrink-0">
                                  {imgUrl ? <img src={toApiUrl(imgUrl) ?? undefined} alt={s.firstName} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-on-surface-variant">person</span>}
                                </div>
                                <div>
                                  <p className="font-bold text-on-surface text-sm">{s.firstName} {s.lastName}</p>
                                  <p className="text-xs text-on-surface-variant">ID: {s.studentId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-primary-fixed text-on-primary-fixed-variant uppercase tracking-tighter">Student</span>
                            </td>
                            <td className="px-4 py-3 text-on-surface-variant text-xs">{campusInfo?.name ?? s.campusId ?? "---"}</td>
                            <td className="px-4 py-3 text-on-surface-variant text-xs">{deptInfo?.name ?? "---"}</td>
                            <td className="px-4 py-3 text-on-surface-variant text-xs">{s.academicYear ?? "---"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-green-100 text-green-800" : "bg-error-container text-error"}`}>{active ? "Active" : "Inactive"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => { setSelectedUser({ type: "STUDENT", data: s }); setShowStudentEditModal(true); }} className="rounded-lg p-1.5 text-primary hover:bg-primary-fixed/20 transition-colors" title="Edit">
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button onClick={async () => { setSelectedUser({ type: "STUDENT", data: s }); await new Promise(r => setTimeout(r, 0)); handleToggleActive(); }} className={`rounded-lg p-1.5 transition-colors ${active ? "text-error hover:bg-error-container" : "text-green-700 hover:bg-green-50"}`} title={active ? "Deactivate" : "Activate"}>
                                  <span className="material-symbols-outlined text-[18px]">{active ? "block" : "check_circle"}</span>
                                </button>
                                <button onClick={async () => { setSelectedUser({ type: "STUDENT", data: s }); await new Promise(r => setTimeout(r, 0)); handleDeleteUser(); }} className="rounded-lg p-1.5 text-error hover:bg-error-container transition-colors" title="Delete">
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredStudents.length === 0 && !loading && (
                    <div className="p-8 text-center text-on-surface-variant text-sm">No students found.</div>
                  )}
                </div>
              </div>

              {/* Edit Student Modal */}
              {showStudentEditModal && selectedUser && selectedUser.type === "STUDENT" && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowStudentEditModal(false)} />
                  <div className="relative z-10 w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl overflow-hidden">
                    <div className="h-20 bg-gradient-to-r from-primary-container to-primary" />
                    <div className="px-6 pb-6 -mt-10">
                      <div className="flex items-end gap-4 mb-5">
                        <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-white flex items-center justify-center">
                          {getProfileImageUrl(selectedUser) ? <img src={toApiUrl(getProfileImageUrl(selectedUser)) ?? undefined} alt="Student" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-3xl text-on-surface-variant">person</span>}
                        </div>
                        <div className="pb-1">
                          <h3 className="text-lg font-black text-on-surface">{editFirstName} {editLastName}</h3>
                          <p className="text-xs text-on-surface-variant">{getIdentifier(selectedUser)}</p>
                        </div>
                        <button onClick={() => setShowStudentEditModal(false)} className="ml-auto rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">First</label><input type="text" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} className={inputCls} /></div>
                          <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Middle</label><input type="text" value={editMiddleName} onChange={e => setEditMiddleName(e.target.value)} className={inputCls} /></div>
                          <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Last</label><input type="text" value={editLastName} onChange={e => setEditLastName(e.target.value)} className={inputCls} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Campus</label>
                            <select value={editCampusId} onChange={e => { setEditCampusId(e.target.value); setEditDepartmentId(""); }} className={inputCls}>
                              <option value="">Select Campus</option>{campuses.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                            </select>
                          </div>
                          <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Academic Year</label>
                            <input type="number" value={editAcademicYear} onChange={e => setEditAcademicYear(parseInt(e.target.value))} className={inputCls} min="2000" max={new Date().getFullYear() + 10} />
                          </div>
                        </div>
                        <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Email</label><input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className={inputCls} placeholder="student@uog.edu.et" /></div>
                        <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Academic Department</label>
                          <select value={editDepartmentId} onChange={e => setEditDepartmentId(e.target.value)} className={inputCls}>
                            <option value="">Select Department</option>{editDeptOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                        <div className="border-t border-surface-container pt-4">
                          <button onClick={() => setShowResetPw(v => !v)} className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-base">lock_reset</span>{showResetPw ? "Cancel Password Reset" : "Reset Password"}
                          </button>
                          {showResetPw && <div className="mt-3 flex gap-2">
                            <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`${inputCls} flex-1`} />
                            <button onClick={handleResetPassword} disabled={pwSaving || !newPassword.trim()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-opacity">{pwSaving ? "..." : "Set"}</button>
                          </div>}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-5">
                        <button onClick={async () => { await handleUpdateUser(); setShowStudentEditModal(false); }} className="flex-1 bg-primary hover:bg-primary-container hover:text-on-primary-container text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all">Save Changes</button>
                        <button onClick={() => setShowStudentEditModal(false)} className="flex-1 py-3 text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-xl transition-colors">Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Student Modal */}
              {showStudentAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowStudentAddModal(false)} />
                  <div className="relative z-10 w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                          <span className="material-symbols-outlined">school</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-on-surface">Register Student</h3>
                          <p className="text-xs text-on-surface-variant">Add a new student to the registry.</p>
                        </div>
                      </div>
                      <button onClick={() => setShowStudentAddModal(false)} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">First</label><input type="text" value={createData.firstName} onChange={e => setCreateData({ ...createData, firstName: e.target.value })} className={inputCls} placeholder="First" /></div>
                        <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Middle</label><input type="text" value={createData.middleName} onChange={e => setCreateData({ ...createData, middleName: e.target.value })} className={inputCls} placeholder="(opt)" /></div>
                        <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Last</label><input type="text" value={createData.lastName} onChange={e => setCreateData({ ...createData, lastName: e.target.value })} className={inputCls} placeholder="Last" /></div>
                      </div>
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Student ID</label>
                        <input type="text" value={createData.identifier} onChange={e => setCreateData({ ...createData, identifier: e.target.value })} className={inputCls} placeholder="UGR/1234/15" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Email</label><input type="email" value={createData.email} onChange={e => setCreateData({ ...createData, email: e.target.value })} className={inputCls} placeholder="student@uog.edu.et" /></div>
                        <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Password</label><input type="password" value={createData.password} onChange={e => setCreateData({ ...createData, password: e.target.value })} className={inputCls} placeholder="(default: ID)" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Campus</label>
                          <select value={createData.campusId} onChange={e => setCreateData({ ...createData, campusId: e.target.value, departmentId: "" })} className={inputCls}>
                            <option value="">Select...</option>{campuses.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                          </select>
                        </div>
                        <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Department</label>
                          <select value={createData.departmentId} onChange={e => setCreateData({ ...createData, departmentId: e.target.value })} className={inputCls}>
                            <option value="">{createData.campusId ? "Select..." : "Campus first"}</option>{createDeptOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Academic Year</label>
                        <input type="number" value={createData.academicYear || new Date().getFullYear()} onChange={e => setCreateData({ ...createData, academicYear: parseInt(e.target.value) })} className={inputCls} min="2000" max={new Date().getFullYear() + 10} />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => setCreateData({ ...BLANK_CREATE })} className="flex-1 py-3 text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-xl transition-colors">Clear</button>
                      <button onClick={async () => { await handleCreate(); setShowStudentAddModal(false); }} className="flex-1 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-container hover:text-on-primary-container shadow-md transition-colors">Register</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Modal */}
              {showStudentImportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowStudentImportModal(false)} />
                  <div className="relative z-10 w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-tertiary flex items-center justify-center"><span className="material-symbols-outlined text-white">upload_file</span></div>
                        <div>
                          <h3 className="text-lg font-black text-on-surface">Bulk Student Import</h3>
                          <p className="text-xs text-on-surface-variant">Upload CSV with student data.</p>
                        </div>
                      </div>
                      <button onClick={() => setShowStudentImportModal(false)} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button>
                    </div>
                    <div className="bg-primary-fixed/30 rounded-lg p-4 mb-5 text-xs text-on-primary-fixed-variant space-y-1.5">
                      <p className="font-bold text-sm mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-base">info</span>Required Columns (in order)</p>
                      {[["A","studentId","e.g. UGR/001/16"],["B","firstName",""],["C","middleName","(optional)"],["D","lastName",""],["E","gender","MALE or FEMALE"],["F","phone","(optional)"],["G","email","(optional)"],["H","campusId","TEWODROS / MARAKI / FASIL"],["I","academicDepartmentId","(optional dept ID)"],["J","program","(optional)"],["K","academicYear","e.g. 2024"],["L","graduationYear","e.g. 2028"],["M","password","(optional)"]].map(([col,field,hint]) => (
                        <div key={col} className="flex gap-2"><span className="w-5 font-black text-primary shrink-0">{col}</span><span className="font-semibold w-36 shrink-0">{field}</span><span className="opacity-70">{hint}</span></div>
                      ))}
                    </div>
                    <button onClick={downloadTemplate} className="w-full mb-4 py-2.5 text-sm font-bold text-primary border-2 border-primary/30 hover:border-primary hover:bg-primary-fixed/20 rounded-xl transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base">download</span>Download CSV Template
                    </button>
                    <div className="border-2 border-dashed border-outline-variant rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary-fixed/10 transition-colors mb-4" onClick={() => fileInputRef.current?.click()}>
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2 block">folder_open</span>
                      {importFile ? <p className="text-sm font-bold text-primary">{importFile.name}</p> : <><p className="text-sm font-medium text-on-surface-variant">Click to select file</p><p className="text-xs text-on-surface-variant opacity-70 mt-1">Supports .csv and .xlsx</p></>}
                      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0] ?? null; setImportFile(f); setImportResult(null); }} />
                    </div>
                    <button onClick={async () => { await handleImport(); }} disabled={!importFile || importing} className="w-full py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-container hover:text-on-primary-container shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {importing ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Importing…</> : <><span className="material-symbols-outlined text-base">cloud_upload</span> Upload &amp; Import</>}
                    </button>
                    {importResult && (
                      <div className="mt-5 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-surface-container p-3 rounded-lg text-center"><p className="text-2xl font-black text-on-surface">{importResult.totalRows}</p><p className="text-[10px] text-on-surface-variant font-bold uppercase">Total Rows</p></div>
                          <div className="bg-green-50 p-3 rounded-lg text-center"><p className="text-2xl font-black text-green-700">{importResult.importedCount}</p><p className="text-[10px] text-green-600 font-bold uppercase">Imported</p></div>
                          <div className={`p-3 rounded-lg text-center ${importResult.failedCount > 0 ? "bg-red-50" : "bg-surface-container"}`}><p className={`text-2xl font-black ${importResult.failedCount > 0 ? "text-red-700" : "text-on-surface"}`}>{importResult.failedCount}</p><p className={`text-[10px] font-bold uppercase ${importResult.failedCount > 0 ? "text-red-600" : "text-on-surface-variant"}`}>Failed</p></div>
                        </div>
                        {importResult.errors.length > 0 && <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto"><p className="text-xs font-bold text-red-700 mb-2">Row Errors:</p>{importResult.errors.map((e, i) => <p key={i} className="text-[11px] text-red-600 leading-relaxed">{e}</p>)}</div>}
                        {importResult.importedCount > 0 && <p className="text-xs text-green-700 font-medium text-center flex items-center justify-center gap-1"><span className="material-symbols-outlined text-base">check_circle</span>{importResult.importedCount} students added.</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ════════════════════════ STUDENT BATCHES TAB ════════════════════════ */}
        {mainTab === "STUDENT_BATCHES" && (
          <div className="space-y-6">
            <section className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary tracking-tight">Student Batches</h2>
                <p className="text-sm text-on-surface-variant mt-1">Review prospective student lists submitted by registrars, download or import them into the registry.</p>
              </div>
              <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">{batches.length} batch{batches.length !== 1 ? "es" : ""}</span>
            </section>

            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-surface-container">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Batch</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Campus</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Submitted By</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Students</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {batches.map(b => (
                      <tr key={b.id} className="hover:bg-primary-fixed/10">
                        <td className="px-4 py-3">
                          <p className="font-bold text-on-surface">{b.name}</p>
                          <p className="text-[10px] text-on-surface-variant">{new Date(b.submittedAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">{b.campusId}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{b.submittedBy}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-primary-fixed/40 px-2 py-0.5 text-[11px] font-bold text-primary">{b.studentCount} students</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${b.status === "IMPORTED" ? "bg-green-100 text-green-800" : b.status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{b.status === "IMPORTED" ? "Imported" : b.status === "REJECTED" ? "Rejected" : "Pending"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleViewBatch(b.id)} className="rounded-lg px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary-fixed/20 transition-colors">
                            {b.status === "IMPORTED" ? "View" : "Review & Import"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {batches.length === 0 && <div className="p-8 text-center text-on-surface-variant text-sm">No batches submitted yet.</div>}
              </div>
            </div>

            {batchDetail && (
              <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-surface-container">
                <div className="px-6 py-4 border-b border-surface-container flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-surface-container-low/30">
                  <div>
                    <h3 className="text-sm font-bold text-on-primary-fixed-variant uppercase tracking-wider">{batchDetail.batch.name}</h3>
                    <p className="text-[10px] text-on-surface-variant">{batchDetail.batch.campusId} · Submitted by {batchDetail.batch.submittedBy} · {batchDetail.students.length} students</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {batchDetail.batch.status !== "IMPORTED" && (
                      <button onClick={handleBatchImport} disabled={batchImporting} className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50">
                        <span className="material-symbols-outlined text-lg">person_add</span>{batchImporting ? "Importing…" : "Generate IDs & Import"}
                      </button>
                    )}
                    <button onClick={handleDownloadBatchCsv} className="rounded-lg px-3 py-2 text-sm font-bold text-primary border border-primary/30 hover:border-primary hover:bg-primary-fixed/20 transition-colors flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">download</span> Download CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Name</th>
                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Gender</th>
                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Age</th>
                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Department</th>
                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Email</th>
                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Year</th>
                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Campus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {batchDetail.students.map(s => (
                        <tr key={s.id} className="hover:bg-primary-fixed/5">
                          <td className="px-4 py-2 font-medium text-on-surface">{s.firstName} {s.middleName ? s.middleName + " " : ""}{s.lastName}</td>
                          <td className="px-4 py-2 text-on-surface-variant">{s.gender ?? "—"}</td>
                          <td className="px-4 py-2 text-on-surface-variant">{s.age ?? "—"}</td>
                          <td className="px-4 py-2 text-on-surface-variant">{s.department ?? "—"}</td>
                          <td className="px-4 py-2 text-on-surface-variant">{s.email ?? "—"}</td>
                          <td className="px-4 py-2 text-on-surface-variant">{s.academicYear ?? "—"}</td>
                          <td className="px-4 py-2 text-on-surface-variant">{s.campusId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {batchImportResult && (
                  <div className="p-4 border-t border-surface-container bg-surface-container-low/30">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-surface-container p-3 rounded-lg text-center"><p className="text-2xl font-black text-on-surface">{batchImportResult.totalRows}</p><p className="text-[10px] text-on-surface-variant font-bold uppercase">Total</p></div>
                      <div className="bg-green-50 p-3 rounded-lg text-center"><p className="text-2xl font-black text-green-700">{batchImportResult.importedCount}</p><p className="text-[10px] text-green-600 font-bold uppercase">Imported</p></div>
                      <div className={`p-3 rounded-lg text-center ${batchImportResult.failedCount > 0 ? "bg-red-50" : "bg-surface-container"}`}><p className={`text-2xl font-black ${batchImportResult.failedCount > 0 ? "text-red-700" : "text-on-surface"}`}>{batchImportResult.failedCount}</p><p className={`text-[10px] font-bold uppercase ${batchImportResult.failedCount > 0 ? "text-red-600" : "text-on-surface-variant"}`}>Failed</p></div>
                    </div>
                    {batchImportResult.errors.length > 0 && <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto"><p className="text-xs font-bold text-red-700 mb-2">Errors:</p>{batchImportResult.errors.map((e, i) => <p key={i} className="text-[11px] text-red-600 leading-relaxed">{e}</p>)}</div>}
                    {batchImportResult.importedCount > 0 && <p className="text-xs text-green-700 font-medium text-center flex items-center justify-center gap-1"><span className="material-symbols-outlined text-base">check_circle</span>{batchImportResult.importedCount} students added with UGR/NNNNN/YY IDs.</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════ DEPARTMENTS TAB ════════════════════════ */}
        {mainTab === "DEPARTMENTS" && (
          <div className="space-y-6">
            <section className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary tracking-tight">Department Management</h2>
                <p className="text-sm text-on-surface-variant mt-1">Manage university offices involved in clearance. Add departments, assign officers, enable/disable clearance authority.</p>
              </div>
              <button onClick={() => openDeptForm()} className="bg-primary text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md hover:bg-primary-container hover:text-on-primary-container transition-all">
                <span className="material-symbols-outlined">add</span> Add Department
              </button>
            </section>

            {/* Search */}
            <div className="bg-surface-container-low p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-grow w-full">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input value={deptSearch} onChange={e => setDeptSearch(e.target.value)} type="text" placeholder="Search departments by name or code..." className="w-full pl-12 pr-4 py-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-primary/40 text-sm shadow-sm transition-shadow" />
              </div>
            </div>

            {/* Department Table */}
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-surface-container">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Department</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Code</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Type</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Campus</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Assigned Officers</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {departments.filter(d => !deptSearch || d.name.toLowerCase().includes(deptSearch.toLowerCase()) || d.code.toLowerCase().includes(deptSearch.toLowerCase())).map(dept => {
                      const campus = campuses.find(c => c.code === dept.campusId);
                      const assigned = assignedStaffMap[dept.id] ?? [];
                      return (
                        <tr key={dept.id} className="hover:bg-primary-fixed/10">
                          <td className="px-4 py-3">
                            <p className="font-bold text-on-surface">{dept.name}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{dept.code}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${dept.type === "ACADEMIC" ? "bg-primary-container text-primary" : "bg-secondary-container text-on-secondary-container"}`}>{dept.type}</span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{campus?.name ?? dept.campusId}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${dept.active ? "bg-green-100 text-green-800" : "bg-error-container text-error"}`}>{dept.active ? "Active" : "Inactive"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {assigned.length === 0 ? <span className="text-xs text-on-surface-variant italic">No officers assigned</span> : assigned.map(s => (
                                <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-medium text-on-surface">{s.username}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openDeptForm(dept)} className="rounded-lg p-1.5 text-primary hover:bg-primary-fixed/20 transition-colors" title="Edit">
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button onClick={() => handleToggleDepartment(dept)} className={`rounded-lg p-1.5 transition-colors ${dept.active ? "text-error hover:bg-error-container" : "text-green-700 hover:bg-green-50"}`} title={dept.active ? "Disable" : "Enable"}>
                                <span className="material-symbols-outlined text-[18px]">{dept.active ? "block" : "check_circle"}</span>
                              </button>
                              <button onClick={() => { setAssignOpenFor(dept); setAssignUserId(""); }} className="rounded-lg p-1.5 text-secondary hover:bg-secondary-container transition-colors" title="Assign Officer">
                                <span className="material-symbols-outlined text-[18px]">person_add</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {departments.filter(d => !deptSearch || d.name.toLowerCase().includes(deptSearch.toLowerCase()) || d.code.toLowerCase().includes(deptSearch.toLowerCase())).length === 0 && (
                  <div className="p-8 text-center text-on-surface-variant text-sm">No departments found.</div>
                )}
              </div>
            </div>

            {/* Department Form Modal */}
            {showDeptForm && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeptForm(false)} />
                <div className="relative z-10 w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-on-surface">{editingDept ? "Edit Department" : "Add Department"}</h3>
                    <button onClick={() => setShowDeptForm(false)} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button>
                  </div>
                  <div className="space-y-4">
                    <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Department Name</label><input type="text" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} className={inputCls} placeholder="e.g. Library Services" /></div>
                    <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Code</label><input type="text" value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })} className={inputCls} placeholder="e.g. LIB" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Type</label>
                        <select value={deptForm.type} onChange={e => setDeptForm({ ...deptForm, type: e.target.value as "ACADEMIC" | "CLEARANCE" })} className={inputCls}>
                          <option value="CLEARANCE">Clearance Office</option><option value="ACADEMIC">Academic Department</option>
                        </select>
                      </div>
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Campus</label>
                        <select value={deptForm.campusId} onChange={e => setDeptForm({ ...deptForm, campusId: e.target.value })} className={inputCls}>
                          {campuses.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="dept-active" checked={deptForm.active} onChange={e => setDeptForm({ ...deptForm, active: e.target.checked })} className="rounded" />
                      <label htmlFor="dept-active" className="text-sm font-medium text-on-surface">Active / Has clearance authority</label>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowDeptForm(false)} className="flex-1 rounded-xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSaveDepartment} disabled={savingDept || !deptForm.name || !deptForm.code} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary/90 disabled:opacity-50">
                      {savingDept ? "Saving..." : (editingDept ? "Update Department" : "Add Department")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Assign Staff Modal */}
            {assignOpenFor && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAssignOpenFor(null)} />
                <div className="relative z-10 w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-on-surface">Assign Officer to {assignOpenFor.name}</h3>
                    <button onClick={() => setAssignOpenFor(null)} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-4">Select a staff member to assign to this department. Only non-student users are shown.</p>
                  <div className="space-y-4">
                    <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Select Staff Member</label>
                      <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)} className={inputCls}>
                        <option value="">Choose a staff member...</option>
                        {staffUsers.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role.replace(/_/g, " ")})</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setAssignOpenFor(null)} className="flex-1 rounded-xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                    <button onClick={handleAssignStaff} disabled={!assignUserId} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary/90 disabled:opacity-50">Assign Officer</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
