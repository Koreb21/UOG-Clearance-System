import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppBar } from "../components/AppBar";
import { BottomNav, type TabId } from "../components/BottomNav";
import { api } from "../lib/api";
import { storage } from "../lib/storage";
import { useAuth } from "../modules/auth/AuthContext";
import { tokens } from "../theme/tokens";
import type { ClearanceRequest, ClearanceStatus, Inquiry } from "../types";
import { CertificateTab } from "./tabs/CertificateTab";
import { InquiriesTab } from "./tabs/InquiriesTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { PaymentsTab } from "./tabs/PaymentsTab";

type Cache = { requests: ClearanceRequest[]; selectedRequestId: string; status: ClearanceStatus | null; inquiries: Inquiry[] };

export function StudentHomeScreen() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [status, setStatus] = useState<ClearanceStatus | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [inquiryTargetCode, setInquiryTargetCode] = useState("LIBRARY");
  const [inquiryMessage, setInquiryMessage] = useState("");

  // Load cached data then fetch live
  useEffect(() => {
    async function load() {
      const cached = await storage.getDashboardCache<Cache>();
      if (cached) {
        setRequests(cached.requests);
        setSelectedRequestId(cached.selectedRequestId);
        setStatus(cached.status);
        setInquiries(cached.inquiries);
      }
      if (!token) return;
      try {
        const [reqs, inqs] = await Promise.all([
          api.listStudentRequests(token),
          api.listStudentInquiries(token),
        ]);
        setRequests(reqs);
        setSelectedRequestId((cur) => cur || reqs[0]?.id || "");
        setInquiries(inqs);
      } catch {}
    }
    void load();
  }, [token]);

  // Load status when selected request changes
  useEffect(() => {
    if (!token || !selectedRequestId) { setStatus(null); return; }
    api.getStudentStatus(token, selectedRequestId).then(setStatus).catch(() => {});
  }, [selectedRequestId, token]);

  // Persist cache
  useEffect(() => {
    void storage.setDashboardCache<Cache>({ requests, selectedRequestId, status, inquiries });
  }, [requests, selectedRequestId, status, inquiries]);

  // Listen for payment return deep link
  useEffect(() => {
    const sub = Linking.addEventListener("url", () => { void handleRefresh(); });
    return () => sub.remove();
  }, [token, selectedRequestId]);

  const payableLiabilities = useMemo(
    () => status?.liabilities.filter((l) => l.paymentRequired && l.status !== "PAID" && l.status !== "CLEARED" && l.status !== "WAIVED") ?? [],
    [status]
  );

  const currentInquiries = useMemo(
    () => inquiries.filter((q) => q.clearanceRequestId === selectedRequestId),
    [inquiries, selectedRequestId]
  );

  async function handleRefresh() {
    if (!token) return;
    setRefreshing(true);
    try {
      const [reqs, inqs] = await Promise.all([api.listStudentRequests(token), api.listStudentInquiries(token)]);
      const target = selectedRequestId || reqs[0]?.id || "";
      setRequests(reqs);
      setSelectedRequestId(target);
      setInquiries(inqs);
      if (target) setStatus(await api.getStudentStatus(token, target));
    } catch {} finally { setRefreshing(false); }
  }

  async function handlePayNow() {
    if (!token || !status || payableLiabilities.length === 0) return;
    setPaymentLoading(true);
    try {
      const res = await api.initiateChapaPayment(token, {
        clearanceRequestId: status.request.id,
        liabilityIds: payableLiabilities.map((l) => l.id),
      });
      await Linking.openURL(res.checkoutUrl);
    } catch {} finally { setPaymentLoading(false); }
  }

  async function handleSendInquiry() {
    if (!token || !status || !inquiryMessage.trim()) return;
    setSubmittingInquiry(true);
    setInquiryError(null);
    try {
      const created = await api.createStudentInquiry(token, {
        clearanceRequestId: status.request.id,
        targetCheckCode: inquiryTargetCode,
        message: inquiryMessage,
      });
      setInquiries((cur) => [created, ...cur]);
      setInquiryMessage("");
    } catch (err) {
      setInquiryError(err instanceof Error ? err.message : "Failed to send inquiry. Please try again.");
    } finally {
      setSubmittingInquiry(false);
    }
  }

  return (
    <View style={styles.root}>
      <AppBar />
      <View style={styles.content}>
        {activeTab === "overview" && (
          <OverviewTab
            status={status}
            username={user?.username ?? ""}
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            onLogout={() => void logout()}
          />
        )}
        {activeTab === "payments" && (
          <PaymentsTab
            status={status}
            payableLiabilities={payableLiabilities}
            paymentLoading={paymentLoading}
            onPayNow={() => void handlePayNow()}
          />
        )}
        {activeTab === "inquiries" && (
          <InquiriesTab
            status={status}
            inquiries={currentInquiries}
            targetCheckCode={inquiryTargetCode}
            message={inquiryMessage}
            setTargetCheckCode={(v) => { setInquiryTargetCode(v); setInquiryError(null); }}
            setMessage={(v) => { setInquiryMessage(v); setInquiryError(null); }}
            onSubmit={() => void handleSendInquiry()}
            submitting={submittingInquiry}
            error={inquiryError}
          />
        )}
        {activeTab === "certificate" && <CertificateTab status={status} />}
      </View>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.background },
  content: { flex: 1 },
});
