import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { toMediaUrl } from "../../lib/api";
import { useTheme } from "../../modules/theme/ThemeContext";
import type { ClearanceRequest, ClearanceStatus } from "../../types";

const CHECK_ICONS: Record<string, string> = {
  LIBRARY: "local-library",
  PROCTOR: "security",
  CAFE: "restaurant",
  DEPARTMENT_HEAD: "account-balance",
  STUDENT_DEAN: "groups",
  FINANCE: "account-balance-wallet",
  REGISTRAR: "app-registration",
};

function checkIcon(code: string): string {
  return CHECK_ICONS[code] ?? "check-circle";
}

function checkLabel(code: string) {
  const map: Record<string, string> = {
    LIBRARY: "Main Library",
    PROCTOR: "Proctor Office",
    CAFE: "Cafe",
    DEPARTMENT_HEAD: "Department Head",
    STUDENT_DEAN: "Student Service",
    FINANCE: "Finance Office",
    REGISTRAR: "Registrar Office",
  };
  return map[code] ?? code.replace(/_/g, " ");
}

const REQ_TYPES: { id: "SEMESTER" | "FINAL" | "WITHDRAWAL"; label: string }[] = [
  { id: "SEMESTER", label: "Semester" },
  { id: "FINAL", label: "Final" },
  { id: "WITHDRAWAL", label: "Withdrawal" },
];

type Props = {
  status: ClearanceStatus | null;
  username: string;
  refreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  requests: ClearanceRequest[];
  selectedRequestId: string;
  onSelectRequest: (id: string) => void;
  onCreateRequest: (form: { semester: string; academicYearLabel: string; requestType: "SEMESTER" | "FINAL" | "WITHDRAWAL" }) => Promise<void>;
};

export function OverviewTab({ status, username, refreshing, onRefresh, onLogout, requests, selectedRequestId, onSelectRequest, onCreateRequest }: Props) {
  const { tokens, mode } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState<{ semester: string; academicYearLabel: string; requestType: "SEMESTER" | "FINAL" | "WITHDRAWAL" }>({ semester: "", academicYearLabel: "", requestType: "SEMESTER" });
  const [creating, setCreating] = useState(false);

  const student = status?.student;
  const displayName = student ? `${student.firstName} ${student.lastName}` : username;
  const cleared = status?.checks.filter((c: { status: string }) => c.status === "CLEARED").length ?? 0;
  const total = status?.checks.length ?? 7;
  const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;
  const bottleneck = status?.checks.find((c: { status: string; checkCode: string }) => c.status !== "CLEARED")?.checkCode ?? "None";

  const isDark = mode === "dark";

  async function handleCreate() {
    if (!newForm.semester.trim() || !newForm.academicYearLabel.trim()) return;
    setCreating(true);
    try {
      await onCreateRequest(newForm);
      setShowCreate(false);
      setNewForm({ semester: "", academicYearLabel: "", requestType: "SEMESTER" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Hero card */}
      <LinearGradient colors={isDark ? ["#001e40", "#1a3050"] : ["#001e40", "#2f476b"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { backgroundColor: isDark ? "#001e40" : "transparent" }]}>
        <View style={[styles.heroGlow, { backgroundColor: `${tokens.secondary}33` }]} />
        <View style={styles.heroTop}>
          <View style={styles.heroIdent}>
            {student?.profileImageUrl ? (
              <Image source={{ uri: toMediaUrl(student.profileImageUrl) ?? "" }} style={[styles.avatar, { borderColor: "rgba(255,255,255,0.2)" }]} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.2)" }]}>
                <Text style={[styles.avatarFallbackText, { color: "#fff" }]}>{displayName[0]?.toUpperCase() ?? "S"}</Text>
              </View>
            )}
            <View style={styles.heroInfo}>
              <Text style={[styles.heroName, { color: "#fff" }]}>{displayName}</Text>
              <Text style={[styles.heroId, { color: "rgba(255,255,255,0.75)" }]}>ID: {student?.studentId ?? username}</Text>
              <View style={[styles.campusBadge, { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.18)" }]}>
                <MaterialIcons name="stars" size={12} color="#fff" />
                <Text style={[styles.campusBadgeText, { color: "#fff" }]}>{student?.campusId?.replace(/_/g, " ") ?? "Campus"}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.heroActions}>
          <Pressable style={[styles.refreshBtn, { backgroundColor: tokens.secondaryContainer }]} onPress={onRefresh} disabled={refreshing}>
            <MaterialIcons name="refresh" size={18} color={tokens.onSecondaryContainer} />
            <Text style={[styles.refreshBtnText, { color: tokens.onSecondaryContainer }]}>{refreshing ? "Refreshing…" : "Refresh"}</Text>
          </Pressable>
          <Pressable style={[styles.signOutBtn, { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.1)" }]} onPress={onLogout}>
            <MaterialIcons name="logout" size={18} color="#fff" />
            <Text style={[styles.signOutBtnText, { color: "#fff" }]}>Sign Out</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Stat chips */}
      <View style={styles.stats}>
        <View style={[styles.statCard, { backgroundColor: isDark ? tokens.surfaceContainerLowest : "rgba(255,255,255,0.85)", borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)" }]}>
          <Text style={[styles.statLabel, { color: tokens.onSurfaceVariant }]}>PROGRESS</Text>
          <Text style={[styles.statValue, { color: tokens.primary }]}>{pct}%</Text>
          <View style={[styles.miniBar, { backgroundColor: tokens.surfaceContainer }]}>
            <View style={[styles.miniBarFill, { backgroundColor: tokens.secondary, width: `${pct}%` }]} />
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? tokens.surfaceContainerLowest : "rgba(255,255,255,0.85)", borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)" }]}>
          <Text style={[styles.statLabel, { color: tokens.onSurfaceVariant }]}>CHECKS</Text>
          <Text style={[styles.statValue, { color: tokens.primary }]}>{cleared}/{total}</Text>
          <Text style={[styles.statSub, { color: tokens.secondary }]}>ACTIVE</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? tokens.surfaceContainerLowest : "rgba(255,255,255,0.85)", borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)" }]}>
          <Text style={[styles.statLabel, { color: tokens.onSurfaceVariant }]}>BOTTLENECK</Text>
          <Text style={[styles.statValue, { color: tokens.error, fontSize: 14 }]}>{checkLabel(bottleneck)}</Text>
          <Text style={[styles.statSub, { color: tokens.error }]}>ACTION REQ.</Text>
        </View>
      </View>

      {/* Request selector + create */}
      <View style={[styles.section, { gap: 12 }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionEyebrow, { color: tokens.onSurfaceVariant }]}>Clearance Requests</Text>
          <Pressable style={[styles.newReqBtn, { backgroundColor: tokens.primaryContainer }]} onPress={() => setShowCreate((v) => !v)}>
            <MaterialIcons name="add" size={16} color={tokens.onPrimary} />
            <Text style={[styles.newReqText, { color: tokens.onPrimary }]}>New</Text>
          </Pressable>
        </View>

        {showCreate && (
          <View style={[styles.createCard, {
            backgroundColor: isDark ? tokens.surfaceContainerLow : "rgba(255,255,255,0.8)",
            borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)",
          }]}>
            <Text style={[styles.createTitle, { color: tokens.primary }]}>New Clearance Request</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceContainerLowest, color: tokens.onSurface, borderColor: tokens.outlineVariant }]}
              placeholder="Semester (e.g. I, II)"
              placeholderTextColor={tokens.onSurfaceVariant}
              value={newForm.semester}
              onChangeText={(t) => setNewForm((c) => ({ ...c, semester: t }))}
            />
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceContainerLowest, color: tokens.onSurface, borderColor: tokens.outlineVariant }]}
              placeholder="Academic Year (e.g. 2024/25)"
              placeholderTextColor={tokens.onSurfaceVariant}
              value={newForm.academicYearLabel}
              onChangeText={(t) => setNewForm((c) => ({ ...c, academicYearLabel: t }))}
            />
            <View style={styles.typeRow}>
              {REQ_TYPES.map((rt) => (
                <Pressable
                  key={rt.id}
                  onPress={() => setNewForm((c) => ({ ...c, requestType: rt.id }))}
                  style={[styles.typeChip, {
                    backgroundColor: newForm.requestType === rt.id ? tokens.secondaryContainer : tokens.surfaceContainer,
                    borderColor: newForm.requestType === rt.id ? tokens.secondary : tokens.outlineVariant,
                  }]}
                >
                  <Text style={[{ fontSize: 12, fontWeight: "700", color: newForm.requestType === rt.id ? tokens.onSecondaryContainer : tokens.onSurfaceVariant }]}>
                    {rt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.createBtn, {
                backgroundColor: tokens.secondary,
                shadowColor: isDark ? "#000" : "#006a63",
                opacity: pressed || creating ? 0.85 : 1,
              }]}
              onPress={() => void handleCreate()}
              disabled={creating || !newForm.semester.trim() || !newForm.academicYearLabel.trim()}
            >
              <Text style={styles.createBtnText}>{creating ? "Creating…" : "Submit Request"}</Text>
            </Pressable>
          </View>
        )}

        {requests.length === 0 ? (
          <Text style={[styles.empty, { color: tokens.onSurfaceVariant }]}>No clearance requests yet. Create one above.</Text>
        ) : (
          <View style={styles.reqList}>
            {requests.map((req) => {
              const active = req.id === selectedRequestId;
              return (
                <Pressable
                  key={req.id}
                  onPress={() => onSelectRequest(req.id)}
                  style={[styles.reqCard, {
                    backgroundColor: active ? tokens.secondaryContainer : isDark ? tokens.surfaceContainerLowest : "rgba(255,255,255,0.8)",
                    borderColor: active ? tokens.secondary : isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)",
                  }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.reqNum, { color: active ? tokens.onSecondaryContainer : tokens.primary }]}>{req.requestNumber}</Text>
                    <Text style={[styles.reqMeta, { color: tokens.onSurfaceVariant }]}>{req.requestType} · {req.semester} · {req.academicYearLabel}</Text>
                  </View>
                  <View style={[styles.reqStatus, { backgroundColor: active ? tokens.secondary : isDark ? tokens.surfaceContainer : tokens.surfaceContainer }]}>
                    <Text style={[{ fontSize: 10, fontWeight: "800", color: active ? "#fff" : tokens.onSurfaceVariant }]}>{req.status}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Live status */}
      <View style={[styles.section, { gap: 12 }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionEyebrow, { color: tokens.onSurfaceVariant }]}>Live Status</Text>
          <View style={[styles.syncBadge, { gap: 6 }]}>
            <View style={[styles.syncDot, { backgroundColor: tokens.secondary }]} />
            <Text style={[styles.syncText, { color: tokens.onSurfaceVariant }]}>Real-time sync</Text>
          </View>
        </View>

        {!status ? (
          <Text style={[styles.empty, { color: tokens.onSurfaceVariant }]}>Select or create a request to load status.</Text>
        ) : (
          <View style={[styles.checkList, { gap: 10 }]}>
            {status.checks.map((check) => {
              const isCleared = check.status === "CLEARED";
              const isError = check.status === "FLAGGED" || check.status === "FAILED" || check.status === "AWAITING_FINANCE";
              const isLocked = !isCleared && !isError;
              const borderColor = isCleared ? tokens.secondary : isError ? tokens.error : tokens.outlineVariant;
              return (
                <View
                  key={check.id}
                  style={[styles.checkRow, {
                    backgroundColor: isDark ? tokens.surfaceContainerLow : "rgba(255,255,255,0.7)",
                    borderLeftColor: borderColor,
                    opacity: isLocked ? 0.6 : 1,
                  }]}
                >
                  <View style={[styles.checkIconWrap, {
                    backgroundColor: isCleared ? `${tokens.secondary}22` : isError ? `${tokens.error}18` : tokens.surfaceContainer,
                  }]}>
                    <MaterialIcons
                      name={checkIcon(check.checkCode) as any}
                      size={20}
                      color={isCleared ? tokens.secondary : isError ? tokens.error : tokens.outline}
                    />
                  </View>
                  <View style={styles.checkInfo}>
                    <Text style={[styles.checkName, { color: isLocked ? tokens.onSurfaceVariant : tokens.onSurface }]}>
                      {checkLabel(check.checkCode)}
                    </Text>
                    <Text style={[styles.checkStatus, {
                      color: isCleared ? tokens.secondary : isError ? tokens.error : tokens.onSurfaceVariant,
                    }]}>
                      {isLocked ? `LOCKED (Pending ${checkLabel(bottleneck)})` : check.status.replace(/_/g, " ")}
                    </Text>
                  </View>
                  <MaterialIcons
                    name={isCleared ? "check-circle" : isError ? "error-outline" : "lock"}
                    size={20}
                    color={isCleared ? tokens.secondary : isError ? tokens.error : tokens.outline}
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 16 },
  hero: { borderRadius: 24, padding: 20, gap: 16, overflow: "hidden", position: "relative" },
  heroGlow: {
    position: "absolute", top: -40, right: -40, width: 160, height: 160,
    borderRadius: 80,
  },
  heroTop: {},
  heroIdent: { flexDirection: "row", gap: 14, alignItems: "center" },
  avatar: { width: 76, height: 76, borderRadius: 18, borderWidth: 2 },
  avatarFallback: {
    width: 76, height: 76, borderRadius: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 2,
  },
  avatarFallbackText: { fontSize: 28, fontWeight: "800" },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { fontSize: 20, fontWeight: "800" },
  heroId: { fontSize: 13 },
  campusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
    marginTop: 2,
  },
  campusBadgeText: { fontSize: 11, fontWeight: "600" },
  heroActions: { flexDirection: "row", gap: 10 },
  refreshBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 14, height: 46,
  },
  refreshBtnText: { fontWeight: "700", fontSize: 14 },
  signOutBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 14, height: 46, borderWidth: 1,
  },
  signOutBtnText: { fontWeight: "700", fontSize: 14 },
  stats: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, borderRadius: 20, padding: 14, alignItems: "center", gap: 4,
    borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  statValue: { fontSize: 20, fontWeight: "800" },
  statSub: { fontSize: 9, fontWeight: "700" },
  miniBar: { width: "100%", height: 3, borderRadius: 2, marginTop: 2 },
  miniBarFill: { height: "100%", borderRadius: 2 },
  section: {},
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionEyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase" },
  syncBadge: { flexDirection: "row", alignItems: "center" },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { fontSize: 11 },
  empty: { fontSize: 13, textAlign: "center", padding: 20 },
  newReqBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  newReqText: { fontSize: 12, fontWeight: "800" },
  createCard: { borderRadius: 20, padding: 16, gap: 10, borderWidth: 1 },
  createTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  input: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: {
    flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 10,
    paddingVertical: 10, borderWidth: 1,
  },
  createBtn: {
    borderRadius: 14, height: 48, alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 5,
  },
  createBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  reqList: { gap: 8 },
  reqCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, padding: 14, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  reqNum: { fontSize: 13, fontWeight: "800" },
  reqMeta: { fontSize: 11 },
  reqStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  checkList: {},
  checkRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 20, padding: 14,
    borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  checkIconWrap: { width: 40, height: 40, borderRadius: 9999, alignItems: "center", justifyContent: "center" },
  checkInfo: { flex: 1, gap: 2 },
  checkName: { fontSize: 14, fontWeight: "700" },
  checkStatus: { fontSize: 11, fontWeight: "700" },
});
