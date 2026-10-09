import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);

const KEY = "treino_pesado_v1";
const state = {
  page: "dashboard",
  students: [],
  exercises: [],
  templates: [],
  payments: [],
  settings: JSON.parse(localStorage.getItem(KEY+"_settings") || "null") || {
    academy: "ACADEMIA HD",
    professional: "Professor",
    whatsapp: "",
    instagram: "",
    welcome: "Bora começar seu treino?"
  }
};

const app = document.querySelector("#app");

function uid(prefix="id"){
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function esc(v=""){
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function saveLocal(){
  localStorage.setItem(KEY+"_students", JSON.stringify(state.students));
  localStorage.setItem(KEY+"_exercises", JSON.stringify(state.exercises));
  localStorage.setItem(KEY+"_templates", JSON.stringify(state.templates));
  localStorage.setItem(KEY+"_payments", JSON.stringify(state.payments));
  localStorage.setItem(KEY+"_settings", JSON.stringify(state.settings));
}
function loadLocal(){
  for (const k of ["students","exercises","templates","payments"]){
    const raw = localStorage.getItem(KEY+"_"+k);
    if(raw) state[k] = JSON.parse(raw);
  }
}
async function cloudLoad(){
  try{
    const [s,e,t,p] = await Promise.all([
      getDocs(collection(db,"students")),
      getDocs(collection(db,"exercises")),
      getDocs(collection(db,"templates")),
      getDocs(collection(db,"payments"))
    ]);
    if(!s.empty) state.students = s.docs.map(x=>({id:x.id,...x.data()}));
    if(!e.empty) state.exercises = e.docs.map(x=>({id:x.id,...x.data()}));
    if(!t.empty) state.templates = t.docs.map(x=>({id:x.id,...x.data()}));
    if(!p.empty) state.payments = p.docs.map(x=>({id:x.id,...x.data()}));
    saveLocal();
  }catch(err){
    console.warn("Firebase indisponível; usando dados locais.", err);
  }
}
async function cloudSet(col,id,data){
  try{ await setDoc(doc(db,col,id),data,{merge:true}); }
  catch(err){ console.warn("Falha Firebase",err); }
}
async function cloudDelete(col,id){
  try{ await deleteDoc(doc(db,col,id)); }catch(err){}
}

function nav(page){
  state.page = page;
  render();
  history.replaceState(null,"","#"+page);
}
function toast(msg){
  let t=document.querySelector(".toast");
  if(!t){t=document.createElement("div");t.className="toast";document.body.appendChild(t);}
  t.textContent=msg;t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2200);
}

function layout(content){
  const menu = [
    ["dashboard","DASHBOARD","▦"],
    ["students","ALUNOS","♙"],
    ["exercises","EXERCÍCIOS","◈"],
    ["templates","TREINOS","▤"],
    ["finance","FINANCEIRO","$"]
  ];
  return `
  <div class="shell">
    <header class="topbar">
      <div class="brand" onclick="window.go('dashboard')">
        <div class="brand-mark">HD</div>
        <div><strong>${esc(state.settings.academy)}</strong><span>Treino Pesado</span></div>
      </div>
      <div class="top-actions">
        <button class="icon-btn" title="Atualizar" onclick="window.reloadData()">↻</button>
        <button class="profile-chip" onclick="window.openSettings()">⚙</button>
      </div>
    </header>
    <aside class="sidebar">
      <div class="side-label">GESTÃO</div>
      ${menu.map(([p,l,i])=>`<button class="nav-item ${state.page===p?'active':''}" onclick="window.go('${p}')"><span>${i}</span>${l}</button>`).join("")}
      <div class="side-footer">V1 • ${esc(state.settings.professional)}</div>
    </aside>
    <main class="main">${content}</main>
  </div>
  <div id="modal"></div>
  `;
}

function dashboard(){
  const active = state.students.filter(s=>s.status!=="bloqueado").length;
  const blocked = state.students.filter(s=>s.status==="bloqueado").length;
  const pending = state.payments.filter(p=>p.status!=="pago").length;
  const trained = state.students.filter(s=>s.workoutId).length;
  return `
  <section class="page-head">
    <div><div class="eyebrow">VISÃO GERAL</div><h1>Dashboard</h1><p>As informações importantes da sua academia, em um só lugar.</p></div>
    <button class="primary" onclick="window.go('students')">+ NOVO ALUNO</button>
  </section>
  <section class="stats">
    <div class="stat"><span>ALUNOS ATIVOS</span><b>${active}</b><small>cadastros ativos</small></div>
    <div class="stat"><span>COM TREINO</span><b>${trained}</b><small>treinos preparados</small></div>
    <div class="stat"><span>PENDÊNCIAS</span><b>${pending}</b><small>financeiras</small></div>
    <div class="stat"><span>BLOQUEADOS</span><b>${blocked}</b><small>bloqueio manual</small></div>
  </section>
  <section class="panel-grid">
    <div class="panel">
      <div class="panel-title"><h2>ATENÇÃO</h2><span>${pending} pendência(s)</span></div>
      ${pending ? state.payments.filter(p=>p.status!=="pago").slice(0,5).map(p=>{
        const s=state.students.find(x=>x.id===p.studentId);
        return `<div class="notice-row"><div><b>${esc(s?.name||"Aluno")}</b><small>${esc(p.description||"Pagamento pendente")}</small></div><strong>R$ ${Number(p.value||0).toFixed(2).replace(".",",")}</strong></div>`;
      }).join("") : `<div class="empty">Nenhuma pendência no momento.</div>`}
    </div>
    <div class="panel">
      <div class="panel-title"><h2>ACESSO RÁPIDO</h2></div>
      <div class="quick-grid">
        <button onclick="window.go('students')"><b>ALUNOS</b><span>Gerenciar cadastros</span></button>
        <button onclick="window.go('templates')"><b>TREINOS</b><span>Modelos pré-definidos</span></button>
        <button onclick="window.go('exercises')"><b>EXERCÍCIOS</b><span>Biblioteca visual</span></button>
        <button onclick="window.go('finance')"><b>FINANCEIRO</b><span>Recebimentos</span></button>
      </div>
    </div>
  </section>`;
}

function students(){
  const sorted=[...state.students].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  return `
  <section class="page-head"><div><div class="eyebrow">GESTÃO</div><h1>Alunos</h1><p>Lista em ordem alfabética com as ações principais à vista.</p></div><button class="primary" onclick="window.studentForm()">+ NOVO ALUNO</button></section>
  <div class="toolbar"><input id="studentSearch" placeholder="Pesquisar aluno..." oninput="window.filterStudents(this.value)"><span>${sorted.length} aluno(s)</span></div>
  <div class="student-list" id="studentList">
    ${sorted.map(s=>studentRow(s)).join("") || `<div class="empty big">Nenhum aluno cadastrado.</div>`}
  </div>`;
}
function studentRow(s){
  const status = s.status==="bloqueado" ? `<span class="status danger">BLOQUEADO</span>` : `<span class="status ok">ATIVO</span>`;
  return `<div class="student-row" data-name="${esc(s.name.toLowerCase())}">
    <div class="avatar">${esc((s.name||"?").split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase())}</div>
    <div class="student-main"><b>${esc(s.name)}</b><span>${esc(s.phone||"Sem telefone")} · ${status}</span></div>
    <div class="row-actions">
      <button title="Home" onclick="window.studentHome('${s.id}')">HOME</button>
      <button title="Status" onclick="window.toggleStatus('${s.id}')">STATUS</button>
      <button title="Editar" onclick="window.studentForm('${s.id}')">EDITAR</button>
      <button class="accent" title="Treino" onclick="window.assignWorkout('${s.id}')">TREINO</button>
      <button title="Link" onclick="window.studentLink('${s.id}')">LINK</button>
      <button class="${s.status==='bloqueado'?'success':'danger'}" onclick="window.toggleStatus('${s.id}')">${s.status==='bloqueado'?'LIBERAR':'BLOQUEAR'}</button>
    </div>
  </div>`;
}

function exercises(){
  return `<section class="page-head"><div><div class="eyebrow">BIBLIOTECA</div><h1>Exercícios</h1><p>Cadastre o conteúdo visual e as instruções que aparecerão para o aluno.</p></div><button class="primary" onclick="window.exerciseForm()">+ NOVO EXERCÍCIO</button></section>
  <div class="card-grid">${state.exercises.map(e=>`<article class="exercise-card">
    ${e.image?`<img src="${esc(e.image)}" alt="">`:`<div class="media-empty">SEM IMAGEM</div>`}
    <div class="exercise-body"><span class="tag">${esc(e.muscle||"GERAL")}</span><h3>${esc(e.name)}</h3><p>${esc(e.instructions||"Sem instruções cadastradas.")}</p>
    ${e.video?`<div class="video-line">VÍDEO CADASTRADO</div>`:""}
    <button class="outline" onclick="window.exerciseForm('${e.id}')">EDITAR</button></div>
  </article>`).join("") || `<div class="empty big">A biblioteca ainda está vazia.</div>`}</div>`;
}

function templates(){
  return `<section class="page-head"><div><div class="eyebrow">BIBLIOTECA DE MODELOS</div><h1>Treinos</h1><p>Crie modelos quantas vezes quiser e use-os como ponto de partida para cada aluno.</p></div><button class="primary" onclick="window.templateForm()">+ NOVO TREINO</button></section>
  <div class="template-grid">${state.templates.map(t=>`<article class="template-card"><div class="template-top"><span>${t.exercises?.length||0} EXERCÍCIOS</span><button onclick="window.templateForm('${t.id}')">EDITAR</button></div><h2>${esc(t.name)}</h2><p>${esc(t.description||"Modelo de treino")}</p><div class="template-actions"><button class="outline" onclick="window.templateForm('${t.id}')">ABRIR MODELO</button></div></article>`).join("") || `<div class="empty big">Nenhum modelo criado. Comece pelo primeiro treino.</div>`}</div>`;
}

function finance(){
  const total=state.payments.reduce((a,p)=>a+(p.status==="pago"?Number(p.value||0):0),0);
  const pending=state.payments.reduce((a,p)=>a+(p.status!=="pago"?Number(p.value||0):0),0);
  return `<section class="page-head"><div><div class="eyebrow">CONTROLE</div><h1>Financeiro</h1><p>Recebimentos e pendências sem misturar com a gestão de treinos.</p></div><button class="primary" onclick="window.paymentForm()">+ LANÇAR PAGAMENTO</button></section>
  <section class="finance-summary"><div><span>RECEBIDO</span><b>R$ ${total.toFixed(2).replace(".",",")}</b></div><div><span>PENDENTE</span><b>R$ ${pending.toFixed(2).replace(".",",")}</b></div></section>
  <div class="panel table-panel"><div class="table-head"><b>LANÇAMENTOS</b></div>${state.payments.map(p=>{const s=state.students.find(x=>x.id===p.studentId);return `<div class="payment-row"><span>${esc(s?.name||"Aluno")}</span><span>${esc(p.description||"Mensalidade")}</span><b>R$ ${Number(p.value||0).toFixed(2).replace(".",",")}</b><button class="${p.status==="pago"?"success":"danger"}" onclick="window.togglePayment('${p.id}')">${p.status==="pago"?"PAGO":"PENDENTE"}</button></div>`}).join("") || `<div class="empty">Nenhum lançamento.</div>`}</div>`;
}

function render(){
  const hash=location.hash.replace("#","");
  if(hash.startsWith("aluno=")){renderStudent(hash.split("=")[1]);return;}
  const pages={dashboard,students,exercises,templates,finance};
  app.innerHTML=layout(pages[state.page] ? pages[state.page]() : dashboard());
}
window.go=nav;
window.reloadData=async()=>{await cloudLoad();render();toast("Dados atualizados");};
window.filterStudents=(v)=>document.querySelectorAll(".student-row").forEach(r=>r.style.display=r.dataset.name.includes(v.toLowerCase())?"":"none");
window.openSettings=()=>modal(`<div class="modal-card"><div class="modal-head"><h2>CONFIGURAÇÕES</h2><button onclick="closeModal()">×</button></div>
<form onsubmit="window.saveSettings(event)"><label>Nome da academia<input name="academy" value="${esc(state.settings.academy)}" required></label><label>Professor<input name="professional" value="${esc(state.settings.professional)}"></label><label>WhatsApp<input name="whatsapp" value="${esc(state.settings.whatsapp)}"></label><label>Instagram<input name="instagram" value="${esc(state.settings.instagram)}"></label><label>Mensagem de boas-vindas<textarea name="welcome">${esc(state.settings.welcome)}</textarea></label><button class="primary wide">SALVAR</button></form></div>`);
window.saveSettings=(ev)=>{ev.preventDefault();const f=new FormData(ev.target);state.settings=Object.fromEntries(f);saveLocal();closeModal();render();toast("Configurações salvas");};

window.studentForm=(id)=>{
 const s=state.students.find(x=>x.id===id)||{id:uid("stu"),name:"",phone:"",email:"",status:"ativo",token:crypto.randomUUID(),workoutId:null};
 modal(`<div class="modal-card"><div class="modal-head"><h2>${id?"EDITAR ALUNO":"NOVO ALUNO"}</h2><button onclick="closeModal()">×</button></div><form onsubmit="window.saveStudent(event,'${s.id}')">
 <label>Nome<input name="name" value="${esc(s.name)}" required></label><label>WhatsApp<input name="phone" value="${esc(s.phone)}"></label><label>E-mail<input name="email" value="${esc(s.email)}"></label>
 <button class="primary wide">SALVAR ALUNO</button></form></div>`);
 window._editingStudent=s;
};
window.saveStudent=async(ev,id)=>{ev.preventDefault();const f=new FormData(ev.target);let s=state.students.find(x=>x.id===id);if(!s){s=window._editingStudent;state.students.push(s);}Object.assign(s,Object.fromEntries(f));saveLocal();await cloudSet("students",s.id,s);closeModal();render();toast("Aluno salvo");};

window.toggleStatus=async(id)=>{const s=state.students.find(x=>x.id===id);if(!s)return;s.status=s.status==="bloqueado"?"ativo":"bloqueado";saveLocal();await cloudSet("students",s.id,s);render();toast(s.status==="bloqueado"?"Aluno bloqueado":"Aluno liberado");};
window.studentHome=(id)=>{const s=state.students.find(x=>x.id===id);modal(`<div class="modal-card small"><div class="modal-head"><h2>${esc(s.name)}</h2><button onclick="closeModal()">×</button></div><div class="home-card"><span>STATUS</span><b>${s.status==="bloqueado"?"BLOQUEADO":"ATIVO"}</b><span>TREINO</span><b>${esc((state.templates.find(t=>t.id===s.workoutId)?.name)||"Nenhum")}</b><span>CONTATO</span><b>${esc(s.phone||"Não informado")}</b></div></div>`)};

window.assignWorkout=(id)=>{
 const s=state.students.find(x=>x.id===id);
 const current=s.workout||{id:uid("wrk"),name:"Novo treino",description:"",exercises:[]};
 modal(`<div class="modal-card workout-modal"><div class="workout-hero">
   <img src="./assets/hero-treino.webp" alt="">
   <div class="workout-hero-overlay"><span>EDIÇÃO DE TREINO</span><h2>${esc(s.name)}</h2><p>O que for salvo aqui será o treino enviado para este aluno.</p></div>
   <button class="hero-close" onclick="closeModal()">×</button>
 </div>
 <div class="workout-editor-head">
   <div><b>MONTAR TREINO DO ALUNO</b><small>Você está editando o treino dele, não a tela do aluno.</small></div>
   <button class="outline" onclick="window.loadModelIntoStudent('${id}')">USAR MODELO</button>
 </div>
 <form onsubmit="window.saveAndSendStudentWorkout(event,'${id}')">
   <label>Nome do treino<input name="name" value="${esc(current.name)}" required></label>
   <label>Descrição<textarea name="description">${esc(current.description||"")}</textarea></label>
   <div class="editor-section-title">EXERCÍCIOS DO TREINO</div>
   <div id="studentWorkoutExercises" class="student-workout-exercises">
     ${renderStudentWorkoutExercises(current.exercises||[])}
   </div>
   <button type="button" class="add-exercise" onclick="window.addStudentExercise('${id}')">+ ADICIONAR EXERCÍCIO</button>
   <div class="editor-bottom">
     <button type="button" class="outline" onclick="closeModal()">FECHAR</button>
     <button type="submit" class="primary">ENVIAR TREINO</button>
   </div>
 </form></div>`);
};
function renderStudentWorkoutExercises(items){
 return items.map((x,i)=>`
 <div class="student-exercise-edit" data-index="${i}">
   <div class="student-exercise-title">
     <div><span>${String(i+1).padStart(2,"0")}</span><b>${esc(x.name||"Exercício")}</b></div>
     <button type="button" class="remove-exercise" onclick="this.closest('.student-exercise-edit').remove()">REMOVER</button>
   </div>
   <input type="hidden" name="exerciseId" value="${esc(x.exerciseId||"")}">
   <input type="hidden" name="exerciseName" value="${esc(x.name||"")}">
   <div class="exercise-edit-grid">
     <label>SÉRIES<input name="sets" type="number" min="1" value="${esc(x.sets||3)}"></label>
     <label>REPETIÇÕES<input name="reps" type="text" value="${esc(x.reps||10)}"></label>
     <label>CARGA<input name="load" type="text" value="${esc(x.load||"")}"></label>
     <label>DESCANSO<input name="rest" type="text" value="${esc(x.rest||"60s")}"></label>
   </div>
   <label>OBSERVAÇÃO<textarea name="notes" rows="2">${esc(x.notes||"")}</textarea></label>
 </div>`).join("");
}
window.loadModelIntoStudent=(studentId)=>{
 const s=state.students.find(x=>x.id===studentId);
 modal(`<div class="modal-card"><div class="modal-head"><h2>USAR MODELO DE TREINO</h2><button onclick="closeModal()">×</button></div>
 <p class="modal-help">O modelo será copiado para a edição deste aluno. O original permanecerá intacto.</p>
 <div class="choice-list">${state.templates.map(t=>`<button type="button" onclick="window.applyModelAndEdit('${studentId}','${t.id}')"><b>${esc(t.name)}</b><span>${t.exercises?.length||0} exercícios</span></button>`).join("")||`<div class="empty">Nenhum modelo disponível.</div>`}</div></div>`);
};
window.applyModelAndEdit=(studentId,templateId)=>{
 const t=state.templates.find(x=>x.id===templateId);
 const s=state.students.find(x=>x.id===studentId);
 if(!t||!s)return;
 s._draftWorkout={id:uid("wrk"),name:t.name,description:t.description||"",exercises:JSON.parse(JSON.stringify(t.exercises||[]))};
 closeModal();
 window.assignWorkout(studentId);
 setTimeout(()=>{
   const form=document.querySelector(".workout-modal form");
   if(form){
     form.querySelector('[name="name"]').value=s._draftWorkout.name;
     form.querySelector('[name="description"]').value=s._draftWorkout.description;
     document.querySelector("#studentWorkoutExercises").innerHTML=renderStudentWorkoutExercises(s._draftWorkout.exercises);
   }
 },20);
};
window.addStudentExercise=(studentId)=>{
 const wrap=document.querySelector("#studentWorkoutExercises");
 const available=state.exercises.filter(e=>![...wrap.querySelectorAll('[name="exerciseId"]')].map(x=>x.value).includes(e.id));
 if(!available.length){toast("Todos os exercícios cadastrados já foram adicionados");return;}
 const options=available.map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join("");
 const temp=document.createElement("div");
 temp.innerHTML=`<div class="student-exercise-edit new-exercise">
   <div class="student-exercise-title"><div><span>+</span><b>NOVO EXERCÍCIO</b></div><button type="button" class="remove-exercise" onclick="this.closest('.student-exercise-edit').remove()">REMOVER</button></div>
   <label>EXERCÍCIO<select class="new-exercise-select">${options}</select></label>
   <div class="exercise-edit-grid"><label>SÉRIES<input class="new-sets" type="number" min="1" value="3"></label><label>REPETIÇÕES<input class="new-reps" value="10"></label><label>CARGA<input class="new-load"></label><label>DESCANSO<input class="new-rest" value="60s"></label></div>
   <label>OBSERVAÇÃO<textarea class="new-notes" rows="2"></textarea></label>
 </div>`;
 wrap.appendChild(temp.firstElementChild);
};
window.saveAndSendStudentWorkout=async(ev,id)=>{
 ev.preventDefault();
 const s=state.students.find(x=>x.id===id), form=ev.target, data=new FormData(form);
 const rows=[...document.querySelectorAll(".student-exercise-edit")];
 const exercises=[];
 for(const row of rows){
   let exerciseId=row.querySelector('[name="exerciseId"]')?.value;
   if(!exerciseId){
     exerciseId=row.querySelector(".new-exercise-select")?.value;
   }
   const e=state.exercises.find(x=>x.id===exerciseId);
   if(!e) continue;
   exercises.push({
     exerciseId:e.id,name:e.name,muscle:e.muscle||"",image:e.image||"",video:e.video||"",
     sets:Number(row.querySelector('[name="sets"]')?.value || row.querySelector(".new-sets")?.value || 3),
     reps:row.querySelector('[name="reps"]')?.value || row.querySelector(".new-reps")?.value || 10,
     load:row.querySelector('[name="load"]')?.value || row.querySelector(".new-load")?.value || "",
     rest:row.querySelector('[name="rest"]')?.value || row.querySelector(".new-rest")?.value || "60s",
     notes:row.querySelector('[name="notes"]')?.value || row.querySelector(".new-notes")?.value || ""
   });
 }
 s.workout={
   id:s.workout?.id||uid("wrk"),
   name:data.get("name"),
   description:data.get("description"),
   exercises,
   public:true,
   released:true,
   updatedAt:Date.now()
 };
 s.workoutId=s.workout.id;
 saveLocal();
 await cloudSet("students",s.id,s);
 closeModal();
 render();
 toast("Treino salvo e enviado para "+s.name);
};

window.studentLink=(id)=>{
 const s=state.students.find(x=>x.id===id);if(!s.token)s.token=crypto.randomUUID();
 saveLocal();cloudSet("students",s.id,s);
 const url=location.origin+location.pathname+"#aluno="+encodeURIComponent(s.token);
 modal(`<div class="modal-card small"><div class="modal-head"><h2>LINK DO ALUNO</h2><button onclick="closeModal()">×</button></div><p>Envie este link para ${esc(s.name)}.</p><div class="link-box">${esc(url)}</div><button class="primary wide" onclick="navigator.clipboard.writeText('${url.replaceAll("'","\\'")}');toast('Link copiado')">COPIAR LINK</button><p class="muted">O aluno acessará somente a área dele pelo token individual.</p></div>`);
};

window.exerciseForm=(id)=>{
 const e=state.exercises.find(x=>x.id===id)||{id:uid("ex"),name:"",muscle:"",instructions:"",image:"",video:""};
 modal(`<div class="modal-card"><div class="modal-head"><h2>${id?"EDITAR EXERCÍCIO":"NOVO EXERCÍCIO"}</h2><button onclick="closeModal()">×</button></div><form onsubmit="window.saveExercise(event,'${e.id}')">
 <label>Nome<input name="name" value="${esc(e.name)}" required></label><label>Grupo muscular<input name="muscle" value="${esc(e.muscle)}"></label><label>Como executar<textarea name="instructions">${esc(e.instructions)}</textarea></label>
 <label>Imagem (URL)<input name="image" value="${esc(e.image)}" placeholder="https://..."></label><label>Vídeo (URL)<input name="video" value="${esc(e.video)}" placeholder="https://..."></label>
 <p class="muted">V1 usa URL para mídia. Upload direto será integrado na próxima etapa com Firebase Storage.</p>
 <button class="primary wide">SALVAR EXERCÍCIO</button></form></div>`);
};
window.saveExercise=async(ev,id)=>{ev.preventDefault();const f=new FormData(ev.target);let e=state.exercises.find(x=>x.id===id);if(!e){e={id};state.exercises.push(e);}Object.assign(e,Object.fromEntries(f));saveLocal();await cloudSet("exercises",e.id,e);closeModal();render();toast("Exercício salvo");};

window.templateForm=(id)=>{
 const t=state.templates.find(x=>x.id===id)||{id:uid("tpl"),name:"",description:"",exercises:[]};
 modal(`<div class="modal-card wide-modal"><div class="modal-head"><h2>${id?"EDITAR TREINO":"NOVO TREINO"}</h2><button onclick="closeModal()">×</button></div><form onsubmit="window.saveTemplate(event,'${t.id}')">
 <label>Nome do modelo<input name="name" value="${esc(t.name)}" required></label><label>Descrição<textarea name="description">${esc(t.description)}</textarea></label>
 <div class="workout-editor">${state.exercises.map(e=>`<label class="exercise-check"><input type="checkbox" name="ex" value="${e.id}" ${(t.exercises||[]).some(x=>x.exerciseId===e.id)?"checked":""}><span><b>${esc(e.name)}</b><small>${esc(e.muscle||"")}</small></span></label>`).join("")||`<div class="empty">Cadastre exercícios primeiro.</div>`}</div>
 <button class="primary wide">SALVAR MODELO</button></form></div>`);
};
window.saveTemplate=async(ev,id)=>{ev.preventDefault();const f=new FormData(ev.target);const ids=f.getAll("ex");let t=state.templates.find(x=>x.id===id);if(!t){t={id};state.templates.push(t);}t.name=f.get("name");t.description=f.get("description");t.exercises=ids.map(exerciseId=>{const e=state.exercises.find(x=>x.id===exerciseId);return {exerciseId,name:e.name,muscle:e.muscle||"",image:e.image||"",video:e.video||"",sets:3,reps:10,load:"",rest:"60s",notes:""};});saveLocal();await cloudSet("templates",t.id,t);closeModal();render();toast("Modelo salvo");};

window.paymentForm=()=>{
 modal(`<div class="modal-card"><div class="modal-head"><h2>NOVO LANÇAMENTO</h2><button onclick="closeModal()">×</button></div><form onsubmit="window.savePayment(event)">
 <label>Aluno<select name="studentId" required>${state.students.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label><label>Descrição<input name="description" value="Mensalidade"></label><label>Valor<input type="number" step="0.01" name="value" required></label><label>Status<select name="status"><option value="pendente">Pendente</option><option value="pago">Pago</option></select></label><button class="primary wide">SALVAR</button></form></div>`);
};
window.savePayment=async(ev)=>{ev.preventDefault();const f=new FormData(ev.target),p={id:uid("pay"),...Object.fromEntries(f),value:Number(f.get("value"))};state.payments.push(p);saveLocal();await cloudSet("payments",p.id,p);closeModal();render();};
window.togglePayment=async(id)=>{const p=state.payments.find(x=>x.id===id);p.status=p.status==="pago"?"pendente":"pago";saveLocal();await cloudSet("payments",p.id,p);render();};

function modal(html){document.querySelector("#modal").innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)window.closeModal()">${html}</div>`;}
window.closeModal=()=>document.querySelector("#modal").innerHTML="";

async function renderStudent(token){
  let student=state.students.find(s=>s.token===token);
  if(!student){
    try{
      const q=query(collection(db,"students"),where("token","==",token),limit(1));
      const snap=await getDocs(q);
      if(!snap.empty){student={id:snap.docs[0].id,...snap.docs[0].data()};}
    }catch(e){}
  }
  if(!student){app.innerHTML=`<div class="student-error"><h1>Link não encontrado</h1><p>Verifique se o link recebido está correto.</p></div>`;return;}
  if(student.status==="bloqueado"){app.innerHTML=`<div class="student-error"><h1>Acesso bloqueado</h1><p>Entre em contato com seu professor.</p></div>`;return;}
  const w=student.workout||{name:"Seu treino",exercises:[]};
  app.innerHTML=`<div class="student-app"><header class="student-top"><div><span>${esc(state.settings.academy)}</span><b>${esc(student.name)}</b></div><div class="student-logo">HD</div></header>
  <main class="student-main"><div class="student-welcome"><span>SEU TREINO</span><h1>${esc(state.settings.welcome)}</h1><p>${esc(w.name)}</p><button class="student-start" onclick="window.startStudent('${token}')">COMEÇAR TREINO</button></div>
  <div class="student-preview"><b>${w.exercises?.length||0}</b><span>exercícios preparados</span></div></main></div>`;
}
window.startStudent=(token)=>{
 const s=state.students.find(x=>x.token===token);if(!s)return;
 const w=s.workout||{name:"Treino",exercises:[]};
 let i=0;
 const show=()=>{
   const ex=w.exercises[i];
   app.innerHTML=`<div class="student-app workout-screen"><header class="student-top"><button onclick="window.renderStudent('${token}')">←</button><div><span>${esc(w.name)}</span><b>${i+1} / ${w.exercises.length}</b></div><div class="progress"><i style="width:${((i+1)/w.exercises.length)*100}%"></i></div></header>
   <main class="exercise-screen">${ex.image?`<img class="exercise-media" src="${esc(ex.image)}" alt="">`:ex.video?`<video class="exercise-media" controls src="${esc(ex.video)}"></video>`:""}
   <span class="tag">${esc(ex.muscle||"EXERCÍCIO")}</span><h1>${esc(ex.name)}</h1>
   <div class="exercise-data"><div><b>${ex.sets||3}</b><span>SÉRIES</span></div><div><b>${ex.reps||10}</b><span>REPS</span></div><div><b>${esc(ex.load||"—")}</b><span>CARGA</span></div><div><b>${esc(ex.rest||"—")}</b><span>DESCANSO</span></div></div>
   <div class="instruction"><b>COMO EXECUTAR</b><p>${esc(state.exercises.find(e=>e.id===ex.exerciseId)?.instructions||"Siga a orientação do professor.")}</p></div>
   <button class="series-btn" onclick="this.classList.toggle('done');this.textContent=this.classList.contains('done')?'✓ SÉRIE CONCLUÍDA':'MARCAR SÉRIE CONCLUÍDA'">MARCAR SÉRIE CONCLUÍDA</button>
   <div class="swipe-actions"><button onclick="window.prevExercise()">ANTERIOR</button><button class="next" onclick="window.nextExercise()">PRÓXIMO →</button></div></main></div>`;
 };
 window.prevExercise=()=>{if(i>0){i--;show();}};
 window.nextExercise=()=>{if(i<w.exercises.length-1){i++;show();}else{app.innerHTML=`<div class="student-finished"><div>✓</div><h1>Treino finalizado!</h1><p>Excelente trabalho, ${esc(s.name)}.</p><button class="student-start" onclick="window.renderStudent('${token}')">VOLTAR</button></div>`;}};
 show();
};

window.renderStudent=renderStudent;
loadLocal();
if(location.hash.startsWith("#aluno=")) render(); else { cloudLoad().finally(render); }
window.addEventListener("hashchange",render);

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
