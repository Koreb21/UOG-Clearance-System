import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusBySlug } from "../modules/campus/catalog";

const API = "/api/v1";

interface Contact { id: string; username: string; role: string; campusId: string | null; }
interface Attachment {
  name: string;
  type: string;
  size: number;
  data: string;
}

interface Message {
  id: string;
  fromUserId: string; fromUsername: string; fromRole: string;
  toUserId: string | null; toUsername: string | null;
  subject: string; body: string; sentAt: string;
  readAt: string | null; isBroadcast: boolean;
  deletedBySender: boolean; deletedByRecipient: boolean;
  attachments: Attachment[] | null;
}

interface Conversation {
  contactId: string;
  contactName: string;
  contactRole: string;
  isBroadcast: boolean;
  lastMessage: Message;
  unreadCount: number;
}

function roleLabel(role: string) {
  const map: Record<string, string> = { LIBRARIAN: "Library", PROCTOR: "Proctor", CAFE_STAFF: "Cafeteria", DEPARTMENT_HEAD: "Dept. Head", STUDENT_DEAN: "Dean of Students", FINANCE_OFFICER: "Finance", MAIN_REGISTRAR: "Registrar", SYSTEM_ADMIN: "Admin" };
  return map[role] ?? role.replace(/_/g, " ");
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return fmtTime(iso);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-ET", { month: "short", day: "numeric" });
}

function fmtDayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-ET", { weekday: "long", month: "long", day: "numeric" });
}

function fmtFullDate(iso: string) {
  return new Date(iso).toLocaleString("en-ET", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function authHeaders(token: string) { return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }; }

export function MessagingPage() {
  const { token, user } = useAuth();
  const { campusSlug } = useParams();
  const navigate = useNavigate();
  const campus = getCampusBySlug(campusSlug);

  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [search, setSearch] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [newMsgText, setNewMsgText] = useState("");
  const [newMsgSubject, setNewMsgSubject] = useState("");
  const [selectedContact, setSelectedContact] = useState("");
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [attachFile, setAttachFile] = useState<File | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [inboxRes, sentRes, contactsRes] = await Promise.all([
        fetch(`${API}/messages/inbox`, { headers: authHeaders(token) }),
        fetch(`${API}/messages/sent`, { headers: authHeaders(token) }),
        fetch(`${API}/messages/contacts`, { headers: authHeaders(token) }),
      ]);
      const inboxData: Message[] = await inboxRes.json();
      const sentData: Message[] = await sentRes.json();
      setInbox(inboxData);
      setSent(sentData);
      setContacts(await contactsRes.json());
    } catch {/* */}
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedConv, inbox, sent]);

  useEffect(() => {
    if (selectedConv) inputRef.current?.focus();
  }, [selectedConv]);

  const conversations = useCallback((): Conversation[] => {
    const all = [...inbox, ...sent].filter(m => !m.deletedBySender && !m.deletedByRecipient);
    const map = new Map<string, Conversation>();

    for (const msg of all) {
      const selfId = user?.userId ?? "";
      const isFromMe = msg.fromUserId === selfId;
      let key: string, name: string, role: string;

      if (msg.isBroadcast) {
        key = `broadcast-${msg.fromUserId}`;
        name = `${msg.fromUsername} (Broadcast)`;
        role = msg.fromRole;
      } else if (isFromMe) {
        key = msg.toUserId ?? `sent-${msg.id}`;
        const c = contacts.find(x => x.id === msg.toUserId);
        name = c?.username ?? msg.toUsername ?? (msg.toUserId ? "Unknown" : "Draft / Self");
        role = c?.role ?? "";
      } else {
        key = msg.fromUserId;
        name = msg.fromUsername;
        role = msg.fromRole;
      }

      const existing = map.get(key);
      const isUnread = !msg.readAt && msg.fromUserId !== selfId;
      if (!existing || new Date(msg.sentAt) > new Date(existing.lastMessage.sentAt)) {
        map.set(key, {
          contactId: key,
          contactName: name,
          contactRole: role,
          isBroadcast: msg.isBroadcast,
          lastMessage: msg,
          unreadCount: isUnread ? 1 : 0,
        });
      } else if (isUnread) {
        existing.unreadCount += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => new Date(b.lastMessage.sentAt).getTime() - new Date(a.lastMessage.sentAt).getTime());
  }, [inbox, sent, contacts, user?.userId]);

  const convs = conversations();
  const totalUnread = inbox.filter(m => !m.readAt).length;

  const chatMessages = selectedConv ? [...inbox, ...sent].filter(m => {
    if (m.deletedBySender || m.deletedByRecipient) return false;
    const selfId = user?.userId ?? "";
    if (selectedConv.isBroadcast) return m.isBroadcast && m.fromUserId === selectedConv.contactId.replace("broadcast-", "");
    const otherId = selectedConv.contactId;
    return (m.fromUserId === selfId && (m.toUserId === otherId || (!m.toUserId && otherId.startsWith("sent-"))))
        || (m.fromUserId === otherId && (m.toUserId === selfId || m.toUserId === null));
  }).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()) : [];

  async function markRead(msg: Message) {
    if (!token || msg.readAt || msg.fromUserId === user?.userId) return;
    await fetch(`${API}/messages/${msg.id}/read`, { method: "PATCH", headers: authHeaders(token) });
    setInbox(prev => prev.map(m => m.id === msg.id ? { ...m, readAt: new Date().toISOString() } : m));
  }

  useEffect(() => {
    if (selectedConv && chatMessages.length > 0) {
      chatMessages.forEach(m => markRead(m));
    }
  }, [selectedConv, chatMessages.length]);

  async function fileToAttachment(file: File): Promise<Attachment> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, data: reader.result as string });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function sendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!token || !newMsgText.trim()) return;
    setSending(true);
    const recipient = isBroadcast ? null : (selectedContact || selectedConv?.contactId);
    const subject = newMsgSubject.trim() || (replyingTo ? `Re: ${replyingTo.subject}` : "New message");
    try {
      let attachments: Attachment[] | null = null;
      if (attachFile) {
        const att = await fileToAttachment(attachFile);
        attachments = [att];
      }
      await fetch(`${API}/messages`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ toUserId: isBroadcast ? null : recipient, subject, body: newMsgText, isBroadcast, attachments })
      });
      setNewMsgText("");
      setNewMsgSubject("");
      setAttachFile(null);
      setReplyingTo(null);
      setIsBroadcast(false);
      setSelectedContact("");
      setShowCompose(false);
      await load();
    } catch {/* */}
    setSending(false);
  }

  async function deleteOne(msg: Message) {
    if (!token) return;
    const asSender = msg.fromUserId === user?.userId;
    await fetch(`${API}/messages/${msg.id}`, { method: "DELETE", headers: authHeaders(token), body: JSON.stringify({ asSender }) });
    setMenuMsgId(null);
    await load();
  }

  async function forwardMessage(msg: Message, toUserId: string) {
    if (!token) return;
    await fetch(`${API}/messages`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        toUserId,
        subject: `Fwd: ${msg.subject}`,
        body: `--- Forwarded message ---\nFrom: ${msg.fromUsername}\nSubject: ${msg.subject}\nDate: ${fmtFullDate(msg.sentAt)}\n\n${msg.body}`,
        isBroadcast: false,
      })
    });
    setForwardingMsg(null);
    await load();
  }

  const filteredConvs = convs.filter(c =>
    c.contactName.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.subject.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.body.toLowerCase().includes(search.toLowerCase())
  );

  function getDashboardPath() {
    if (!user) return `/campus/${campusSlug}`;
    switch (user.role) {
      case "STUDENT": return `/campus/${campusSlug}/student`;
      case "FINANCE_OFFICER": return `/campus/${campusSlug}/finance`;
      case "MAIN_REGISTRAR": return `/campus/${campusSlug}/registrar`;
      case "SYSTEM_ADMIN": return `/admin`;
      default: return `/campus/${campusSlug}/staff`;
    }
  }

  const selfId = user?.userId ?? "";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#eef2f8] font-['Inter',sans-serif]">

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────── */}
      <div className={`
        flex w-full flex-shrink-0 flex-col border-r border-black/5 bg-white
        md:w-[320px] lg:w-[360px]
        ${selectedConv ? "hidden md:flex" : "flex"}
      `}>

        {/* Sidebar header */}
        <div className="flex h-14 items-center justify-between border-b border-black/5 bg-[#003366] px-4 text-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(getDashboardPath())}
              className="flex size-8 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              title="Back to dashboard"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <h1 className="text-sm font-bold leading-tight">Messages</h1>
              <p className="text-[10px] opacity-70 leading-tight">{campus?.name ?? "Campus"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button type="button" className="flex size-9 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
              </button>
              {totalUnread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="flex size-9 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              title="New message"
            >
              <span className="material-symbols-outlined text-[20px]">edit_square</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-black/5">
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[#8a9099]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="w-full rounded-full border border-black/8 bg-[#f0f2f5] py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#003366]/30 focus:bg-white focus:ring-2 focus:ring-[#003366]/10"
            />
          </div>
        </div>

        {/* Conversation list */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-[#8a9099]">
            <span className="material-symbols-outlined animate-spin text-xl text-[#003366]">progress_activity</span>
            <span className="text-sm">Loading…</span>
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-[#c3c6d1]">chat_bubble</span>
            <p className="text-sm font-semibold text-[#43474f]">No conversations yet</p>
            <button type="button" onClick={() => setShowCompose(true)} className="mt-1 rounded-full bg-[#003366] px-5 py-2 text-xs font-bold text-white hover:bg-[#002244] transition-colors">
              New Message
            </button>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {filteredConvs.map(conv => {
              const isActive = selectedConv?.contactId === conv.contactId;
              const isUnread = conv.unreadCount > 0;
              const initial = conv.contactName.charAt(0).toUpperCase();
              return (
                <li
                  key={conv.contactId}
                  onClick={() => { setSelectedConv(conv); setShowCompose(false); }}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors ${
                    isActive ? "bg-[#e8f0fb]" : "hover:bg-[#f5f7fa]"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`relative flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${conv.isBroadcast ? "bg-[#003366]" : "bg-[#5b7fa6]"}`}>
                    {initial}
                    {isUnread && <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-blue-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <p className={`truncate text-sm ${isUnread ? "font-black text-[#001e40]" : "font-semibold text-[#191c1e]"}`}>
                        {conv.contactName}
                      </p>
                      <span className={`shrink-0 text-[11px] ${isUnread ? "font-bold text-[#003366]" : "text-[#8a9099]"}`}>
                        {fmtDate(conv.lastMessage.sentAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className={`truncate text-xs ${isUnread ? "font-semibold text-[#191c1e]" : "text-[#8a9099]"}`}>
                        {conv.lastMessage.fromUserId === selfId && <span className="mr-0.5 opacity-60">You: </span>}
                        {conv.lastMessage.body}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="flex shrink-0 size-5 items-center justify-center rounded-full bg-[#003366] text-[10px] font-black text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    {conv.isBroadcast && (
                      <span className="mt-0.5 inline-block rounded bg-[#dbeafe] px-1.5 py-0.5 text-[9px] font-bold text-[#1d4ed8]">Broadcast</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── RIGHT CHAT AREA ──────────────────────────────────────── */}
      <div className={`
        flex flex-1 flex-col min-w-0 min-h-0
        ${!selectedConv ? "hidden md:flex" : "flex"}
      `}>
        {!selectedConv ? (
          /* No conversation selected — desktop placeholder */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#f0f4f8] text-[#8a9099]">
            <div className="flex size-20 items-center justify-center rounded-full bg-[#003366]/10">
              <span className="material-symbols-outlined text-4xl text-[#003366]">chat</span>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-[#001e40]">Select a conversation</p>
              <p className="text-sm text-[#8a9099]">or compose a new message</p>
            </div>
            <button type="button" onClick={() => setShowCompose(true)} className="flex items-center gap-2 rounded-full bg-[#003366] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#002244] transition-colors">
              <span className="material-symbols-outlined text-[18px]">edit_square</span>
              New Message
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-black/5 bg-white px-4 shadow-sm">
              {/* Mobile back button */}
              <button
                type="button"
                onClick={() => setSelectedConv(null)}
                className="flex size-9 items-center justify-center rounded-full text-[#003366] hover:bg-[#f0f4f8] transition-colors md:hidden"
              >
                <span className="material-symbols-outlined text-[22px]">arrow_back</span>
              </button>
              {/* Avatar */}
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${selectedConv.isBroadcast ? "bg-[#003366]" : "bg-[#5b7fa6]"}`}>
                {selectedConv.contactName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#001e40]">{selectedConv.contactName}</p>
                <p className="truncate text-[11px] text-[#8a9099]">
                  {roleLabel(selectedConv.contactRole)}{selectedConv.isBroadcast ? " · Broadcast" : ""}
                </p>
              </div>
            </div>

            {/* Messages scroll area */}
            <div
              ref={scrollRef}
              onClick={() => setMenuMsgId(null)}
              className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4"
              style={{ background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23003366' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\"), linear-gradient(180deg,#eef2f8 0%,#e8edf5 100%)" }}
            >
              {chatMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-[#8a9099]">
                  <span className="material-symbols-outlined text-4xl text-[#c3c6d1]">chat_bubble_outline</span>
                  <p className="text-sm">No messages yet — say something!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chatMessages.map((msg, idx) => {
                    const isMe = msg.fromUserId === selfId;
                    const showDayLabel = idx === 0 || new Date(msg.sentAt).toDateString() !== new Date(chatMessages[idx - 1].sentAt).toDateString();
                    const prevMsg = chatMessages[idx - 1];
                    const isSameAuthor = prevMsg && prevMsg.fromUserId === msg.fromUserId && !showDayLabel;
                    const nextMsg = chatMessages[idx + 1];
                    const isLast = !nextMsg || nextMsg.fromUserId !== msg.fromUserId || new Date(nextMsg.sentAt).toDateString() !== new Date(msg.sentAt).toDateString();

                    return (
                      <div key={msg.id}>
                        {showDayLabel && (
                          <div className="my-4 flex items-center justify-center">
                            <span className="rounded-full bg-[#d0d8e4]/70 px-3 py-1 text-[11px] font-semibold text-[#43474f] shadow-sm backdrop-blur-sm">
                              {fmtDayLabel(msg.sentAt)}
                            </span>
                          </div>
                        )}

                        <div className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"} ${isSameAuthor ? "mt-0.5" : "mt-2"}`}>
                          {/* Other-person avatar (only on last message in group) */}
                          {!isMe && (
                            <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${isLast ? "bg-[#5b7fa6]" : "bg-transparent"}`}>
                              {isLast ? msg.fromUsername.charAt(0).toUpperCase() : ""}
                            </div>
                          )}

                          {/* Bubble */}
                          <div className="group relative max-w-[70%] sm:max-w-[60%]">
                            {/* Sender name (first message in group, from others) */}
                            {!isMe && !isSameAuthor && (
                              <p className="mb-1 ml-1 text-[11px] font-bold text-[#003366]">{msg.fromUsername}</p>
                            )}
                            {!isMe && !isSameAuthor && msg.isBroadcast && (
                              <p className="mb-1 ml-1 text-[11px] font-bold text-[#7c3aed]">📢 Broadcast</p>
                            )}

                            <div className={`relative rounded-2xl px-3.5 py-2.5 shadow-sm ${
                              isMe
                                ? "rounded-br-sm bg-[#003366] text-white"
                                : "rounded-bl-sm bg-white text-[#191c1e]"
                            }`}>
                              {/* Subject (only for broadcasts or if subject differs from "New message") */}
                              {(msg.isBroadcast || (msg.subject && msg.subject !== "New message" && !msg.subject.startsWith("Re: "))) && (
                                <p className={`mb-1 text-xs font-bold ${isMe ? "text-white/80" : "text-[#003366]"}`}>
                                  {msg.subject}
                                </p>
                              )}

                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>

                              {/* Attachments */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                  {msg.attachments.map((att) => (
                                    <a
                                      key={att.name}
                                      href={att.data}
                                      download={att.name}
                                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors ${
                                        isMe ? "bg-white/10 hover:bg-white/20" : "bg-[#f0f4f8] hover:bg-[#e2e8f0]"
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {att.type.startsWith("image/") ? "image" : att.type.includes("pdf") ? "picture_as_pdf" : "description"}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">{att.name}</p>
                                        <p className={`text-[10px] ${isMe ? "opacity-70" : "text-[#8a9099]"}`}>{(att.size / 1024).toFixed(1)} KB</p>
                                      </div>
                                      <span className="material-symbols-outlined text-[16px] opacity-70">download</span>
                                    </a>
                                  ))}
                                </div>
                              )}

                              {/* Timestamp + read receipt */}
                              <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isMe ? "text-white/60" : "text-[#8a9099]"}`}>
                                <span>{fmtTime(msg.sentAt)}</span>
                                {isMe && (
                                  <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: msg.readAt ? "'FILL' 1" : "'FILL' 0" }}>
                                    {msg.readAt ? "done_all" : "done"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Context menu trigger */}
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setMenuMsgId(menuMsgId === msg.id ? null : msg.id); }}
                              className={`absolute top-1 ${isMe ? "-left-7" : "-right-7"} hidden rounded-full p-1 text-[#8a9099] hover:text-[#001e40] group-hover:flex transition-all`}
                            >
                              <span className="material-symbols-outlined text-[16px]">expand_more</span>
                            </button>

                            {/* Context menu */}
                            {menuMsgId === msg.id && (
                              <div
                                className={`absolute z-20 top-7 ${isMe ? "right-0" : "left-0"} w-40 rounded-2xl border border-black/5 bg-white py-1.5 shadow-xl`}
                                onClick={e => e.stopPropagation()}
                              >
                                {!selectedConv.isBroadcast && (
                                  <button type="button" onClick={() => { setReplyingTo(msg); setMenuMsgId(null); inputRef.current?.focus(); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-[#191c1e] hover:bg-[#f5f7fa]">
                                    <span className="material-symbols-outlined text-[16px] text-[#5b7fa6]">reply</span>Reply
                                  </button>
                                )}
                                <button type="button" onClick={() => { setForwardingMsg(msg); setMenuMsgId(null); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-[#191c1e] hover:bg-[#f5f7fa]">
                                  <span className="material-symbols-outlined text-[16px] text-[#5b7fa6]">forward</span>Forward
                                </button>
                                <button type="button" onClick={() => deleteOne(msg)} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                  <span className="material-symbols-outlined text-[16px]">delete</span>Delete
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Own avatar placeholder to align correctly */}
                          {isMe && <div className="size-7 shrink-0" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reply-to banner */}
            {replyingTo && (
              <div className="flex items-center gap-3 border-t border-black/5 bg-white px-4 py-2">
                <div className="w-1 self-stretch rounded-full bg-[#003366]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-[#003366]">Replying to {replyingTo.fromUsername}</p>
                  <p className="truncate text-[11px] text-[#8a9099]">{replyingTo.body}</p>
                </div>
                <button type="button" onClick={() => setReplyingTo(null)} className="rounded-full p-1 hover:bg-[#f0f4f8] transition-colors">
                  <span className="material-symbols-outlined text-[18px] text-[#8a9099]">close</span>
                </button>
              </div>
            )}

            {/* Attachment preview strip */}
            {attachFile && (
              <div className="flex items-center gap-3 border-t border-black/5 bg-white px-4 py-2">
                <span className="material-symbols-outlined text-[20px] text-[#003366]">attach_file</span>
                <span className="flex-1 truncate text-sm font-medium text-[#191c1e]">{attachFile.name}</span>
                <span className="text-xs text-[#8a9099]">{(attachFile.size / 1024).toFixed(1)} KB</span>
                <button type="button" onClick={() => setAttachFile(null)} className="rounded-full p-1 hover:bg-red-50 transition-colors">
                  <span className="material-symbols-outlined text-[16px] text-red-500">close</span>
                </button>
              </div>
            )}

            {/* Input bar */}
            {!selectedConv.isBroadcast && (
              <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-black/5 bg-white px-3 py-3">
                <input type="file" ref={fileInputRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setAttachFile(f); }} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#8a9099] hover:bg-[#f0f4f8] transition-colors"
                  title="Attach file"
                >
                  <span className="material-symbols-outlined text-[22px]">attach_file</span>
                </button>
                <input
                  ref={inputRef}
                  value={newMsgText}
                  onChange={e => setNewMsgText(e.target.value)}
                  placeholder="Type a message…"
                  className="min-w-0 flex-1 rounded-full border border-black/8 bg-[#f0f2f5] px-4 py-2.5 text-sm outline-none transition focus:border-[#003366]/30 focus:bg-white focus:ring-2 focus:ring-[#003366]/10"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
                <button
                  type="submit"
                  disabled={sending || !newMsgText.trim()}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#003366] text-white shadow-sm hover:bg-[#002244] disabled:opacity-40 transition-all active:scale-95"
                >
                  {sending
                    ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    : <span className="material-symbols-outlined text-[20px]">send</span>
                  }
                </button>
              </form>
            )}

            {selectedConv.isBroadcast && (
              <div className="flex items-center justify-center gap-2 border-t border-black/5 bg-white px-4 py-3">
                <span className="material-symbols-outlined text-[16px] text-[#8a9099]">info</span>
                <p className="text-xs text-[#8a9099]">Broadcast channel — replies not available</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── COMPOSE MODAL ──────────────────────────────────────────── */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setShowCompose(false)}>
          <div
            className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between bg-[#003366] px-5 py-4 text-white">
              <h2 className="text-sm font-bold">New Message</h2>
              <button type="button" onClick={() => { setShowCompose(false); setIsBroadcast(false); setSelectedContact(""); setNewMsgText(""); setNewMsgSubject(""); }} className="rounded-full p-1 hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex flex-col gap-4 p-5">
              {/* Broadcast toggle */}
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
                <input type="checkbox" checked={isBroadcast} onChange={e => { setIsBroadcast(e.target.checked); setSelectedContact(""); }} className="size-4 rounded accent-[#003366]" />
                <div>
                  <p className="text-sm font-semibold text-[#001e40]">Broadcast to all staff</p>
                  <p className="text-[11px] text-[#8a9099]">Send to everyone on this campus</p>
                </div>
              </label>

              {/* Recipient */}
              {!isBroadcast && (
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8a9099]">To</label>
                  <select
                    value={selectedContact}
                    onChange={e => setSelectedContact(e.target.value)}
                    required={!isBroadcast}
                    className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 text-sm outline-none focus:border-[#003366]/40 focus:ring-2 focus:ring-[#003366]/10"
                  >
                    <option value="">Select recipient…</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.username} — {roleLabel(c.role)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8a9099]">Subject</label>
                <input
                  value={newMsgSubject}
                  onChange={e => setNewMsgSubject(e.target.value)}
                  placeholder="Optional subject…"
                  className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 text-sm outline-none focus:border-[#003366]/40 focus:ring-2 focus:ring-[#003366]/10"
                />
              </div>

              {/* Message body */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8a9099]">Message</label>
                <textarea
                  value={newMsgText}
                  onChange={e => setNewMsgText(e.target.value)}
                  required
                  rows={4}
                  placeholder="Write your message…"
                  className="w-full resize-none rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm outline-none focus:border-[#003366]/40 focus:ring-2 focus:ring-[#003366]/10"
                />
              </div>

              {/* Attachment preview */}
              {attachFile && (
                <div className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                  <span className="material-symbols-outlined text-[18px] text-[#003366]">attach_file</span>
                  <span className="flex-1 truncate text-sm text-[#191c1e]">{attachFile.name}</span>
                  <span className="text-[10px] text-[#8a9099]">{(attachFile.size / 1024).toFixed(1)} KB</span>
                  <button type="button" onClick={() => setAttachFile(null)} className="rounded-full p-1 hover:bg-red-50">
                    <span className="material-symbols-outlined text-[15px] text-red-500">close</span>
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex size-10 items-center justify-center rounded-full border border-[#e2e8f0] text-[#8a9099] hover:bg-[#f0f4f8] transition-colors"
                  title="Attach file"
                >
                  <span className="material-symbols-outlined text-[20px]">attach_file</span>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setAttachFile(f); }} />
                <button
                  type="submit"
                  disabled={sending || (!isBroadcast && !selectedContact) || !newMsgText.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#003366] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#002244] disabled:opacity-40 transition-all active:scale-95"
                >
                  {sending ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">send</span>}
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FORWARD MODAL ──────────────────────────────────────────── */}
      {forwardingMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setForwardingMsg(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#003366] px-5 py-4 text-white">
              <h3 className="text-sm font-bold">Forward to…</h3>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {contacts.map(c => (
                <button key={c.id} type="button" onClick={() => forwardMessage(forwardingMsg, c.id)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-[#f5f7fa] transition-colors">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#5b7fa6] text-xs font-bold text-white">{c.username.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#191c1e]">{c.username}</p>
                    <p className="text-[10px] text-[#8a9099]">{roleLabel(c.role)}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-black/5">
              <button type="button" onClick={() => setForwardingMsg(null)} className="w-full rounded-2xl border-2 border-[#e2e8f0] py-2.5 text-sm font-bold text-[#43474f] hover:bg-[#f5f7fa] transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
