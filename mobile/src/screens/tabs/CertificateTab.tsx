import { MaterialIcons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { tokens } from "../../theme/tokens";
import type { ClearanceStatus } from "../../types";

function fmtDate(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-ET", { year: "numeric", month: "long", day: "numeric" });
}

type Props = { status: ClearanceStatus | null };

export function CertificateTab({ status }: Props) {
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
        <View style={styles.lockedWrap}>
          <View style={styles.lockedQrWrap}>
            {/* Ghost QR */}
            <View style={styles.ghostQr} />
            <View style={styles.lockOverlay}>
              <MaterialIcons name="lock" size={40} color={tokens.onSurfaceVariant} />
              <Text style={styles.lockMsg}>
                Certificate unlocks when all checks are cleared and the Registrar issues it.
              </Text>
            </View>
          </View>
          <Text style={styles.lockedTitle}>Not Yet Cleared</Text>
          <Text style={styles.lockedSub}>
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
      <View style={styles.successHeader}>
        <View style={styles.successIcon}>
          <MaterialIcons name="verified" size={34} color={tokens.onSecondaryContainer} />
        </View>
        <Text style={styles.successTitle}>Clearance Finalized</Text>
        <Text style={styles.successSub}>Your digital certificate is ready for presentation.</Text>
      </View>

      {/* Certificate card */}
      <View style={styles.certCard}>
        {/* Dot pattern */}
        <View style={styles.dotPattern} />

        <View style={styles.certBrand}>
          <View>
            <Text style={styles.certEyebrow}>Official Document</Text>
            <Text style={styles.certUniv}>University of Gondar</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
          </View>
        </View>

        {/* QR Code */}
        <View style={styles.qrSection}>
          <View style={styles.qrFrame}>
            <Image
              source={{ uri: `data:image/png;base64,${cert.base64Qr}` }}
              style={styles.qrImage}
              resizeMode="contain"
            />
            {/* Scan corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanLabel}>SCAN TO VERIFY AUTHENTICITY</Text>
        </View>

        {/* Student details grid */}
        <View style={styles.detailsGrid}>
          {[
            { label: "STUDENT NAME", value: `${student?.firstName ?? ""} ${student?.lastName ?? ""}` },
            { label: "STUDENT ID", value: student?.studentId ?? "—" },
            { label: "REQUEST ID", value: request?.requestNumber ?? "—" },
            { label: "ISSUE DATE", value: fmtDate(cert.generatedAt) },
          ].map((row) => (
            <View key={row.label} style={styles.detailCell}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Hash */}
        <View style={styles.hashBox}>
          <Text style={styles.hashLabel}>DIGITAL FINGERPRINT (SHA-256)</Text>
          <Text style={styles.hashValue}>{cert.hash.slice(0, 48)}…</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.88 }]} onPress={() => void handleShare()}>
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
  lockedWrap: { alignItems: "center", gap: 16, paddingVertical: 24 },
  lockedQrWrap: {
    width: 220, height: 220, borderRadius: 20, overflow: "hidden",
    backgroundColor: tokens.surfaceContainerLow, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: tokens.outlineVariant,
  },
  ghostQr: { position: "absolute", inset: 0, backgroundColor: tokens.surfaceContainerHighest, opacity: 0.6 },
  lockOverlay: {
    position: "absolute", inset: 0, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)", gap: 10, padding: 20,
  },
  lockMsg: { fontSize: 12, color: tokens.onSurfaceVariant, textAlign: "center", lineHeight: 17 },
  lockedTitle: { fontSize: 22, fontWeight: "800", color: tokens.primary },
  lockedSub: { fontSize: 13, color: tokens.onSurfaceVariant, textAlign: "center" },

  // Cleared state
  successHeader: { alignItems: "center", gap: 8 },
  successIcon: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: tokens.secondaryContainer,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  successTitle: { fontSize: 26, fontWeight: "900", color: tokens.primary },
  successSub: { fontSize: 13, color: tokens.onSurfaceVariant, textAlign: "center" },
  certCard: {
    width: "100%", backgroundColor: "rgba(255,255,255,0.87)", borderRadius: 22,
    padding: 22, gap: 20, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.09, shadowRadius: 32, elevation: 8,
  },
  dotPattern: {
    position: "absolute", inset: 0, opacity: 0.025,
    // Simulated dot grid via opacity — actual dot pattern requires SVG/canvas
  },
  certBrand: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  certEyebrow: { color: tokens.secondary, fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  certUniv: { fontSize: 18, fontWeight: "800", color: tokens.primary },
  verifiedBadge: {
    backgroundColor: `${tokens.secondary}18`, borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${tokens.secondary}30`,
  },
  verifiedBadgeText: { color: tokens.secondary, fontSize: 10, fontWeight: "800" },
  qrSection: { alignItems: "center", gap: 10 },
  qrFrame: {
    width: 230, height: 230, backgroundColor: "#fff", borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: tokens.outlineVariant,
    alignItems: "center", justifyContent: "center", position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  qrImage: { width: "100%", height: "100%" },
  corner: { position: "absolute", width: 16, height: 16, borderColor: `${tokens.secondary}60`, borderWidth: 2 },
  cornerTL: { top: 8, left: 8, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 8, right: 8, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 8, left: 8, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 8, right: 8, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLabel: { fontSize: 9, color: `${tokens.onSurfaceVariant}80`, letterSpacing: 1.5, fontWeight: "600", textTransform: "uppercase" },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)", paddingTop: 16, gap: 16 },
  detailCell: { width: "45%", gap: 3 },
  detailLabel: { fontSize: 9, color: tokens.onSurfaceVariant, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  detailValue: { fontSize: 14, color: tokens.primary, fontWeight: "700" },
  hashBox: {
    backgroundColor: tokens.surfaceContainerLow, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: tokens.outlineVariant, gap: 4,
  },
  hashLabel: { fontSize: 8, color: tokens.onSurfaceVariant, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "600" },
  hashValue: { fontSize: 10, color: `${tokens.primary}80`, fontFamily: "monospace", lineHeight: 15 },
  actions: { width: "100%", gap: 10 },
  shareBtn: {
    backgroundColor: tokens.secondary, height: 54, borderRadius: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: "#006a63", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  shareBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
