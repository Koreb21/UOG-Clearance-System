import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../../modules/theme/ThemeContext";
import type { ClearanceCheck, ClearanceStatus, Inquiry } from "../../types";

const DEPT_LABELS: Record<string, string> = {
  LIBRARY: "Library", PROCTOR: "Proctor", CAFE: "Cafe",
  DEPARTMENT_HEAD: "Dept. Head", STUDENT_DEAN: "Dean",
  FINANCE: "Finance", REGISTRAR: "Registrar",
};

function fmtTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return `${d.toLocaleDateString("en-ET", { month: "short", day: "numeric" })}, ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  status: ClearanceStatus | null;
  inquiries: Inquiry[];
  targetCheckCode: string;
  message: string;
  setTargetCheckCode: (v: string) => void;
  setMessage: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error?: string | null;
};

export function InquiriesTab({
  status, inquiries, targetCheckCode, message,
  setTargetCheckCode, setMessage, onSubmit, submitting, error,
}: Props) {
  const { tokens, mode } = useTheme();
  const isDark = mode === "dark";

  const checks: ClearanceCheck[] = status?.checks ?? [];
  const depts = checks.length > 0
    ? checks.map((c) => ({ code: c.checkCode, label: DEPT_LABELS[c.checkCode] ?? c.checkCode.replace(/_/g, " "), blocked: c.status !== "CLEARED" }))
    : Object.entries(DEPT_LABELS).map(([code, label]) => ({ code, label, blocked: false }));

  const currentInquiries = inquiries.filter((q) => q.targetCheckCode === targetCheckCode);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Dept chip selector */}
      <Text style={[styles.eyebrow, { color: tokens.onSurfaceVariant }]}>Select Department</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {depts.map((d) => {
          const active = d.code === targetCheckCode;
          return (
            <Pressable
              key={d.code}
              style={[
                styles.chip,
                active && { backgroundColor: tokens.tertiaryFixed, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
                d.blocked && !active && { backgroundColor: `${tokens.tertiaryFixed}88` },
              ]}
              onPress={() => setTargetCheckCode(d.code)}
            >
              <Text style={[
                styles.chipText,
                active && { color: isDark ? "#ffdbca" : "#331200", fontWeight: "700" },
                d.blocked && !active && { color: tokens.onTertiaryContainer },
              ]}>
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Inquiry form */}
      <View style={[styles.formCard, {
        backgroundColor: isDark ? tokens.surfaceContainerLow : "rgba(255,255,255,0.72)",
        borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)",
      }]}>
        <Text style={[styles.formTitle, { color: tokens.primary }]}>Direct Inquiry</Text>
        <TextInput
          style={[styles.textarea, {
            backgroundColor: tokens.surfaceContainerLowest,
            color: tokens.onSurface,
            borderColor: `${tokens.outline}30`,
          }]}
          placeholder="Ask the office what action you still need to complete"
          placeholderTextColor={tokens.outline}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
        />
        {!status && (
          <View style={[styles.noStatusBanner, { backgroundColor: `${tokens.surfaceContainerHigh}cc` }]}>
            <MaterialIcons name="info-outline" size={16} color={tokens.onSurfaceVariant} />
            <Text style={[styles.noStatusText, { color: tokens.onSurfaceVariant }]}>Load a clearance request first to send an inquiry.</Text>
          </View>
        )}
        {error ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={16} color="#b91c1c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.sendBtn, {
            backgroundColor: tokens.primary,
            shadowColor: "#000",
            opacity: pressed || submitting || !message.trim() || !status ? 0.45 : 1,
          }]}
          onPress={onSubmit}
          disabled={submitting || !message.trim() || !status}
        >
          <Text style={styles.sendBtnText}>{submitting ? "Sending…" : "Send Inquiry"}</Text>
          <MaterialIcons name="send" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Inquiry history as chat */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.eyebrow, { color: tokens.onSurfaceVariant }]}>Inquiry History</Text>
          <Text style={[styles.officeLabel, { color: tokens.onSurfaceVariant }]}>{DEPT_LABELS[targetCheckCode] ?? targetCheckCode} Office</Text>
        </View>

        {currentInquiries.length === 0 ? (
          <Text style={[styles.empty, { color: tokens.onSurfaceVariant }]}>No inquiries sent to this office yet.</Text>
        ) : (
          <View style={styles.chatList}>
            {currentInquiries.map((q) => (
              <View key={q.id} style={styles.chatThread}>
                {/* Student message */}
                <View style={styles.bubbleLeft}>
                  <View style={[styles.bubbleLeftBubble, { backgroundColor: tokens.surfaceContainerHighest }]}>
                    <Text style={[styles.bubbleText, { color: tokens.onSurface }]}>{q.message}</Text>
                  </View>
                  <Text style={[styles.bubbleTime, { color: `${tokens.onSurfaceVariant}80` }]}>{fmtTime(q.respondedAt ?? undefined)}</Text>
                </View>

                {/* Staff reply */}
                {q.response ? (
                  <View style={styles.bubbleRight}>
                    <View style={[styles.bubbleRightBubble, { backgroundColor: tokens.secondaryContainer }]}>
                      <Text style={[styles.bubbleText, { color: tokens.onSecondaryContainer }]}>{q.response}</Text>
                    </View>
                    <View style={styles.bubbleMeta}>
                      <Text style={[styles.staffName, { color: tokens.secondary }]}>Staff</Text>
                      <Text style={[styles.bubbleTime, { color: `${tokens.onSurfaceVariant}80` }]}>{fmtTime(q.respondedAt)}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 16 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase" },
  chipRow: { gap: 10, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9999,
    backgroundColor: "#f2ede5",
  },
  chipText: { fontSize: 12, fontWeight: "600", color: "#44474e" },
  formCard: {
    borderRadius: 22, padding: 20, gap: 14,
    borderWidth: 1,
  },
  formTitle: { fontSize: 20, fontWeight: "800" },
  textarea: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14, fontSize: 14, minHeight: 90,
  },
  sendBtn: {
    borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5,
  },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  noStatusBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  noStatusText: { fontSize: 12, flex: 1 },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fef2f2", borderRadius: 10, borderWidth: 1, borderColor: "#fca5a5",
    paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { fontSize: 12, color: "#b91c1c", flex: 1, fontWeight: "600" },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  officeLabel: { fontSize: 11 },
  empty: { fontSize: 13, textAlign: "center", padding: 24 },
  chatList: { gap: 20 },
  chatThread: { gap: 14 },
  bubbleLeft: { alignItems: "flex-start", maxWidth: "80%", gap: 4 },
  bubbleLeftBubble: {
    borderRadius: 20,
    borderBottomLeftRadius: 4, padding: 14,
  },
  bubbleRight: { alignItems: "flex-end", alignSelf: "flex-end", maxWidth: "80%", gap: 4 },
  bubbleRightBubble: {
    borderRadius: 20,
    borderBottomRightRadius: 4, padding: 14,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleMeta: { flexDirection: "row", gap: 8, alignItems: "center" },
  staffName: { fontSize: 11, fontWeight: "700" },
  bubbleTime: { fontSize: 10 },
});
