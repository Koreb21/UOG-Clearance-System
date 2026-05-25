import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { tokens } from "../../theme/tokens";
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
  const paidPayments = status?.payments.filter((p) => p.status === "VERIFIED" || p.status === "SUCCESS") ?? [];
  const pendingPayments = status?.payments.filter((p) => p.status !== "VERIFIED" && p.status !== "SUCCESS") ?? [];
  const totalOwed = payableLiabilities.reduce((s, l) => s + l.amount, 0);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Financial overview cards */}
        <Text style={styles.eyebrow}>Financial Overview</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <MaterialIcons name="pending-actions" size={22} color={tokens.error} />
            <Text style={styles.summaryLabel}>To Pay</Text>
            <Text style={[styles.summaryValue, { color: tokens.error }]}>{totalOwed.toFixed(0)} ETB</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialIcons name="verified" size={22} color={tokens.secondary} />
            <Text style={styles.summaryLabel}>Verified</Text>
            <Text style={[styles.summaryValue, { color: tokens.secondary }]}>{paidPayments.length} payments</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialIcons name="hourglass-empty" size={22} color={tokens.onTertiaryContainer} />
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: tokens.onTertiaryContainer }]}>{pendingPayments.length}</Text>
          </View>
        </ScrollView>

        {/* Active liabilities */}
        {status?.liabilities && status.liabilities.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Liabilities</Text>
              {payableLiabilities.length > 0 && (
                <View style={styles.blockedBadge}>
                  <MaterialIcons name="warning" size={13} color={tokens.error} />
                  <Text style={styles.blockedText}>Clearance Blocked</Text>
                </View>
              )}
            </View>
            {status.liabilities.map((item) => {
              const isPaid = item.status === "PAID" || item.status === "CLEARED" || item.status === "WAIVED";
              return (
                <View key={item.id} style={styles.liabilityCard}>
                  <View style={[styles.liabilityIcon, { backgroundColor: isPaid ? `${tokens.secondary}18` : `${tokens.error}15` }]}>
                    <MaterialIcons name="menu-book" size={22} color={isPaid ? tokens.secondary : tokens.error} />
                  </View>
                  <View style={styles.liabilityCopy}>
                    <Text style={styles.liabilityName}>{item.itemName}</Text>
                    <Text style={styles.liabilityDept}>{item.departmentCheckCode.replace(/_/g, " ")}</Text>
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
          <Text style={styles.empty}>No liabilities recorded.</Text>
        )}

        {/* Payment history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View style={styles.historyHeaderLeft}>
                <MaterialIcons name="history" size={18} color={tokens.onSurfaceVariant} />
                <Text style={styles.historyHeaderText}>Recent Transactions</Text>
              </View>
            </View>
            {!status?.payments.length ? (
              <Text style={styles.emptyInner}>No transactions yet.</Text>
            ) : (
              status.payments.map((payment) => (
                <View key={payment.id} style={styles.txRow}>
                  <View style={styles.txIcon}>
                    <MaterialIcons name="payments" size={18} color={tokens.secondary} />
                  </View>
                  <View style={styles.txCopy}>
                    <Text style={styles.txTitle}>{payment.departmentCheckCode?.replace(/_/g, " ") ?? "Finance"}</Text>
                    <Text style={styles.txMeta}>
                      {fmtDate(payment.verifiedAt ?? payment.receiptIssuedAt)} · {payment.provider ?? "Chapa"}
                    </Text>
                  </View>
                  <Text style={styles.txAmount}>{payment.amount} {payment.currency}</Text>
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
          style={({ pressed }) => [styles.payBtn, pressed && { opacity: 0.85 }]}
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
  eyebrow: { fontSize: 10, fontWeight: "700", color: tokens.onSurfaceVariant, letterSpacing: 2.5, textTransform: "uppercase" },
  summaryRow: { gap: 12, paddingVertical: 4 },
  summaryCard: {
    minWidth: 150, backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 22, padding: 18, gap: 6,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2,
  },
  summaryLabel: { fontSize: 11, color: tokens.onSurfaceVariant, fontWeight: "500" },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: tokens.primary },
  blockedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  blockedText: { fontSize: 11, color: tokens.error, fontWeight: "700" },
  liabilityCard: {
    backgroundColor: tokens.surfaceContainerLowest, borderRadius: 22, padding: 18,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  liabilityIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  liabilityCopy: { flex: 1, gap: 2 },
  liabilityName: { fontSize: 14, fontWeight: "700", color: tokens.onSurface },
  liabilityDept: { fontSize: 11, color: tokens.onSurfaceVariant },
  liabilityRight: { alignItems: "flex-end", gap: 4 },
  liabilityAmount: { fontSize: 14, fontWeight: "800" },
  statusPill: { borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  historyCard: {
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 22, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
  },
  historyHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 14, backgroundColor: tokens.surfaceContainerHigh,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)",
  },
  historyHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyHeaderText: { fontSize: 14, fontWeight: "700", color: tokens.onSurface },
  emptyInner: { padding: 20, color: tokens.onSurfaceVariant, fontSize: 13, textAlign: "center" },
  txRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.04)",
  },
  txIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: `${tokens.secondary}18`, alignItems: "center", justifyContent: "center",
  },
  txCopy: { flex: 1, gap: 2 },
  txTitle: { fontSize: 13, fontWeight: "700", color: tokens.onSurface },
  txMeta: { fontSize: 11, color: tokens.onSurfaceVariant },
  txAmount: { fontSize: 14, fontWeight: "700", color: tokens.onSurface },
  empty: { color: tokens.onSurfaceVariant, fontSize: 13, textAlign: "center", padding: 20 },
  payBtn: {
    position: "absolute", bottom: 16, left: 16, right: 16,
    backgroundColor: tokens.secondary,
    height: 56, borderRadius: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    shadowColor: "#006a63", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
