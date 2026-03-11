// ---------- Demo data ----------
const data = {
  fiscalYears: ["FY 2024-25", "FY 2025-26"],
  programs: [
    { id:"P1", name:"Interim Housing & Shelter", allocated: 420000000, spent: 295000000 },
    { id:"P2", name:"Permanent Supportive Housing", allocated: 510000000, spent: 362000000 },
    { id:"P3", name:"Outreach & Case Management", allocated: 180000000, spent: 141000000 },
    { id:"P4", name:"Encampment Resolution", allocated: 155000000, spent: 99000000 }
  ],
  vendors: [
    { id:"V1", name:"Provider A (demo)" },
    { id:"V2", name:"Provider B (demo)" },
    { id:"V3", name:"Provider C (demo)" }
  ],
  contracts: [
    { id:"C-210", name:"Bridge Shelter Ops", vendorId:"V1", programId:"P1", cap: 95000000, status:"active", budgetLine:"BL-01 Shelter Ops" },
    { id:"C-344", name:"PSH Services + Retention", vendorId:"V2", programId:"P2", cap: 120000000, status:"active", budgetLine:"BL-09 PSH Services" },
    { id:"C-118", name:"Outreach Team Deployment", vendorId:"V3", programId:"P3", cap: 52000000, status:"active", budgetLine:"BL-14 Outreach" },
    { id:"C-509", name:"Encampment Resolution Support", vendorId:"V1", programId:"P4", cap: 42000000, status:"paused", budgetLine:"BL-22 Encampment Resolution" }
  ],
  txns: [
    { id:"TXN-1042", contractId:"C-210", programId:"P1", amount: 2500000, date:"2025-10-12", verified:"missing", outcome:"Monthly ops report pending", notes:"Invoice received; deliverables TBD" },
    { id:"TXN-1043", contractId:"C-210", programId:"P1", amount: 1800000, date:"2025-11-01", verified:"verified", outcome:"Beds maintained; staffing met", notes:"Invoice + staffing roster attached" },
    { id:"TXN-2041", contractId:"C-344", programId:"P2", amount: 5200000, date:"2025-10-20", verified:"verified", outcome:"Retention check-ins completed", notes:"Outcome sheet attached" },
    { id:"TXN-3048", contractId:"C-118", programId:"P3", amount: 900000, date:"2025-11-03", verified:"missing", outcome:"Contacts logged; referrals unclear", notes:"Field notes exist but not uploaded" },
    { id:"TXN-5091", contractId:"C-509", programId:"P4", amount: 650000, date:"2025-10-28", verified:"verified", outcome:"Clean-up coordination completed", notes:"Photos + partner note attached" }
  ],
  evidence: [
    { id:"EV-9001", txnId:"TXN-1043", type:"Invoice", notes:"Invoice + roster", date:"2025-11-02" },
    { id:"EV-9002", txnId:"TXN-2041", type:"Outcome Metrics", notes:"Retention metrics sheet", date:"2025-10-21" },
    { id:"EV-9003", txnId:"TXN-5091", type:"Photo / Field Note", notes:"Before/after + partner sign-off", date:"2025-10-29" }
  ],
  auditlog: [
    { id:"AL-1", ts:"2025-11-03 09:12", actor:"Analyst", action:"Created transaction TXN-3048", object:"TXN-3048", note:"Missing evidence flagged" },
    { id:"AL-2", ts:"2025-11-02 15:40", actor:"Program Lead", action:"Attached evidence EV-9001", object:"EV-9001", note:"Invoice linked to TXN-1043" }
  ]
};

// ---------- Helpers ----------
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const money = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const pct = (n) => `${Math.round(n*100)}%`;
const todayISO = () => new Date().toISOString().slice(0,10);

function getProgram(id){ return data.programs.find(p=>p.id===id); }
function getContract(id){ return data.contracts.find(c=>c.id===id); }
function getVendor(id){ return data.vendors.find(v=>v.id===id); }

function sum(arr, fn){ return arr.reduce((a,x)=>a+fn(x),0); }

// ---------- Routing ----------
const routes = {
  dashboard: { title:"Dashboard", subtitle:"A traceable path from budget → contract → spend → evidence." },
  budgets: { title:"Budgets", subtitle:"Drill into program allocations and their contract mix." },
  contracts: { title:"Contracts", subtitle:"See caps, spend, and traceability down to transactions." },
  transactions: { title:"Transactions", subtitle:"Every spend record can be verified with evidence." },
  evidence: { title:"Evidence", subtitle:"Attach invoices, reports, photos, outcomes — anything that substantiates spend." },
  auditlog: { title:"Audit Log", subtitle:"Immutable-ish trace: who changed what, when, and why." },
  public: { title:"Public View", subtitle:"A simplified view that builds trust without exposing sensitive details." }
};

function showRoute(route){
  // nav
  $$(".nav-item").forEach(b=>b.classList.toggle("is-active", b.dataset.route===route));
  // views
  $$(".view").forEach(v=>v.hidden = (v.dataset.view !== route));
  // titles
  $("#pageTitle").textContent = routes[route].title;
  $("#pageSubtitle").textContent = routes[route].subtitle;

  // per-route render
  if(route==="dashboard") renderDashboard();
  if(route==="budgets") renderBudgets();
  if(route==="contracts") renderContracts();
  if(route==="transactions") renderTransactions();
  if(route==="evidence") renderEvidence();
  if(route==="auditlog") renderAuditLog();
  if(route==="public") renderPublic();
}

$$(".nav-item").forEach(btn=>{
  btn.addEventListener("click", ()=> showRoute(btn.dataset.route));
});

// ---------- Search (global) ----------
$("#searchInput").addEventListener("input", ()=>{
  const q = $("#searchInput").value.trim().toLowerCase();
  // Apply lightweight search in Contracts + Transactions tables if visible
  const current = $$(".view").find(v=>!v.hidden)?.dataset.view;
  if(current==="contracts") renderContracts(q);
  if(current==="transactions") renderTransactions(q);
});

// ---------- Dashboard ----------
function renderDashboard(){
  const totalBudget = sum(data.programs, p=>p.allocated);
  const totalSpent = sum(data.txns, t=>t.amount);
  const unverified = sum(data.txns.filter(t=>t.verified==="missing"), t=>t.amount);

  $("#kpiBudget").textContent = money(totalBudget);
  $("#kpiSpent").textContent = money(totalSpent);
  $("#kpiUnverified").textContent = money(unverified);

  // Mini chart by program (% spent of allocated)
  const chart = $("#miniChart");
  chart.innerHTML = "";
  data.programs.forEach(p=>{
    const ratio = Math.min(1, p.spent / p.allocated);
    const row = document.createElement("div");
    row.className = "bar";
    row.innerHTML = `
      <div class="name">${p.name}</div>
      <div class="track"><div class="fill" style="width:${Math.round(ratio*100)}%"></div></div>
      <div class="pct">${pct(ratio)}</div>
    `;
    row.addEventListener("click", ()=>{
      showRoute("budgets");
      $("#programSelect").value = p.id;
      renderBudgets();
    });
    chart.appendChild(row);
  });

  // Activity feed
  const feed = $("#activityFeed");
  feed.innerHTML = "";
  const recent = [
    ...data.auditlog.slice(-4).reverse(),
    { ts:`${todayISO()} 13:10`, actor:"System", action:"Flagged missing evidence", object:"TXN-1042", note:"Unverified spend detected" }
  ].slice(0,6);

  recent.forEach(e=>{
    const item = document.createElement("div");
    item.className = "feed-item";
    item.innerHTML = `
      <div>
        <div><strong>${e.action}</strong> <span class="muted">(${e.object})</span></div>
        <div class="muted">${e.note || ""}</div>
      </div>
      <div class="meta">${e.ts} • ${e.actor}</div>
    `;
    feed.appendChild(item);
  });
}

// ---------- Budgets ----------
function ensureBudgetSelectors(){
  const fy = $("#fySelect");
  if(!fy.options.length){
    data.fiscalYears.forEach(x=>{
      const o=document.createElement("option");
      o.value=x;o.textContent=x;fy.appendChild(o);
    });
  }
  const ps = $("#programSelect");
  if(!ps.options.length){
    data.programs.forEach(p=>{
      const o=document.createElement("option");
      o.value=p.id;o.textContent=p.name;ps.appendChild(o);
    });
  }
}

function renderBudgets(){
  ensureBudgetSelectors();
  const programId = $("#programSelect").value || data.programs[0].id;
  const p = getProgram(programId);

  $("#budgetAllocated").textContent = money(p.allocated);
  $("#budgetSpent").textContent = money(p.spent);
  $("#budgetRemaining").textContent = money(p.allocated - p.spent);

  // Top contracts for program
  const rows = data.contracts
    .filter(c=>c.programId===programId)
    .map(c=>{
      const spent = sum(data.txns.filter(t=>t.contractId===c.id), t=>t.amount);
      return { ...c, spent };
    })
    .sort((a,b)=>b.spent-a.spent);

  $("#programContracts").innerHTML = tableHTML(
    ["Contract","Vendor","Cap","Spent","Status","Open"],
    rows.map(r=>[
      r.name,
      getVendor(r.vendorId).name,
      money(r.cap),
      money(r.spent),
      chip(r.status==="active" ? "ok" : "missing", r.status),
      `<button class="btn ghost mini" data-open="${r.id}">View</button>`
    ])
  );
  $("#programContracts").querySelectorAll("[data-open]").forEach(b=>{
    b.addEventListener("click", ()=>{
      showRoute("contracts");
      showContractDetail(b.dataset.open);
    });
  });

  $("#btnSaveBudgetNote").onclick = ()=>{
    addAudit("Program Lead","Updated program note", programId, $("#budgetNote").value || "Note saved");
    flash("Saved (demo).");
  };
}

// ---------- Contracts ----------
function ensureContractFilters(){
  const vs = $("#vendorSelect");
  if(!vs.options.length){
    const all = document.createElement("option");
    all.value="all"; all.textContent="All";
    vs.appendChild(all);
    data.vendors.forEach(v=>{
      const o=document.createElement("option");
      o.value=v.id;o.textContent=v.name;vs.appendChild(o);
    });
  }
}

function renderContracts(searchQ=""){
  ensureContractFilters();

  const status = $("#contractStatus").value;
  const vendor = $("#vendorSelect").value;

  let rows = data.contracts.map(c=>{
    const spent = sum(data.txns.filter(t=>t.contractId===c.id), t=>t.amount);
    return { ...c, spent };
  });

  if(status !== "all") rows = rows.filter(r=>r.status===status);
  if(vendor !== "all" && vendor) rows = rows.filter(r=>r.vendorId===vendor);
  if(searchQ) {
    rows = rows.filter(r=>{
      const v = getVendor(r.vendorId).name.toLowerCase();
      return (r.name.toLowerCase().includes(searchQ) || v.includes(searchQ) || r.budgetLine.toLowerCase().includes(searchQ));
    });
  }

  $("#contractsTable").innerHTML = tableHTML(
    ["Contract","Vendor","Program","Cap","Spent","Status","Trace"],
    rows.map(r=>[
      `<button class="link" data-c="${r.id}">${r.name}</button>`,
      getVendor(r.vendorId).name,
      getProgram(r.programId).name,
      money(r.cap),
      money(r.spent),
      chip(r.status==="active" ? "ok" : "missing", r.status),
      `<span class="muted">budget → contract → txns</span>`
    ])
  );

  $("#contractsTable").querySelectorAll("[data-c]").forEach(a=>{
    a.addEventListener("click", ()=> showContractDetail(a.dataset.c));
  });

  $("#btnExportContracts").onclick = ()=> exportCSV("contracts.csv",
    ["id","name","vendor","program","cap","spent","status","budgetLine"],
    rows.map(r=>({
      id:r.id, name:r.name, vendor:getVendor(r.vendorId).name, program:getProgram(r.programId).name,
      cap:r.cap, spent:r.spent, status:r.status, budgetLine:r.budgetLine
    }))
  );
}

function showContractDetail(contractId){
  const c = getContract(contractId);
  const v = getVendor(c.vendorId);
  const p = getProgram(c.programId);
  const spent = sum(data.txns.filter(t=>t.contractId===c.id), t=>t.amount);
  const ratio = Math.min(1, spent/c.cap);

  $("#contractDetail").hidden = false;
  $("#cdName").textContent = c.name;
  $("#cdMeta").textContent = `${v.name} • ${p.name} • Status: ${c.status}`;
  $("#cdBudgetLine").textContent = c.budgetLine;
  $("#cdSpend").textContent = `${money(spent)} / ${money(c.cap)}`;
  $("#cdBar").style.width = `${Math.round(ratio*100)}%`;

  // Transactions for contract
  const txns = data.txns.filter(t=>t.contractId===c.id).sort((a,b)=>b.date.localeCompare(a.date));
  $("#cdTxns").innerHTML = tableHTML(
    ["Txn","Date","Amount","Verified","Outcome"],
    txns.map(t=>[
      t.id, t.date, money(t.amount),
      chip(t.verified==="verified" ? "ok":"missing", t.verified),
      `<span class="muted">${escapeHTML(t.outcome)}</span>`
    ])
  );

  // Evidence for those txns
  const ev = data.evidence.filter(e=>txns.some(t=>t.id===e.txnId)).sort((a,b)=>b.date.localeCompare(a.date));
  $("#cdEvidence").innerHTML = tableHTML(
    ["Evidence","Txn","Type","Date","Notes"],
    ev.map(e=>[
      e.id, e.txnId, e.type, e.date, `<span class="muted">${escapeHTML(e.notes)}</span>`
    ])
  );
}

// ---------- Transactions ----------
function ensureTxnFilters(){
  const ps = $("#txnProgramFilter");
  if(!ps.options.length){
    const all = document.createElement("option");
    all.value="all"; all.textContent="All";
    ps.appendChild(all);
    data.programs.forEach(p=>{
      const o=document.createElement("option");
      o.value=p.id;o.textContent=p.name;ps.appendChild(o);
    });
  }
}

function renderTransactions(searchQ=""){
  ensureTxnFilters();
  const verify = $("#verifyFilter").value;
  const program = $("#txnProgramFilter").value;

  let rows = data.txns.map(t=>{
    const c = getContract(t.contractId);
    return { ...t, contractName:c.name, vendorName:getVendor(c.vendorId).name };
  });

  if(verify !== "all") rows = rows.filter(r=>r.verified===verify);
  if(program !== "all" && program) rows = rows.filter(r=>r.programId===program);
  if(searchQ){
    rows = rows.filter(r =>
      r.vendorName.toLowerCase().includes(searchQ) ||
      r.contractName.toLowerCase().includes(searchQ) ||
      r.id.toLowerCase().includes(searchQ)
    );
  }

  $("#txnsTable").innerHTML = tableHTML(
    ["Txn","Date","Vendor","Contract","Program","Amount","Evidence"],
    rows.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>[
      r.id,
      r.date,
      r.vendorName,
      r.contractName,
      getProgram(r.programId).name,
      money(r.amount),
      chip(r.verified==="verified" ? "ok" : "missing", r.verified==="verified" ? "Verified" : "Missing")
    ])
  );

  $("#btnExportTxns").onclick = ()=> exportCSV("transactions.csv",
    ["id","date","vendor","contract","program","amount","verification","outcome","notes"],
    rows.map(r=>({
      id:r.id, date:r.date, vendor:r.vendorName, contract:r.contractName, program:getProgram(r.programId).name,
      amount:r.amount, verification:r.verified, outcome:r.outcome, notes:r.notes
    }))
  );
}

// ---------- Evidence ----------
function renderEvidence(){
  $("#evidenceTable").innerHTML = tableHTML(
    ["Evidence","Txn","Type","Date","Notes"],
    data.evidence.sort((a,b)=>b.date.localeCompare(a.date)).map(e=>[
      e.id, e.txnId, e.type, e.date, `<span class="muted">${escapeHTML(e.notes)}</span>`
    ])
  );

  $("#btnAddEvidence").onclick = ()=>{
    const txnId = $("#evTxnId").value.trim();
    const type = $("#evType").value;
    const notes = $("#evNotes").value.trim() || "(no notes)";
    if(!txnId){ flash("Add a Transaction ID first."); return; }

    const newId = `EV-${Math.floor(9000 + Math.random()*900)}`;
    data.evidence.push({ id:newId, txnId, type, notes, date: todayISO() });

    // if evidence added, optionally flip txn verified
    const txn = data.txns.find(t=>t.id===txnId);
    if(txn){
      txn.verified = "verified";
      addAudit("Analyst", `Attached evidence ${newId}`, newId, `Linked to ${txnId}`);
    } else {
      addAudit("Analyst", `Added evidence ${newId}`, newId, `Unlinked txn: ${txnId}`);
    }

    $("#evTxnId").value = "";
    $("#evNotes").value = "";
    renderEvidence();
    renderDashboard();
    flash("Evidence added (demo).");
  };
}

// ---------- Audit Log ----------
function renderAuditLog(){
  $("#auditTable").innerHTML = tableHTML(
    ["Time","Actor","Action","Object","Note"],
    data.auditlog.slice().reverse().map(a=>[
      a.ts, a.actor, a.action, a.object, `<span class="muted">${escapeHTML(a.note||"")}</span>`
    ])
  );
}

// ---------- Public View ----------
function renderPublic(){
  const monthSpend = sum(data.txns.filter(t=>t.verified==="verified"), t=>t.amount);
  const verifiedRate = data.txns.length ? (data.txns.filter(t=>t.verified==="verified").length / data.txns.length) : 0;

  $("#pubSpend").textContent = money(monthSpend);
  $("#pubVerified").textContent = `${Math.round(verifiedRate*100)}%`;

  // Top programs by spent (from program spent field)
  const top = data.programs
    .slice()
    .sort((a,b)=>b.spent-a.spent)
    .slice(0,3);

  $("#pubPrograms").innerHTML = top.map(p=>`<div>• ${p.name}</div>`).join("");

  const plain = $("#pubPlain");
  plain.innerHTML = "";
  top.forEach(p=>{
    const ratio = Math.min(1, p.spent/p.allocated);
    const li = document.createElement("li");
    li.innerHTML = `<strong>${p.name}</strong>: ${pct(ratio)} of budget used, with traceable spending records.`;
    plain.appendChild(li);
  });
}

// ---------- Modal (New Transaction) ----------
// Support both the newer ids (txnModal/openTxn/closeTxn/cancelTxn/createTxn/txnBackdrop)
// and the earlier demo ids (modal/btnNewTxn/btnCreateTxn + [data-close]).

const modal = $("#txnModal") || $("#modal");
const openTrigger = $("#openTxn") || $("#btnNewTxn");
const closeBtn = $("#closeTxn");
const cancelBtn = $("#cancelTxn");
const createBtn = $("#createTxn") || $("#btnCreateTxn");
const backdrop = $("#txnBackdrop");
const closeEls = $$('[data-close]');

function isModalOpen(){
  if(!modal) return false;
  // Prefer the .hidden class convention, fall back to the native hidden attribute.
  if(modal.classList.contains('hidden')) return false;
  if(typeof modal.hidden === 'boolean') return !modal.hidden;
  return true;
}

const openModal = () => {
  if(!modal) return;
  modal.hidden = false;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
};

const closeModal = () => {
  if(!modal) return;
  modal.hidden = true;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden','true');
};

// Never show modal on load
closeModal();

// Open modal only when user explicitly clicks
if(openTrigger){
  openTrigger.addEventListener('click', (e)=>{
    e.preventDefault();
    populateModalSelectors();
    openModal();
  });
}

// Close hooks
if(closeBtn) closeBtn.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
if(cancelBtn) cancelBtn.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
if(backdrop) backdrop.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
closeEls.forEach(el => el.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); }));

// Esc closes
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape' && isModalOpen()) closeModal();
});

function populateModalSelectors(){
  // These ids are used by the original demo modal.
  // If your HTML uses different ids, this function safely no-ops.
  const mp = $("#mProgram");
  const mc = $("#mContract");
  if(!mp || !mc) return;

  if(!mp.options.length){
    data.programs.forEach(p=>{
      const o=document.createElement("option");
      o.value=p.id;o.textContent=p.name;mp.appendChild(o);
    });
  }

  const renderContractOptionsForProgram = ()=>{
    const pid = mp.value;
    mc.innerHTML = "";
    data.contracts.filter(c=>c.programId===pid).forEach(c=>{
      const o=document.createElement("option");
      o.value=c.id;o.textContent=c.name;mc.appendChild(o);
    });
  };

  renderContractOptionsForProgram();
  mp.onchange = renderContractOptionsForProgram;
}

// Create transaction: support both the original button click and a form submit.
const modalForm = $("#txnForm");

function handleCreateTxn(e){
  if(e) e.preventDefault();

  // Prefer the original demo modal field ids if present.
  const programEl = $("#mProgram");
  const contractEl = $("#mContract");
  const amountEl = $("#mAmount");
  const outcomeEl = $("#mOutcome");
  const notesEl = $("#mNotes");
  const verifiedEl = $("#mVerified");

  // If those fields are missing (different modal markup), just close the modal in lo-fi mode.
  if(!programEl || !contractEl || !amountEl || !verifiedEl){
    flash('Created (lo-fi).');
    closeModal();
    return;
  }

  const programId = programEl.value;
  const contractId = contractEl.value;
  const amount = Number(amountEl.value);
  const outcome = (outcomeEl?.value || '').trim() || "(no outcome)";
  const notes = (notesEl?.value || '').trim() || "";
  const verified = verifiedEl.value;

  if(!amount || amount <= 0){ flash("Enter a valid amount."); return; }

  const newId = `TXN-${Math.floor(1000 + Math.random()*8999)}`;
  data.txns.push({
    id:newId, contractId, programId, amount,
    date: todayISO(), verified, outcome, notes
  });

  addAudit("Analyst", `Created transaction ${newId}`, newId,
    verified==="verified" ? "Evidence attached" : "Missing evidence flagged"
  );

  // Update program spent (lo-fi simplification)
  const p = getProgram(programId);
  if(p) p.spent += amount;

  closeModal();
  amountEl.value = "";
  if(outcomeEl) outcomeEl.value = "";
  if(notesEl) notesEl.value = "";

  // Re-render current view
  const current = $$(".view").find(v=>!v.hidden)?.dataset.view;
  if(current==="transactions") renderTransactions($("#searchInput")?.value.trim().toLowerCase() || "");
  renderDashboard();
  flash("Transaction created (demo).");
}

if(createBtn){
  createBtn.addEventListener('click', handleCreateTxn);
}
if(modalForm){
  modalForm.addEventListener('submit', handleCreateTxn);
}

// ---------- UI utils ----------
function chip(kind, label){
  return `<span class="chip ${kind}">${escapeHTML(label)}</span>`;
}

function tableHTML(headers, rows){
  const thead = `<thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

function addAudit(actor, action, object, note){
  const ts = new Date();
  const stamp = `${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())} ${pad(ts.getHours())}:${pad(ts.getMinutes())}`;
  data.auditlog.push({ id:`AL-${data.auditlog.length+1}`, ts:stamp, actor, action, object, note });
}

function pad(n){ return String(n).padStart(2,"0"); }

function exportCSV(filename, headers, rows){
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => csvEscape(r[h])).join(","))
  ].join("\n");

  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  addAudit("System","Exported CSV", filename, "User exported data");
  flash("Exported CSV (demo).");
}

function csvEscape(val){
  const s = String(val ?? "");
  if(/[,"\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
  return s;
}

function escapeHTML(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

let toastTimer=null;
function flash(msg){
  clearTimeout(toastTimer);
  let t = $("#toast");
  if(!t){
    t = document.createElement("div");
    t.id="toast";
    t.style.position="fixed";
    t.style.right="16px";
    t.style.bottom="16px";
    t.style.padding="10px 12px";
    t.style.border="1px solid var(--line)";
    t.style.borderRadius="14px";
    t.style.background="#0e1220";
    t.style.color="var(--text)";
    t.style.zIndex="60";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity="1";
  toastTimer=setTimeout(()=>{ t.style.opacity="0"; }, 1800);
}

// ---------- Init ----------
function init(){
  // set up select defaults
  $("#contractStatus").onchange = ()=> renderContracts($("#searchInput").value.trim().toLowerCase());
  $("#vendorSelect").onchange = ()=> renderContracts($("#searchInput").value.trim().toLowerCase());
  $("#verifyFilter").onchange = ()=> renderTransactions($("#searchInput").value.trim().toLowerCase());
  $("#txnProgramFilter").onchange = ()=> renderTransactions($("#searchInput").value.trim().toLowerCase());

  // Fill selects lazily when needed
  ensureBudgetSelectors();
  ensureContractFilters();
  ensureTxnFilters();

  showRoute("dashboard");
}
init();