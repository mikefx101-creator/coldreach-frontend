import { useState, useRef, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// IMPORTANT: Replace with your Railway backend URL after deploying backend
const API_URL = "https://coldreach-production-ce11.up.railway.app"
// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:      "#0a0a0f",
  surface: "#111118",
  card:    "#16161f",
  border:  "#22222e",
  borderB: "#2a2a38",
  accent:  "#4f6ef7",
  green:   "#22c55e",
  greenBg: "#052010",
  amber:   "#f59e0b",
  amberBg: "#1c1400",
  red:     "#ef4444",
  redBg:   "#1a0505",
  text:    "#eeeef5",
  sub:     "#7c7c9a",
  faint:   "#35354a",
  white:   "#ffffff",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"numeric", month:"short" }) : "—";
const today = () => new Date().toISOString().split("T")[0];
const interp = (tpl, vars) => (tpl||"").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || `{{${k}}}`);

// ─── API ───────────────────────────────────────────────────────────────────────
const api = {
  getCampaigns: async () => {
    const r = await fetch(`${API_URL}/api/campaigns`);
    if (!r.ok) throw new Error("Failed");
    return r.json();
  },
  createCampaign: async (name, sequence) => {
    const r = await fetch(`${API_URL}/api/campaigns`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ name, sequence }),
    });
    if (!r.ok) throw new Error("Failed");
    return r.json();
  },
  updateCampaign: async (id, data) => {
    const r = await fetch(`${API_URL}/api/campaigns/${id}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error("Failed");
    return r.json();
  },
  addLeads: async (campaignId, leads) => {
    const r = await fetch(`${API_URL}/api/campaigns/${campaignId}/leads`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ leads }),
    });
    if (!r.ok) throw new Error("Failed");
    return r.json();
  },
  getAccounts: async () => {
    const r = await fetch(`${API_URL}/api/accounts`);
    if (!r.ok) throw new Error("Failed");
    return r.json();
  },
  addAccount: async (email, label, limit, appPassword) => {
    const r = await fetch(`${API_URL}/api/accounts`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ email, label, limit, appPassword }),
    });
    if (!r.ok) throw new Error("Failed");
    return r.json();
  },
  toggleAccount: async (id, active) => {
    const r = await fetch(`${API_URL}/api/accounts/${id}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ active }),
    });
    if (!r.ok) throw new Error("Failed");
    return r.json();
  },
  markReplied: async (leadId) => {
    const r = await fetch(`${API_URL}/api/leads/${leadId}/replied`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
    });
    if (!r.ok) throw new Error("Failed");
    return r.json();
  },
};

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

function Badge({ s, label }) {
  const map = {
    active:  [T.green, T.greenBg],
    paused:  [T.amber, T.amberBg],
    draft:   [T.sub,   T.card],
    sent:    [T.accent,"#0d1040"],
    queued:  [T.sub,   "#1a1a2e"],
    bounced: [T.red,   T.redBg],
    replied: [T.green, T.greenBg],
  };
  const [fg, bg] = map[s] || [T.sub, T.card];
  return (
    <span style={{ background:bg, color:fg, padding:"2px 9px", borderRadius:99,
      fontSize:11, fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase",
      whiteSpace:"nowrap" }}>
      {label || s}
    </span>
  );
}

function Btn({ children, onClick, variant="primary", sm, disabled, full, style:sx={} }) {
  const variants = {
    primary: { background:T.accent,   color:T.white, border:"none" },
    ghost:   { background:"none",     color:T.sub,   border:`1px solid ${T.border}` },
    success: { background:T.greenBg,  color:T.green, border:`1px solid ${T.green}40` },
    danger:  { background:T.redBg,    color:T.red,   border:"none" },
    amber:   { background:T.amberBg,  color:T.amber, border:`1px solid ${T.amber}40` },
  };
  return (
    <button onClick={disabled ? undefined : onClick}
      style={{ ...variants[variant], padding: sm ? "6px 13px" : "8px 18px",
        fontSize: sm ? 12 : 13, borderRadius:8, fontWeight:600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
        fontFamily:"inherit", transition:"opacity .15s",
        width: full ? "100%" : undefined, ...sx }}>
      {children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type="text", rows, hint }) {
  const base = {
    width:"100%", background:T.bg, border:`1px solid ${T.border}`,
    borderRadius:8, padding:"9px 13px", color:T.text, fontSize:13,
    fontFamily:"inherit", outline:"none", boxSizing:"border-box",
    transition:"border-color .15s",
  };
  return (
    <div style={{ marginBottom:14 }}>
      {label && (
        <div style={{ color:T.sub, fontSize:11, fontWeight:600,
          letterSpacing:"0.05em", marginBottom:5 }}>
          {label.toUpperCase()}
        </div>
      )}
      {rows
        ? <textarea value={value} onChange={e=>onChange(e.target.value)}
            placeholder={placeholder} rows={rows}
            style={{ ...base, resize:"vertical", lineHeight:1.7 }}
            onFocus={e=>e.target.style.borderColor=T.accent}
            onBlur={e=>e.target.style.borderColor=T.border} />
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)}
            placeholder={placeholder} style={base}
            onFocus={e=>e.target.style.borderColor=T.accent}
            onBlur={e=>e.target.style.borderColor=T.border} />}
      {hint && <div style={{ color:T.faint, fontSize:11, marginTop:4 }}>{hint}</div>}
    </div>
  );
}

function Modal({ title, onClose, children, width=500 }) {
  useEffect(() => {
    const h = (e) => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:T.surface, border:`1px solid ${T.borderB}`,
        borderRadius:14, width:"100%", maxWidth:width, maxHeight:"90vh", overflow:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"18px 22px", borderBottom:`1px solid ${T.border}` }}>
          <span style={{ color:T.text, fontWeight:700, fontSize:15 }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:T.sub, fontSize:22, cursor:"pointer", lineHeight:1, padding:0 }}>×</button>
        </div>
        <div style={{ padding:22 }}>{children}</div>
      </div>
    </div>
  );
}

function Toast({ msg, type="success", onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  const bg = type==="error" ? T.red : T.accent;
  return (
    <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
      background:bg, color:T.white, padding:"11px 24px", borderRadius:10,
      fontWeight:600, fontSize:13, zIndex:9999, whiteSpace:"nowrap",
      boxShadow:`0 4px 20px ${bg}40`, pointerEvents:"none" }}>
      {msg}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ flex:1, minWidth:0, background:T.card, border:`1px solid ${T.border}`,
      borderRadius:10, padding:"16px 18px" }}>
      <div style={{ color:color||T.text, fontSize:24, fontWeight:800, lineHeight:1 }}>{value}</div>
      <div style={{ color:T.sub, fontSize:11, marginTop:5, fontWeight:500 }}>{label}</div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard", icon:"▦",  label:"Dashboard" },
  { id:"campaigns", icon:"⚡", label:"Campaigns" },
  { id:"accounts",  icon:"✉",  label:"Accounts"  },
  { id:"inbox",     icon:"◎",  label:"Inbox"     },
];

function Sidebar({ page, setPage, campaigns, open, setOpen }) {
  const replies = campaigns.flatMap(c=>c.leads||[]).filter(l=>l.replied).length;
  return (
    <>
      {open && (
        <div onClick={()=>setOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)",
            zIndex:49, display: window.innerWidth < 768 ? "block" : "none" }} />
      )}
      <aside style={{ position:"fixed", left:0, top:0, bottom:0,
        width: open ? 210 : 56, background:T.surface,
        borderRight:`1px solid ${T.border}`, zIndex:50,
        display:"flex", flexDirection:"column",
        transition:"width .2s cubic-bezier(.4,0,.2,1)", overflow:"hidden" }}>

        {/* Logo */}
        <div style={{ padding:"16px 12px", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", gap:10, minHeight:56 }}>
          <div onClick={()=>setOpen(v=>!v)}
            style={{ width:32, height:32, flexShrink:0, cursor:"pointer",
              background:"linear-gradient(135deg,#4f6ef7,#818cf8)",
              borderRadius:8, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:16 }}>⚡</div>
          {open && (
            <span style={{ color:T.text, fontWeight:800, fontSize:14,
              whiteSpace:"nowrap", letterSpacing:"-0.02em" }}>ColdReach</span>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ padding:"10px 8px", flex:1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={()=>{ setPage(n.id); setOpen(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
                padding: open ? "9px 12px" : "9px 0",
                justifyContent: open ? "flex-start" : "center",
                borderRadius:8, border:"none",
                background: page===n.id ? "#4f6ef720" : "none",
                color: page===n.id ? T.accent : T.sub,
                fontWeight: page===n.id ? 600 : 400,
                cursor:"pointer", fontSize:13, marginBottom:2,
                position:"relative", transition:"all .12s" }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{n.icon}</span>
              {open && <span style={{ whiteSpace:"nowrap" }}>{n.label}</span>}
              {n.id==="inbox" && replies>0 && (
                <span style={{ background:T.green, color:"#fff", fontSize:9,
                  fontWeight:800, padding:"1px 5px", borderRadius:99,
                  position: open ? "static" : "absolute", top:4, right:4 }}>
                  {replies}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User */}
        {open && (
          <div style={{ padding:"12px 14px", borderTop:`1px solid ${T.border}`,
            display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28, height:28, flexShrink:0,
              background:"linear-gradient(135deg,#4f6ef7,#818cf8)",
              borderRadius:"50%", display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:12, fontWeight:800, color:"#fff" }}>M</div>
            <div style={{ overflow:"hidden" }}>
              <div style={{ color:T.text, fontSize:12, fontWeight:600 }}>Mike</div>
              <div style={{ color:T.faint, fontSize:10, overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>evershinex0@gmail.com</div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function Topbar({ title, sub, setOpen, right }) {
  return (
    <div style={{ position:"sticky", top:0, zIndex:40, background:T.bg,
      borderBottom:`1px solid ${T.border}`, padding:"0 20px",
      display:"flex", alignItems:"center", gap:12, height:56 }}>
      <button onClick={()=>setOpen(v=>!v)}
        style={{ background:"none", border:"none", color:T.sub,
          fontSize:20, cursor:"pointer", padding:"4px 6px",
          borderRadius:6, flexShrink:0 }}>☰</button>
      <div style={{ flex:1, minWidth:0 }}>
        {sub && <div style={{ color:T.faint, fontSize:10, fontWeight:600,
          letterSpacing:"0.06em" }}>{sub}</div>}
        <div style={{ color:T.text, fontSize:16, fontWeight:700,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</div>
      </div>
      {right && <div style={{ flexShrink:0 }}>{right}</div>}
    </div>
  );
}

// ─── SEQUENCE EDITOR ──────────────────────────────────────────────────────────
function SequenceEditor({ sequence, setSequence, leads }) {
  const [sel, setSel] = useState(0);
  const step = sequence[Math.min(sel, sequence.length-1)];

  const upd = (f, v) =>
    setSequence(p => p.map((s,i) => i===sel ? {...s,[f]:v} : s));

  const addStep = () => {
    const lastDay = sequence[sequence.length-1]?.day || 0;
    setSequence(p => [...p, {
      id:uid(), day:lastDay+3,
      subject:"Follow-up — {{firstName}}",
      body:"Hey {{firstName}},\n\nJust following up on my last email.\n\nStill worth a quick chat?\n\nMike",
    }]);
    setSel(sequence.length);
  };

  const delStep = (idx, e) => {
    e.stopPropagation();
    if (sequence.length===1) return;
    setSequence(p => p.filter((_,i) => i!==idx));
    setSel(p => Math.max(0, p >= idx ? p-1 : p));
  };

  const preview = leads[0] || { firstName:"James", lastName:"Carter", company:"Acme Corp" };

  return (
    <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
      {/* Step list */}
      <div style={{ width:"100%", maxWidth:220, minWidth:160, flexShrink:0 }}>
        {sequence.map((s,i) => (
          <div key={s.id} onClick={()=>setSel(i)}
            style={{ background: sel===i ? "#4f6ef715" : T.card,
              border:`1px solid ${sel===i ? T.accent : T.border}`,
              borderRadius:8, padding:"11px 13px", cursor:"pointer",
              marginBottom:8, display:"flex", justifyContent:"space-between",
              alignItems:"flex-start", gap:8, transition:"all .12s" }}>
            <div style={{ minWidth:0 }}>
              <div style={{ color: sel===i ? T.accent : T.sub, fontSize:10,
                fontWeight:700, letterSpacing:"0.05em", marginBottom:3 }}>
                {s.day===0 ? "INITIAL" : `DAY ${s.day}`}
              </div>
              <div style={{ color: sel===i ? T.text : T.sub, fontSize:12,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {s.subject}
              </div>
            </div>
            {sequence.length>1 && (
              <button onClick={e=>delStep(i,e)}
                style={{ background:"none", border:"none", color:T.faint,
                  cursor:"pointer", fontSize:16, padding:0, flexShrink:0 }}>×</button>
            )}
          </div>
        ))}
        <button onClick={addStep}
          style={{ width:"100%", background:"none",
            border:`1px dashed ${T.border}`, borderRadius:8,
            padding:"10px", color:T.sub, cursor:"pointer", fontSize:12, fontWeight:500 }}>
          + Add follow-up
        </button>
      </div>

      {/* Editor */}
      <div style={{ flex:1, minWidth:260 }}>
        <div style={{ background:T.card, border:`1px solid ${T.border}`,
          borderRadius:10, padding:"12px 16px", marginBottom:14,
          display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ color:T.sub, fontSize:12 }}>Send after</span>
          <input type="number" min={0} value={step?.day||0}
            onChange={e=>upd("day", parseInt(e.target.value)||0)}
            style={{ width:56, background:T.bg, border:`1px solid ${T.border}`,
              borderRadius:6, padding:"5px 8px", color:T.text,
              fontSize:13, textAlign:"center", fontFamily:"inherit" }} />
          <span style={{ color:T.faint, fontSize:12 }}>
            {step?.day===0 ? "days — sends immediately" : "days after previous step"}
          </span>
        </div>

        <Field label="Subject" value={step?.subject||""}
          onChange={v=>upd("subject",v)} placeholder="Your subject line..." />

        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:5 }}>
            <div style={{ color:T.sub, fontSize:11, fontWeight:600,
              letterSpacing:"0.05em" }}>BODY</div>
            <div style={{ color:T.faint, fontSize:10 }}>
              {"{{firstName}} {{lastName}} {{company}}"}
            </div>
          </div>
          <textarea value={step?.body||""} onChange={e=>upd("body",e.target.value)}
            rows={9} style={{ width:"100%", background:T.bg,
              border:`1px solid ${T.border}`, borderRadius:8,
              padding:"10px 13px", color:T.text, fontSize:13, lineHeight:1.7,
              resize:"vertical", fontFamily:"inherit", boxSizing:"border-box",
              outline:"none" }}
            onFocus={e=>e.target.style.borderColor=T.accent}
            onBlur={e=>e.target.style.borderColor=T.border} />
        </div>

        {/* Preview */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`,
          borderRadius:8, padding:"12px 14px" }}>
          <div style={{ color:T.faint, fontSize:10, fontWeight:600,
            letterSpacing:"0.05em", marginBottom:8 }}>
            PREVIEW — {preview.firstName} {preview.lastName}
          </div>
          <div style={{ color:T.sub, fontSize:12, marginBottom:4 }}>
            <b style={{ color:T.faint }}>Subject:</b>{" "}
            {interp(step?.subject||"", preview)}
          </div>
          <div style={{ color:T.sub, fontSize:12, lineHeight:1.65,
            whiteSpace:"pre-wrap" }}>
            {interp(step?.body||"", preview)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CAMPAIGN DETAIL ──────────────────────────────────────────────────────────
function CampaignDetail({ campaign, onUpdate, onBack, setOpen }) {
  const [tab,      setTab]      = useState("leads");
  const [sequence, setSequence] = useState(campaign.sequence||[]);
  const [leads,    setLeads]    = useState(campaign.leads||[]);
  const [toast,    setToast]    = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [newLead,  setNewLead]  = useState({ firstName:"", lastName:"", email:"", company:"" });
  const [saving,   setSaving]   = useState(false);
  const fileRef = useRef();

  const save = useCallback(async (seq=sequence, lds=leads) => {
    setSaving(true);
    try {
      await api.updateCampaign(campaign.id, { ...campaign, sequence:seq, leads:lds });
      onUpdate({ ...campaign, sequence:seq, leads:lds });
    } catch (e) {
      setToast({ msg:"Save failed", type:"error" });
    } finally {
      setSaving(false);
    }
  }, [campaign, sequence, leads, onUpdate]);

  const markReplied = async (id) => {
    try {
      await api.markReplied(id);
      const updated = leads.map(l => l.id===id
        ? { ...l, replied:true, status:"replied", repliedAt:today() } : l);
      setLeads(updated);
      onUpdate({ ...campaign, sequence, leads:updated });
      setToast({ msg:"Marked as replied ✓" });
    } catch {
      const updated = leads.map(l => l.id===id
        ? { ...l, replied:true, status:"replied", repliedAt:today() } : l);
      setLeads(updated);
      setToast({ msg:"Marked as replied ✓" });
    }
  };

  const removeLead = (id) => {
    const updated = leads.filter(l=>l.id!==id);
    setLeads(updated);
    save(sequence, updated);
  };

  const addLead = async () => {
    if (!newLead.email||!newLead.firstName) return;
    try {
      const added = await api.addLeads(campaign.id, [newLead]);
      const updated = [...leads, ...(added||[{ ...newLead, id:uid(), status:"queued", replied:false, step:1 }])];
      setLeads(updated);
      onUpdate({ ...campaign, sequence, leads:updated });
      setNewLead({ firstName:"", lastName:"", email:"", company:"" });
      setAddModal(false);
      setToast({ msg:"Lead added" });
    } catch {
      setToast({ msg:"Error adding lead", type:"error" });
    }
  };

  const handleCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = ev.target.result.trim().split("\n");
      const hdrs = lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/["\s]/g,""));
      const parsed = lines.slice(1).map(line => {
        const vals = line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));
        const o={}; hdrs.forEach((h,j)=>o[h]=vals[j]||"");
        return {
          firstName: o.firstname||o.first_name||o.name?.split(" ")[0]||"",
          lastName:  o.lastname||o.last_name||o.name?.split(" ")[1]||"",
          email:     o.email||"",
          company:   o.company||o.companyname||"",
        };
      }).filter(l=>l.email?.includes("@") && l.firstName);
      try {
        const added = await api.addLeads(campaign.id, parsed);
        const updated = [...leads, ...(added||parsed.map(l=>({ ...l, id:uid(), status:"queued", replied:false, step:1 })))];
        setLeads(updated);
        onUpdate({ ...campaign, sequence, leads:updated });
        setToast({ msg:`${parsed.length} leads imported` });
      } catch {
        setToast({ msg:"Import failed", type:"error" });
      }
    };
    reader.readAsText(file);
    e.target.value="";
  };

  const sent    = leads.filter(l=>l.status==="sent"||l.status==="replied").length;
  const replied = leads.filter(l=>l.replied).length;
  const queued  = leads.filter(l=>l.status==="queued").length;
  const rate    = sent>0 ? Math.round((replied/sent)*100) : 0;

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      {addModal && (
        <Modal title="Add Lead" onClose={()=>setAddModal(false)} width={420}>
          <Field label="First Name *" value={newLead.firstName}
            onChange={v=>setNewLead(p=>({...p,firstName:v}))} placeholder="James" />
          <Field label="Last Name" value={newLead.lastName}
            onChange={v=>setNewLead(p=>({...p,lastName:v}))} placeholder="Carter" />
          <Field label="Email *" value={newLead.email}
            onChange={v=>setNewLead(p=>({...p,email:v}))} placeholder="james@company.com" />
          <Field label="Company" value={newLead.company}
            onChange={v=>setNewLead(p=>({...p,company:v}))} placeholder="Acme Corp" />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
            <Btn variant="ghost" onClick={()=>setAddModal(false)}>Cancel</Btn>
            <Btn onClick={addLead} disabled={!newLead.email||!newLead.firstName}>Add Lead</Btn>
          </div>
        </Modal>
      )}

      <Topbar title={campaign.name} sub="CAMPAIGN" setOpen={setOpen}
        right={
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Badge s={campaign.status} />
            <Btn sm variant="ghost" onClick={onBack}>← Back</Btn>
          </div>
        } />

      <div style={{ padding:"20px 20px 40px" }}>
        {/* Stats */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:22 }}>
          <StatCard label="Total Leads" value={leads.length} />
          <StatCard label="Sent"    value={sent}    color={T.accent} />
          <StatCard label="Replied" value={replied} color={T.green} />
          <StatCard label="Queued"  value={queued}  color={T.amber} />
          <StatCard label="Rate"    value={`${rate}%`} color={T.sub} />
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:20, background:T.card,
          borderRadius:8, padding:4, width:"fit-content", border:`1px solid ${T.border}` }}>
          {[["leads",`Leads (${leads.length})`],["sequence",`Sequence (${sequence.length} steps)`]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{ padding:"6px 16px", borderRadius:6, border:"none",
                background: tab===id ? T.accent : "none",
                color: tab===id ? T.white : T.sub,
                fontWeight:600, cursor:"pointer", fontSize:12 }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* LEADS TAB */}
        {tab==="leads" && (
          <>
            <input ref={fileRef} type="file" accept=".csv"
              onChange={handleCSV} style={{ display:"none" }} />
            <div style={{ display:"flex", gap:8, marginBottom:16,
              flexWrap:"wrap", alignItems:"center" }}>
              <Btn sm variant="ghost" onClick={()=>fileRef.current.click()}>↑ Import CSV</Btn>
              <Btn sm variant="ghost" onClick={()=>setAddModal(true)}>+ Add Lead</Btn>
              <span style={{ color:T.faint, fontSize:11, marginLeft:"auto" }}>
                CSV columns: firstName, email, lastName, company
              </span>
            </div>

            {leads.length===0
              ? (
                <div style={{ background:T.card, border:`1px dashed ${T.border}`,
                  borderRadius:12, padding:"50px 20px", textAlign:"center" }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
                  <div style={{ color:T.sub, marginBottom:4 }}>No leads yet</div>
                  <div style={{ color:T.faint, fontSize:12 }}>Import a CSV or add manually</div>
                </div>
              ) : (
                <div style={{ overflowX:"auto", borderRadius:12,
                  border:`1px solid ${T.border}` }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                        {["Name","Email","Company","Status","Step","Replied","Actions"].map(h=>(
                          <th key={h} style={{ padding:"10px 14px", textAlign:"left",
                            color:T.faint, fontSize:10, fontWeight:700,
                            letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((l,i)=>(
                        <tr key={l.id} style={{ borderBottom: i<leads.length-1
                          ? `1px solid ${T.border}` : "none",
                          background: l.replied ? "#22c55e08" : "none" }}>
                          <td style={{ padding:"11px 14px", color:T.text,
                            fontSize:12, fontWeight:500, whiteSpace:"nowrap" }}>
                            {l.firstName} {l.lastName}
                          </td>
                          <td style={{ padding:"11px 14px", color:T.sub, fontSize:12 }}>{l.email}</td>
                          <td style={{ padding:"11px 14px", color:T.sub, fontSize:12 }}>{l.company||"—"}</td>
                          <td style={{ padding:"11px 14px" }}><Badge s={l.status} /></td>
                          <td style={{ padding:"11px 14px", color:T.sub, fontSize:12 }}>
                            {l.step}/{sequence.length}
                          </td>
                          <td style={{ padding:"11px 14px" }}>
                            {l.replied
                              ? <span style={{ color:T.green, fontSize:11, fontWeight:600 }}>✓ {fmt(l.repliedAt)}</span>
                              : <span style={{ color:T.faint, fontSize:11 }}>—</span>}
                          </td>
                          <td style={{ padding:"11px 14px" }}>
                            <div style={{ display:"flex", gap:6 }}>
                              {!l.replied && l.status!=="bounced" && (
                                <button onClick={()=>markReplied(l.id)}
                                  style={{ background:T.greenBg,
                                    border:`1px solid ${T.green}30`,
                                    borderRadius:6, padding:"4px 10px",
                                    color:T.green, fontSize:11,
                                    cursor:"pointer", fontWeight:600,
                                    whiteSpace:"nowrap" }}>
                                  Replied ✓
                                </button>
                              )}
                              <button onClick={()=>removeLead(l.id)}
                                style={{ background:"none",
                                  border:`1px solid ${T.border}`,
                                  borderRadius:6, padding:"4px 8px",
                                  color:T.faint, fontSize:11, cursor:"pointer" }}>✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </>
        )}

        {/* SEQUENCE TAB */}
        {tab==="sequence" && (
          <>
            <SequenceEditor sequence={sequence} setSequence={setSequence} leads={leads} />
            <div style={{ marginTop:18, display:"flex", justifyContent:"flex-end" }}>
              <Btn onClick={()=>{ save(sequence, leads); setToast({ msg:"Sequence saved" }); }}
                disabled={saving}>
                {saving ? "Saving..." : "Save Sequence"}
              </Btn>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── CAMPAIGNS PAGE ────────────────────────────────────────────────────────────
function CampaignsPage({ campaigns, setCampaigns, onOpen, setOpen }) {
  const [modal,   setModal]   = useState(false);
  const [name,    setName]    = useState("");
  const [toast,   setToast]   = useState(null);
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const c = await api.createCampaign(name.trim(), [
        { id:uid(), day:0,
          subject:"Hey {{firstName}} — quick question",
          body:"Hey {{firstName}},\n\nI came across {{company}} and thought you might be interested.\n\n\n\nBest,\nMike" }
      ]);
      setCampaigns(p=>[...p, c]);
      setModal(false); setName("");
      setToast({ msg:"Campaign created" });
      setTimeout(()=>onOpen(c), 80);
    } catch {
      setToast({ msg:"Error creating campaign", type:"error" });
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) =>
    setCampaigns(p=>p.map(c=>c.id===id
      ? { ...c, status:c.status==="active"?"paused":"active" } : c));

  const del = (id) => setCampaigns(p=>p.filter(c=>c.id!==id));

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
      {modal && (
        <Modal title="New Campaign" onClose={()=>setModal(false)} width={400}>
          <Field label="Campaign Name" value={name} onChange={setName}
            placeholder="e.g. Video Editing Outreach" />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={create} disabled={!name.trim()||loading}>
              {loading ? "Creating..." : "Create"}
            </Btn>
          </div>
        </Modal>
      )}

      <Topbar title="Campaigns" sub="OUTREACH" setOpen={setOpen}
        right={<Btn sm onClick={()=>setModal(true)}>+ New Campaign</Btn>} />

      <div style={{ padding:"20px 20px 40px" }}>
        {campaigns.length===0
          ? (
            <div style={{ background:T.card, border:`1px dashed ${T.border}`,
              borderRadius:12, padding:"70px 20px", textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📣</div>
              <div style={{ color:T.sub, marginBottom:16 }}>No campaigns yet</div>
              <Btn onClick={()=>setModal(true)}>Create your first campaign</Btn>
            </div>
          ) : campaigns.map(c => {
            const s = (c.leads||[]).filter(l=>l.status==="sent"||l.status==="replied").length;
            const r = (c.leads||[]).filter(l=>l.replied).length;
            const rate = s>0 ? Math.round((r/s)*100) : 0;
            return (
              <div key={c.id}
                style={{ background:T.card, border:`1px solid ${T.border}`,
                  borderRadius:12, padding:"18px 20px", marginBottom:12,
                  cursor:"pointer", transition:"border-color .15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderB}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                  <div onClick={()=>onOpen(c)} style={{ flex:1, minWidth:180 }}>
                    <div style={{ display:"flex", alignItems:"center",
                      gap:10, marginBottom:5, flexWrap:"wrap" }}>
                      <span style={{ color:T.text, fontWeight:600, fontSize:14 }}>{c.name}</span>
                      <Badge s={c.status} />
                    </div>
                    <div style={{ color:T.faint, fontSize:11 }}>
                      {(c.leads||[]).length} leads · {(c.sequence||[]).length} steps · {fmt(c.createdAt)}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
                    {[["Leads",(c.leads||[]).length,T.sub],["Sent",s,T.accent],["Replied",r,T.green],["Rate",`${rate}%`,T.amber]].map(([lbl,val,col])=>(
                      <div key={lbl} style={{ textAlign:"center" }}>
                        <div style={{ color:col, fontWeight:700, fontSize:16 }}>{val}</div>
                        <div style={{ color:T.faint, fontSize:10 }}>{lbl}</div>
                      </div>
                    ))}
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={e=>{e.stopPropagation();toggle(c.id);}}
                        style={{ background: c.status==="active" ? T.amberBg : T.greenBg,
                          border:`1px solid ${c.status==="active" ? T.amber+"30" : T.green+"30"}`,
                          borderRadius:7, padding:"6px 13px",
                          color: c.status==="active" ? T.amber : T.green,
                          fontSize:12, fontWeight:600, cursor:"pointer" }}>
                        {c.status==="active" ? "Pause" : "Resume"}
                      </button>
                      <button onClick={e=>{e.stopPropagation();del(c.id);}}
                        style={{ background:T.redBg, border:"none", borderRadius:7,
                          padding:"6px 10px", color:T.red, fontSize:12, cursor:"pointer" }}>✕</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}

// ─── ACCOUNTS PAGE ─────────────────────────────────────────────────────────────
function AccountsPage({ accounts, setAccounts, setOpen }) {
  const [modal,   setModal]   = useState(false);
  const [toast,   setToast]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [acc, setAcc] = useState({ email:"", label:"", limit:15, appPassword:"" });

  const add = async () => {
    if (!acc.email||!acc.appPassword) {
      setToast({ msg:"Email and app password required", type:"error" }); return;
    }
    setLoading(true);
    try {
      const result = await api.addAccount(acc.email, acc.label, acc.limit, acc.appPassword);
      setAccounts(p=>[...p, result||{ ...acc, id:uid(), active:false, sentToday:0 }]);
      setAcc({ email:"", label:"", limit:15, appPassword:"" });
      setModal(false);
      setToast({ msg:"Account added" });
    } catch {
      setToast({ msg:"Error adding account", type:"error" });
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (id, current) => {
    try {
      await api.toggleAccount(id, !current);
      setAccounts(p=>p.map(a=>a.id===id?{...a,active:!a.active}:a));
    } catch {
      setAccounts(p=>p.map(a=>a.id===id?{...a,active:!a.active}:a));
    }
  };

  const remove = (id) => setAccounts(p=>p.filter(a=>a.id!==id));

  const cap    = accounts.filter(a=>a.active).reduce((s,a)=>s+(a.dailyLimit||a.limit||15),0);
  const today_ = accounts.reduce((s,a)=>s+(a.sentToday||0),0);

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
      {modal && (
        <Modal title="Add Gmail Account" onClose={()=>setModal(false)} width={420}>
          <div style={{ background:T.amberBg, border:`1px solid ${T.amber}30`,
            borderRadius:8, padding:"10px 13px", marginBottom:16,
            fontSize:12, color:T.amber, lineHeight:1.6 }}>
            ⚠️ Warm up new accounts 2–3 weeks before cold sending. Keep limit at 15/day.
          </div>
          <Field label="Gmail Email *" value={acc.email}
            onChange={v=>setAcc(p=>({...p,email:v}))} placeholder="you@gmail.com" />
          <Field label="App Password *" value={acc.appPassword}
            onChange={v=>setAcc(p=>({...p,appPassword:v}))}
            placeholder="xxxx xxxx xxxx xxxx"
            hint="Generate from Gmail → Security → App Passwords" />
          <Field label="Label" value={acc.label}
            onChange={v=>setAcc(p=>({...p,label:v}))} placeholder="Primary / Backup…" />
          <div style={{ marginBottom:16 }}>
            <div style={{ color:T.sub, fontSize:11, fontWeight:600,
              letterSpacing:"0.05em", marginBottom:6 }}>
              DAILY LIMIT — {acc.limit} emails/day
            </div>
            <input type="range" min={5} max={30} value={acc.limit}
              onChange={e=>setAcc(p=>({...p,limit:parseInt(e.target.value)}))}
              style={{ width:"100%", accentColor:T.accent }} />
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={add} disabled={!acc.email||!acc.appPassword||loading}>
              {loading ? "Adding..." : "Add Account"}
            </Btn>
          </div>
        </Modal>
      )}

      <Topbar title="Email Accounts" sub="SENDING" setOpen={setOpen}
        right={<Btn sm onClick={()=>setModal(true)}>+ Add Account</Btn>} />

      <div style={{ padding:"20px 20px 40px" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:22 }}>
          <StatCard label="Active Accounts" value={accounts.filter(a=>a.active).length} color={T.green} />
          <StatCard label="Daily Capacity" value={`${cap}/day`} color={T.accent} />
          <StatCard label="Sent Today" value={today_} color={T.sub} />
        </div>

        {accounts.length===0
          ? (
            <div style={{ background:T.card, border:`1px dashed ${T.border}`,
              borderRadius:12, padding:"50px 20px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>✉</div>
              <div style={{ color:T.sub, marginBottom:12 }}>No accounts yet</div>
              <Btn onClick={()=>setModal(true)}>Add your Gmail account</Btn>
            </div>
          ) : accounts.map(a => (
            <div key={a.id} style={{ background:T.card,
              border:`1px solid ${a.active ? T.borderB : T.border}`,
              borderRadius:12, padding:"16px 20px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", flexWrap:"wrap", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14,
                  flex:1, minWidth:0 }}>
                  <div style={{ width:38, height:38, flexShrink:0,
                    background: a.active ? "#4f6ef720" : T.surface,
                    border:`1px solid ${a.active ? T.accent+"40" : T.border}`,
                    borderRadius:10, display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:18 }}>✉</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ color:T.text, fontWeight:600, fontSize:13,
                      overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap" }}>{a.email}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:3 }}>
                      {a.label && <span style={{ color:T.sub, fontSize:11 }}>{a.label}</span>}
                      <Badge s={a.active?"active":"paused"}
                        label={a.active?"Active":"Inactive"} />
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:16, alignItems:"center", flexShrink:0 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:T.text, fontWeight:700 }}>{a.sentToday||0}</div>
                    <div style={{ color:T.faint, fontSize:10 }}>Today</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:T.accent, fontWeight:700 }}>{a.dailyLimit||a.limit||15}</div>
                    <div style={{ color:T.faint, fontSize:10 }}>Limit</div>
                  </div>
                  <div style={{ width:64 }}>
                    <div style={{ background:T.faint, borderRadius:3,
                      height:4, overflow:"hidden" }}>
                      <div style={{ width:`${Math.min(100,((a.sentToday||0)/(a.dailyLimit||a.limit||15))*100)}%`,
                        background:T.accent, height:"100%", borderRadius:3 }} />
                    </div>
                    <div style={{ color:T.faint, fontSize:9, marginTop:3,
                      textAlign:"right" }}>{a.sentToday||0}/{a.dailyLimit||a.limit||15}</div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>toggle(a.id, a.active)}
                      style={{ background: a.active ? T.amberBg : T.greenBg,
                        border:`1px solid ${a.active ? T.amber+"30" : T.green+"30"}`,
                        borderRadius:7, padding:"6px 13px",
                        color: a.active ? T.amber : T.green,
                        fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      {a.active ? "Pause" : "Activate"}
                    </button>
                    <button onClick={()=>remove(a.id)}
                      style={{ background:T.redBg, border:"none", borderRadius:7,
                        padding:"6px 10px", color:T.red, fontSize:12, cursor:"pointer" }}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          ))}

        <div style={{ marginTop:20, background:T.surface,
          border:`1px solid ${T.border}`, borderRadius:10, padding:"14px 18px" }}>
          <div style={{ color:T.sub, fontSize:11, fontWeight:600,
            marginBottom:8, letterSpacing:"0.05em" }}>DELIVERABILITY TIPS</div>
          <div style={{ color:T.faint, fontSize:12, lineHeight:1.9 }}>
            • Warm up accounts 2–3 weeks before cold sending<br/>
            • Keep daily limit at 15 emails per account<br/>
            • Write plain text — no images or spam trigger words<br/>
            • Check your inbox regularly for replies
          </div>
        </div>
      </div>
    </>
  );
}

// ─── INBOX PAGE ────────────────────────────────────────────────────────────────
function InboxPage({ campaigns, setCampaigns, setOpen }) {
  const [filter, setFilter] = useState("replied");
  const [toast,  setToast]  = useState(null);

  const allSent = campaigns.flatMap(c =>
    (c.leads||[])
      .filter(l=>l.status==="sent"||l.status==="replied")
      .map(l=>({...l, cName:c.name, cId:c.id}))
  );

  const shown = filter==="replied" ? allSent.filter(l=>l.replied)
              : filter==="noreply" ? allSent.filter(l=>!l.replied)
              : allSent;

  const mark = async (cId, lId) => {
    try {
      await api.markReplied(lId);
    } catch {}
    setCampaigns(p=>p.map(c=>c.id===cId
      ? { ...c, leads:c.leads.map(l=>l.id===lId
          ? { ...l, replied:true, status:"replied", repliedAt:today() } : l) }
      : c));
    setToast({ msg:"Marked as replied" });
  };

  const rep  = allSent.filter(l=>l.replied).length;
  const no   = allSent.filter(l=>!l.replied).length;
  const rate = allSent.length>0 ? Math.round((rep/allSent.length)*100) : 0;

  return (
    <>
      {toast && <Toast msg={toast.msg} onDone={()=>setToast(null)} />}
      <Topbar title="Reply Inbox" sub="TRACKING" setOpen={setOpen} />
      <div style={{ padding:"20px 20px 40px" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:22 }}>
          <StatCard label="Total Sent" value={allSent.length} />
          <StatCard label="Replied"    value={rep}           color={T.green} />
          <StatCard label="No Reply"   value={no}            color={T.sub}   />
          <StatCard label="Reply Rate" value={`${rate}%`}    color={T.amber} />
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
          {[["replied",`Replied (${rep})`],["noreply",`No Reply (${no})`],["all",`All (${allSent.length})`]].map(([v,lbl])=>(
            <button key={v} onClick={()=>setFilter(v)}
              style={{ background: filter===v ? T.accent : T.card,
                color: filter===v ? T.white : T.sub,
                border:`1px solid ${filter===v ? T.accent : T.border}`,
                borderRadius:8, padding:"7px 16px",
                cursor:"pointer", fontSize:12, fontWeight:500 }}>
              {lbl}
            </button>
          ))}
        </div>

        {shown.length===0
          ? (
            <div style={{ background:T.card, border:`1px solid ${T.border}`,
              borderRadius:12, padding:"50px 20px", textAlign:"center",
              color:T.faint, fontSize:13 }}>
              {filter==="replied" ? "No replies yet — keep sending!" : "Everyone replied 🎉"}
            </div>
          ) : shown.map(l => (
            <div key={l.id} style={{ background:T.card,
              border:`1px solid ${l.replied ? T.green+"20" : T.border}`,
              borderRadius:10, padding:"14px 18px", marginBottom:8,
              display:"flex", justifyContent:"space-between",
              alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center",
                  gap:8, marginBottom:3, flexWrap:"wrap" }}>
                  <span style={{ color:T.text, fontWeight:600, fontSize:13 }}>
                    {l.firstName} {l.lastName}
                  </span>
                  {l.replied && <Badge s="replied" label="Replied" />}
                </div>
                <div style={{ color:T.sub, fontSize:12 }}>{l.email} · {l.company}</div>
                <div style={{ color:T.faint, fontSize:11, marginTop:3 }}>
                  {l.cName} · Step {l.step} · Sent {fmt(l.sentAt)}
                  {l.replied && ` · Replied ${fmt(l.repliedAt)}`}
                </div>
              </div>
              {!l.replied
                ? (
                  <button onClick={()=>mark(l.cId, l.id)}
                    style={{ background:T.greenBg, border:`1px solid ${T.green}30`,
                      borderRadius:7, padding:"7px 16px", color:T.green,
                      fontSize:12, fontWeight:600, cursor:"pointer",
                      whiteSpace:"nowrap" }}>
                    Mark Replied ✓
                  </button>
                ) : (
                  <span style={{ color:T.green, fontSize:12,
                    fontWeight:600, whiteSpace:"nowrap" }}>
                    ✓ {fmt(l.repliedAt)}
                  </span>
                )}
            </div>
          ))}
      </div>
    </>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ campaigns, accounts, setPage, loading }) {
  const all    = campaigns.flatMap(c=>c.leads||[]);
  const sent   = all.filter(l=>l.status==="sent"||l.status==="replied").length;
  const rep    = all.filter(l=>l.replied).length;
  const queued = all.filter(l=>l.status==="queued").length;
  const rate   = sent>0 ? Math.round((rep/sent)*100) : 0;
  const todaySent = accounts.reduce((s,a)=>s+(a.sentToday||0),0);
  const dailyCap  = accounts.filter(a=>a.active).reduce((s,a)=>s+(a.dailyLimit||a.limit||15),0);

  if (loading) {
    return (
      <div style={{ padding:"40px 20px", textAlign:"center" }}>
        <div style={{ color:T.sub, fontSize:14 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding:"20px 20px 40px" }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:24 }}>
        <StatCard label="Total Sent"  value={sent}       color={T.accent} />
        <StatCard label="Replies"     value={rep}        color={T.green}  />
        <StatCard label="Reply Rate"  value={`${rate}%`} color={T.amber}  />
        <StatCard label="In Queue"    value={queued}     color={T.sub}    />
      </div>

      {/* Today's sending */}
      <div style={{ background:T.card, border:`1px solid ${T.border}`,
        borderRadius:12, padding:"18px 20px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
          <span style={{ color:T.text, fontWeight:600, fontSize:14 }}>Today's Sending</span>
          <span style={{ color:T.sub, fontSize:12 }}>{todaySent} / {dailyCap} emails</span>
        </div>
        <div style={{ background:T.faint, borderRadius:4, height:5,
          overflow:"hidden", marginBottom:16 }}>
          <div style={{ width:`${dailyCap>0 ? Math.min(100,(todaySent/dailyCap)*100) : 0}%`,
            background:"linear-gradient(90deg,#4f6ef7,#818cf8)",
            height:"100%", borderRadius:4, transition:"width .4s" }} />
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {accounts.length===0
            ? <div style={{ color:T.faint, fontSize:12 }}>No accounts added yet</div>
            : accounts.map(a => (
              <div key={a.id} style={{ flex:1, minWidth:140, background:T.surface,
                border:`1px solid ${T.border}`, borderRadius:8, padding:"10px 13px" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:4 }}>
                  <span style={{ color:T.sub, fontSize:11, fontWeight:600 }}>
                    {a.label||"Account"}
                  </span>
                  <Badge s={a.active?"active":"paused"} label={a.active?"On":"Off"} />
                </div>
                <div style={{ color:T.text, fontSize:12, marginBottom:2,
                  overflow:"hidden", textOverflow:"ellipsis",
                  whiteSpace:"nowrap" }}>{a.email}</div>
                <div style={{ color:T.sub, fontSize:11 }}>
                  {a.sentToday||0}/{a.dailyLimit||a.limit||15} today
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Campaigns */}
      <div style={{ background:T.card, border:`1px solid ${T.border}`,
        borderRadius:12, padding:"18px 20px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:14 }}>
          <span style={{ color:T.text, fontWeight:600, fontSize:14 }}>Campaigns</span>
          <Btn sm onClick={()=>setPage("campaigns")} variant="ghost">View all</Btn>
        </div>
        {campaigns.length===0
          ? <div style={{ color:T.faint, fontSize:13, textAlign:"center",
              padding:"20px 0" }}>No campaigns yet</div>
          : campaigns.slice(0,3).map((c,i) => {
            const s = (c.leads||[]).filter(l=>l.status==="sent"||l.status==="replied").length;
            const r = (c.leads||[]).filter(l=>l.replied).length;
            return (
              <div key={c.id} style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"11px 0",
                borderTop: i>0 ? `1px solid ${T.border}` : "none",
                gap:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ color:T.text, fontWeight:500, fontSize:13 }}>{c.name}</div>
                  <div style={{ color:T.sub, fontSize:11, marginTop:2 }}>
                    {(c.leads||[]).length} leads · <Badge s={c.status} />
                  </div>
                </div>
                <div style={{ display:"flex", gap:20 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:T.accent, fontWeight:700 }}>{s}</div>
                    <div style={{ color:T.faint, fontSize:10 }}>Sent</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:T.green, fontWeight:700 }}>{r}</div>
                    <div style={{ color:T.faint, fontSize:10 }}>Replied</div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Recent replies */}
      {rep > 0 && (
        <div style={{ background:T.card, border:`1px solid ${T.border}`,
          borderRadius:12, padding:"18px 20px" }}>
          <span style={{ color:T.text, fontWeight:600, fontSize:14,
            display:"block", marginBottom:14 }}>Recent Replies</span>
          {campaigns.flatMap(c=>(c.leads||[])).filter(l=>l.replied).slice(0,5).map((l,i,arr)=>(
            <div key={l.id} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", padding:"10px 0",
              borderTop: i>0 ? `1px solid ${T.border}` : "none",
              gap:8, flexWrap:"wrap" }}>
              <div>
                <div style={{ color:T.text, fontSize:13, fontWeight:500 }}>
                  {l.firstName} {l.lastName}
                </div>
                <div style={{ color:T.sub, fontSize:11 }}>{l.company} · {l.email}</div>
              </div>
              <div style={{ color:T.green, fontSize:11, fontWeight:600 }}>
                Replied {fmt(l.repliedAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page,       setPage]       = useState("dashboard");
  const [campaigns,  setCampaigns]  = useState([]);
  const [accounts,   setAccounts]   = useState([]);
  const [openCamp,   setOpenCamp]   = useState(null);
  const [sideOpen,   setSideOpen]   = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    Promise.all([api.getCampaigns(), api.getAccounts()])
      .then(([camps, accs]) => {
        setCampaigns(camps);
        setAccounts(accs);
      })
      .catch(e => setError("Cannot connect to backend. Check API_URL."))
      .finally(() => setLoading(false));
  }, []);

  const navigate = (p) => { setPage(p); setOpenCamp(null); setSideOpen(false); };

  const updateCampaign = (updated) => {
    setCampaigns(p=>p.map(c=>c.id===updated.id ? updated : c));
    setOpenCamp(updated);
  };

  const sideW = sideOpen ? 210 : 56;

  return (
    <div style={{ minHeight:"100vh", background:T.bg,
      fontFamily:"-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif",
      color:T.text }}>

      <Sidebar page={page} setPage={navigate} campaigns={campaigns}
        open={sideOpen} setOpen={setSideOpen} />

      <div style={{ marginLeft:sideW, minHeight:"100vh",
        transition:"margin-left .2s cubic-bezier(.4,0,.2,1)" }}>

        {error && (
          <div style={{ background:T.redBg, border:`1px solid ${T.red}`,
            padding:"12px 20px", fontSize:13, color:T.red, textAlign:"center" }}>
            ⚠️ {error}
          </div>
        )}

        {page==="dashboard" && (
          <>
            <Topbar title="Dashboard" sub="OVERVIEW" setOpen={setSideOpen} />
            <Dashboard campaigns={campaigns} accounts={accounts}
              setPage={navigate} loading={loading} />
          </>
        )}

        {page==="campaigns" && !openCamp && (
          <CampaignsPage campaigns={campaigns} setCampaigns={setCampaigns}
            onOpen={(c)=>{ setOpenCamp(c); }} setOpen={setSideOpen} />
        )}

        {page==="campaigns" && openCamp && (
          <CampaignDetail
            campaign={campaigns.find(c=>c.id===openCamp.id)||openCamp}
            onUpdate={updateCampaign}
            onBack={()=>setOpenCamp(null)}
            setOpen={setSideOpen}
          />
        )}

        {page==="accounts" && (
          <AccountsPage accounts={accounts} setAccounts={setAccounts}
            setOpen={setSideOpen} />
        )}

        {page==="inbox" && (
          <InboxPage campaigns={campaigns} setCampaigns={setCampaigns}
            setOpen={setSideOpen} />
        )}
      </div>
    </div>
  );
}
