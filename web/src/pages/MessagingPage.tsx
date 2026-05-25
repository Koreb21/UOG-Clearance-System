import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusBySlug } from "../modules/campus/catalog";

const API = "/api/v1";

interface Contact { id: string; username: string; role: string; campusId: string | null; }
interface Message {
  id: string;
  fromUserId: string; fromUsername: string; fromRole: string;
  toUserId: string | null; toUsername: string | null;
  subject: string; body: string; sentAt: string;
  readAt: string | null; isBroadcast: boolean;
  deletedBySender: boolean; deletedByRecipient: boolean;
}

function roleLabel(role: string) {
  const map: Record<string, string> = { LIBRARIAN: "Library", PROCTOR: "Proctor", CAFE_STAFF: "Cafeteria", DEPARTMENT_HEAD: "Dept. Head", STUDENT_DEAN: "Dean of Students", FINANCE_OFFICER: "Finance", MAIN_REGISTRAR: "Registrar", SYSTEM_ADMIN: "Admin" };
  return map[role] ?? role.replace(/_/g, " ");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-ET", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function authHeaders(token: string) { return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }; }

export function MessagingPage() {
  const { token, user } = useAuth();
  const { campusSlug } = useParams();
  const navigate = useNavigate();
  const campus = getCampusBySlug(campusSlug);

  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({ toUserId: "", subject: "", body: "", isBroadcast: false });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [inboxRes, sentRes, contactsRes] = await Promise.all([
        fetch(`${API}/messages/inbox`, { headers: authHeaders(token) }),
        fetch(`${API}/messages/sent`, { headers: authHeaders(token) }),
        fetch(`${API}/messages/contacts`, { headers: authHeaders(token) }),
      ]);
      setInbox(await inboxRes.json());
      setSent(await sentRes.json());
      setContacts(await contactsRes.json());
    } catch {/* */}
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function markRead(msg: Message) {
    if (!token || msg.readAt) return;
    await fetch(`${API}/messages/${msg.id}/read`, { method: "PATCH", headers: authHeaders(token) });
    setInbox((prev) => prev.map((m) => m.id === msg.id ? { ...m, readAt: new Date().toISOString() } : m));
  }

  async function deleteSelected() {
    if (!token || selectedIds.size === 0) return;
    const asSender = tab === "sent";
    await fetch(`${API}/messages/delete-batch`, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ messageIds: [...selectedIds], asSender }) });
    await load();
    setSelectedIds(new Set());
    setSelected(null);
  }

  async function deleteOne(msg: Message) {
    if (!token) return;
    const asSender = msg.fromUserId === user?.userId;
    await fetch(`${API}/messages/${msg.id}`, { method: "DELETE", headers: authHeaders(token), body: JSON.stringify({ asSender }) });
    await load();
    setSelected(null);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !form.subject.trim() || !form.body.trim()) return;
    setSending(true);
    await fetch(`${API}/messages`, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ toUserId: form.isBroadcast ? null : form.toUserId || null, subject: form.subject, body: form.body, isBroadcast: form.isBroadcast }) });
    setSending(false);
    setComposing(false);
    setForm({ toUserId: "", subject: "", body: "", isBroadcast: false });
    await load();
    setTab("sent");
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const list = tab === "inbox" ? inbox : sent;
    if (selectedIds.size === list.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(list.map((m) => m.id)));
  }

  const messages = tab === "inbox" ? inbox : sent;
  const unreadCount = inbox.filter((m) => !m.readAt).length;

  return (
    <div className="flex min-h-screen flex-col bg-[#f2f4f7] font-['Inter',sans-serif]">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#c3c6d1]/30 bg-white/90 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="h-5 w-px bg-[#c3c6d1]/40" />
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#003366] text-white">
            <span className="material-symbols-outlined text-[18px]">chat</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-[#001e40]">Messages</h1>
            <p className="text-[10px] text-[#43474f]">{campus?.name ?? "Campus"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setComposing(true); setSelected(null); }}
          className="flex items-center gap-2 rounded-xl bg-[#003366] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#002244] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
          Compose
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-0 md:gap-6 p-0 md:p-6">
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 flex-col gap-1">
          <button
            type="button"
            onClick={() => { setTab("inbox"); setSelected(null); setSelectedIds(new Set()); }}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${tab === "inbox" ? "bg-[#003366] text-white shadow" : "text-[#43474f] hover:bg-white hover:shadow-sm"}`}
          >
            <span className="material-symbols-outlined text-[20px]">inbox</span>
            Inbox
            {unreadCount > 0 && (
              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setTab("sent"); setSelected(null); setSelectedIds(new Set()); }}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${tab === "sent" ? "bg-[#003366] text-white shadow" : "text-[#43474f] hover:bg-white hover:shadow-sm"}`}
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
            Sent
          </button>
          <div className="my-2 border-t border-[#c3c6d1]/30" />
          <button
            type="button"
            onClick={() => { setComposing(true); setSelected(null); }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#43474f] hover:bg-white hover:shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">edit_square</span>
            New Message
          </button>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col md:flex-row gap-0 md:gap-4 min-h-0">
          {/* Message list */}
          <div className={`flex flex-col bg-white md:rounded-xl shadow-sm ${selected || composing ? "hidden md:flex" : "flex"} md:w-80 lg:w-96`}>
            {/* Tab bar (mobile) */}
            <div className="flex md:hidden border-b border-[#c3c6d1]/30">
              {(["inbox", "sent"] as const).map((t) => (
                <button key={t} type="button" onClick={() => { setTab(t); setSelected(null); }} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${tab === t ? "text-[#003366] border-b-2 border-[#003366]" : "text-[#43474f]"}`}>
                  {t}{t === "inbox" && unreadCount > 0 ? ` (${unreadCount})` : ""}
                </button>
              ))}
            </div>

            {/* Toolbar */}
            {messages.length > 0 && (
              <div className="flex items-center gap-2 border-b border-[#c3c6d1]/20 px-4 py-2">
                <input type="checkbox" checked={selectedIds.size === messages.length} onChange={toggleSelectAll} className="rounded text-[#003366] focus:ring-[#003366]" />
                {selectedIds.size > 0 && (
                  <button type="button" onClick={deleteSelected} className="ml-1 flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    Delete ({selectedIds.size})
                  </button>
                )}
                <span className="ml-auto text-[10px] text-[#43474f]">{messages.length} {tab === "inbox" ? "messages" : "sent"}</span>
              </div>
            )}

            {/* List */}
            {loading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-[#43474f]">
                <span className="material-symbols-outlined animate-spin text-3xl text-[#003366]">progress_activity</span>
                <p className="text-sm">Loading messages…</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-[#43474f]">
                <span className="material-symbols-outlined text-5xl text-[#c3c6d1]">{tab === "inbox" ? "inbox" : "send"}</span>
                <p className="text-sm font-medium">No {tab === "inbox" ? "messages" : "sent messages"}</p>
                {tab === "inbox" && <p className="text-xs text-[#43474f]/70">Messages from staff and broadcasts will appear here.</p>}
              </div>
            ) : (
              <ul className="flex-1 divide-y divide-[#c3c6d1]/20 overflow-y-auto">
                {messages.map((msg) => {
                  const isUnread = tab === "inbox" && !msg.readAt;
                  const isActive = selected?.id === msg.id;
                  return (
                    <li key={msg.id} className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${isActive ? "bg-[#d5e3ff]/40" : "hover:bg-[#f2f4f7]"} ${isUnread ? "bg-blue-50/50" : ""}`}
                      onClick={() => { setSelected(msg); markRead(msg); setComposing(false); }}>
                      <input type="checkbox" checked={selectedIds.has(msg.id)} onChange={() => toggleSelect(msg.id)} onClick={(e) => e.stopPropagation()} className="mt-1 rounded text-[#003366] focus:ring-[#003366]" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate text-sm ${isUnread ? "font-black text-[#001e40]" : "font-semibold text-[#191c1e]"}`}>
                            {tab === "inbox" ? msg.fromUsername : msg.toUsername ?? "All Staff"}
                          </p>
                          <span className="shrink-0 text-[10px] text-[#43474f]">{fmtDate(msg.sentAt)}</span>
                        </div>
                        <p className={`truncate text-xs ${isUnread ? "font-bold text-[#001e40]" : "text-[#43474f]"}`}>{msg.subject}</p>
                        <p className="truncate text-[11px] text-[#43474f]/70">{msg.body}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {msg.isBroadcast && <span className="rounded bg-[#d5e3ff] px-1.5 py-0.5 text-[9px] font-bold text-[#001b3c]">Broadcast</span>}
                          {isUnread && <span className="size-2 rounded-full bg-blue-500" />}
                          {tab === "inbox" && <span className="text-[10px] text-[#43474f]/60">{roleLabel(msg.fromRole)}</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Message detail / Compose */}
          <div className={`flex-1 bg-white md:rounded-xl shadow-sm flex flex-col ${!selected && !composing ? "hidden md:flex" : "flex"}`}>
            {composing ? (
              <form onSubmit={sendMessage} className="flex flex-1 flex-col p-6 gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#001e40]">New Message</h2>
                  <button type="button" onClick={() => setComposing(false)} className="rounded-lg p-1.5 text-[#43474f] hover:bg-[#f2f4f7]">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-[#c3c6d1]/40 px-4 py-2">
                  <input type="checkbox" checked={form.isBroadcast} onChange={(e) => setForm((f) => ({ ...f, isBroadcast: e.target.checked, toUserId: "" }))} className="rounded text-[#003366]" />
                  <span className="text-sm font-semibold text-[#001e40]">Broadcast to all staff on this campus</span>
                </label>

                {!form.isBroadcast && (
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">To</label>
                    <select value={form.toUserId} onChange={(e) => setForm((f) => ({ ...f, toUserId: e.target.value }))} required className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none">
                      <option value="">Select recipient…</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>{c.username} — {roleLabel(c.role)}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Subject</label>
                  <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required placeholder="Message subject…" className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none" />
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Message</label>
                  <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required placeholder="Write your message…" rows={8} className="flex-1 w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-3 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none resize-none" />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setComposing(false)} className="flex-1 rounded-xl border-2 border-[#c3c6d1] py-3 text-sm font-bold text-[#43474f] hover:bg-[#f2f4f7] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={sending} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#003366] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#002244] transition-colors disabled:opacity-50">
                    {sending ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">send</span>}
                    {sending ? "Sending…" : "Send Message"}
                  </button>
                </div>
              </form>
            ) : selected ? (
              <div className="flex flex-1 flex-col">
                {/* Detail header */}
                <div className="flex items-center justify-between border-b border-[#c3c6d1]/20 px-6 py-4">
                  <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#43474f] hover:bg-[#f2f4f7] md:hidden">
                    <span className="material-symbols-outlined text-lg">arrow_back</span>Back
                  </button>
                  <h2 className="text-base font-bold text-[#001e40] truncate flex-1 md:flex-none">{selected.subject}</h2>
                  <button type="button" onClick={() => deleteOne(selected)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">delete</span>Delete
                  </button>
                </div>

                {/* Meta */}
                <div className="border-b border-[#c3c6d1]/20 bg-[#f2f4f7]/50 px-6 py-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#43474f]">From:</span>
                    <span className="font-bold text-[#001e40]">{selected.fromUsername}</span>
                    <span className="rounded bg-[#d5e3ff] px-1.5 py-0.5 text-[9px] font-bold text-[#001b3c]">{roleLabel(selected.fromRole)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#43474f]">To:</span>
                    <span className="font-bold text-[#001e40]">{selected.isBroadcast ? "All Staff (Broadcast)" : selected.toUsername ?? "—"}</span>
                  </div>
                  <div className="text-[10px] text-[#43474f]">{fmtDate(selected.sentAt)}</div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#191c1e]">{selected.body}</p>
                </div>

                {/* Reply shortcut */}
                {tab === "inbox" && (
                  <div className="border-t border-[#c3c6d1]/20 px-6 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setForm({ toUserId: selected.fromUserId, subject: `Re: ${selected.subject}`, body: "", isBroadcast: false });
                        setComposing(true);
                      }}
                      className="flex items-center gap-2 rounded-xl bg-[#f2f4f7] px-4 py-2.5 text-sm font-semibold text-[#001e40] hover:bg-[#e6e8eb] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">reply</span>
                      Reply
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4 text-center text-[#43474f]">
                <span className="material-symbols-outlined text-6xl text-[#c3c6d1]">chat</span>
                <div>
                  <p className="text-base font-bold text-[#001e40]">Select a message</p>
                  <p className="text-sm text-[#43474f]/70">or compose a new one</p>
                </div>
                <button
                  type="button"
                  onClick={() => setComposing(true)}
                  className="flex items-center gap-2 rounded-xl bg-[#003366] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#002244] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Compose
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
