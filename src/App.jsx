import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CONFIGURATION ──────────────────────────────────────────────────
const SUPABASE_URL = "https://zdiqwcicsljaoamkildq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkaXF3Y2ljc2xqYW9hbWtpbGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NzgyMTIsImV4cCI6MjA5NTM1NDIxMn0.C6uhg4_5KVIqy_yMU8uvCji7efzw_L5I3CXN400XDZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const TASK_STATUS_OPTIONS = ["todo", "done"];
const TASK_STATUS_LABEL = { todo: "To-dos", done: "Done" };
const TASK_STATUS_COLOR = {
  todo: { accent: "#e8c547" },
  done: { accent: "#4caf7d" },
};

const PROJ_FLOW = ["trienkhai", "nghiemthu", "choTT", "hoantất"];
const PROJ_FLOW_LABEL = {
  trienkhai: "Triển khai",
  nghiemthu: "Nghiệm thu",
  choTT:     "Chờ TT",
  hoantất:   "Hoàn tất",
};
const PROJ_FLOW_COLOR = {
  trienkhai: "#4a9eff",
  nghiemthu: "#e8a23a",
  choTT:     "#e05c9a",
  hoantất:   "#4caf7d",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtVND(n) {
  if (!n && n !== 0) return "—";
  return n.toLocaleString("vi-VN") + " đ";
}

function parseInput(raw) {
  const match = raw.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[-–]\s*(.+)$/);
  if (!match) return null;
  return { date: match[1].trim(), task: match[2].trim() };
}

function sortByDate(tasks) {
  return [...tasks].sort((a, b) => {
    const p = (s) => { const [d,m,y]=s.split("/").map(Number); return new Date(y||2026,(m||1)-1,d||1); };
    return p(a.date) - p(b.date);
  });
}

// ─── INJECT STYLES ───────────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const styleTag = document.createElement("style");
  styleTag.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
    * { box-sizing: border-box; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
    select option { background:#141414; }
    input::placeholder, textarea::placeholder { color:#333; }
    textarea { resize: vertical; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #0d0d0d; }
    ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
    .proj-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:100; display:flex; align-items:center; justify-content:center; padding:24px; }
    .proj-modal { background:#141414; border:1px solid #2a2a2a; border-radius:8px; width:100%; max-width:520px; padding:28px; animation: fadeIn .2s ease; }
    .flow-step { display:flex; align-items:center; gap:6px; font-size:10px; letter-spacing:.08em; text-transform:uppercase; font-weight:600; padding:5px 10px; border-radius:3px; border:1px solid; cursor:pointer; font-family:inherit; transition:all .15s; }
    .flow-arrow { color:#333; font-size:12px; margin:0 2px; }
    .copy-toast { position:fixed; bottom:28px; left:50%; transform:translateX(-50%); background:#e8c547; color:#0d0d0d; font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; letter-spacing:.08em; padding:10px 22px; border-radius:4px; z-index:200; animation:fadeIn .2s ease; }
  `;
  document.head.appendChild(styleTag);
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("tasks");

  return (
    <div style={S.root}>
      <div style={S.grain} />
      <div style={S.container}>
        <div style={S.appHeader}>
          <div>
            <div style={S.eyebrow}>WORK DASHBOARD</div>
            <h1 style={S.appTitle}>Nghĩa / AE</h1>
          </div>
          <div style={S.tabBar}>
            {[["tasks","📋 Tasks"],["projects","📁 Projects"]].map(([k,label])=>(
              <button key={k} onClick={()=>setTab(k)} style={{...S.tabBtn, ...(tab===k?S.tabBtnActive:{})}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "tasks"    && <TasksTab />}
        {tab === "projects" && <ProjectsTab />}
      </div>
    </div>
  );
}

// ─── TASKS TAB ───────────────────────────────────────────────────────────────
function TasksTab() {
  const [tasks, setTasks]   = useState([]);
  const [input, setInput]   = useState("");
  const [error, setError]   = useState("");
  const [filter, setFilter] = useState("todo");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    const { data, error } = await supabase.from("tasks").select("*");
    if (!error && data) {
      setTasks(sortByDate(data));
    }
    setLoading(false);
  }

  async function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const parsed = parseInput(trimmed);
    if (!parsed) { setError("Format: DD/MM - Công việc cần làm"); return; }
    setError("");

    const newTask = {
      id: Date.now(),
      date: parsed.date,
      task: parsed.task,
      status: "todo",
      createdAt: new Date().toISOString()
    };

    const { error: err } = await supabase.from("tasks").insert([newTask]);
    if (!err) {
      setTasks(sortByDate([...tasks, newTask]));
      setInput("");
    } else {
      setError("Không thể lưu dữ liệu lên Supabase Cloud.");
    }
  }

  async function handleStatusChange(id, newStatus) {
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
    if (!error) {
      setTasks(tasks.map(x => x.id === id ? { ...x, status: newStatus } : x));
    }
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) {
      setTasks(tasks.filter(x => x.id !== id));
    }
  }

  const filtered = tasks.filter(t => t.status === filter);
  const counts   = { todo: tasks.filter(t=>t.status==="todo").length, done: tasks.filter(t=>t.status==="done").length };

  return (
    <>
      <div style={S.filterRow}>
        {["todo","done"].map(s => (
          <button key={s} onClick={()=>setFilter(s)} style={{...S.filterBtn, ...(filter===s?S.filterBtnActive:{}), ...(filter===s?{color: TASK_STATUS_COLOR[s]?.accent}:{})}}>
            <span style={S.filterCount}>{counts[s]}</span>
            <span style={S.filterLabel}>{TASK_STATUS_LABEL[s]}</span>
          </button>
        ))}
      </div>

      <div style={S.inputArea}>
        <div style={S.inputWrap}>
          <span style={S.inputIcon}>+</span>
          <input style={S.input} placeholder="DD/MM - Công việc cần làm..."
            value={input} onChange={e=>{setInput(e.target.value);setError("");}}
            onKeyDown={e=>e.key==="Enter"&&handleAdd()} />
          <button style={S.addBtn} onClick={handleAdd}>Add</button>
        </div>
        {error && <div style={S.error}>{error}</div>}
      </div>

      {loading ? <div style={S.empty}>ĐANG TẢI DỮ LIỆU...</div> : (
        <div style={S.list}>
          {filtered.length === 0
            ? <div style={S.empty}>{filter==="todo"?"Không có task nào.":"Chưa có task nào đã xong."}</div>
            : filtered.map((t,i)=>(
              <TaskRow key={t.id} task={t} index={i}
                onStatus={handleStatusChange}
                onDelete={handleDelete} />
            ))
          }
        </div>
      )}
    </>
  );
}

function TaskRow({ task, index, onStatus, onDelete }) {
  const [hov, setHov] = useState(false);
  const ac = TASK_STATUS_COLOR[task.status].accent;
  return (
    <div style={{...S.taskRow,...(hov?S.taskRowHover:{}), animationDelay:`${index*35}ms`}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div style={{...S.dot, background: ac}} />
      <div style={S.taskDate}>{task.date}</div>
      <div style={{...S.taskText, textDecoration: task.status==="done"?"line-through":"none", opacity: task.status==="done"?.4:1}}>
        {task.task}
      </div>
      <div style={S.taskActions}>
        <select style={{...S.sel, color: ac, borderColor: ac+"44"} } value={task.status}
          onChange={e=>onStatus(task.id,e.target.value)}>
          {TASK_STATUS_OPTIONS.map(s=><option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
        </select>
        <button style={{...S.delBtn, opacity:hov?1:0}} onClick={()=>onDelete(task.id)}>×</button>
      </div>
    </div>
  );
}

// ─── PROJECTS TAB ────────────────────────────────────────────────────────────
function ProjectsTab() {
  const [projects, setProjects] = useState([]);
  const [modal, setModal]       = useState(null); 
  const [filter, setFilter]     = useState("all"); 
  const [toast, setToast]       = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    const { data, error } = await supabase.from("projects").select("*");
    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  }

  async function handleUpsert(proj) {
    const existing = projects.find(p=>p.id===proj.id);
    const { error } = await supabase.from("projects").upsert([proj]);
    if (!error) {
      setProjects(existing ? projects.map(p=>p.id===proj.id?proj:p) : [...projects, proj]);
    }
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (!error) {
      setProjects(projects.filter(p=>p.id!==id));
    }
  }

  const waiting  = projects.filter(p=>["nghiemthu","choTT"].includes(p.status));
  const active   = projects.filter(p=>p.status==="trienkhai");
  const totalDebt = waiting.reduce((s,p)=>s+(p.value||0),0);
  const filtered = filter==="all" ? projects : projects.filter(p=>p.status===filter);

  function generateReport() {
    const done_grp  = projects.filter(p=>["nghiemthu","choTT","hoantất"].includes(p.status));
    const active_grp = projects.filter(p=>p.status==="trienkhai");
    let lines = ["*Project đã xong, đang xử lý nghiệm thu hoặc chờ thanh toán:*"];
    done_grp.forEach((p,i)=>{
      lines.push(`${i+1}. ${p.name} | ${p.note||PROJ_FLOW_LABEL[p.status]}`);
    });
    lines.push("---");
    lines.push("*Project đang triển khai:*");
    active_grp.forEach((p,i)=>{
      lines.push(`${i+1}. ${p.name} | ${p.note||"Đang triển khai"}`);
    });
    return lines.join("\n");
  }

  function copyReport() {
    navigator.clipboard.writeText(generateReport()).then(()=>{
      setToast(true); setTimeout(()=>setToast(false), 2000);
    });
  }

  const editingProject = modal && modal !== "new" ? projects.find(p=>p.id===modal) : null;

  return (
    <>
      <div style={S.summaryBar}>
        <div style={S.summaryCard}>
          <div style={S.summaryNum}>{projects.length}</div>
          <div style={S.summaryLabel}>Tổng project</div>
        </div>
        <div style={S.summaryCard}>
          <div style={{...S.summaryNum, color:"#e05c9a"}}>{waiting.length}</div>
          <div style={S.summaryLabel}>Chờ thanh toán</div>
        </div>
        <div style={{...S.summaryCard, flex:2}}>
          <div style={{...S.summaryNum, color:"#e05c9a", fontSize:16}}>{fmtVND(totalDebt)}</div>
          <div style={S.summaryLabel}>Tổng công nợ (excl.VAT)</div>
        </div>
        <div style={{...S.summaryCard, flex:1}}>
          <div style={{...S.summaryNum, color:"#4a9eff"}}>{active.length}</div>
          <div style={S.summaryLabel}>Đang triển khai</div>
        </div>
      </div>

      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8}}>
        <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
          {["all",...PROJ_FLOW].map(s=>(
            <button key={s} onClick={()=>setFilter(s)} style={{
              ...S.filterBtn,
              ...(filter===s?S.filterBtnActive:{}),
              ...(s!=="all"?{color:PROJ_FLOW_COLOR[s]}:{})
            }}>
              <span style={S.filterCount}>{s==="all"?projects.length:projects.filter(p=>p.status===s).length}</span>
              <span style={S.filterLabel}>{s==="all"?"All":PROJ_FLOW_LABEL[s]}</span>
            </button>
          ))}
        </div>
        <div style={{display:"flex", gap:6}}>
          <button style={S.reportBtn} onClick={copyReport}>📋 Copy báo cáo T2</button>
          <button style={S.addBtn} onClick={()=>setModal("new")}>+ Project</button>
        </div>
      </div>

      {loading ? <div style={S.empty}>ĐANG TẢI DỮ LIỆU...</div> : (
        <div style={S.list}>
          {filtered.length===0
            ? <div style={S.empty}>Chưa có project nào ở giai đoạn này.</div>
            : filtered.map((p,i)=>(
              <ProjectRow key={p.id} project={p} index={i}
                onEdit={()=>setModal(p.id)}
                onStatus={(id,s)=>handleUpsert({...p,status:s})}
                onDelete={handleDelete} />
            ))
          }
        </div>
      )}

      {modal && (
        <ProjectModal
          project={editingProject}
          onSave={proj=>{ handleUpsert(proj); setModal(null); }}
          onClose={()=>setModal(null)}
        />
      )}

      {toast && <div className="copy-toast">✓ Đã copy báo cáo!</div>}
    </>
  );
}

function ProjectRow({ project, index, onEdit, onStatus, onDelete }) {
  const [hov, setHov] = useState(false);
  const ac = PROJ_FLOW_COLOR[project.status];

  return (
    <div style={{...S.taskRow,...(hov?S.taskRowHover:{}), animationDelay:`${index*35}ms`, alignItems:"flex-start", padding:"14px"}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div style={{...S.dot, background:ac, marginTop:4}} />
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
          <span style={{...S.taskText, fontWeight:600}}>{project.name}</span>
          {project.value ? (
            <span style={{fontSize:10, color:"#e05c9a", letterSpacing:".05em", fontWeight:600, background:"#1a1010", border:"1px solid #3a1a1a", borderRadius:3, padding:"2px 6px"}}>
              {project.value.toLocaleString("vi-VN")} excl.VAT
            </span>
          ) : null}
        </div>
        {project.note && (
          <div style={{fontSize:11, color:"#555", marginTop:4, letterSpacing:".02em", lineHeight:1.5}}>
            {project.note}
          </div>
        )}
      </div>
      <div style={{display:"flex", alignItems:"center", gap:6, flexShrink:0, marginTop:2}}>
        <select style={{...S.sel, color:ac, borderColor:ac+"44", fontSize:9}} value={project.status}
          onChange={e=>onStatus(project.id,e.target.value)}>
          {PROJ_FLOW.map(s=><option key={s} value={s}>{PROJ_FLOW_LABEL[s]}</option>)}
        </select>
        <button style={{...S.iconBtn, opacity:hov?1:.3}} onClick={onEdit} title="Sửa">✏️</button>
        <button style={{...S.delBtn, opacity:hov?1:0}} onClick={()=>onDelete(project.id)} title="Xoá">×</button>
      </div>
    </div>
  );
}

function ProjectModal({ project, onSave, onClose }) {
  const [name,   setName]   = useState(project?.name   || "");
  const [value,  setValue]  = useState(project?.value  || "");
  const [status, setStatus] = useState(project?.status || "trienkhai");
  const [note,   setNote]   = useState(project?.note   || "");
  const [err,    setErr]    = useState("");

  function handleSave() {
    if (!name.trim()) { setErr("Tên project không được để trống."); return; }
    const numVal = value === "" ? null : Number(String(value).replace(/\D/g,""));
    onSave({
      id:     project?.id || Date.now(),
      name:   name.trim(),
      value:  numVal,
      status,
      note:   note.trim(),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="proj-modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="proj-modal">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:11,letterSpacing:".2em",color:"#555",fontWeight:600,textTransform:"uppercase"}}>
            {project?"Sửa project":"Thêm project mới"}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#444",fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Tên project *</label>
          <input style={S.modalInput} placeholder="VD: OM/BSG Chill, ZEISS, AEON Mailer..."
            value={name} onChange={e=>setName(e.target.value)} />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Giá trị (excl.VAT)</label>
          <input style={S.modalInput} placeholder="VD: 31900000"
            value={value} onChange={e=>setValue(e.target.value)} type="number" />
          {value && <div style={{fontSize:10,color:"#e05c9a",marginTop:4}}>= {Number(String(value).replace(/\D/g,"")).toLocaleString("vi-VN")} đ</div>}
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Giai đoạn</label>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
            {PROJ_FLOW.map((s,i)=>(
              <button key={s} className="flow-step"
                style={{color:PROJ_FLOW_COLOR[s], borderColor:PROJ_FLOW_COLOR[s]+(status===s?"":"33"), background:status===s?PROJ_FLOW_COLOR[s]+"22":"transparent"}}
                onClick={()=>setStatus(s)}>
                {i>0&&<span className="flow-arrow">›</span>}
                {PROJ_FLOW_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Ghi chú / Trạng thái chi tiết</label>
          <textarea style={{...S.modalInput, minHeight:72, fontFamily:"inherit"}}
            placeholder="VD: Đã ký HĐ & BBNT → chờ gửi ký & xuất Hóa đơn"
            value={note} onChange={e=>setNote(e.target.value)} />
        </div>

        {err && <div style={S.error}>{err}</div>}

        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20}}>
          <button style={S.cancelBtn} onClick={onClose}>Huỷ</button>
          <button style={S.addBtn} onClick={handleSave}>Lưu</button>
        </div>
      </div>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  root: { minHeight:"100vh", background:"#0d0d0d", fontFamily:"'IBM Plex Mono','Courier New',monospace", color:"#e0ddd8", position:"relative", overflowX:"hidden" },
  grain: { position:"fixed", inset:0, backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")", pointerEvents:"none", zIndex:0, opacity:.6 },
  container: { position:"relative", zIndex:1, maxWidth:780, margin:"0 auto", padding:"40px 20px 80px" },
  appHeader: { marginBottom:28, borderBottom:"1px solid #1e1e1e", paddingBottom:20, display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:12 },
  eyebrow: { fontSize:10, letterSpacing:".3em", color:"#444", marginBottom:4, fontWeight:600 },
  appTitle: { fontSize:26, fontWeight:700, margin:0, letterSpacing:"-.02em", color:"#f0ede8" },
  tabBar: { display:"flex", gap:4 },
  tabBtn: { background:"transparent", border:"1px solid #232323", borderRadius:4, padding:"7px 16px", cursor:"pointer", color:"#444", fontFamily:"inherit", fontSize:11, fontWeight:600, letterSpacing:".05em", transition:"all .15s" },
  tabBtnActive: { background:"#1c1c1c", borderColor:"#404040", color:"#e0ddd8" },

  filterRow: { display:"flex", gap:4, flexWrap:"wrap", marginBottom:20 },
  filterBtn: { background:"transparent", border:"1px solid #1e1e1e", borderRadius:4, padding:"5px 12px", cursor:"pointer", color:"#444", fontFamily:"inherit", fontSize:11, letterSpacing:".05em", display:"flex", gap:5, alignItems:"center", transition:"all .15s" },
  filterBtnActive: { background:"#1c1c1c", borderColor:"#383838", color:"#e0ddd8" },
  filterCount: { fontWeight:700, fontSize:12 },
  filterLabel: { textTransform:"uppercase", fontSize:9, letterSpacing:".12em" },

  summaryBar: { display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" },
  summaryCard: { flex:1, minWidth:80, background:"#111", border:"1px solid #1e1e1e", borderRadius:5, padding:"12px 14px" },
  summaryNum: { fontSize:22, fontWeight:700, letterSpacing:"-.02em", color:"#f0ede8" },
  summaryLabel: { fontSize:9, color:"#444", letterSpacing:".1em", textTransform:"uppercase", marginTop:2 },

  inputArea: { marginBottom:24 },
  inputWrap: { display:"flex", alignItems:"center", background:"#141414", border:"1px solid #2a2a2a", borderRadius:6, overflow:"hidden" },
  inputIcon: { padding:"0 14px", fontSize:20, color:"#444", userSelect:"none", lineHeight:1 },
  input: { flex:1, background:"transparent", border:"none", outline:"none", color:"#e0ddd8", fontFamily:"'IBM Plex Mono','Courier New',monospace", fontSize:13, padding:"13px 0", letterSpacing:".02em" },
  addBtn: { background:"#e8c547", color:"#0d0d0d", border:"none", padding:"13px 18px", cursor:"pointer", fontFamily:"'IBM Plex Mono','Courier New',monospace", fontSize:11, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" },
  reportBtn: { background:"transparent", border:"1px solid #2a2a2a", color:"#aaa", borderRadius:4, padding:"8px 14px", cursor:"pointer", fontFamily:"'IBM Plex Mono','Courier New',monospace", fontSize:11, fontWeight:600, letterSpacing:".05em", transition:"all .15s" },
  cancelBtn: { background:"transparent", border:"1px solid #2a2a2a", color:"#666", borderRadius:4, padding:"10px 18px", cursor:"pointer", fontFamily:"'IBM Plex Mono','Courier New',monospace", fontSize:11, letterSpacing:".05em" },
  error: { marginTop:8, fontSize:11, color:"#e05c5c", letterSpacing:".05em" },

  list: { display:"flex", flexDirection:"column", gap:2 },
  taskRow: { display:"flex", alignItems:"center", gap:10, padding:"11px 13px", background:"#111", borderRadius:5, border:"1px solid transparent", transition:"all .15s", animation:"fadeIn .25s ease both" },
  taskRowHover: { background:"#161616", borderColor:"#242424" },
  dot: { width:6, height:6, borderRadius:"50%", flexShrink:0 },
  taskDate: { fontSize:11, color:"#555", minWidth:50, letterSpacing:".05em", fontWeight:600 },
  taskText: { flex:1, fontSize:13, lineHeight:1.5, letterSpacing:".01em" },
  taskActions: { display:"flex", alignItems:"center", gap:5, flexShrink:0 },
  sel: { background:"#1a1a1a", border:"1px solid", borderRadius:3, padding:"3px 6px", fontFamily:"'IBM Plex Mono','Courier New',monospace", fontSize:10, letterSpacing:".08em", cursor:"pointer", outline:"none", textTransform:"uppercase", fontWeight:600 },
  delBtn: { background:"transparent", border:"none", color:"#e05c5c", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 3px", transition:"opacity .15s", fontFamily:"inherit" },
  iconBtn: { background:"transparent", border:"none", cursor:"pointer", fontSize:13, lineHeight:1, padding:"0 3px", transition:"opacity .15s" },
  empty: { textAlign:"center", color:"#2a2a2a", fontSize:11, letterSpacing:".1em", padding:"40px 0", textTransform:"uppercase" },

  formGroup: { marginBottom:16 },
  label: { fontSize:10, letterSpacing:".15em", textTransform:"uppercase", color:"#555", fontWeight:600, display:"block", marginBottom:6 },
  modalInput: { width:"100%", background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:4, color:"#e0ddd8", fontFamily:"'IBM Plex Mono','Courier New',monospace", fontSize:12, padding:"10px 12px", outline:"none", letterSpacing:".02em" },
};