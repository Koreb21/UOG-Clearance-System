import { MaterialIcons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../modules/theme/ThemeContext";
import type { ClearanceStatus } from "../../types";

function fmtDate(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-ET", { year: "numeric", month: "long", day: "numeric" });
}

type Props = { status: ClearanceStatus | null };

export function CertificateTab({ status }: Props) {
  const { tokens, mode } = useTheme();
  const isDark = mode === "dark";

  const cert = status?.certificate ?? null;
  const student = status?.student ?? null;
  const request = status?.request ?? null;

  async function handleShare() {
    if (!cert || !student) return;
    await Share.share({
      title: "UoG Clearance Certificate",
      message: [
        "University of Gondar — Clearance Certificate",
        `Student: ${student.firstName} ${student.lastName}`,
        `ID: ${student.studentId}`,
        `Request: ${request?.requestNumber ?? "—"}`,
        `Certificate Hash: ${cert.hash}`,
        `Issued: ${fmtDate(cert.generatedAt)}`,
      ].join("\n"),
    });
  }

  if (!cert) {
    // Locked state
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.lockedWrap, { gap: 16, paddingVertical: 24 }]}>
          <View style={[styles.lockedQrWrap, {
            backgroundColor: tokens.surfaceContainerLow,
            borderColor: tokens.outlineVariant,
          }]}>
            {/* Ghost QR */}
            <View style={[styles.ghostQr, { backgroundColor: tokens.surfaceContainerHighest }]} />
            <View style={[styles.lockOverlay, { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)" }]}>
              <MaterialIcons name="lock" size={40} color={tokens.onSurfaceVariant} />
              <Text style={[styles.lockMsg, { color: tokens.onSurfaceVariant }]}>
                Certificate unlocks when all checks are cleared and the Registrar issues it.
              </Text>
            </View>
          </View>
          <Text style={[styles.lockedTitle, { color: tokens.primary }]}>Not Yet Cleared</Text>
          <Text style={[styles.lockedSub, { color: tokens.onSurfaceVariant }]}>
            {status
              ? `${status.checks.filter((c) => c.status === "CLEARED").length}/${status.checks.length} departments cleared.`
              : "Select a request to check certificate readiness."}
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Cleared state
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* Success header */}
      <View style={[styles.successHeader, { gap: 8 }]}>
        <View style={[styles.successIcon, { backgroundColor: tokens.secondaryContainer }]}>
          <MaterialIcons name="verified" size={34} color={tokens.onSecondaryContainer} />
        </View>
        <Text style={[styles.successTitle, { color: tokens.primary }]}>Clearance Finalized</Text>
        <Text style={[styles.successSub, { color: tokens.onSurfaceVariant }]}>Your digital certificate is ready for presentation.</Text>
      </View>

      {/* Certificate card */}
      <View style={[styles.certCard, {
        backgroundColor: isDark ? tokens.surfaceContainerLow : "rgba(255,255,255,0.87)",
        borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)",
      }]}>
        <View style={[styles.dotPattern, { opacity: isDark ? 0.04 : 0.025 }]} />

        <View style={styles.certBrand}>
          <View>
            <Text style={[styles.certEyebrow, { color: tokens.secondary }]}>Official Document</Text>
            <Text style={[styles.certUniv, { color: tokens.primary }]}>University of Gondar</Text>
          </View>
          <View style={[styles.verifiedBadge, { backgroundColor: `${tokens.secondary}18`, borderColor: `${tokens.secondary}30` }]}>
            <Text style={[styles.verifiedBadgeText, { color: tokens.secondary }]}>VERIFIED</Text>
          </View>
        </View>

        {/* QR Code */}
        <View style={[styles.qrSection, { gap: 10 }]}>
          <View style={[styles.qrFrame, {
            backgroundColor: isDark ? "#fff" : "#fff",
            borderColor: tokens.outlineVariant,
          }]}>
            <Image
              source={{ uri: `data:image/png;base64,${cert.base64Qr}` }}
              style={styles.qrImage}
              resizeMode="contain"
            />
            {/* Scan corners */}
            <View style={[styles.corner, styles.cornerTL, { borderColor: `${tokens.secondary}60` }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: `${tokens.secondary}60` }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: `${tokens.secondary}60` }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: `${tokens.secondary}60` }]} />
          </View>
          <Text style={[styles.scanLabel, { color: `${tokens.onSurfaceVariant}80` }]}>SCAN TO VERIFY AUTHENTICITY</Text>
        </View>

        {/* Student details grid */}
        <View style={[styles.detailsGrid, { borderTopColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.06)" }]}>
          {[
            { label: "STUDENT NAME", value: `${student?.firstName ?? ""} ${student?.lastName ?? ""}` },
            { label: "STUDENT ID", value: student?.studentId ?? "—" },
            { label: "REQUEST ID", value: request?.requestNumber ?? "—" },
            { label: "ISSUE DATE", value: fmtDate(cert.generatedAt) },
          ].map((row) => (
            <View key={row.label} style={[styles.detailCell, { width: "45%", gap: 3 }]}>
              <Text style={[styles.detailLabel, { color: tokens.onSurfaceVariant }]}>{row.label}</Text>
              <Text style={[styles.detailValue, { color: tokens.primary }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Hash */}
        <View style={[styles.hashBox, {
          backgroundColor: tokens.surfaceContainerLow,
          borderColor: tokens.outlineVariant,
        }]}>
          <Text style={[styles.hashLabel, { color: tokens.onSurfaceVariant }]}>DIGITAL FINGERPRINT (SHA-256)</Text>
          <Text style={[styles.hashValue, { color: `${tokens.primary}80` }]}>{cert.hash.slice(0, 48)}…</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.actions, { width: "100%", gap: 10 }]}>
        <Pressable style={({ pressed }) => [styles.shareBtn, {
          backgroundColor: tokens.secondary,
          shadowColor: isDark ? "#000" : "#006a63",
          opacity: pressed ? 0.88 : 1,
        }]} onPress={() => void handleShare()}>
          <MaterialIcons name="share" size={20} color="#fff" />
          <Text style={styles.shareBtnText}>Share Certificate</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40, alignItems: "center", gap: 20 },

  // Locked state
  lockedWrap: { alignItems: "center" },
  lockedQrWrap: {
    width: 220, height: 220, borderRadius: 20, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  ghostQr: { position: "absolute", inset: 0, opacity: 0.6 },
  lockOverlay: {
    position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 10, padding: 20,
  },
  lockMsg: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  lockedTitle: { fontSize: 22, fontWeight: "800" },
  lockedSub: { fontSize: 13, textAlign: "center" },

  // Cleared state
  successHeader: { alignItems: "center" },
  successIcon: {
    width: 62, height: 62, borderRadius: 31,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  successTitle: { fontSize: 26, fontWeight: "900" },
  successSub: { fontSize: 13, textAlign: "center" },
  certCard: {
    width: "100%", borderRadius: 22,
    padding: 22, gap: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.09, shadowRadius: 32, elevation: 8,
  },
  dotPattern: {
    position: "absolute", inset: 0,
  },
  certBrand: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  certEyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  certUniv: { fontSize: 18, fontWeight: "800" },
  verifiedBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
  },
  verifiedBadgeText: { fontSize: 10, fontWeight: "800" },
  qrSection: { alignItems: "center" },
  qrFrame: {
    width: 230, height: 230, borderRadius: 14,
    padding: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center", position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  qrImage: { width: "100%", height: "100%" },
  corner: { position: "absolute", width: 16, height: 16, borderWidth: 2 },
  cornerTL: { top: 8, left: 8, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 8, right: 8, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 8, left: 8, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 8, right: 8, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: "600", textTransform: "uppercase" },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, paddingTop: 16, gap: 16 },
  detailCell: {},
  detailLabel: { fontSize: 9, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  detailValue: { fontSize: 14, fontWeight: "700" },
  hashBox: {
    borderRadius: 10,
    padding: 12, gap: 4,
    borderWidth: 1,
  },
  hashLabel: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "600" },
  hashValue: { fontSize: 10, fontFamily: "monospace", lineHeight: 15 },
  actions: {},
  shareBtn: {
    height: 54, borderRadius: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  shareBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
