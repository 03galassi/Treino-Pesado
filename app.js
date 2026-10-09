
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, where, query, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const STORAGE="treino_pesado_v2";
const app=document.querySelector("#app");

const state={
 page:"dashboard",
 settings:JSON.parse(localStorage.getItem(STORAGE+"_settings")||"null")||{
   academy:"ACADEMIA HD", professional:"Professor", welcome:"Bora começar seu treino?"
 },
 students:JSON.parse(localStorage.getItem(STORAGE+"_students")||"[]"),
 exercises:JSON.parse(localStorage.getItem(STORAGE+"_exercises")||"[]"),
 templates:JSON.parse(localStorage.getItem(STORAGE+"_templates")||"[]"),
 payments:JSON.parse(localStorage.getItem(STORAGE+"_payments")||"[]")
};

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const id=p=>p+"_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function persist(){
 for(const k of ["settings","students","exercises","templates","payments"])
   localStorage.setItem(STORAGE+"_"+k,JSON.stringify(state[k]));
}
async function cloudSet(col,item){try{await setDoc(doc(db,col,item.id),item,{merge:true})}catch(e){console.warn(e)}}
async function cloudDelete(col,itemId){try{await deleteDoc(doc(db,col,itemId))}catch(e){console.warn(e)}}
async function sync(){
 try{
  const [a,b,c,d]=await Promise.all([
   getDocs(collection(db,"students")),getDocs(collection(db,"exercises")),
   getDocs(collection(db,"templates")),getDocs(collection(db,"payments"))
  ]);
  if(!a.empty)state.students=a.docs.map(x=>({id:x.id,...x.data()}));
  if(!b.empty)state.exercises=b.docs.map(x=>({id:x.id,...x.data()}));
  if(!c.empty)state.templates=c.docs.map(x=>({id:x.id,...x.data()}));
  if(!d.empty)state.payments=d.docs.map(x=>({id:x.id,...x.data()}));
  persist();
 }catch(e){console.warn("Firebase indisponível; modo local ativo.",e)}
}
function toast(msg){
 let t=document.querySelector(".toast");if(!t){t=document.createElement("div");t.className="toast";document.body.appendChild(t)}
 t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);
}
function go(page){state.page=page;location.hash=page;render()}
window.go=go;

function shell(body){
 const nav=[["dashboard","DASHBOARD"],["students","ALUNOS"],["exercises","EXERCÍCIOS"],["templates","TREINOS"],["finance","FINANCEIRO"]];
 return `<div class="app-shell">
 <header class="top">
  <div class="logo" onclick="go('dashboard')"><div class="logo-mark">HD</div><div><b>${esc(state.settings.academy)}</b><small>TREINO PESADO</small></div></div>
  <nav class="main-nav">${nav.map(x=>`<button class="nav ${state.page===x[0]?"active":""}" onclick="go('${x[0]}')">${x[1]}</button>`).join("")}</nav>
  <div class="top-right"><button class="round" onclick="window.refresh()">↻</button><button class="round" onclick="window.settings()">⚙</button></div>
 </header><main class="content">${body}</main></div>`;
}

function dashboard(){
 const active=state.students.filter(s=>s.status!=="bloqueado").length;
 const blocked=state.students.filter(s=>s.status==="bloqueado").length;
 const trained=state.students.filter(s=>s.workout?.released).length;
 const pending=state.payments.filter(p=>p.status!=="pago").length;
 return `<section class="hero"><img src="./assets/academia-treino.webp" alt=""><div class="hero-copy"><div class="kicker">GESTÃO DE TREINAMENTO</div><h1>Treino Pesado</h1><p>Controle seus alunos, monte treinos e envie exatamente o que cada aluno deve executar.</p><button class="btn primary big" onclick="go('students')">ABRIR ALUNOS</button></div></section>
 <section class="metrics"><div class="metric"><span>ALUNOS ATIVOS</span><b>${active}</b><small>cadastros ativos</small></div><div class="metric"><span>TREINOS ENVIADOS</span><b>${trained}</b><small>prontos para alunos</small></div><div class="metric"><span>PENDÊNCIAS</span><b>${pending}</b><small>financeiras</small></div><div class="metric"><span>BLOQUEADOS</span><b>${blocked}</b><small>controle manual</small></div></section>
 <div class="grid2"><div class="panel"><div class="panel-title"><b>FLUXO PRINCIPAL</b><span>simples e direto</span></div><p style="font-size:12px;line-height:1.7;color:#6e7b86">Crie modelos em <b>TREINOS</b>. Depois vá em <b>ALUNOS → TREINO</b>, escolha um modelo, ajuste o treino daquele aluno e clique em <b>ENVIAR TREINO</b>.</p></div>
 <div class="panel"><div class="panel-title"><b>ACESSO RÁPIDO</b></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn light" onclick="go('students')">ALUNOS</button><button class="btn light" onclick="go('templates')">TREINOS</button><button class="btn light" onclick="go('exercises')">EXERCÍCIOS</button><button class="btn light" onclick="go('finance')">FINANCEIRO</button></div></div></div>`;
}

function students(){
 const list=[...state.students].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
 return `<div class="page-head"><div><div class="section-label">GESTÃO</div><h1>Alunos</h1><p>Todos em ordem alfabética. As ações importantes ficam na própria linha.</p></div><button class="btn primary" onclick="window.studentForm()">+ NOVO ALUNO</button></div>
 <div class="student-toolbar"><input placeholder="Pesquisar aluno..." oninput="window.searchStudents(this.value)"><span>${list.length} aluno(s)</span></div>
 <div class="student-list" id="studentsList">${list.length?list.map(studentRow).join(""):`<div class="empty"><strong>Nenhum aluno cadastrado</strong>Cadastre o primeiro aluno para começar.</div>`}</div>`;
}
function studentRow(s){
 const initials=(s.name||"?").split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase();
 return `<div class="student-row" data-name="${esc(s.name.toLowerCase())}"><div class="avatar">${esc(initials)}</div><div class="student-info"><b>${esc(s.name)}</b><small>${esc(s.phone||"Sem contato")} · <span class="status ${s.status==="bloqueado"?"block":"ok"}">${s.status==="bloqueado"?"BLOQUEADO":"ATIVO"}</span></small></div>
 <div class="student-actions"><button class="mini" onclick="window.studentHome('${s.id}')">HOME</button><button class="mini" onclick="window.studentStatus('${s.id}')">STATUS</button><button class="mini" onclick="window.studentForm('${s.id}')">EDITAR</button><button class="mini blue" onclick="window.openWorkoutEditor('${s.id}')">TREINO</button><button class="mini" onclick="window.studentLink('${s.id}')">LINK</button><button class="mini ${s.status==="bloqueado"?"green":"red"}" onclick="window.studentStatus('${s.id}')">${s.status==="bloqueado"?"LIBERAR":"BLOQUEAR"}</button></div></div>`;
}
window.searchStudents=v=>document.querySelectorAll(".student-row").forEach(r=>r.style.display=r.dataset.name.includes(v.toLowerCase())?"":"none");

function exercises(){
 return `<div class="page-head"><div><div class="section-label">BIBLIOTECA</div><h1>Exercícios</h1><p>Aqui o professor define a demonstração e as instruções de cada exercício.</p></div><button class="btn primary" onclick="window.exerciseForm()">+ NOVO EXERCÍCIO</button></div>
 <div class="exercise-grid">${state.exercises.length?state.exercises.map(e=>`<article class="exercise-card">${e.image?`<img src="${esc(e.image)}" alt="">`:`<div class="exercise-noimg">SEM IMAGEM</div>`}<div class="exercise-body"><span class="pill">${esc(e.muscle||"GERAL")}</span><h3>${esc(e.name)}</h3><p>${esc(e.instructions||"Sem instruções.")}</p>${e.video?`<small style="color:#159b68;font-size:9px;font-weight:900">VÍDEO CADASTRADO</small>`:""}<br><button class="btn light" style="margin-top:12px" onclick="window.exerciseForm('${e.id}')">EDITAR</button></div></article>`).join(""):`<div class="empty"><strong>Biblioteca vazia</strong>Cadastre o primeiro exercício.</div>`}</div>`;
}
function templates(){
 return `<div class="page-head"><div><div class="section-label">MODELOS</div><h1>Treinos</h1><p>Modelos são a base. O treino do aluno será uma cópia editável.</p></div><button class="btn primary" onclick="window.templateForm()">+ NOVO TREINO</button></div>
 <div class="template-grid">${state.templates.length?state.templates.map(t=>`<article class="template-card"><div class="template-body"><div class="template-top"><span class="template-count">${t.exercises?.length||0} EXERCÍCIOS</span><button class="mini" onclick="window.templateForm('${t.id}')">EDITAR</button></div><h2>${esc(t.name)}</h2><p>${esc(t.description||"Modelo de treino")}</p><button class="btn light" onclick="window.templateForm('${t.id}')">ABRIR MODELO</button></div></article>`).join(""):`<div class="empty"><strong>Nenhum modelo criado</strong>Crie modelos para acelerar a montagem dos treinos.</div>`}</div>`;
}
function finance(){
 const received=state.payments.filter(p=>p.status==="pago").reduce((a,p)=>a+Number(p.value||0),0);
 const pending=state.payments.filter(p=>p.status!=="pago").reduce((a,p)=>a+Number(p.value||0),0);
 return `<div class="page-head"><div><div class="section-label">CONTROLE</div><h1>Financeiro</h1><p>Pagamentos, pendências e histórico.</p></div><button class="btn primary" onclick="window.paymentForm()">+ LANÇAR</button></div>
 <div class="finance-cards"><div class="finance-card"><span>RECEBIDO</span><b>R$ ${received.toFixed(2).replace(".",",")}</b></div><div class="finance-card"><span>PENDENTE</span><b>R$ ${pending.toFixed(2).replace(".",",")}</b></div></div>
 <div class="panel table">${state.payments.length?state.payments.map(p=>{const s=state.students.find(x=>x.id===p.studentId);return `<div class="payment"><span>${esc(s?.name||"Aluno")}</span><span>${esc(p.description||"Mensalidade")}</span><b>R$ ${Number(p.value||0).toFixed(2).replace(".",",")}</b><button class="mini ${p.status==="pago"?"green": "red"}" onclick="window.togglePayment('${p.id}')">${p.status==="pago"?"PAGO":"PENDENTE"}</button></div>`}).join(""):`<div class="empty">Nenhum lançamento.</div>`}</div>`;
}

function modal(html){document.body.insertAdjacentHTML("beforeend",`<div class="modal-wrap" id="modalRoot">${html}</div>`)}
window.closeModal=()=>document.querySelector("#modalRoot")?.remove();

window.settings=()=>{
 modal(`<div class="modal"><div class="modal-head"><b>CONFIGURAÇÕES</b><button class="close" onclick="closeModal()">×</button></div><form id="settingsForm"><div class="modal-body"><div class="form-grid"><label class="field">ACADEMIA<input name="academy" value="${esc(state.settings.academy)}" required></label><label class="field">PROFISSIONAL<input name="professional" value="${esc(state.settings.professional)}"></label><label class="field">WHATSAPP<input name="whatsapp" value="${esc(state.settings.whatsapp||"")}"></label><label class="field">INSTAGRAM<input name="instagram" value="${esc(state.settings.instagram||"")}"></label><label class="field full">BOAS-VINDAS<textarea name="welcome">${esc(state.settings.welcome)}</textarea></label></div></div><div class="modal-footer"><button type="button" class="btn light" onclick="closeModal()">CANCELAR</button><button class="btn primary">SALVAR</button></div></form></div>`);
 document.querySelector("#settingsForm").onsubmit=e=>{e.preventDefault();state.settings=Object.fromEntries(new FormData(e.target));persist();closeModal();render();toast("Configurações salvas")};
};

window.studentForm=(studentId)=>{
 const s=state.students.find(x=>x.id===studentId)||{id:id("stu"),name:"",phone:"",email:"",status:"ativo",token:crypto.randomUUID()};
 modal(`<div class="modal"><div class="modal-head"><b>${studentId?"EDITAR ALUNO":"NOVO ALUNO"}</b><button class="close" onclick="closeModal()">×</button></div><form id="studentForm"><div class="modal-body"><div class="form-grid"><label class="field full">NOME<input name="name" value="${esc(s.name)}" required></label><label class="field">WHATSAPP<input name="phone" value="${esc(s.phone||"")}"></label><label class="field">E-MAIL<input name="email" value="${esc(s.email||"")}"></label></div></div><div class="modal-footer"><button type="button" class="btn light" onclick="closeModal()">CANCELAR</button><button class="btn primary">SALVAR</button></div></form></div>`);
 document.querySelector("#studentForm").onsubmit=async e=>{e.preventDefault();Object.assign(s,Object.fromEntries(new FormData(e.target)));if(!s.token)s.token=crypto.randomUUID();if(!studentId)state.students.push(s);persist();await cloudSet("students",s);closeModal();render();toast("Aluno salvo")};
};

window.studentStatus=async studentId=>{const s=state.students.find(x=>x.id===studentId);s.status=s.status==="bloqueado"?"ativo":"bloqueado";persist();await cloudSet("students",s);render();toast(s.status==="bloqueado"?"Aluno bloqueado":"Aluno liberado")};
window.studentHome=studentId=>{const s=state.students.find(x=>x.id===studentId);modal(`<div class="modal"><div class="modal-head"><b>${esc(s.name)}</b><button class="close" onclick="closeModal()">×</button></div><div class="modal-body"><p style="font-size:12px;color:#6f7b86">Status: <b>${s.status==="bloqueado"?"Bloqueado":"Ativo"}</b></p><p style="font-size:12px;color:#6f7b86">Treino: <b>${esc(s.workout?.name||"Nenhum treino enviado")}</b></p><p style="font-size:12px;color:#6f7b86">Contato: <b>${esc(s.phone||"Não informado")}</b></p></div></div>`)};

window.studentLink=studentId=>{
 const s=state.students.find(x=>x.id===studentId);if(!s.token)s.token=crypto.randomUUID();persist();cloudSet("students",s);
 const url=location.origin+location.pathname+"#aluno="+encodeURIComponent(s.token);
 modal(`<div class="modal"><div class="modal-head"><b>LINK DO ALUNO</b><button class="close" onclick="closeModal()">×</button></div><div class="modal-body"><p style="font-size:12px">Este é o endereço que abre a <b>área do aluno</b>. A tela de edição continua exclusiva do professor.</p><div style="padding:12px;background:#f5f7f8;border:1px solid var(--line);border-radius:9px;word-break:break-all;font-size:10px">${esc(url)}</div><button class="btn primary" style="margin-top:12px;width:100%" onclick="navigator.clipboard.writeText('${url.replaceAll("'","\\'")}');toast('Link copiado')">COPIAR LINK</button></div></div>`);
};

window.exerciseForm=exerciseId=>{
 const e=state.exercises.find(x=>x.id===exerciseId)||{id:id("ex"),name:"",muscle:"",instructions:"",image:"",video:""};
 modal(`<div class="modal"><div class="modal-head"><b>${exerciseId?"EDITAR EXERCÍCIO":"NOVO EXERCÍCIO"}</b><button class="close" onclick="closeModal()">×</button></div><form id="exerciseForm"><div class="modal-body"><div class="form-grid"><label class="field full">NOME<input name="name" value="${esc(e.name)}" required></label><label class="field">GRUPO MUSCULAR<input name="muscle" value="${esc(e.muscle)}"></label><label class="field">IMAGEM — URL<input name="image" value="${esc(e.image)}"></label><label class="field full">VÍDEO — URL<input name="video" value="${esc(e.video)}"></label><label class="field full">COMO EXECUTAR<textarea name="instructions">${esc(e.instructions)}</textarea></label></div></div><div class="modal-footer"><button type="button" class="btn light" onclick="closeModal()">CANCELAR</button><button class="btn primary">SALVAR</button></div></form></div>`);
 document.querySelector("#exerciseForm").onsubmit=async ev=>{ev.preventDefault();Object.assign(e,Object.fromEntries(new FormData(ev.target)));if(!exerciseId)state.exercises.push(e);persist();await cloudSet("exercises",e);closeModal();render();toast("Exercício salvo")};
};

function exerciseFor(exId){return state.exercises.find(x=>x.id===exId)}
function templateFormData(t){
 return (t.exercises||[]).map(x=>({exerciseId:x.exerciseId,name:x.name,sets:x.sets||3,reps:x.reps||10,load:x.load||"",rest:x.rest||"60s",notes:x.notes||""}));
}
window.templateForm=templateId=>{
 const t=state.templates.find(x=>x.id===templateId)||{id:id("tpl"),name:"",description:"",exercises:[]};
 const rows=templateFormData(t);
 modal(`<div class="modal wide"><div class="modal-head"><b>${templateId?"EDITAR MODELO":"NOVO MODELO DE TREINO"}</b><button class="close" onclick="closeModal()">×</button></div>
 <form id="templateForm"><div class="modal-body"><div class="form-grid"><label class="field full">NOME DO MODELO<input name="name" value="${esc(t.name)}" required></label><label class="field full">DESCRIÇÃO<textarea name="description">${esc(t.description)}</textarea></label></div>
 <div style="margin-top:18px;font-size:9px;font-weight:950;letter-spacing:.15em;color:var(--blue)">EXERCÍCIOS</div><div id="templateRows">${rows.map((r,i)=>workoutRow(r,i)).join("")}</div><button type="button" class="add-row" onclick="window.addTemplateRow()">+ ADICIONAR EXERCÍCIO</button></div>
 <div class="modal-footer"><button type="button" class="btn light" onclick="closeModal()">CANCELAR</button><button class="btn primary">SALVAR MODELO</button></div></form></div>`);
 document.querySelector("#templateForm").onsubmit=async ev=>{ev.preventDefault();const data=new FormData(ev.target);const rows=[...document.querySelectorAll("#templateRows .workout-row")];t.name=data.get("name");t.description=data.get("description");t.exercises=rows.map(r=>readWorkoutRow(r)).filter(Boolean);if(!templateId)state.templates.push(t);persist();await cloudSet("templates",t);closeModal();render();toast("Modelo salvo")};
};
function workoutRow(r,i){
 const opts=state.exercises.map(e=>`<option value="${e.id}" ${e.id===r.exerciseId?"selected":""}>${esc(e.name)}</option>`).join("");
 return `<div class="workout-row"><div class="workout-row-top"><div class="workout-row-name"><span class="number">${String(i+1).padStart(2,"0")}</span><b>${esc(exerciseFor(r.exerciseId)?.name||"Selecione o exercício")}</b></div><button type="button" class="mini red" onclick="this.closest('.workout-row').remove()">REMOVER</button></div><label class="field" style="margin-top:10px">EXERCÍCIO<select name="exerciseId">${opts}</select></label><div class="workout-fields"><label class="field">SÉRIES<input name="sets" value="${esc(r.sets)}"></label><label class="field">REPS<input name="reps" value="${esc(r.reps)}"></label><label class="field">CARGA<input name="load" value="${esc(r.load)}"></label><label class="field">DESCANSO<input name="rest" value="${esc(r.rest)}"></label></div><label class="field notes">OBSERVAÇÃO<textarea name="notes" rows="2">${esc(r.notes)}</textarea></label></div>`;
}
function readWorkoutRow(r){
 const e=exerciseFor(r.querySelector('[name="exerciseId"]').value);if(!e)return null;
 return {exerciseId:e.id,name:e.name,muscle:e.muscle||"",image:e.image||"",video:e.video||"",sets:r.querySelector('[name="sets"]').value,reps:r.querySelector('[name="reps"]').value,load:r.querySelector('[name="load"]').value,rest:r.querySelector('[name="rest"]').value,notes:r.querySelector('[name="notes"]').value};
}
window.addTemplateRow=()=>{const box=document.querySelector("#templateRows");const i=box.children.length;box.insertAdjacentHTML("beforeend",workoutRow({exerciseId:state.exercises[0]?.id||"",sets:3,reps:10,load:"",rest:"60s",notes:""},i))};

function editorWorkoutRows(workout){
 return (workout.exercises||[]).map((r,i)=>workoutRow(r,i)).join("");
}
window.openWorkoutEditor=studentId=>{
 const s=state.students.find(x=>x.id===studentId);
 const w=s.workout||{id:id("wrk"),name:"Treino de "+s.name,description:"",exercises:[]};
 modal(`<div class="modal wide"><div class="editor-cover"><img src="./assets/academia-treino.webp" alt=""><div class="editor-cover-copy"><div class="kicker">EDIÇÃO EXCLUSIVA DO PROFESSOR</div><h2>${esc(s.name)}</h2><p>O que for salvo aqui será enviado para este aluno.</p></div><button class="close" onclick="closeModal()">×</button></div>
 <form id="studentWorkoutForm"><div class="editor-body"><div class="editor-headline"><div><b>MONTAR TREINO DO ALUNO</b><small>O botão TREINO abre esta tela de edição. A área do aluno é outra tela.</small></div><button type="button" class="btn light" onclick="window.pickTemplateForStudent('${s.id}')">USAR MODELO</button></div>
 <div class="form-grid"><label class="field full">NOME DO TREINO<input name="name" value="${esc(w.name)}" required></label><label class="field full">DESCRIÇÃO<textarea name="description">${esc(w.description||"")}</textarea></label></div>
 <div style="margin-top:18px;font-size:9px;font-weight:950;letter-spacing:.15em;color:var(--blue)">EXERCÍCIOS ENVIADOS PARA ${esc(s.name).toUpperCase()}</div>
 <div id="studentWorkoutRows">${editorWorkoutRows(w)}</div>
 <button type="button" class="add-row" onclick="window.addStudentRow()">+ ADICIONAR EXERCÍCIO</button></div>
 <div class="editor-send"><small>O aluno só verá o que estiver neste treino após clicar em ENVIAR TREINO.</small><button class="btn primary big">ENVIAR TREINO</button></div></form></div>`);
 document.querySelector("#studentWorkoutForm").onsubmit=async ev=>{
   ev.preventDefault();const f=new FormData(ev.target);const rows=[...document.querySelectorAll("#studentWorkoutRows .workout-row")];
   s.workout={id:w.id,name:f.get("name"),description:f.get("description"),exercises:rows.map(readWorkoutRow).filter(Boolean),released:true,updatedAt:Date.now()};
   s.workoutId=s.workout.id;s.status=s.status||"ativo";persist();await cloudSet("students",s);closeModal();render();toast("Treino enviado para "+s.name);
 };
};
window.addStudentRow=()=>{const box=document.querySelector("#studentWorkoutRows");box.insertAdjacentHTML("beforeend",workoutRow({exerciseId:state.exercises[0]?.id||"",sets:3,reps:10,load:"",rest:"60s",notes:""},box.children.length))};

window.pickTemplateForStudent=studentId=>{
 const s=state.students.find(x=>x.id===studentId);
 modal(`<div class="modal"><div class="modal-head"><b>ESCOLHER MODELO</b><button class="close" onclick="closeModal()">×</button></div><div class="modal-body"><p style="font-size:11px;color:var(--muted)">O modelo será copiado para a edição de <b>${esc(s.name)}</b>. O modelo original não será alterado.</p>${state.templates.map(t=>`<button class="choice" onclick="window.useTemplateForStudent('${studentId}','${t.id}')"><b>${esc(t.name)}</b><span>${t.exercises?.length||0} exercícios</span></button>`).join("")||`<div class="empty">Nenhum modelo criado.</div>`}</div></div>`);
};
window.useTemplateForStudent=(studentId,templateId)=>{
 const s=state.students.find(x=>x.id===studentId),t=state.templates.find(x=>x.id===templateId);if(!s||!t)return;
 s.workout={id:id("wrk"),name:t.name,description:t.description||"",exercises:JSON.parse(JSON.stringify(t.exercises||[])),released:false};
 closeModal();window.openWorkoutEditor(studentId);
};

window.paymentForm=()=>{
 modal(`<div class="modal"><div class="modal-head"><b>NOVO LANÇAMENTO</b><button class="close" onclick="closeModal()">×</button></div><form id="payForm"><div class="modal-body"><div class="form-grid"><label class="field full">ALUNO<select name="studentId">${state.students.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label><label class="field">DESCRIÇÃO<input name="description" value="Mensalidade"></label><label class="field">VALOR<input name="value" type="number" step=".01" required></label><label class="field">STATUS<select name="status"><option value="pendente">Pendente</option><option value="pago">Pago</option></select></label></div></div><div class="modal-footer"><button type="button" class="btn light" onclick="closeModal()">CANCELAR</button><button class="btn primary">SALVAR</button></div></form></div>`);
 document.querySelector("#payForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),p={id:id("pay"),studentId:f.get("studentId"),description:f.get("description"),value:Number(f.get("value")),status:f.get("status")};state.payments.push(p);persist();await cloudSet("payments",p);closeModal();render();toast("Lançamento salvo")};
};
window.togglePayment=async paymentId=>{const p=state.payments.find(x=>x.id===paymentId);p.status=p.status==="pago"?"pendente":"pago";persist();await cloudSet("payments",p);render()};

async function renderStudent(token){
 let s=state.students.find(x=>x.token===token);
 if(!s){try{const q=query(collection(db,"students"),where("token","==",token),limit(1));const snap=await getDocs(q);if(!snap.empty)s={id:snap.docs[0].id,...snap.docs[0].data()}}catch(e){}}
 if(!s){app.innerHTML=`<div class="finished"><h1>Link inválido</h1><p>Verifique o link enviado pelo professor.</p></div>`;return}
 if(s.status==="bloqueado"){app.innerHTML=`<div class="finished"><h1>Acesso bloqueado</h1><p>Procure seu professor.</p></div>`;return}
 const w=s.workout;
 if(!w?.released){app.innerHTML=`<div class="finished"><h1>Treino ainda não enviado</h1><p>Seu professor ainda não liberou um treino.</p></div>`;return}
 app.innerHTML=`<div class="student-page"><header class="student-head"><div><small>${esc(state.settings.academy)}</small><b>${esc(s.name)}</b></div><div class="student-logo">HD</div></header><main class="student-content"><div class="welcome-card"><img src="./assets/academia-treino.webp" alt=""><div class="welcome-copy"><div class="kicker">TREINO PREPARADO PARA VOCÊ</div><h1>${esc(state.settings.welcome)}</h1><p>${esc(w.name)}</p><button class="start" onclick="window.startWorkout('${encodeURIComponent(token)}')">COMEÇAR TREINO</button></div></div></main></div>`;
}
window.startWorkout=encoded=>{
 const token=decodeURIComponent(encoded);const s=state.students.find(x=>x.token===token);if(!s)return;
 const w=s.workout;let i=0;
 function show(){
  const ex=w.exercises[i];const instruction=exerciseFor(ex.exerciseId)?.instructions||"Siga a orientação do professor.";
  app.innerHTML=`<div class="student-page"><header class="student-head"><button class="round" onclick="renderStudent('${token}')">←</button><div style="text-align:center"><small>${esc(w.name)}</small><b>${i+1} / ${w.exercises.length}</b></div><div class="student-logo">HD</div></header><div class="student-progress"><i style="width:${((i+1)/w.exercises.length)*100}%"></i></div><main class="exercise-screen">${ex.image?`<img class="exercise-media" src="${esc(ex.image)}">`:ex.video?`<video class="exercise-media" controls src="${esc(ex.video)}"></video>`:""}<span class="pill">${esc(ex.muscle||"EXERCÍCIO")}</span><h1>${esc(ex.name)}</h1><div class="exercise-stats"><div><b>${esc(ex.sets||3)}</b><span>SÉRIES</span></div><div><b>${esc(ex.reps||10)}</b><span>REPS</span></div><div><b>${esc(ex.load||"—")}</b><span>CARGA</span></div><div><b>${esc(ex.rest||"—")}</b><span>DESCANSO</span></div></div><div class="instruction-card"><b>COMO EXECUTAR</b><p>${esc(instruction)}</p>${ex.notes?`<p><b style="color:#17212b">OBSERVAÇÃO:</b> ${esc(ex.notes)}</p>`:""}</div><button id="seriesBtn" class="series" onclick="this.classList.toggle('done');this.textContent=this.classList.contains('done')?'✓ SÉRIE CONCLUÍDA':'MARCAR SÉRIE CONCLUÍDA'">MARCAR SÉRIE CONCLUÍDA</button><div class="exercise-nav"><button onclick="window.prevStudentExercise()">ANTERIOR</button><button class="next" onclick="window.nextStudentExercise()">PRÓXIMO →</button></div></main></div>`;
 }
 window.prevStudentExercise=()=>{if(i>0){i--;show()}};
 window.nextStudentExercise=()=>{if(i<w.exercises.length-1){i++;show()}else{app.innerHTML=`<div class="finished"><div><div class="check">✓</div><h1>Treino finalizado!</h1><p>Excelente trabalho, ${esc(s.name)}.</p><button class="btn primary" onclick="renderStudent('${token}')">VOLTAR</button></div></div>`}};
 show();
};
window.renderStudent=renderStudent;

function render(){
 const hash=location.hash.slice(1);
 if(hash.startsWith("aluno=")){renderStudent(hash.slice(6));return}
 const pages={dashboard,students,exercises,templates,finance};
 app.innerHTML=shell(pages[state.page]||dashboard());
}
window.refresh=async()=>{await sync();render();toast("Dados atualizados")};
window.addEventListener("hashchange",render);
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
sync().finally(render);
