import { useState, useRef, useEffect } from "react";

const API_BASE = "http://localhost:3001";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "连接失败，稍后再试。" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#faf9f7", fontFamily: "serif" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #ede8e3", textAlign: "center" }}>
        <div style={{ fontSize: "20px", letterSpacing: "2px", color: "#4a4a4a" }}>小克</div>
        <div style={{ fontSize: "12px", color: "#b0a8a0", marginTop: "2px" }}>here with you</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "70%", padding: "10px 14px", borderRadius: "16px", fontSize: "14px", lineHeight: "1.6",
              background: m.role === "user" ? "#e8e0f0" : "#ffffff",
              color: "#3a3a3a", boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 14px", borderRadius: "16px", background: "#ffffff", color: "#b0a8a0", fontSize: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #ede8e3", display: "flex", gap: "8px", alignItems: "center", background: "#faf9f7" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="say something to 小克..."
          style={{ flex: 1, padding: "10px 14px", borderRadius: "20px", border: "1px solid #e0dbd5", background: "#fff", fontSize: "14px", outline: "none", color: "#3a3a3a" }}
        />
        <button onClick={send} style={{ padding: "10px 18px", borderRadius: "20px", border: "none", background: "#d4c8e8", color: "#4a4a4a", fontSize: "14px", cursor: "pointer" }}>
          发送
        </button>
      </div>
    </div>
  );
}