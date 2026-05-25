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
  | { type: "STUDENT"; data: Student }
  | { type: "STAFF"; data: StaffUser };
type RightTab = "EDIT" | "REGISTER_STUDENT" | "REGISTER_STAFF" | "IMPORT";

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

export function AdminDashboardPage() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Password reset
  const [showResetPw, setShowResetPw] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Right panel tabs & create form
  const [rightPanelTab, setRightPanelTab] = useState<RightTab>("EDIT");
  const [createUserType, setCreateUserType] = useState<"STUDENT" | "STAFF">("STUDENT");
  const [createData, setCreateData] = useState({ ...BLANK_CREATE });

  // Bulk import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    totalRows: number;
    importedCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── helpers ──────────────────────────────────────────────── */
  function getDisplayName(u: UnifiedUser) {
    return u.type === "STUDENT"
      ? `${u.data.firstName} ${u.data.lastName}`.trim()
      : u.data.username;
  }
  function getIdentifier(u: UnifiedUser) {
    return u.type === "STUDENT" ? u.data.studentId : u.data.username;
  }
  function getCampusId(u: UnifiedUser) { return u.data.campusId ?? ""; }
  function getDepartmentId(u: UnifiedUser) {
    return u.type === "STUDENT"
      ? u.data.academicDepartmentId ?? ""
      : u.data.departmentId ?? "";
  }
  function getProfileImageUrl(u: UnifiedUser) {
    return u.type === "STUDENT" ? u.data.profileImageUrl : null;
  }
  function isActive(u: UnifiedUser) {
    return u.type === "STUDENT" ? u.data.status === "ACTIVE" : u.data.active;
  }

  function departmentOptionsFor(userType: "STUDENT" | "STAFF", campusId: string) {
    const expected = userType === "STUDENT" ? "ACADEMIC" : "CLEARANCE";
    return departments
      .filter(d => d.type === expected)
      .filter(d => !campusId || d.campusId === campusId)
      .filter(d => d.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const editDeptOptions = selectedUser
    ? departmentOptionsFor(selectedUser.type, editCampusId)
    : [];
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [token]);

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
          return (
            `${u.data.firstName} ${u.data.lastName}`.toLowerCase().includes(q) ||
            u.data.studentId.toLowerCase().includes(q)
          );
        }
        return (
          u.data.username.toLowerCase().includes(q) ||
          u.data.role.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [students, staffUsers, searchQuery]);

  /* ── sync edit form when selectedUser changes ─────────────── */
  useEffect(() => {
    if (!selectedUser) return;
    setShowResetPw(false);
    setNewPassword("");
    if (selectedUser.type === "STUDENT") {
      const s = selectedUser.data;
      setEditFirstName(s.firstName);
      setEditMiddleName(s.middleName ?? "");
      setEditLastName(s.lastName);
      setEditEmail(s.email ?? "");
      setEditDepartmentId(s.academicDepartmentId ?? "");
      setEditCampusId(s.campusId);
      setEditRole("STUDENT");
      setEditAcademicYear(s.academicYear ?? new Date().getFullYear());
    } else {
      const s = selectedUser.data;
      setEditFirstName(s.username);
      setEditMiddleName("");
      setEditLastName("");
      setEditEmail(s.email ?? "");
      setEditDepartmentId(s.departmentId ?? "");
      setEditCampusId(s.campusId);
      setEditRole(s.role);
      setEditAcademicYear(new Date().getFullYear());
    }
  }, [selectedUser]);

  /* ── actions ──────────────────────────────────────────────── */
  const handleUpdateUser = async () => {
    if (!selectedUser || !token) return;
    const reselect = { id: selectedUser.data.id, type: selectedUser.type };
    try {
      if (selectedUser.type === "STUDENT") {
        await api.updateStudent(token, selectedUser.data.studentId, {
          firstName: editFirstName,
          middleName: editMiddleName || undefined,
          lastName: editLastName,
          gender: selectedUser.data.gender ?? undefined,
          phone: selectedUser.data.phone ?? undefined,
          email: editEmail || undefined,
          campusId: editCampusId || selectedUser.data.campusId,
          academicDepartmentId: editDepartmentId || undefined,
          program: selectedUser.data.program ?? undefined,
          academicYear: editAcademicYear,
          graduationYear: selectedUser.data.graduationYear ?? new Date().getFullYear() + 1
        });
      } else {
        await api.updateStaffUser(token, selectedUser.data.id, {
          username: editFirstName,
          email: editEmail || undefined,
          role: editRole as Exclude<UserRole, "STUDENT">,
          departmentId: editDepartmentId || undefined,
          campusId: editCampusId || selectedUser.data.campusId
        });
      }
      showToast("Profile updated successfully.", "success");
      loadData(reselect);
    } catch (err: any) {
      showToast("Update failed: " + err.message, "error");
    }
  };

  const handleToggleActive = async () => {
    if (!selectedUser || !token) return;
    const reselect = { id: selectedUser.data.id, type: selectedUser.type };
    const nextActive = !isActive(selectedUser);
    try {
      if (selectedUser.type === "STUDENT") {
        await api.setStudentActive(token, selectedUser.data.studentId, nextActive);
      } else {
        await api.setStaffUserActive(token, selectedUser.data.id, nextActive);
      }
      showToast(`User ${nextActive ? "activated" : "deactivated"} successfully.`, "success");
      loadData(reselect);
    } catch (err: any) {
      showToast("Status change failed: " + err.message, "error");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !token || !newPassword.trim()) return;
    setPwSaving(true);
    try {
      if (selectedUser.type === "STUDENT") {
        await api.resetStudentPassword(token, selectedUser.data.studentId, newPassword.trim());
      } else {
        await api.resetStaffPassword(token, selectedUser.data.id, newPassword.trim());
      }
      setNewPassword("");
      setShowResetPw(false);
      showToast("Password reset successfully.", "success");
    } catch (err: any) {
      showToast("Password reset failed: " + err.message, "error");
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !token) return;
    if (!window.confirm(`Are you sure you want to permanently delete this ${selectedUser.type === "STUDENT" ? "student" : "staff member"}? This cannot be undone.`)) {
      return;
    }
    setDeletingUser(true);
    try {
      if (selectedUser.type === "STUDENT") {
        await api.deleteStudent(token, selectedUser.data.studentId);
      } else {
        await api.deleteStaffUser(token, selectedUser.data.id);
      }
      showToast(`${selectedUser.type === "STUDENT" ? "Student" : "Staff member"} deleted successfully.`, "success");
      setSelectedUser(null);
      loadData();
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingUser(false);
    }
  };

  const handleCreate = async () => {
    if (!token) return;
    try {
      if (createUserType === "STUDENT") {
        await api.createStudent(token, {
          studentId: createData.identifier,
          firstName: createData.firstName,
          middleName: createData.middleName || undefined,
          lastName: createData.lastName,
          email: createData.email,
          campusId: createData.campusId,
          academicDepartmentId: createData.departmentId || undefined,
          academicYear: createData.academicYear || new Date().getFullYear(),
          graduationYear: new Date().getFullYear() + 1,
          temporaryPassword: createData.password || undefined
        });
      } else {
        await api.createStaffUser(token, {
          username: createData.identifier,
          email: createData.email || undefined,
          temporaryPassword: createData.password || undefined,
          role: createData.role as Exclude<UserRole, "STUDENT">,
          departmentId: createData.departmentId || undefined,
          campusId: createData.campusId
        });
      }
      setCreateData({ ...BLANK_CREATE });
      showToast(`${createUserType === "STUDENT" ? "Student" : "Staff"} registered successfully.`, "success");
      loadData();
    } catch (err: any) {
      showToast("Registration failed: " + err.message, "error");
    }
  };

  const handleImport = async () => {
    if (!token || !importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await api.importStudentsCsv(token, importFile);
      setImportResult(result);
      loadData();
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      showToast("Import failed: " + err.message, "error");
    } finally {
      setImporting(false);
    }
  };

  function downloadTemplate() {
    const header =
      "studentId,firstName,middleName,lastName,gender,phone,email,campusId,academicDepartmentId,program,academicYear,graduationYear,password";
    const example =
      "UGR/001/16,Abebe,Bekele,Tadesse,MALE,+251900000000,abebe@uog.edu.et,TEWODROS,,Computer Science,2024,2028,";
    const csv = [header, example].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── shared input class ───────────────────────────────────── */
  const inputCls =
    "w-full bg-surface-container-high border-none rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/40 transition-shadow";

  /* ══════════════════════════════════════════════════════════ */
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

      {/* ── Left Sidebar (only active items) ── */}
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
          <a
            className="flex items-center gap-4 p-3 bg-white text-primary font-bold rounded-lg shadow-sm"
            href="#"
          >
            <span className="material-symbols-outlined">group</span>
            <span className="text-sm font-medium uppercase tracking-[0.05em]">User Registry</span>
          </a>
        </nav>

        <div className="mt-auto pt-6 border-t border-outline-variant/20">
          <p className="text-[10px] text-on-surface-variant text-center">V2.1.0 • SECURE SESSION</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ml-72 px-8 pb-12 min-h-screen bg-surface" style={{ paddingTop: 'calc(5rem + 2rem)' }}>

        {/* Stats bento */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="md:col-span-2 bg-gradient-to-br from-primary to-primary-container p-8 rounded-2xl text-white shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">User Registry Management</h2>
              <p className="text-primary-fixed opacity-80 text-sm">
                Centralised authority for University of Gondar staff and student credentials.
              </p>
            </div>
            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={() => {
                  setRightPanelTab(createUserType === "STAFF" ? "REGISTER_STAFF" : "REGISTER_STUDENT");
                }}
                className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:bg-white/30 shadow-lg border border-white/20"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                Register New User
              </button>
              <button
                onClick={() => setRightPanelTab("IMPORT")}
                className="bg-secondary-container text-on-secondary-container px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:brightness-105 shadow-lg"
              >
                <span className="material-symbols-outlined text-lg">upload_file</span>
                Bulk Import
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
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>Loaded from DB</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between shadow-sm border border-surface-container">
            <span className="material-symbols-outlined text-secondary text-3xl">badge</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total Staff</p>
              <p className="text-4xl font-black text-primary">{staffUsers.length.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>All records verified</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── User list ── */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-surface-container-low p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-grow w-full">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  type="text"
                  placeholder="Search by Name, ID, or Role..."
                  className="w-full pl-12 pr-4 py-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-primary/40 text-sm shadow-sm transition-shadow"
                />
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-surface-container">
              <div className="px-6 py-4 border-b border-surface-container flex justify-between items-center bg-surface-container-low/30">
                <h3 className="text-sm font-bold text-on-primary-fixed-variant uppercase tracking-wider">Active Registry</h3>
                <span className="text-xs text-on-surface-variant">
                  {loading ? "Loading..." : `Showing ${unifiedList.length} users`}
                </span>
              </div>
              <div className="divide-y divide-surface-container max-h-[600px] overflow-y-auto">
                {unifiedList.map(u => {
                  const isSelected =
                    selectedUser?.data.id === u.data.id && selectedUser?.type === u.type;
                  const name = getDisplayName(u);
                  const identifier = getIdentifier(u);
                  const roleBadge = u.type === "STUDENT" ? "Student" : u.data.role;
                  const deptInfo = departments.find(d => d.id === getDepartmentId(u));
                  const campusInfo = campuses.find(c => c.code === getCampusId(u));
                  const imgUrl = getProfileImageUrl(u);

                  return (
                    <div
                      key={`${u.type}-${u.data.id}`}
                      onClick={() => { setSelectedUser(u); setRightPanelTab("EDIT"); }}
                      className={`px-6 py-5 flex items-center justify-between cursor-pointer transition-colors group ${
                        isSelected
                          ? "bg-primary-fixed/20 border-l-4 border-primary"
                          : "hover:bg-primary-fixed/10 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center overflow-hidden border ${
                          u.type === "STAFF" ? "border-secondary border-2" : "border-outline-variant/10"
                        }`}>
                          {imgUrl ? (
                            <img src={toApiUrl(imgUrl) ?? undefined} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-on-surface-variant">
                              {u.type === "STUDENT" ? "person" : "badge"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm flex items-center gap-2">
                            {name}
                            {!isActive(u) && <span className="w-2 h-2 rounded-full bg-error" title="Inactive" />}
                          </p>
                          <p className="text-xs text-on-surface-variant">ID: {identifier}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-12">
                        <div className="hidden md:block">
                          <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-tighter ${
                            u.type === "STUDENT"
                              ? "bg-primary-fixed text-on-primary-fixed-variant"
                              : "bg-secondary-fixed text-on-secondary-fixed-variant"
                          }`}>
                            {roleBadge}
                          </span>
                        </div>
                        <div className="hidden md:block text-right w-32">
                          <p className="text-xs font-medium text-on-surface truncate">{campusInfo?.name || "---"}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">{deptInfo?.name || "---"}</p>
                        </div>
                        <span className={`material-symbols-outlined transition-opacity ${
                          isSelected ? "text-primary opacity-100" : "text-on-surface-variant opacity-0 group-hover:opacity-100"
                        }`}>
                          {isSelected ? "edit_square" : "chevron_right"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {unifiedList.length === 0 && !loading && (
                  <div className="p-8 text-center text-on-surface-variant text-sm">
                    No users found matching query.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Tab bar */}
            <div className="bg-surface-container-low p-1.5 rounded-2xl flex gap-1 shadow-sm">
              {(
                [
                  { tab: "EDIT", icon: "manage_accounts", label: "Edit" },
                  { tab: "REGISTER_STUDENT", icon: "person_add", label: "Student" },
                  { tab: "REGISTER_STAFF", icon: "badge", label: "Staff" },
                  { tab: "IMPORT", icon: "upload_file", label: "Import" }
                ] as { tab: RightTab; icon: string; label: string }[]
              ).map(({ tab, icon, label }) => (
                <button
                  key={tab}
                  onClick={() => {
                    setRightPanelTab(tab);
                    if (tab === "REGISTER_STUDENT") setCreateUserType("STUDENT");
                    if (tab === "REGISTER_STAFF") setCreateUserType("STAFF");
                    if (tab === "IMPORT") setImportResult(null);
                  }}
                  className={`flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    rightPanelTab === tab
                      ? "bg-white text-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* ── EDIT tab ── */}
            {rightPanelTab === "EDIT" && (
              selectedUser ? (
                <div className="bg-surface-container-lowest rounded-2xl shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)] overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary-container to-primary" />
                  <div className="relative pt-8 mb-6 flex flex-col items-center px-6 pb-4">
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-white mb-4 flex items-center justify-center">
                      {getProfileImageUrl(selectedUser) ? (
                        <img
                          src={toApiUrl(getProfileImageUrl(selectedUser)) ?? undefined}
                          alt="User"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant">
                          {selectedUser.type === "STUDENT" ? "person" : "badge"}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-bold text-primary">
                      {editFirstName} {editLastName}
                    </h4>
                    <p className="text-on-surface-variant text-sm flex items-center gap-2">
                      {getIdentifier(selectedUser)}
                      {!isActive(selectedUser) && (
                        <span className="text-error font-bold text-xs uppercase border border-error px-1 rounded">
                          Inactive
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="space-y-4 px-6 pb-6">
                    {/* Name row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">First</label>
                        <input type="text" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Middle</label>
                        <input type="text" value={editMiddleName} onChange={e => setEditMiddleName(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Last</label>
                        <input type="text" value={editLastName} onChange={e => setEditLastName(e.target.value)} className={inputCls} />
                      </div>
                    </div>

                    {/* Campus */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Campus</label>
                      <select
                        value={editCampusId}
                        onChange={e => { setEditCampusId(e.target.value); setEditDepartmentId(""); }}
                        className={inputCls}
                      >
                        <option value="">Select Campus</option>
                        {campuses.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Email</label>
                      <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className={inputCls} placeholder="user@uog.edu.et" />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">
                        {selectedUser.type === "STUDENT" ? "Academic Department" : "Clearance Office"}
                      </label>
                      <select value={editDepartmentId} onChange={e => setEditDepartmentId(e.target.value)} className={inputCls}>
                        <option value="">Select Department</option>
                        {editDeptOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>

                    {/* Academic Year (students only) */}
                    {selectedUser.type === "STUDENT" && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Academic Year</label>
                        <input type="number" value={editAcademicYear} onChange={e => setEditAcademicYear(parseInt(e.target.value))} className={inputCls} min="2000" max={new Date().getFullYear() + 10} />
                      </div>
                    )}

                    {/* Role (staff only) */}
                    {selectedUser.type === "STAFF" && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Role</label>
                        <select value={editRole} onChange={e => setEditRole(e.target.value)} className={inputCls}>
                          <option value="PROCTOR">Proctor</option>
                          <option value="DEPARTMENT_HEAD">Department Head</option>
                          <option value="LIBRARIAN">Librarian</option>
                          <option value="STUDENT_DEAN">Student Dean</option>
                          <option value="CAFE_STAFF">Cafe Staff</option>
                          <option value="FINANCE_OFFICER">Finance Officer</option>
                          <option value="MAIN_REGISTRAR">Main Registrar</option>
                          <option value="SYSTEM_ADMIN">System Admin</option>
                        </select>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleUpdateUser}
                        className="flex-1 bg-primary hover:bg-primary-container hover:text-on-primary-container text-white py-3 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-all"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleToggleActive}
                        title={isActive(selectedUser) ? "Deactivate User" : "Activate User"}
                        className={`px-4 py-3 rounded-lg font-bold text-sm shadow-sm transition-colors ${
                          isActive(selectedUser)
                            ? "bg-error-container text-on-error-container hover:bg-error hover:text-white"
                            : "bg-outline-variant text-on-surface-variant hover:bg-primary hover:text-white"
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg leading-none">
                          {isActive(selectedUser) ? "block" : "check_circle"}
                        </span>
                      </button>
                      <button
                        onClick={handleDeleteUser}
                        disabled={deletingUser}
                        title="Delete User"
                        className="px-4 py-3 rounded-lg font-bold text-sm shadow-sm transition-colors bg-error-container text-on-error-container hover:bg-error hover:text-white disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-lg leading-none">delete</span>
                      </button>
                    </div>

                    {/* Reset Password */}
                    <div className="border-t border-surface-container pt-4">
                      <button
                        onClick={() => setShowResetPw(v => !v)}
                        className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">lock_reset</span>
                        {showResetPw ? "Cancel Password Reset" : "Reset Password"}
                      </button>

                      {showResetPw && (
                        <div className="mt-3 flex gap-2">
                          <input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className={`${inputCls} flex-1`}
                          />
                          <button
                            onClick={handleResetPassword}
                            disabled={pwSaving || !newPassword.trim()}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-opacity"
                          >
                            {pwSaving ? "..." : "Set"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-container-lowest rounded-2xl p-10 border border-outline-variant/10 text-center flex flex-col items-center justify-center text-on-surface-variant h-80 shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)]">
                  <div className="w-16 h-16 rounded-full bg-primary-fixed/30 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-primary opacity-60">manage_accounts</span>
                  </div>
                  <p className="font-bold text-sm uppercase tracking-wider">No Selection</p>
                  <p className="text-xs mt-2 opacity-80">Select a user from the registry to view &amp; edit their profile.</p>
                </div>
              )
            )}

            {/* ── REGISTER_STUDENT / REGISTER_STAFF tab ── */}
            {(rightPanelTab === "REGISTER_STUDENT" || rightPanelTab === "REGISTER_STAFF") && (
              <div className="bg-surface-container-lowest rounded-2xl shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)] p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-container">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    createUserType === "STUDENT"
                      ? "bg-primary-fixed text-on-primary-fixed"
                      : "bg-secondary-fixed text-on-secondary-fixed"
                  }`}>
                    <span className="material-symbols-outlined">
                      {createUserType === "STUDENT" ? "school" : "badge"}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">
                      Register {createUserType === "STUDENT" ? "Student" : "Staff"}
                    </h3>
                    <p className="text-xs text-on-surface-variant">Add a single new user to the registry.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">First</label>
                      <input type="text" value={createData.firstName} onChange={e => setCreateData({ ...createData, firstName: e.target.value })} className={inputCls} placeholder="First" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Middle</label>
                      <input type="text" value={createData.middleName} onChange={e => setCreateData({ ...createData, middleName: e.target.value })} className={inputCls} placeholder="(opt)" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Last</label>
                      <input type="text" value={createData.lastName} onChange={e => setCreateData({ ...createData, lastName: e.target.value })} className={inputCls} placeholder="Last" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">
                      {createUserType === "STUDENT" ? "Student ID" : "Staff Username"}
                    </label>
                    <input
                      type="text"
                      value={createData.identifier}
                      onChange={e => setCreateData({ ...createData, identifier: e.target.value })}
                      className={inputCls}
                      placeholder={createUserType === "STUDENT" ? "UGR/1234/15" : "STAFF/001"}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Email</label>
                      <input type="email" value={createData.email} onChange={e => setCreateData({ ...createData, email: e.target.value })} className={inputCls} placeholder="user@uog.edu.et" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Password</label>
                      <input type="password" value={createData.password} onChange={e => setCreateData({ ...createData, password: e.target.value })} className={inputCls} placeholder="(default: ID)" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Campus</label>
                      <select value={createData.campusId} onChange={e => setCreateData({ ...createData, campusId: e.target.value, departmentId: "" })} className={inputCls}>
                        <option value="">Select...</option>
                        {campuses.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">
                        {createUserType === "STUDENT" ? "Department" : "Office"}
                      </label>
                      <select value={createData.departmentId} onChange={e => setCreateData({ ...createData, departmentId: e.target.value })} className={inputCls}>
                        <option value="">{createData.campusId ? "Select..." : "Campus first"}</option>
                        {createDeptOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {createUserType === "STUDENT" && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Academic Year</label>
                      <input 
                        type="number" 
                        value={createData.academicYear || new Date().getFullYear()} 
                        onChange={e => setCreateData({ ...createData, academicYear: parseInt(e.target.value) })} 
                        className={inputCls} 
                        min="2000" 
                        max={new Date().getFullYear() + 10}
                      />
                    </div>
                  )}

                  {createUserType === "STAFF" && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Role</label>
                      <select value={createData.role} onChange={e => setCreateData({ ...createData, role: e.target.value })} className={inputCls}>
                        <option value="PROCTOR">Proctor</option>
                        <option value="DEPARTMENT_HEAD">Department Head</option>
                        <option value="LIBRARIAN">Librarian</option>
                        <option value="STUDENT_DEAN">Student Dean</option>
                        <option value="CAFE_STAFF">Cafe Staff</option>
                        <option value="FINANCE_OFFICER">Finance Officer</option>
                        <option value="MAIN_REGISTRAR">Main Registrar</option>
                        <option value="SYSTEM_ADMIN">System Admin</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setCreateData({ ...BLANK_CREATE })}
                    className="flex-1 py-3 text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleCreate}
                    className="flex-1 py-3 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-container hover:text-on-primary-container shadow-md transition-colors"
                  >
                    Register
                  </button>
                </div>
              </div>
            )}

            {/* ── IMPORT tab ── */}
            {rightPanelTab === "IMPORT" && (
              <div className="bg-surface-container-lowest rounded-2xl shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)] p-6">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-surface-container">
                  <div className="w-10 h-10 rounded-xl bg-tertiary flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">upload_file</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Bulk Student Import</h3>
                    <p className="text-xs text-on-surface-variant">Upload Excel (.xlsx) or CSV with student data.</p>
                  </div>
                </div>

                {/* Format guide */}
                <div className="bg-primary-fixed/30 rounded-lg p-4 mb-5 text-xs text-on-primary-fixed-variant space-y-1.5">
                  <p className="font-bold text-sm mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">info</span>
                    Required Columns (in order)
                  </p>
                  {[
                    ["A", "studentId", "e.g. UGR/001/16"],
                    ["B", "firstName", ""],
                    ["C", "middleName", "(optional)"],
                    ["D", "lastName", ""],
                    ["E", "gender", "MALE or FEMALE"],
                    ["F", "phone", "(optional)"],
                    ["G", "email", "(optional)"],
                    ["H", "campusId", "TEWODROS / MARAKI / FASIL"],
                    ["I", "academicDepartmentId", "(optional dept ID)"],
                    ["J", "program", "(optional)"],
                    ["K", "academicYear", "e.g. 2024"],
                    ["L", "graduationYear", "e.g. 2028"],
                    ["M", "password", "(optional — default: studentId)"]
                  ].map(([col, field, hint]) => (
                    <div key={col} className="flex gap-2">
                      <span className="w-5 font-black text-primary shrink-0">{col}</span>
                      <span className="font-semibold w-36 shrink-0">{field}</span>
                      <span className="opacity-70">{hint}</span>
                    </div>
                  ))}
                  <p className="text-[10px] opacity-70 pt-1">
                    Row 1 must be the header. Each campus value in column H determines which campus the student belongs to — supporting all three campuses in one file.
                  </p>
                </div>

                <button
                  onClick={downloadTemplate}
                  className="w-full mb-4 py-2.5 text-sm font-bold text-primary border-2 border-primary/30 hover:border-primary hover:bg-primary-fixed/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  Download CSV Template
                </button>

                {/* File picker */}
                <div
                  className="border-2 border-dashed border-outline-variant rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary-fixed/10 transition-colors mb-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2 block">folder_open</span>
                  {importFile ? (
                    <p className="text-sm font-bold text-primary">{importFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-on-surface-variant">Click to select file</p>
                      <p className="text-xs text-on-surface-variant opacity-70 mt-1">Supports .xlsx and .csv</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0] ?? null;
                      setImportFile(f);
                      setImportResult(null);
                    }}
                  />
                </div>

                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="w-full py-3 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-container hover:text-on-primary-container shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Importing…</>
                  ) : (
                    <><span className="material-symbols-outlined text-base">cloud_upload</span> Upload &amp; Import</>
                  )}
                </button>

                {/* Import results */}
                {importResult && (
                  <div className="mt-5 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-surface-container p-3 rounded-lg text-center">
                        <p className="text-2xl font-black text-on-surface">{importResult.totalRows}</p>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase">Total Rows</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-black text-green-700">{importResult.importedCount}</p>
                        <p className="text-[10px] text-green-600 font-bold uppercase">Imported</p>
                      </div>
                      <div className={`p-3 rounded-lg text-center ${importResult.failedCount > 0 ? "bg-red-50" : "bg-surface-container"}`}>
                        <p className={`text-2xl font-black ${importResult.failedCount > 0 ? "text-red-700" : "text-on-surface"}`}>
                          {importResult.failedCount}
                        </p>
                        <p className={`text-[10px] font-bold uppercase ${importResult.failedCount > 0 ? "text-red-600" : "text-on-surface-variant"}`}>
                          Failed
                        </p>
                      </div>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                        <p className="text-xs font-bold text-red-700 mb-2">Row Errors:</p>
                        {importResult.errors.map((e, i) => (
                          <p key={i} className="text-[11px] text-red-600 leading-relaxed">{e}</p>
                        ))}
                      </div>
                    )}

                    {importResult.importedCount > 0 && (
                      <p className="text-xs text-green-700 font-medium text-center flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        {importResult.importedCount} students added to the registry.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
