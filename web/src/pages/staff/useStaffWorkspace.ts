import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../modules/auth/AuthContext";
import { useToast } from "../../components/ToastContext";
import type { ClearanceCheck, ClearanceRequest, ClearanceStatus, Inquiry, StaffQueueItem, StudentSummary } from "../../types";
import { roleConfigs } from "./staffRoleConfig";

type RoleConfig = (typeof roleConfigs)[keyof typeof roleConfigs];

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-ET", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function getStatusLabel(status: string) {
  return status === "PAID_PENDING_DEPARTMENT_APPROVAL" ? "Paid, approval pending" : toTitleCase(status);
}

export function useStaffWorkspace(roleConfig: RoleConfig) {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [queueItems, setQueueItems] = useState<StaffQueueItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [status, setStatus] = useState<ClearanceStatus | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [search, setSearch] = useState("");
  const [submittingLiability, setSubmittingLiability] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [respondingInquiryId, setRespondingInquiryId] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [liabilityCategoryPreset, setLiabilityCategoryPreset] = useState("");
  const [decisionState, setDecisionState] = useState({
    status: roleConfig.reviewOptions[0],
    comment: ""
  });
  const [liabilityState, setLiabilityState] = useState({
    itemName: "",
    category: "",
    description: "",
    amount: "0",
    paymentRequired: roleConfig.paymentDefault
  });

  useEffect(() => {
    setDecisionState({
      status: roleConfig.reviewOptions[0],
      comment: ""
    });
    setLiabilityState((current) => ({
      ...current,
      paymentRequired: roleConfig.paymentDefault
    }));
  }, [roleConfig.paymentDefault, roleConfig.reviewOptions]);

  useEffect(() => {
    if (!token) return;

    Promise.all([api.listStaffStudents(token), api.listStaffQueue(token), api.listStaffInquiries(token)])
      .then(([studentItems, queue, inquiryItems]) => {
        setStudents(studentItems);
        setQueueItems(queue);
        setInquiries(inquiryItems);

        const initialQueue = queue[0];
        if (initialQueue) {
          setSelectedStudentId(initialQueue.studentId);
          setSelectedRequestId(initialQueue.clearanceRequestId);
          return;
        }

        setSelectedStudentId((current) => current || studentItems[0]?.studentId || "");
      })
      .catch((requestError) =>
        showToast(requestError instanceof Error ? requestError.message : "Unable to load staff data", "error")
      );
  }, [token]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      `${student.firstName} ${student.lastName} ${student.studentId} ${student.program ?? ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [search, students]);

  useEffect(() => {
    if (!selectedStudentId || !filteredStudents.some((item) => item.studentId === selectedStudentId)) {
      setSelectedStudentId(filteredStudents[0]?.studentId ?? "");
    }
  }, [filteredStudents, selectedStudentId]);

  useEffect(() => {
    if (!queueItems.length) return;

    const hasCurrentQueueSelection = queueItems.some(
      (item) => item.studentId === selectedStudentId && item.clearanceRequestId === selectedRequestId
    );

    if (!selectedStudentId || !selectedRequestId || !hasCurrentQueueSelection) {
      setSelectedStudentId(queueItems[0].studentId);
      setSelectedRequestId(queueItems[0].clearanceRequestId);
    }
  }, [queueItems, selectedRequestId, selectedStudentId]);

  useEffect(() => {
    if (!token || !selectedStudentId) {
      setRequests([]);
      setSelectedRequestId("");
      setStatus(null);
      return;
    }

    api
      .listVisibleStudentRequests(token, selectedStudentId)
      .then((items) => {
        setRequests(items);
        setSelectedRequestId((current) => {
          if (current && items.some((item) => item.id === current)) return current;
          return items[0]?.id || "";
        });
      })
      .catch((requestError) =>
        showToast(requestError instanceof Error ? requestError.message : "Unable to load student requests", "error")
      );
  }, [selectedStudentId, token]);

  useEffect(() => {
    if (!token || !selectedStudentId || !selectedRequestId) {
      setStatus(null);
      return;
    }

    api
      .getVisibleStudentStatus(token, selectedStudentId, selectedRequestId)
      .then((payload) => {
        setStatus(payload);
        setReplyDraft("");
      })
      .catch((requestError) =>
        showToast(requestError instanceof Error ? requestError.message : "Unable to load clearance detail", "error")
      );
  }, [selectedRequestId, selectedStudentId, token]);

  const refreshStatus = useCallback(async () => {
    if (!token || !selectedStudentId || !selectedRequestId) return;
    const [updatedStatus, updatedInquiries] = await Promise.all([
      api.getVisibleStudentStatus(token, selectedStudentId, selectedRequestId),
      api.listStaffInquiries(token)
    ]);
    setStatus(updatedStatus);
    setInquiries(updatedInquiries);
    api.listStaffQueue(token).then(setQueueItems).catch(() => undefined);
  }, [selectedRequestId, selectedStudentId, token]);

  const selectedQueueStudent = filteredStudents.find((student) => student.studentId === selectedStudentId) ?? null;
  const relevantCheck =
    status?.checks.find((check) => check.checkCode === roleConfig.targetCheckCode) ??
    status?.checks.find((check) => check.status !== "CLEARED") ??
    status?.checks[0] ??
    null;
  const requestInquiries = inquiries.filter((item) => item.clearanceRequestId === status?.request.id);
  const latestInquiry = requestInquiries[0] ?? null;
  const verifiedPayment = status?.payments.find((payment) => payment.status === "VERIFIED" || payment.status === "SUCCESS");
  const currentLiabilities = status?.liabilities ?? [];
  const officeLiabilities = currentLiabilities.filter((l) => l.departmentCheckCode === roleConfig.targetCheckCode);

  const unpaidOfficeTotal = officeLiabilities
    .filter((l) => !["PAID", "CLEARED", "WAIVED"].includes(l.status))
    .reduce((s, l) => s + l.amount, 0);

  async function handleCreateLiability() {
    if (!token || !status) return;
    setSubmittingLiability(true);
    try {
      await api.createLiability(token, {
        studentId: status.student.studentId,
        clearanceRequestId: status.request.id,
        departmentCheckCode: relevantCheck?.checkCode ?? roleConfig.targetCheckCode,
        itemName: liabilityState.itemName,
        category: liabilityState.category || liabilityCategoryPreset || undefined,
        description: liabilityState.description || undefined,
        amount: Number(liabilityState.amount),
        paymentRequired: liabilityState.paymentRequired
      });
      setLiabilityState({
        itemName: "",
        category: "",
        description: "",
        amount: "0",
        paymentRequired: roleConfig.paymentDefault
      });
      setLiabilityCategoryPreset("");
      await refreshStatus();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : "Unable to create liability", "error");
    } finally {
      setSubmittingLiability(false);
    }
  }

  async function handleSubmitDecision(overrideStatus?: ClearanceCheck["status"]) {
    if (!token || !relevantCheck) return;
    setSubmittingDecision(true);
    try {
      await api.reviewCheck(token, relevantCheck.id, {
        status: overrideStatus ?? decisionState.status,
        comment: decisionState.comment || undefined
      });
      await refreshStatus();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : "Unable to submit staff decision", "error");
    } finally {
      setSubmittingDecision(false);
    }
  }

  async function handleReplyInquiry() {
    if (!token || !latestInquiry || !replyDraft.trim()) return;
    setRespondingInquiryId(latestInquiry.id);
    try {
      await api.respondToInquiry(token, latestInquiry.id, {
        response: replyDraft.trim(),
        status: "ANSWERED"
      });
      setReplyDraft("");
      await refreshStatus();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : "Unable to send reply", "error");
    } finally {
      setRespondingInquiryId("");
    }
  }

  const activityItems = useMemo(() => {
    const items: Array<{ title: string; detail: string; time: string; tone: string }> = [];
    if (verifiedPayment) {
      items.push({
        title: "Payment verified",
        detail: `Receipt ${verifiedPayment.receiptNumber ?? verifiedPayment.txRef}`,
        time: formatDateTime(verifiedPayment.receiptIssuedAt ?? verifiedPayment.verifiedAt),
        tone: "payment"
      });
    }
    if (latestInquiry) {
      items.push({
        title: "Inquiry",
        detail: latestInquiry.message.slice(0, 80) + (latestInquiry.message.length > 80 ? "…" : ""),
        time: formatDateTime(latestInquiry.respondedAt),
        tone: "inquiry"
      });
    }
    if (currentLiabilities[0]) {
      items.push({
        title: "Liability",
        detail: currentLiabilities[0].itemName,
        time: status ? formatDateTime(status.request.submittedAt) : "—",
        tone: "issue"
      });
    }
    return items;
  }, [currentLiabilities, latestInquiry, status, verifiedPayment]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return {
    user,
    token,
    students,
    queueItems,
    selectedStudentId,
    setSelectedStudentId,
    selectedRequestId,
    setSelectedRequestId,
    status,
    inquiries,
    search,
    setSearch,
    error,
    setError,
    submittingLiability,
    submittingDecision,
    respondingInquiryId,
    replyDraft,
    setReplyDraft,
    decisionState,
    setDecisionState,
    liabilityState,
    setLiabilityState,
    liabilityCategoryPreset,
    setLiabilityCategoryPreset,
    filteredStudents,
    selectedQueueStudent,
    relevantCheck,
    requestInquiries,
    latestInquiry,
    verifiedPayment,
    currentLiabilities,
    officeLiabilities,
    unpaidOfficeTotal,
    requests,
    handleCreateLiability,
    handleSubmitDecision,
    handleReplyInquiry,
    refreshStatus,
    activityItems,
    formatDateTime,
    scrollTo
  };
}
