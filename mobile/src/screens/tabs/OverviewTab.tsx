import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { toMediaUrl } from "../../lib/api";
import { tokens } from "../../theme/tokens";
import type { ClearanceStatus } from "../../types";

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

type Props = {
  status: ClearanceStatus | null;
  username: string;
  refreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
};

export function OverviewTab({ status, username, refreshing, onRefresh, onLogout }: Props) {
  const student = status?.student;
  const displayName = student ? `${student.firstName} ${student.lastName}` : username;
  const cleared = status?.checks.filter((c: { status: string }) => c.status === "CLEARED").length ?? 0;
  const total = status?.checks.length ?? 7;
  const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;
  const bottleneck = status?.checks.find((c: { status: string; checkCode: string }) => c.status !== "CLEARED")?.checkCode ?? "None";

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Hero card */}
      <LinearGradient colors={["#001e40", "#2f476b"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroIdent}>
            {student?.profileImageUrl ? (
              <Image source={{ uri: toMediaUrl(student.profileImageUrl) ?? "" }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{displayName[0]?.toUpperCase() ?? "S"}</Text>
              </View>
            )}
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{displayName}</Text>
              <Text style={styles.heroId}>ID: {student?.studentId ?? username}</Text>
              <View style={styles.campusBadge}>
                <MaterialIcons name="stars" size={12} color="#fff" />
                <Text style={styles.campusBadgeText}>
                  {student?.campusId?.replace(/_/g, " ") ?? "Campus"}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.heroActions}>
          <Pressable style={styles.refreshBtn} onPress={onRefresh} disabled={refreshing}>
            <MaterialIcons name="refresh" size={18} color={tokens.onSecondaryContainer} />
            <Text style={styles.refreshBtnText}>{refreshing ? "Refreshing…" : "Refresh"}</Text>
          </Pressable>
          <Pressable style={styles.signOutBtn} onPress={onLogout}>
            <MaterialIcons name="logout" size={18} color="#fff" />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Stat chips */}
      <View style={styles.stats}>
        {/* Progress */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>PROGRESS</Text>
          <Text style={styles.statValue}>{pct}%</Text>
          <View style={styles.miniBar}>
            <View style={[styles.miniBarFill, { width: `${pct}%` }]} />
          </View>
        </View>
        {/* Checks */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>CHECKS</Text>
          <Text style={styles.statValue}>{cleared}/{total}</Text>
          <Text style={styles.statSub}>ACTIVE</Text>
        </View>
        {/* Bottleneck */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>BOTTLENECK</Text>
          <Text style={[styles.statValue, { color: tokens.error, fontSize: 14 }]}>
            {checkLabel(bottleneck)}
          </Text>
          <Text style={[styles.statSub, { color: tokens.error }]}>ACTION REQ.</Text>
        </View>
      </View>

      {/* Live status */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Live Status</Text>
          <View style={styles.syncBadge}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Real-time sync</Text>
          </View>
        </View>

        {!status ? (
          <Text style={styles.empty}>Select or create a request to load status.</Text>
        ) : (
          <View style={styles.checkList}>
            {status.checks.map((check) => {
              const isCleared = check.status === "CLEARED";
              const isError = check.status === "FLAGGED" || check.status === "FAILED" || check.status === "AWAITING_FINANCE";
              const isLocked = !isCleared && !isError;
              const borderColor = isCleared ? tokens.secondary : isError ? tokens.error : tokens.outlineVariant;
              return (
                <View
                  key={check.id}
                  style={[styles.checkRow, { borderLeftColor: borderColor, opacity: isLocked ? 0.6 : 1 }]}
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
                    <Text style={[styles.checkName, isLocked && { color: tokens.onSurfaceVariant }]}>
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
    borderRadius: 80, backgroundColor: `${tokens.secondary}33`,
  },
  heroTop: {},
  heroIdent: { flexDirection: "row", gap: 14, alignItems: "center" },
  avatar: { width: 76, height: 76, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" },
  avatarFallback: {
    width: 76, height: 76, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.2)",
  },
  avatarFallbackText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroId: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  campusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
    marginTop: 2,
  },
  campusBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  heroActions: { flexDirection: "row", gap: 10 },
  refreshBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: tokens.secondaryContainer, borderRadius: 14, height: 46,
  },
  refreshBtnText: { color: tokens.onSecondaryContainer, fontWeight: "700", fontSize: 14 },
  signOutBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, height: 46,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  signOutBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  stats: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 20, padding: 14, alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statLabel: { fontSize: 9, fontWeight: "700", color: tokens.onSurfaceVariant, letterSpacing: 1, textTransform: "uppercase" },
  statValue: { fontSize: 20, fontWeight: "800", color: tokens.primary },
  statSub: { fontSize: 9, fontWeight: "700", color: tokens.secondary },
  miniBar: { width: "100%", height: 3, backgroundColor: tokens.surfaceContainer, borderRadius: 2, marginTop: 2 },
  miniBarFill: { height: "100%", backgroundColor: tokens.secondary, borderRadius: 2 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionEyebrow: { fontSize: 10, fontWeight: "700", color: tokens.onSurfaceVariant, letterSpacing: 2.5, textTransform: "uppercase" },
  syncBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  syncDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.secondary },
  syncText: { fontSize: 11, color: tokens.onSurfaceVariant },
  empty: { color: tokens.onSurfaceVariant, fontSize: 13, textAlign: "center", padding: 20 },
  checkList: { gap: 10 },
  checkRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 20, padding: 14,
    borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  checkIconWrap: { width: 40, height: 40, borderRadius: 9999, alignItems: "center", justifyContent: "center" },
  checkInfo: { flex: 1, gap: 2 },
  checkName: { fontSize: 14, fontWeight: "700", color: tokens.onSurface },
  checkStatus: { fontSize: 11, fontWeight: "700" },
});
