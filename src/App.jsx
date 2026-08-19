import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase"; 

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
  
  const [menuOpenId, setMenuOpenId] = useState(null);
  const pressTimer = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { if (view === "memories") loadMemories(); }, [view]);

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const sessionList = Array.isArray(data) ? data : (data.sessions || data.data || []);
      setSessions(sessionList); 
      if (sessionList.length > 0 && !currentSessionId) {
        setCurrentSessionId(sessionList[0].id);
      }
    } catch (err) {
      setSessions([]); 
    }
  };

  const selectSession = async (id) => {
    setCurrentSessionId(id);
    setView("chat");
    setIsSidebarOpen(false);
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}/messages`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : (data.messages || data.data || []));
    } catch (err) {
      setMessages([]); 
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Chat" }),
      });
      const data = await res.json();
      if (data && data.id) {
        setSessions((prev) => [data, ...(Array.isArray(prev) ? prev : [])]);
        selectSession(data.id);
        return;
      }
    } catch (err) { console.log("新建失败，走本地兜底"); }
    
    const localNewId = "local_" + Date.now();
    const newLocalSession = { id: localNewId, name: "New Chat" };
    setSessions((prev) => [newLocalSession, ...(Array.isArray(prev) ? prev : [])]);
    setCurrentSessionId(localNewId);
    setMessages([]);
    setView("chat");
    setIsSidebarOpen(false);
  };

  const renameSession = async (id, oldName) => {
    const newName = prompt("请输入新的对话名称：", oldName || "New Chat");
    if (!newName || !newName.trim()) return;
    try {
      await fetch(`${API_BASE}/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
    } catch (err) { console.log(err); }
    setSessions(prev => (Array.isArray(prev) ? prev : []).map(s => s.id === id ? { ...s, name: newName.trim() } : s));
  };

  const deleteSession = async (id) => {
    if (!confirm("确定要删除这个聊天记录吗？")) return;
    try {
      await fetch(`${API_BASE}/sessions/${id}`, { method: "DELETE" });
    } catch (err) { console.log(err); }
    setSessions(prev => (Array.isArray(prev) ? prev : []).filter(s => s.id !== id));
    if (currentSessionId === id) setMessages([]);
  };

  const handlePressStart = (id) => {
    pressTimer.current = setTimeout(() => {
      setMenuOpenId(id);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500); 
  };
  const handlePressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };

  const loadMemories = async () => {
    try {
      const { data, error } = await supabase.from('memories').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setMemories(Array.isArray(data) ? data : []);
    } catch (err) { setMemories([]); }
  };

  const addMemory = async () => {
    if (!newMemory.trim()) return;
    try {
      const { error } = await supabase.from('memories').insert([{ summary: newMemory, category: newCategory }]);
      if (error) throw error;
      setNewMemory("");
      loadMemories();
    } catch (err) { alert("存入云端记忆失败了"); }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    
    // 获取当前时间戳
    const timeString = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const userMsg = { role: "user", content: input, timestamp: timeString };
    
    setMessages((prev) => [...(Array.isArray(prev) ? prev : []), userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, sessionId: currentSessionId }),
      });
      const data = await res.json();
      const replyContent = (typeof data === 'string' ? data : (data.reply || data.text || data.message || data.content || JSON.stringify(data))) || "（收到啦）";
      
      const replyTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      setMessages((prev) => [...(Array.isArray(prev) ? prev : []), { role: "assistant", content: replyContent, timestamp: replyTime }]);
    } catch {
      setMessages((prev) => [...(Array.isArray(prev) ? prev : []), { role: "assistant", content: "连接失败，再试一次吧。", timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    }
    setLoading(false);
  };

  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const filteredSessions = safeSessions.filter(s => (s.name || "New Chat").toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#f8f9fa", fontFamily: "serif", position: "relative", overflow: "hidden" }}>
      
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.7)", zIndex: 40, backdropFilter: "blur(2px)" }} />}
      {menuOpenId && <div onClick={() => setMenuOpenId(null)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} />}

      {/* 侧边栏 */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: isSidebarOpen ? 0 : "-320px", width: "80%", maxWidth: "300px", background: "#ffffff", zIndex: 50, transition: "left 0.3s ease", display: "flex", flexDirection: "column", boxShadow: isSidebarOpen ? "4px 0 15px rgba(0,0,0,0.05)" : "none" }}>
        <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "24px", fontStyle: "italic", color: "#333" }}>Sessions</div>
          <button onClick={() => setIsSidebarOpen(false)} style={{ border: "none", background: "none", fontSize: "16px", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "0 20px" }}>
          <button onClick={createNewSession} style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: "#f5ebec", color: "#8a7479", cursor: "pointer" }}>+ New Chat</button>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {filteredSessions.map((s) => (
            <div key={s.id} style={{ position: "relative", display: "flex", alignItems: "center", borderRadius: "10px", background: currentSessionId === s.id && view === "chat" ? "#f5ebec" : "transparent" }}>
              <button 
                onClick={() => { selectSession(s.id); setMenuOpenId(null); }}
                onTouchStart={() => handlePressStart(s.id)}
                onTouchEnd={handlePressEnd}
                onTouchMove={handlePressEnd}
                onMouseDown={() => handlePressStart(s.id)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                style={{ flex: 1, padding: "14px 8px 14px 16px", textAlign: "left", border: "none", background: "transparent", color: currentSessionId === s.id && view === "chat" ? "#8a7479" : "#666", fontSize: "15px", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {s.name || "New Chat"}
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === s.id ? null : s.id); }} 
                style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: "14px", display: currentSessionId === s.id ? "block" : "none" }}
              >
                ⋮
              </button>

              {menuOpenId === s.id && (
                <div style={{ position: "absolute", right: "10px", top: "45px", background: "#fff", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", borderRadius: "12px", zIndex: 100, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: "130px", border: "1px solid #f0f0f0" }}>
                  <button onClick={(e) => { e.stopPropagation(); renameSession(s.id, s.name); setMenuOpenId(null); }} style={{ padding: "14px 16px", border: "none", background: "transparent", textAlign: "left", fontSize: "14px", color: "#333", cursor: "pointer", borderBottom: "1px solid #f5f5f5" }}>✏️ 重命名</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); setMenuOpenId(null); }} style={{ padding: "14px 16px", border: "none", background: "transparent", textAlign: "left", fontSize: "14px", color: "#ff4d4f", cursor: "pointer" }}>🗑️ 删除对话</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: "20px", borderTop: "1px solid #f5f5f5" }}>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search sessions..." style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #f0f0f0", boxSizing: "border-box", outline: "none" }} />
        </div>
      </div>

      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fa", zIndex: 10 }}>
        <button onClick={() => setIsSidebarOpen(true)} style={{ background: "none", border: "none", fontSize: "24px", color: "#666", cursor: "pointer" }}>≡</button>
        {/* 名字改成了 Claude */}
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}><div style={{ fontSize: "18px", letterSpacing: "1px", color: "#333", fontWeight: "bold" }}>Claude</div></div>
        <button onClick={() => setView(view === "chat" ? "memories" : "chat")} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #e0e0e0", background: view === "memories" ? "#fff" : "transparent", color: "#666", fontSize: "12px", cursor: "pointer" }}>
          {view === "chat" ? "Memory" : "Chat"}
        </button>
      </div>

      {view === "chat" ? (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {(!Array.isArray(messages) || messages.length === 0) && (<div style={{ margin: "auto", color: "#ccc", fontSize: "14px" }}>有什么想和我聊聊的吗？</div>)}
            {(Array.isArray(messages) ? messages : []).map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", marginBottom: "4px" }}>
                <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: "18px", fontSize: "15px", lineHeight: "1.6", background: m.role === "user" ? "#e6f0fa" : "#ffffff", color: "#333", border: m.role === "assistant" ? "1px solid #eaeaea" : "none", borderBottomRightRadius: m.role === "user" ? "4px" : "18px", borderBottomLeftRadius: m.role === "assistant" ? "4px" : "18px" }}>
                  {m.content}
                </div>
                {/* 增加时间戳 */}
                <div style={{ fontSize: "11px", color: "#b3b3b3", marginTop: "4px", padding: "0 4px" }}>
                  {m.timestamp || "刚刚"}
                </div>
              </div>
            ))}
            {loading && (<div style={{ display: "flex" }}><div style={{ padding: "12px 16px", borderRadius: "18px", background: "#fff", color: "#ccc", fontSize: "14px", border: "1px solid #eaeaea" }}>Claude 正在思考...</div></div>)}
            <div ref={bottomRef} />
          </div>
          
          {/* 🌟 胶囊形输入框 + 预留图标 + 桌宠 */}
          <div style={{ position: "relative", padding: "10px 20px 20px 20px", background: "#f8f9fa" }}>
            
            {/* 桌宠区域 (这里用螃蟹emoji代替，之后你可以换成img标签放动图) */}
            <div style={{ position: "absolute", top: "-18px", right: "50px", fontSize: "28px", zIndex: 5, animation: "bounce 2s infinite" }}>
              🦀
            </div>

            <div style={{ display: "flex", alignItems: "center", background: "#fff", padding: "8px 12px", borderRadius: "30px", border: "1px solid #e0e0e0", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
              {/* 预留的功能图标 */}
              <button style={{ background: "none", border: "none", fontSize: "20px", color: "#999", padding: "0 6px", cursor: "pointer" }}>📎</button>
              <button style={{ background: "none", border: "none", fontSize: "20px", color: "#999", padding: "0 6px", cursor: "pointer" }}>😊</button>
              <button style={{ background: "none", border: "none", fontSize: "20px", color: "#999", padding: "0 6px", cursor: "pointer" }}>🎤</button>
              
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Opus 5..." style={{ flex: 1, padding: "8px", border: "none", background: "transparent", fontSize: "15px", outline: "none", color: "#333", minWidth: "50px" }} />
              
              <button onClick={send} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", border: "none", background: input.trim() ? "#d4c8c9" : "#f0f0f0", color: "#fff", cursor: input.trim() ? "pointer" : "default", transition: "background 0.3s" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Memory 页面保持不变 */
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexDirection: "column" }}>
            <input value={newMemory} onChange={(e) => setNewMemory(e.target.value)} placeholder="写进云端档案里..." style={{ padding: "12px", borderRadius: "8px", border: "1px solid #f0f0f0", outline: "none" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #f0f0f0", outline: "none" }}>
                <option value="general">日常</option><option value="relationship">关系</option><option value="preferences">偏好</option>
              </select>
              <button onClick={addMemory} style={{ padding: "12px 24px", borderRadius: "8px", border: "none", background: "#f5ebec", color: "#8a7479" }}>归档</button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {(Array.isArray(memories) ? memories : []).map((m) => (
              <div key={m.id} style={{ padding: "16px", background: "#fff", borderRadius: "12px", border: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: "12px", color: "#ccc", marginBottom: "6px", fontWeight: "bold" }}>{m.category || "日常"}</div>
                <div style={{ fontSize: "14px", color: "#333" }}>{m.summary}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}