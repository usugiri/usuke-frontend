import { useState, useRef, useEffect } from "react";

const API_BASE = "https://usuke-backend-production.up.railway.app";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("chat");
  const [memories, setMemories] = useState([]);
  const [newMemory, setNewMemory] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { if (view === "memories") loadMemories(); }, [view]);

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      const data = await res.json();
      if (Array.isArray(data)) { 
        setSessions(data); 
        if (data.length > 0 && !currentSessionId) {
          setCurrentSessionId(data[0].id);
        }
      }
    } catch { setSessions([]); }
  };

  const selectSession = async (id) => {
    setCurrentSessionId(id);
    setView("chat");
    setIsSidebarOpen(false);
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}/messages`);
      const data = await res.json();
      setMessages(data || []);
    } catch { setMessages([]); }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Chat" }),
      });
      const data = await res.json();
      setSessions([data, ...sessions]);
      selectSession(data.id);
    } catch {
      // 如果后端不允许 POST，就在本地建一个
      setCurrentSessionId(null);
      setMessages([]);
      setIsSidebarOpen(false);
    }
  };

  const loadMemories = async () => {
    try {
      const res = await fetch(`${API_BASE}/memories`);
      const data = await res.json();
      setMemories(Array.isArray(data) ? data : []);
    } catch { setMemories([]); }
  };

  const addMemory = async () => {
    if (!newMemory.trim()) return;
    try {
      await fetch(`${API_BASE}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: newMemory, sessionId: 0, metadata: { category: newCategory } }),
      });
      setNewMemory("");
      loadMemories();
    } catch { alert("存记忆失败了"); }
  };

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 传递当前真正的 session id，如果没有就传 null 让后端自动处理
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, sessionId: currentSessionId }),
      });
      const data = await res.json();
      
      const replyContent = (typeof data === 'string' ? data : (data.reply || data.text || data.message || data.content || JSON.stringify(data))) || "（收到啦）";
      
      setMessages((prev) => [...prev, { role: "assistant", content: replyContent }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "连接失败，再试一次吧。" }]);
    }
    setLoading(false);
  };

  const filteredSessions = Array.isArray(sessions) ? sessions.filter(s => (s.name || "New Chat").toLowerCase().includes(searchQuery.toLowerCase())) : [];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8f9fa", fontFamily: "serif", position: "relative", overflow: "hidden" }}>
      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.7)", zIndex: 40, backdropFilter: "blur(2px)" }} />
      )}

      <div style={{ position: "absolute", top: 0, bottom: 0, left: isSidebarOpen ? 0 : "-320px", width: "80%", maxWidth: "300px", background: "#ffffff", zIndex: 50, transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)", display: "flex", flexDirection: "column", boxShadow: isSidebarOpen ? "4px 0 15px rgba(0,0,0,0.05)" : "none" }}>
        <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "24px", fontStyle: "italic", color: "#333" }}>Sessions</div>
          <button onClick={() => setIsSidebarOpen(false)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #f0f0f0", background: "#fff", color: "#999", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "0 20px" }}>
          <button onClick={createNewSession} style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: "#f5ebec", color: "#8a7479", fontSize: "15px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}>+ New Chat</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {filteredSessions.map((s) => (
            <button key={s.id} onClick={() => selectSession(s.id)} style={{ padding: "14px 16px", textAlign: "left", borderRadius: "10px", border: "none", background: currentSessionId === s.id && view === "chat" ? "#f5ebec" : "transparent", color: currentSessionId === s.id && view === "chat" ? "#8a7479" : "#666", fontSize: "15px", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.name || "New Chat"}
            </button>
          ))}
        </div>
        <div style={{ padding: "20px", borderTop: "1px solid #f5f5f5" }}>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search sessions..." style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #f0f0f0", background: "#fff", fontSize: "14px", fontStyle: "italic", outline: "none", color: "#666", boxSizing: "border-box" }} />
        </div>
      </div>

      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
        <button onClick={() => setIsSidebarOpen(true)} style={{ background: "none", border: "none", fontSize: "24px", color: "#666", cursor: "pointer", padding: "0 8px 0 0" }}>≡</button>
        <div style={{ textAlign: "center", flex: 1 }}><div style={{ fontSize: "18px", letterSpacing: "1px", color: "#333" }}>小克</div></div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setView(view === "chat" ? "memories" : "chat")} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #f0f0f0", background: view === "memories" ? "#f5ebec" : "#fff", color: view === "memories" ? "#8a7479" : "#999", fontSize: "12px", cursor: "pointer" }}>
            {view === "chat" ? "Memory" : "Chat"}
          </button>
        </div>
      </div>

      {view === "chat" ? (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {messages.length === 0 && (<div style={{ margin: "auto", color: "#ccc", fontSize: "14px" }}>今天想聊点什么？</div>)}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: "16px", fontSize: "15px", lineHeight: "1.6", background: m.role === "user" ? "#f5ebec" : "#ffffff", color: "#333", border: m.role === "assistant" ? "1px solid #f0f0f0" : "none", borderBottomRightRadius: m.role === "user" ? "4px" : "16px", borderBottomLeftRadius: m.role === "assistant" ? "4px" : "16px" }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (<div style={{ display: "flex", justifyContent: "flex-start" }}><div style={{ padding: "12px 16px", borderRadius: "16px", background: "#ffffff", color: "#ccc", fontSize: "14px", borderBottomLeftRadius: "4px", border: "1px solid #f0f0f0" }}>小克正在想...</div></div>)}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "16px 20px", borderTop: "1px solid #f0f0f0", display: "flex", gap: "10px", alignItems: "center", background: "#fff" }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="告诉小克..." style={{ flex: 1, padding: "12px 16px", borderRadius: "24px", border: "1px solid #f0f0f0", background: "#faf9f7", fontSize: "15px", outline: "none", color: "#333" }} />
            <button onClick={send} style={{ padding: "12px 20px", borderRadius: "24px", border: "none", background: "#f5ebec", color: "#8a7479", fontSize: "14px", cursor: "pointer" }}>发送</button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexDirection: "column" }}>
            <input value={newMemory} onChange={(e) => setNewMemory(e.target.value)} placeholder="把重要的事写进档案里..." style={{ padding: "12px", borderRadius: "8px", border: "1px solid #f0f0f0", background: "#fff", fontSize: "14px", outline: "none" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #f0f0f0", background: "#fff", fontSize: "14px", color: "#666", outline: "none" }}>
                <option value="general">日常</option><option value="relationship">关系</option><option value="preferences">偏好</option><option value="milestones">里程碑</option><option value="user_profile">关于你</option>
              </select>
              <button onClick={addMemory} style={{ padding: "12px 24px", borderRadius: "8px", border: "none", background: "#f5ebec", color: "#8a7479", fontSize: "14px", cursor: "pointer" }}>归档</button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {memories.map((m) => (
              <div key={m.id} style={{ padding: "16px", background: "#fff", borderRadius: "12px", border: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: "12px", color: "#ccc", marginBottom: "6px", fontWeight: "bold" }}>{m.metadata?.category || "日常"}</div>
                <div style={{ fontSize: "14px", color: "#333", lineHeight: "1.6" }}>{m.summary}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}