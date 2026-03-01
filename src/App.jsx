import { useState, useEffect, useCallback } from "react";

const CATEGORIES = ["餐饮", "零售", "服务", "外卖", "其他"];
const PAY_METHODS = ["现金", "微信", "支付宝", "银行卡", "其他"];
const STORAGE_KEY = "shop-income-records";
const API_KEY_STORAGE = "shop-income-apikey";

const formatCurrency = (n) =>
  "¥" + Number(n || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const todayStr = () => new Date().toISOString().slice(0, 10);

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── localStorage helpers ───────────────────────────────────────────────────
function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveRecords(records) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {}
}
function loadApiKey() {
  try { return localStorage.getItem(API_KEY_STORAGE) || ""; } catch { return ""; }
}
function saveApiKey(key) {
  try { localStorage.setItem(API_KEY_STORAGE, key); } catch {}
}

// ─── EditPanel Component ─────────────────────────────────────────────────────
function EditPanel({ form, setForm, onSave, onCancel }) {
  return (
    <div className="edit-panel">
      <p style={{ fontSize: 12, color: "#d4a853", letterSpacing: 2, marginBottom: 10 }}>修改记录</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label className="field-label">日期 *</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ fontSize: 13, padding: "7px 10px" }} />
          </div>
          <div>
            <label className="field-label">金额 *</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="0" step="0.01" style={{ fontSize: 15, fontWeight: 600, padding: "7px 10px" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label className="field-label">分类</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ padding: "7px 10px", fontSize: 13 }}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">支付方式</label>
            <select value={form.payMethod} onChange={(e) => setForm({ ...form, payMethod: e.target.value })} style={{ padding: "7px 10px", fontSize: 13 }}>
              {PAY_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="field-label">客户姓名</label>
          <input type="text" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="选填" style={{ padding: "7px 10px", fontSize: 13 }} />
        </div>
        <div>
          <label className="field-label">备注</label>
          <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="选填" style={{ padding: "7px 10px", fontSize: 13 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button className="cancel-btn" onClick={onCancel} style={{ padding: "8px" }}>取消</button>
          <button className="submit-btn" onClick={onSave} style={{ padding: "8px", fontSize: 14, letterSpacing: 2 }}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [records, setRecords] = useState(() => loadRecords());
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [form, setForm] = useState({ amount: "", category: "零售", note: "", payMethod: "现金", customerName: "" });
  const [customerSearch, setCustomerSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState("today");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const [aiError, setAiError] = useState("");
  const [apiKey, setApiKey] = useState(() => loadApiKey());
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState("");

  const save = useCallback((updated) => {
    setRecords(updated);
    saveRecords(updated);
  }, []);

  const addRecord = () => {
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return;
    const newRecord = {
      id: generateId(),
      date: selectedDate,
      amount: parseFloat(form.amount),
      category: form.category,
      note: form.note,
      payMethod: form.payMethod,
      customerName: form.customerName.trim(),
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    };
    save([newRecord, ...records]);
    setForm({ amount: "", category: "零售", note: "", payMethod: "现金", customerName: "" });
    setShowForm(false);
  };

  const deleteRecord = (id) => {
    save(records.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditForm({ date: r.date, amount: r.amount, category: r.category, note: r.note || "", payMethod: r.payMethod, customerName: r.customerName || "" });
  };

  const saveEdit = () => {
    if (!editForm.amount || isNaN(editForm.amount) || Number(editForm.amount) <= 0 || !editForm.date) return;
    save(records.map((r) =>
      r.id === editingId
        ? { ...r, date: editForm.date, amount: parseFloat(editForm.amount), category: editForm.category, note: editForm.note, payMethod: editForm.payMethod, customerName: editForm.customerName.trim() }
        : r
    ));
    setEditingId(null);
  };

  const parseWithAI = async () => {
    if (!aiInput.trim()) return;
    if (!apiKey) { setAiError("请先在设置中填入 Anthropic API Key 才能使用 AI 功能。"); return; }
    setAiParsing(true);
    setAiError("");
    setAiPreview(null);
    try {
      const prompt = `你是一个店铺收账助手。请从以下这段话中提取账单信息，返回纯JSON，不要任何多余文字或代码块标记。

今天日期：${todayStr()}
可用分类：餐饮、零售、服务、外卖、其他
可用支付方式：现金、微信、支付宝、银行卡、其他

用户描述：${aiInput}

请返回如下格式的JSON（所有字段必须存在）：
{
  "date": "YYYY-MM-DD",
  "amount": 数字（根据描述计算总金额，必须是正数）,
  "customerName": "客户姓名（没有则空字符串）",
  "category": "分类（从可用分类中选最合适的）",
  "payMethod": "支付方式（从可用支付方式中选，没有明确提到则默认现金）",
  "note": "备注（简洁描述原始内容要点）"
}`;
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.map((b) => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (!parsed.amount || parsed.amount <= 0) throw new Error("无法识别金额");
      setAiPreview(parsed);
    } catch (e) {
      setAiError("解析失败：" + (e.message || "请检查描述是否清晰，或检查 API Key 是否正确。"));
    }
    setAiParsing(false);
  };

  const confirmAiRecord = () => {
    if (!aiPreview) return;
    const newRecord = {
      id: generateId(),
      date: aiPreview.date || todayStr(),
      amount: parseFloat(aiPreview.amount),
      category: aiPreview.category,
      note: aiPreview.note || "",
      payMethod: aiPreview.payMethod,
      customerName: (aiPreview.customerName || "").trim(),
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    };
    save([newRecord, ...records]);
    setAiInput("");
    setAiPreview(null);
    setTab("today");
    setSelectedDate(newRecord.date);
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const todayRecords = records.filter((r) => r.date === selectedDate);
  const todayTotal = todayRecords.reduce((s, r) => s + r.amount, 0);

  const searchTrimmed = customerSearch.trim();
  const filteredRecords = searchTrimmed
    ? records.filter((r) => r.customerName && r.customerName.includes(searchTrimmed))
    : records;
  const filteredDates = [...new Set(filteredRecords.map((r) => r.date))].sort((a, b) => b.localeCompare(a));
  const historyByDate = filteredDates.map((date) => {
    const recs = filteredRecords.filter((r) => r.date === date);
    return { date, recs, total: recs.reduce((s, r) => s + r.amount, 0) };
  });
  const searchTotal = filteredRecords.reduce((s, r) => s + r.amount, 0);

  const catBreakdown = CATEGORIES.map((cat) => ({
    cat, total: todayRecords.filter((r) => r.category === cat).reduce((s, r) => s + r.amount, 0),
  })).filter((c) => c.total > 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Noto Serif SC', 'SimSun', serif", background: "#1a1209", minHeight: "100vh", color: "#e8d5a3" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1a1209; }
        ::-webkit-scrollbar-thumb { background: #5a3e1b; border-radius: 2px; }
        body { background: #1a1209; }
        .record-row { animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
        .tab-btn { cursor: pointer; padding: 8px 16px; border: 1px solid #5a3e1b; background: transparent; color: #a07840; font-family: inherit; font-size: 13px; transition: all 0.2s; border-radius: 2px; }
        .tab-btn.active { background: #d4a853; color: #1a1209; border-color: #d4a853; font-weight: 600; }
        .tab-btn:hover:not(.active) { background: #2e1f0a; color: #d4a853; }
        .add-btn { cursor: pointer; background: #d4a853; color: #1a1209; border: none; padding: 12px 26px; font-family: inherit; font-size: 15px; font-weight: 700; border-radius: 2px; transition: all 0.2s; letter-spacing: 2px; }
        .add-btn:hover { background: #f0c060; }
        .del-btn { cursor: pointer; background: transparent; border: 1px solid #5a3e1b; color: #8a6030; padding: 4px 10px; font-family: inherit; font-size: 12px; border-radius: 2px; transition: all 0.2s; white-space: nowrap; }
        .del-btn:hover { background: #8b1a1a; border-color: #8b1a1a; color: #ffaaaa; }
        .edit-btn { cursor: pointer; background: transparent; border: 1px solid #5a3e1b; color: #8a6a3a; padding: 4px 10px; font-family: inherit; font-size: 12px; border-radius: 2px; transition: all 0.2s; white-space: nowrap; }
        .edit-btn:hover { background: #2e1f0a; border-color: #d4a853; color: #d4a853; }
        .edit-panel { background: #241608; border: 1px solid #5a3e1b; border-top: none; border-radius: 0 0 4px 4px; padding: 14px 16px; animation: slideIn 0.2s ease; }
        input, select, textarea { background: #241608; border: 1px solid #5a3e1b; color: #e8d5a3; font-family: inherit; font-size: 15px; padding: 10px 12px; border-radius: 2px; width: 100%; outline: none; transition: border-color 0.2s; -webkit-appearance: none; }
        input:focus, select:focus, textarea:focus { border-color: #d4a853; }
        select option { background: #241608; }
        .submit-btn { cursor: pointer; background: #d4a853; color: #1a1209; border: none; padding: 12px; font-family: inherit; font-size: 16px; font-weight: 700; border-radius: 2px; width: 100%; letter-spacing: 3px; transition: all 0.2s; }
        .submit-btn:hover { background: #f0c060; }
        .cancel-btn { cursor: pointer; background: transparent; border: 1px solid #5a3e1b; color: #a07840; padding: 12px; font-family: inherit; font-size: 15px; border-radius: 2px; width: 100%; transition: all 0.2s; }
        .cancel-btn:hover { background: #2e1f0a; }
        .pay-chip { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 11px; border: 1px solid; }
        .ornament { color: #5a3e1b; font-size: 10px; letter-spacing: 6px; }
        .field-label { font-size: 11px; color: #6b4f28; display: block; margin-bottom: 3px; }
        .ai-parse-btn { cursor: pointer; background: linear-gradient(135deg,#b8860b,#d4a853); color: #1a1209; border: none; padding: 12px; font-family: inherit; font-size: 15px; font-weight: 700; border-radius: 2px; width: 100%; letter-spacing: 2px; transition: all 0.2s; }
        .ai-parse-btn:hover:not(:disabled) { background: linear-gradient(135deg,#d4a853,#f0c060); }
        .ai-parse-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ai-confirm-btn { cursor: pointer; background: #2a5c2a; color: #90ee90; border: 1px solid #3d8b3d; padding: 12px; font-family: inherit; font-size: 15px; font-weight: 700; border-radius: 2px; width: 100%; letter-spacing: 2px; transition: all 0.2s; }
        .ai-confirm-btn:hover { background: #357535; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .pulsing { animation: pulse 1.2s infinite; }
        .settings-btn { cursor: pointer; background: transparent; border: 1px solid #3d2910; color: #6b4f28; padding: 4px 10px; font-family: inherit; font-size: 12px; border-radius: 2px; transition: all 0.2s; }
        .settings-btn:hover { border-color: #5a3e1b; color: #a07840; }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#2e1a06 0%,#1a1209 100%)", borderBottom: "1px solid #3d2910", padding: "20px 20px 14px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <p className="ornament" style={{ textAlign: "center", marginBottom: 6 }}>◆ ◇ ◆ ◇ ◆</p>
          <h1 style={{ textAlign: "center", fontSize: 24, fontWeight: 700, color: "#d4a853", letterSpacing: 8, marginBottom: 2 }}>每日收账</h1>
          <p style={{ textAlign: "center", fontSize: 11, color: "#6b4f28", letterSpacing: 4 }}>DAILY INCOME LEDGER</p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, padding: "14px 0", alignItems: "center" }}>
          <button className={`tab-btn${tab === "today" ? " active" : ""}`} onClick={() => setTab("today")}>今日账单</button>
          <button className={`tab-btn${tab === "history" ? " active" : ""}`} onClick={() => setTab("history")}>历史记录</button>
          <button className={`tab-btn${tab === "ai" ? " active" : ""}`} onClick={() => setTab("ai")} style={tab !== "ai" ? { borderColor: "#7a5a28", color: "#c09040" } : {}}>✦ AI录入</button>
          <button className="settings-btn" style={{ marginLeft: "auto" }} onClick={() => { setShowApiKeyInput(!showApiKeyInput); setApiKeyDraft(apiKey); }}>⚙ 设置</button>
        </div>

        {/* API Key Settings Panel */}
        {showApiKeyInput && (
          <div style={{ background: "#1f1005", border: "1px solid #5a3e1b", borderRadius: 4, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#d4a853", marginBottom: 8, letterSpacing: 1 }}>⚙ AI 功能设置</p>
            <p style={{ fontSize: 12, color: "#6b4f28", marginBottom: 10, lineHeight: 1.6 }}>
              AI 录入功能需要 Anthropic API Key。<br />
              获取地址：<span style={{ color: "#a07840" }}>console.anthropic.com</span>
            </p>
            <label className="field-label">API Key</label>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              style={{ marginBottom: 10, fontSize: 13 }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="cancel-btn" onClick={() => setShowApiKeyInput(false)} style={{ padding: "8px" }}>取消</button>
              <button className="submit-btn" onClick={() => { saveApiKey(apiKeyDraft); setApiKey(apiKeyDraft); setShowApiKeyInput(false); }} style={{ padding: "8px", fontSize: 14, letterSpacing: 1 }}>保存</button>
            </div>
          </div>
        )}

        {/* ── TODAY TAB ─────────────────────────────────────────────────── */}
        {tab === "today" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "#6b4f28", letterSpacing: 1, whiteSpace: "nowrap" }}>日期</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ flex: 1 }} />
            </div>

            {/* Total card */}
            <div style={{ background: "linear-gradient(135deg,#2e1a06,#1f1005)", border: "1px solid #5a3e1b", borderRadius: 4, padding: "20px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "#d4a85310" }} />
              <p style={{ fontSize: 11, color: "#6b4f28", letterSpacing: 3, marginBottom: 6 }}>TODAY'S TOTAL</p>
              <p style={{ fontSize: 40, fontWeight: 700, color: "#d4a853", letterSpacing: 2, lineHeight: 1 }}>{formatCurrency(todayTotal)}</p>
              <p style={{ fontSize: 12, color: "#6b4f28", marginTop: 6 }}>共 {todayRecords.length} 笔收入</p>
              {catBreakdown.length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid #3d2910" }}>
                  {catBreakdown.map((c) => (
                    <span key={c.cat} style={{ fontSize: 12, color: "#a07840" }}>
                      {c.cat} <span style={{ color: "#d4a853" }}>{formatCurrency(c.total)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {!showForm && (
              <button className="add-btn" style={{ width: "100%", marginBottom: 16 }} onClick={() => setShowForm(true)}>
                ＋ 记一笔
              </button>
            )}

            {showForm && (
              <div style={{ background: "#1f1005", border: "1px solid #5a3e1b", borderRadius: 4, padding: 20, marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: "#d4a853", letterSpacing: 3, marginBottom: 14 }}>新增收入</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label className="field-label" style={{ fontSize: 12 }}>金额 *</label>
                    <input type="number" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="0" step="0.01" style={{ fontSize: 22, fontWeight: 600 }} />
                  </div>
                  <div>
                    <label className="field-label" style={{ fontSize: 12 }}>客户姓名（选填）</label>
                    <input type="text" placeholder="如：张三、李四..." value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label className="field-label" style={{ fontSize: 12 }}>分类</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="field-label" style={{ fontSize: 12 }}>支付方式</label>
                      <select value={form.payMethod} onChange={(e) => setForm({ ...form, payMethod: e.target.value })}>
                        {PAY_METHODS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="field-label" style={{ fontSize: 12 }}>备注（选填）</label>
                    <input type="text" placeholder="如：桌号、商品名称..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                    <button className="cancel-btn" onClick={() => setShowForm(false)}>取消</button>
                    <button className="submit-btn" onClick={addRecord}>记账</button>
                  </div>
                </div>
              </div>
            )}

            {todayRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#5a3e1b" }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>账</p>
                <p style={{ fontSize: 13, letterSpacing: 2 }}>今日暂无记录</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todayRecords.map((r) => (
                  <div key={r.id}>
                    <div className="record-row" style={{ background: "#1f1005", border: "1px solid #3d2910", borderRadius: editingId === r.id ? "4px 4px 0 0" : 4, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 18, fontWeight: 700, color: "#d4a853" }}>{formatCurrency(r.amount)}</span>
                          <span className="pay-chip" style={{ color: "#a07840", borderColor: "#5a3e1b" }}>{r.payMethod}</span>
                          <span className="pay-chip" style={{ color: "#6b8a50", borderColor: "#3d5528" }}>{r.category}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#6b4f28" }}>
                          {r.time}
                          {r.customerName && <span style={{ color: "#c09040", marginLeft: 8, fontWeight: 600 }}>👤 {r.customerName}</span>}
                          {r.note && <span style={{ color: "#8a6a3a", marginLeft: 8 }}>· {r.note}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                        <button className="edit-btn" onClick={() => editingId === r.id ? setEditingId(null) : startEdit(r)}>{editingId === r.id ? "收起" : "编辑"}</button>
                        <button className="del-btn" onClick={() => deleteRecord(r.id)}>删除</button>
                      </div>
                    </div>
                    {editingId === r.id && <EditPanel form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={() => setEditingId(null)} />}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ───────────────────────────────────────────────── */}
        {tab === "history" && (
          <div>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6b4f28", fontSize: 14, pointerEvents: "none" }}>🔍</span>
              <input type="text" placeholder="按客户姓名搜索..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} style={{ paddingLeft: 36 }} />
              {customerSearch && (
                <button onClick={() => setCustomerSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6b4f28", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
              )}
            </div>

            {searchTrimmed && (
              <div style={{ background: "#1f1005", border: "1px solid #5a3e1b", borderRadius: 4, padding: "12px 16px", marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: "#8a6a3a" }}>「{searchTrimmed}」的记录</span>
                <span style={{ fontSize: 13, color: "#6b4f28", marginLeft: 8 }}>{filteredRecords.length} 笔</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#d4a853", float: "right" }}>{formatCurrency(searchTotal)}</span>
              </div>
            )}

            {historyByDate.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#5a3e1b" }}>
                <p style={{ fontSize: 13, letterSpacing: 2 }}>{searchTrimmed ? "未找到相关记录" : "暂无历史记录"}</p>
              </div>
            ) : (
              historyByDate.map(({ date, recs, total }) => (
                <div key={date} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #3d2910", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: "#8a6a3a", letterSpacing: 2 }}>{date}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#d4a853" }}>{formatCurrency(total)}</span>
                  </div>
                  {recs.map((r) => (
                    <div key={r.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px", borderBottom: editingId === r.id ? "none" : "1px solid #251508" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 12, color: "#a07840", marginRight: 6 }}>{r.time}</span>
                          {r.customerName && <span style={{ fontSize: 12, color: "#c09040", fontWeight: 600, marginRight: 6 }}>👤 {r.customerName}</span>}
                          <span className="pay-chip" style={{ color: "#6b8a50", borderColor: "#3d5528", marginRight: 5 }}>{r.category}</span>
                          {r.note && <span style={{ fontSize: 11, color: "#6b4f28" }}>{r.note}</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          <span style={{ fontSize: 14, color: "#e8d5a3", fontWeight: 600 }}>{formatCurrency(r.amount)}</span>
                          <button className="edit-btn" onClick={() => editingId === r.id ? setEditingId(null) : startEdit(r)}>{editingId === r.id ? "收起" : "编辑"}</button>
                        </div>
                      </div>
                      {editingId === r.id && (
                        <div style={{ marginBottom: 8, borderBottom: "1px solid #251508" }}>
                          <EditPanel form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={() => setEditingId(null)} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── AI TAB ────────────────────────────────────────────────────── */}
        {tab === "ai" && (
          <div>
            <div style={{ background: "linear-gradient(135deg,#2a1e08,#1f1005)", border: "1px solid #5a3e1b", borderRadius: 4, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "#d4a853", fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>✦ 用一句话记账</p>
              <p style={{ fontSize: 12, color: "#6b4f28", lineHeight: 1.7 }}>
                直接描述交易内容，AI 会自动识别金额、客户、分类等。<br />
                例：<span style={{ color: "#a07840" }}>小王10箱干皮50一箱，未结账</span>
              </p>
            </div>

            {!apiKey && (
              <div style={{ background: "#1f0f00", border: "1px solid #8b5a00", borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#c89040" }}>
                ⚠ 请先点右上角 <strong>⚙ 设置</strong> 填入 API Key 才能使用 AI 功能
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <textarea rows={4} placeholder="输入交易描述..." value={aiInput} onChange={(e) => { setAiInput(e.target.value); setAiPreview(null); setAiError(""); }} style={{ resize: "vertical", lineHeight: 1.6, fontSize: 15 }} />
            </div>

            <button className="ai-parse-btn" disabled={aiParsing || !aiInput.trim()} onClick={parseWithAI}>
              {aiParsing ? <span className="pulsing">⚙ AI 解析中...</span> : "⚡ 智能解析"}
            </button>

            {aiError && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#2a0a0a", border: "1px solid #8b1a1a", borderRadius: 4, color: "#ff8888", fontSize: 13 }}>⚠ {aiError}</div>
            )}

            {aiPreview && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 12, color: "#6b8a50", letterSpacing: 2, marginBottom: 10 }}>✓ 解析结果（可修改后确认）</p>
                <div style={{ background: "#1f1005", border: "1px solid #3d7a3d", borderRadius: 4, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label className="field-label">日期</label>
                      <input type="date" value={aiPreview.date} onChange={(e) => setAiPreview({ ...aiPreview, date: e.target.value })} style={{ padding: "7px 10px", fontSize: 13 }} />
                    </div>
                    <div>
                      <label className="field-label">金额</label>
                      <input type="number" value={aiPreview.amount} onChange={(e) => setAiPreview({ ...aiPreview, amount: e.target.value })} style={{ padding: "7px 10px", fontSize: 18, fontWeight: 700, color: "#d4a853" }} />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">客户姓名</label>
                    <input type="text" value={aiPreview.customerName} onChange={(e) => setAiPreview({ ...aiPreview, customerName: e.target.value })} placeholder="无" style={{ padding: "7px 10px", fontSize: 13 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label className="field-label">分类</label>
                      <select value={aiPreview.category} onChange={(e) => setAiPreview({ ...aiPreview, category: e.target.value })} style={{ padding: "7px 10px", fontSize: 13 }}>
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">支付方式</label>
                      <select value={aiPreview.payMethod} onChange={(e) => setAiPreview({ ...aiPreview, payMethod: e.target.value })} style={{ padding: "7px 10px", fontSize: 13 }}>
                        {PAY_METHODS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="field-label">备注</label>
                    <input type="text" value={aiPreview.note} onChange={(e) => setAiPreview({ ...aiPreview, note: e.target.value })} style={{ padding: "7px 10px", fontSize: 13 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                    <button className="cancel-btn" onClick={() => setAiPreview(null)} style={{ padding: "10px" }}>重新解析</button>
                    <button className="ai-confirm-btn" onClick={confirmAiRecord}>✓ 确认入账</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
