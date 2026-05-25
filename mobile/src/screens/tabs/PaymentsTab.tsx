import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../modules/theme/ThemeContext";
import type { ClearanceStatus, Liability } from "../../types";

function fmtDate(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-ET", { month: "short", day: "numeric", year: "numeric" });
}

type Props = {
  status: ClearanceStatus | null;
  payableLiabilities: Liability[];
  paymentLoading: boolean;
  onPayNow: () => void;
};

export function PaymentsTab({ status, payableLiabilities, paymentLoading, onPayNow }: Props) {
  const { tokens, mode } = useTheme();
  const isDark = mode === "dark";

  const paidPayments = status?.payments.filter((p) => p.status === "VERIFIED" || p.status === "SUCCESS") ?? [];
  const pendingPayments = status?.payments.filter((p) => p.status !== "VERIFIED" && p.status !== "SUCCESS") ?? [];
  const totalOwed = payableLiabilities.reduce((s, l) => s + l.amount, 0);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Financial overview cards */}
        <Text style={[styles.eyebrow, { color: tokens.onSurfaceVariant }]}>Financial Overview</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? tokens.surfaceContainerLowest : "rgba(255,255,255,0.72)", borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)" }]}>
            <MaterialIcons name="pending-actions" size={22} color={tokens.error} />
            <Text style={[styles.summaryLabel, { color: tokens.onSurfaceVariant }]}>To Pay</Text>
            <Text style={[styles.summaryValue, { color: tokens.error }]}>{totalOwed.toFixed(0)} ETB</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? tokens.surfaceContainerLowest : "rgba(255,255,255,0.72)", borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)" }]}>
            <MaterialIcons name="verified" size={22} color={tokens.secondary} />
            <Text style={[styles.summaryLabel, { color: tokens.onSurfaceVariant }]}>Verified</Text>
            <Text style={[styles.summaryValue, { color: tokens.secondary }]}>{paidPayments.length} payments</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? tokens.surfaceContainerLowest : "rgba(255,255,255,0.72)", borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)" }]}>
            <MaterialIcons name="hourglass-empty" size={22} color={tokens.onTertiaryContainer} />
            <Text style={[styles.summaryLabel, { color: tokens.onSurfaceVariant }]}>Pending</Text>
            <Text style={[styles.summaryValue, { color: tokens.onTertiaryContainer }]}>{pendingPayments.length}</Text>
          </View>
        </ScrollView>

        {/* Active liabilities */}
        {status?.liabilities && status.liabilities.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: tokens.primary }]}>Active Liabilities</Text>
              {payableLiabilities.length > 0 && (
                <View style={[styles.blockedBadge, { gap: 4 }]}>
                  <MaterialIcons name="warning" size={13} color={tokens.error} />
                  <Text style={[styles.blockedText, { color: tokens.error }]}>Clearance Blocked</Text>
                </View>
              )}
            </View>
            {status.liabilities.map((item) => {
              const isPaid = item.status === "PAID" || item.status === "CLEARED" || item.status === "WAIVED";
              return (
                <View key={item.id} style={[styles.liabilityCard, {
                  backgroundColor: isDark ? tokens.surfaceContainerLowest : tokens.surfaceContainerLowest,
                  borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)",
                }]}>
                  <View style={[styles.liabilityIcon, { backgroundColor: isPaid ? `${tokens.secondary}18` : `${tokens.error}15` }]}>
                    <MaterialIcons name="menu-book" size={22} color={isPaid ? tokens.secondary : tokens.error} />
                  </View>
                  <View style={styles.liabilityCopy}>
                    <Text style={[styles.liabilityName, { color: tokens.onSurface }]}>{item.itemName}</Text>
                    <Text style={[styles.liabilityDept, { color: tokens.onSurfaceVariant }]}>{item.departmentCheckCode.replace(/_/g, " ")}</Text>
                  </View>
                  <View style={styles.liabilityRight}>
                    <Text style={[styles.liabilityAmount, { color: isPaid ? tokens.secondary : tokens.error }]}>
                      {item.amount} {item.currency}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: isPaid ? `${tokens.secondary}20` : `${tokens.error}18` }]}>
                      <Text style={[styles.statusPillText, { color: isPaid ? tokens.secondary : tokens.error }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.empty, { color: tokens.onSurfaceVariant }]}>No liabilities recorded.</Text>
        )}

        {/* Payment history */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tokens.primary }]}>Payment History</Text>
          <View style={[styles.historyCard, {
            backgroundColor: isDark ? tokens.surfaceContainerLow : "rgba(255,255,255,0.7)",
            borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)",
          }]}>
            <View style={[styles.historyHeader, { backgroundColor: tokens.surfaceContainerHigh, borderBottomColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.05)" }]}>
              <View style={styles.historyHeaderLeft}>
                <MaterialIcons name="history" size={18} color={tokens.onSurfaceVariant} />
                <Text style={[styles.historyHeaderText, { color: tokens.onSurface }]}>Recent Transactions</Text>
              </View>
            </View>
            {!status?.payments.length ? (
              <Text style={[styles.emptyInner, { color: tokens.onSurfaceVariant }]}>No transactions yet.</Text>
            ) : (
              status.payments.map((payment) => (
                <View key={payment.id} style={[styles.txRow, { borderBottomColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.04)" }]}>
                  <View style={[styles.txIcon, { backgroundColor: `${tokens.secondary}18` }]}>
                    <MaterialIcons name="payments" size={18} color={tokens.secondary} />
                  </View>
                  <View style={styles.txCopy}>
                    <Text style={[styles.txTitle, { color: tokens.onSurface }]}>{payment.departmentCheckCode?.replace(/_/g, " ") ?? "Finance"}</Text>
                    <Text style={[styles.txMeta, { color: tokens.onSurfaceVariant }]}>
                      {fmtDate(payment.verifiedAt ?? payment.receiptIssuedAt)} · {payment.provider ?? "Chapa"}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: tokens.onSurface }]}>{payment.amount} {payment.currency}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Spacer for the fixed button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Fixed Pay Now button */}
      {payableLiabilities.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.payBtn, {
            backgroundColor: tokens.secondary,
            shadowColor: isDark ? "#000" : "#006a63",
          }, pressed && { opacity: 0.85 }]}
          onPress={onPayNow}
          disabled={paymentLoading}
        >
          <MaterialIcons name="account-balance-wallet" size={20} color="#fff" />
          <Text style={styles.payBtnText}>
            {paymentLoading ? "Opening Payment…" : `Pay Now (${totalOwed.toFixed(0)} ETB)`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 16 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase" },
  summaryRow: { gap: 12, paddingVertical: 4 },
  summaryCard: {
    minWidth: 150, borderRadius: 22, padding: 18, gap: 6,
    borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2,
  },
  summaryLabel: { fontSize: 11, fontWeight: "500" },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  blockedBadge: { flexDirection: "row", alignItems: "center" },
  blockedText: { fontSize: 11, fontWeight: "700" },
  liabilityCard: {
    borderRadius: 22, padding: 18,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  liabilityIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  liabilityCopy: { flex: 1, gap: 2 },
  liabilityName: { fontSize: 14, fontWeight: "700" },
  liabilityDept: { fontSize: 11 },
  liabilityRight: { alignItems: "flex-end", gap: 4 },
  liabilityAmount: { fontSize: 14, fontWeight: "800" },
  statusPill: { borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  historyCard: {
    borderRadius: 22, overflow: "hidden",
    borderWidth: 1,
  },
  historyHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
  },
  historyHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyHeaderText: { fontSize: 14, fontWeight: "700" },
  emptyInner: { padding: 20, fontSize: 13, textAlign: "center" },
  txRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    borderBottomWidth: 1,
  },
  txIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  txCopy: { flex: 1, gap: 2 },
  txTitle: { fontSize: 13, fontWeight: "700" },
  txMeta: { fontSize: 11 },
  txAmount: { fontSize: 14, fontWeight: "700" },
  empty: { fontSize: 13, textAlign: "center", padding: 20 },
  payBtn: {
    position: "absolute", bottom: 16, left: 16, right: 16,
    height: 56, borderRadius: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
