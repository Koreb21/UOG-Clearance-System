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

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-ET", { month: "short", day: "numeric" });
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
  const [showNewMsg, setShowNewMsg] = useState(false);
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
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selectedConv, inbox, sent]);

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
        body: JSON.stringify({
          toUserId: isBroadcast ? null : recipient,
          subject,
          body: newMsgText,
          isBroadcast,
          attachments,
        })
      });
      setNewMsgText("");
      setNewMsgSubject("");
      setAttachFile(null);
      setReplyingTo(null);
      setIsBroadcast(false);
      setSelectedContact("");
      setShowNewMsg(false);
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

  function handleAttach() {
    fileInputRef.current?.click();
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

  return (
    <div className="flex h-screen flex-col bg-[#f2f4f7] font-['Inter',sans-serif]">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#c3c6d1]/30 bg-[#003366] px-4 text-white shadow-md sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => selectedConv ? setSelectedConv(null) : navigate(getDashboardPath())}
            className="flex items-center gap-1 rounded-lg p-1 hover:bg-white/10 transition-colors"
            title={selectedConv ? "Back to conversations" : "Back to dashboard"}
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <span className="material-symbols-outlined text-[22px]">chat</span>
          <div>
            <h1 className="text-sm font-bold">{selectedConv ? selectedConv.contactName : "Messages"}</h1>
            {!selectedConv && <p className="text-[10px] opacity-80">{campus?.name ?? "Campus"}</p>}
            {selectedConv && <p className="text-[10px] opacity-80">{roleLabel(selectedConv.contactRole)}{selectedConv.isBroadcast ? " · Broadcast" : ""}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!selectedConv && (
            <button type="button" onClick={() => setShowNewMsg(true)} className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          )}
          <div className="relative">
            <button type="button" className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
            </button>
            {totalUnread > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list */}
        <div className={`flex w-full flex-col border-r border-[#c3c6d1]/20 bg-white md:w-80 lg:w-96 ${selectedConv ? "hidden md:flex" : "flex"}`}>
          {/* Search */}
          <div className="border-b border-[#c3c6d1]/20 p-3">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#43474f]">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full rounded-xl border border-[#c3c6d1]/30 bg-[#f2f4f7] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20"
              />
            </div>
          </div>

          {/* New message FAB for mobile */}
          <div className="md:hidden p-2">
            <button type="button" onClick={() => setShowNewMsg(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#003366] py-3 text-sm font-bold text-white">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              New Message
            </button>
          </div>

          {/* Conversations */}
          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-[#43474f]">
              <span className="material-symbols-outlined animate-spin text-2xl text-[#003366]">progress_activity</span>
              <span className="text-sm">Loading...</span>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-[#43474f]">
              <span className="material-symbols-outlined text-5xl text-[#c3c6d1]">chat</span>
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-[#43474f]/70">Start a new conversation</p>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {filteredConvs.map(conv => {
                const isUnread = conv.unreadCount > 0;
                return (
                  <li key={conv.contactId} onClick={() => { setSelectedConv(conv); setShowNewMsg(false); }}
                    className={`flex cursor-pointer items-start gap-3 border-b border-[#c3c6d1]/10 px-4 py-3 transition-colors hover:bg-[#f2f4f7] ${isUnread ? "bg-blue-50/40" : ""}`}>
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${conv.isBroadcast ? "bg-[#003366]" : "bg-[#6b7b8e]"}`}>
                      {conv.contactName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${isUnread ? "font-black text-[#001e40]" : "font-semibold text-[#191c1e]"}`}>{conv.contactName}</p>
                        <span className="shrink-0 text-[10px] text-[#43474f]">{fmtDate(conv.lastMessage.sentAt)}</span>
                      </div>
                      <p className={`truncate text-xs ${isUnread ? "font-bold text-[#001e40]" : "text-[#43474f]"}`}>{conv.lastMessage.subject}</p>
                      <p className="truncate text-[11px] text-[#43474f]/70">{conv.lastMessage.body}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {conv.isBroadcast && <span className="rounded bg-[#d5e3ff] px-1.5 py-0.5 text-[9px] font-bold text-[#001b3c]">Broadcast</span>}
                        {isUnread && <span className="flex size-2 rounded-full bg-blue-500" />}
                        <span className="text-[10px] text-[#43474f]/60">{roleLabel(conv.contactRole)}</span>
                        {conv.unreadCount > 0 && <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-[#003366] text-[10px] font-bold text-white">{conv.unreadCount}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Chat area */}
        <div className={`flex flex-1 flex-col bg-[#f2f4f7] ${!selectedConv && !showNewMsg ? "hidden md:flex" : "flex"} ${(!selectedConv && !showNewMsg) ? "items-center justify-center" : ""}`}>
          {!selectedConv && !showNewMsg ? (
            <div className="flex flex-col items-center gap-4 text-center text-[#43474f]">
              <span className="material-symbols-outlined text-6xl text-[#c3c6d1]">chat</span>
              <div>
                <p className="text-base font-bold text-[#001e40]">Select a conversation</p>
                <p className="text-sm text-[#43474f]/70">or start a new message</p>
              </div>
              <button type="button" onClick={() => setShowNewMsg(true)} className="flex items-center gap-2 rounded-xl bg-[#003366] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#002244]">
                <span className="material-symbols-outlined text-[18px]">edit</span>
                New Message
              </button>
            </div>
          ) : showNewMsg ? (
            /* New Message Composer */
            <div className="flex flex-1 flex-col bg-white">
              <div className="flex items-center justify-between border-b border-[#c3c6d1]/20 px-4 py-3">
                <h2 className="text-sm font-bold text-[#001e40]">New Message</h2>
                <button type="button" onClick={() => { setShowNewMsg(false); setIsBroadcast(false); setSelectedContact(""); }} className="rounded-lg p-1 text-[#43474f] hover:bg-[#f2f4f7]">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex flex-1 flex-col gap-4 p-4">
                <label className="flex items-center gap-3 rounded-xl border border-[#c3c6d1]/30 px-4 py-3">
                  <input type="checkbox" checked={isBroadcast} onChange={e => { setIsBroadcast(e.target.checked); setSelectedContact(""); }} className="rounded text-[#003366]" />
                  <span className="text-sm font-semibold text-[#001e40]">Broadcast to all staff</span>
                </label>

                {!isBroadcast && (
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">To</label>
                    <select value={selectedContact} onChange={e => setSelectedContact(e.target.value)} required={!isBroadcast} className="w-full rounded-xl border border-[#c3c6d1]/30 bg-[#f2f4f7] px-4 py-2.5 text-sm outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20">
                      <option value="">Select recipient...</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.username} — {roleLabel(c.role)}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Subject</label>
                  <input value={newMsgSubject} onChange={e => setNewMsgSubject(e.target.value)} placeholder="Message subject..." className="w-full rounded-xl border border-[#c3c6d1]/30 bg-[#f2f4f7] px-4 py-2.5 text-sm outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20" />
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Message</label>
                  <textarea value={newMsgText} onChange={e => setNewMsgText(e.target.value)} required placeholder="Write your message..." className="flex-1 w-full rounded-xl border border-[#c3c6d1]/30 bg-[#f2f4f7] px-4 py-3 text-sm outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 resize-none" />
                </div>

                {attachFile && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#c3c6d1]/30 bg-[#f2f4f7] px-3 py-2">
                    <span className="material-symbols-outlined text-[18px] text-[#003366]">attach_file</span>
                    <span className="flex-1 truncate text-sm text-[#191c1e]">{attachFile.name}</span>
                    <span className="text-[10px] text-[#43474f]">{(attachFile.size / 1024).toFixed(1)} KB</span>
                    <button type="button" onClick={() => setAttachFile(null)} className="rounded-full p-1 hover:bg-red-50">
                      <span className="material-symbols-outlined text-[16px] text-red-500">close</span>
                    </button>
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowNewMsg(false)} className="flex-1 rounded-xl border-2 border-[#c3c6d1] py-3 text-sm font-bold text-[#43474f] hover:bg-[#f2f4f7]">Cancel</button>
                  <button type="submit" disabled={sending || (!isBroadcast && !selectedContact) || !newMsgText.trim()} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#003366] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#002244] disabled:opacity-50">
                    {sending ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">send</span>}
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Chat view */
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-[#43474f]">
                    <span className="material-symbols-outlined text-4xl text-[#c3c6d1]">chat_bubble</span>
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs text-[#43474f]/70">Send a message to start the conversation</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isMe = msg.fromUserId === user?.userId;
                    const showDate = idx === 0 || new Date(msg.sentAt).toDateString() !== new Date(chatMessages[idx - 1].sentAt).toDateString();
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="my-4 flex items-center justify-center">
                            <span className="rounded-full bg-[#c3c6d1]/30 px-3 py-1 text-[10px] font-medium text-[#43474f]">
                              {new Date(msg.sentAt).toLocaleDateString("en-ET", { weekday: "long", month: "short", day: "numeric" })}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMe ? "justify-end" : "justify-start"} group relative`}>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${isMe ? "rounded-br-sm bg-[#003366] text-white" : "rounded-bl-sm bg-white text-[#191c1e]"}`}>
                            {!isMe && !msg.isBroadcast && (
                              <p className="mb-0.5 text-[10px] font-bold opacity-70">{msg.fromUsername}</p>
                            )}
                            {msg.isBroadcast && (
                              <p className="mb-0.5 text-[10px] font-bold opacity-70">Broadcast from {msg.fromUsername}</p>
                            )}
                            <p className="text-xs font-semibold mb-1">{msg.subject}</p>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {msg.attachments.map((att) => (
                                  <a
                                    key={att.name}
                                    href={att.data}
                                    download={att.name}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${isMe ? "bg-white/10 hover:bg-white/20 text-white" : "bg-[#f2f4f7] hover:bg-[#e4e7ec] text-[#191c1e]"}`}
                                  >
                                    <span className="material-symbols-outlined text-[18px]">{att.type.startsWith("image/") ? "image" : "description"}</span>
                                    <span className="flex-1 truncate text-xs font-medium">{att.name}</span>
                                    <span className="text-[10px] opacity-70">{(att.size / 1024).toFixed(1)} KB</span>
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className={`mt-1 flex items-center gap-1 text-[10px] ${isMe ? "text-white/70" : "text-[#43474f]/60"}`}>
                              <span>{fmtDate(msg.sentAt)}</span>
                              {isMe && <span className="material-symbols-outlined text-[12px]">{msg.readAt ? "done_all" : "done"}</span>}
                            </div>
                          </div>
                          {/* Message actions menu */}
                          <button
                            type="button"
                            onClick={() => setMenuMsgId(menuMsgId === msg.id ? null : msg.id)}
                            className={`absolute top-1 ${isMe ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} opacity-0 group-hover:opacity-100 transition-opacity`}
                          >
                            <span className="material-symbols-outlined text-[16px] text-[#43474f] hover:text-[#001e40]">more_vert</span>
                          </button>
                          {menuMsgId === msg.id && (
                            <div className={`absolute z-10 ${isMe ? "right-0 top-8" : "left-0 top-8"} rounded-xl border border-[#c3c6d1]/20 bg-white py-1 shadow-lg`}>
                              <button type="button" onClick={() => { setReplyingTo(msg); setMenuMsgId(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#191c1e] hover:bg-[#f2f4f7]">
                                <span className="material-symbols-outlined text-[16px]">reply</span>Reply
                              </button>
                              <button type="button" onClick={() => { setForwardingMsg(msg); setMenuMsgId(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#191c1e] hover:bg-[#f2f4f7]">
                                <span className="material-symbols-outlined text-[16px]">forward</span>Forward
                              </button>
                              <button type="button" onClick={() => deleteOne(msg)} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                <span className="material-symbols-outlined text-[16px]">delete</span>Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply indicator */}
              {replyingTo && (
                <div className="flex items-center justify-between border-t border-[#c3c6d1]/20 bg-white px-4 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-[#003366]">reply</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-[#003366]">Replying to {replyingTo.fromUsername}</p>
                      <p className="truncate text-[10px] text-[#43474f]">{replyingTo.body}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setReplyingTo(null)} className="rounded-full p-1 hover:bg-[#f2f4f7]">
                    <span className="material-symbols-outlined text-[16px] text-[#43474f]">close</span>
                  </button>
                </div>
              )}

              {/* Input bar */}
              <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-[#c3c6d1]/20 bg-white px-4 py-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setAttachFile(f);
                      setNewMsgText(prev => prev + `\n[Attached: ${f.name}]`);
                    }
                  }}
                />
                <button type="button" onClick={handleAttach} className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#43474f] hover:bg-[#f2f4f7] transition-colors">
                  <span className="material-symbols-outlined text-[20px]">attach_file</span>
                </button>
                <input
                  value={newMsgText}
                  onChange={e => setNewMsgText(e.target.value)}
                  placeholder="Type a message..."
                  className="min-w-0 flex-1 rounded-full border border-[#c3c6d1]/30 bg-[#f2f4f7] px-4 py-2.5 text-sm outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
                <button
                  type="submit"
                  disabled={sending || !newMsgText.trim()}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#003366] text-white shadow-sm hover:bg-[#002244] disabled:opacity-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Forward modal */}
      {forwardingMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setForwardingMsg(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-3 text-base font-bold text-[#001e40]">Forward to</h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {contacts.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => forwardMessage(forwardingMsg, c.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#f2f4f7] transition-colors"
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-[#003366] text-xs font-bold text-white">{c.username.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#191c1e]">{c.username}</p>
                    <p className="text-[10px] text-[#43474f]">{roleLabel(c.role)}</p>
                  </div>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setForwardingMsg(null)} className="mt-3 w-full rounded-xl border-2 border-[#c3c6d1] py-2.5 text-sm font-bold text-[#43474f] hover:bg-[#f2f4f7]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
