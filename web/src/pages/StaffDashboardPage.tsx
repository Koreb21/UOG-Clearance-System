import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusByCode, getCampusBySlug } from "../modules/campus/catalog";
import { StaffWorkbenchTailwind } from "./staff/StaffWorkbenchTailwind";
import { roleConfigs } from "./staff/staffRoleConfig";
import { useStaffWorkspace } from "./staff/useStaffWorkspace";

export function StaffDashboardPage() {
  const { user, token } = useAuth();
  const { campusSlug } = useParams();
  const routeCampus = getCampusBySlug(campusSlug);
  const campus = routeCampus ?? getCampusByCode(user?.campusId ?? null);

  const staffRole =
    user?.role && user.role in roleConfigs ? (user.role as keyof typeof roleConfigs) : "DEPARTMENT_HEAD";
  const roleConfig = roleConfigs[staffRole];
  const workspace = useStaffWorkspace(roleConfig);

  // Profile update state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: user?.email ?? "" });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    if (!profileForm.email || !profileForm.email.trim()) {
      setProfileFeedback({ ok: false, msg: "Email is required." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
      setProfileFeedback({ ok: false, msg: "Please enter a valid email address." });
      return;
    }
    setProfileSubmitting(true);
    setProfileFeedback(null);
    try {
      await api.updateMyProfile(token, { email: profileForm.email.trim() });
      setProfileFeedback({ ok: true, msg: "Email updated successfully." });
      setTimeout(() => setShowProfileModal(false), 1500);
    } catch (e) {
      setProfileFeedback({ ok: false, msg: e instanceof Error ? e.message : "Failed to update email." });
    } finally {
      setProfileSubmitting(false);
    }
  }

  return (
    <StaffWorkbenchTailwind
      campus={campus}
      roleConfig={roleConfig}
      staffRole={staffRole}
      {...workspace}
      showProfileModal={showProfileModal}
      setShowProfileModal={setShowProfileModal}
      profileForm={profileForm}
      setProfileForm={setProfileForm}
      profileSubmitting={profileSubmitting}
      profileFeedback={profileFeedback}
      handleUpdateProfile={handleUpdateProfile}
    />
  );
}
