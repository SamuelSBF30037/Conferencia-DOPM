'use strict';

// ── Estado ─────────────────────────────────────────────────────────────────────
let relatorioFinal = '';
let running = false;

const MODULOS = ['afastamentos', 'divergencias', 'transferencia', 'aquisitivo', 'suspensoes'];

// ── UI helpers ─────────────────────────────────────────────────────────────────
function setState(id, estado, label) {
  const el = document.getElementById('state-' + id);
  if (!el) return;
  el.className = 'module-state ' + estado;
  el.textContent = label;
}

function setProgress(n, total) {
  document.getElementById('progressFill').style.width = Math.round((n / total) * 100) + '%';
}

function setStatus(msg, cls = '') {
  const el = document.getElementById('statusBar');
  el.textContent = msg;
  el.className = cls;
}

function resetUI() {
  MODULOS.forEach(m => setState(m, '', 'Aguardando'));
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('btnDownload').disabled = true;
  relatorioFinal = '';
}

// ── Verificar aba ──────────────────────────────────────────────────────────────
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ── Injetar script e aguardar resultado ───────────────────────────────────────
function injectAndRun(tabId, func, args = []) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      { target: { tabId }, func, args },
      (results) => {
        if (chrome.runtime.lastError) {
          resolve({ erro: chrome.runtime.lastError.message });
        } else {
          resolve(results?.[0]?.result ?? { erro: 'Sem resultado' });
        }
      }
    );
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  FUNÇÕES INJETADAS NA PÁGINA  (cada uma retorna um objeto estruturado)
// ══════════════════════════════════════════════════════════════════════════════

// ── TÓPICO 1: Afastamentos ────────────────────────────────────────────────────
function scriptAfastamentos() {
  try {
    // --- normalização ---
    function normTexto(t) {
      return (t||'').trim().replace(/\s+/g,' ').replace(/[.*()]/g,'').replace(/&nbsp;/g,' ')
        .replace(/[ÃÂ]/g,'A').replace(/[ÕÔ]/g,'O').replace(/Ê/g,'E').replace(/Î/g,'I')
        .replace(/Û/g,'U').replace(/[ÀÁ]/g,'A').replace(/[ÈÉ]/g,'E').replace(/[ÌÍ]/g,'I')
        .replace(/[ÒÓ]/g,'O').replace(/[ÙÚ]/g,'U').replace(/Ç/g,'C').toUpperCase();
    }
    function normPosto(t) {
      return (t||'').replace(/1º TEN(ENTE)?/gi,'1º TENENTE').replace(/2º TEN(ENTE)?/gi,'2º TENENTE')
        .replace(/SUB\s+TEN/gi,'SUBTENENTE').replace(/[123][°º]\s*SGT/gi,(m)=>{const n=m[0];return n+'º SARGENTO';})
        .replace(/\bCB\b/gi,'CABO').replace(/SD PM|SOLDADO PM|SOLDADO QPPM/gi,'SOLDADO')
        .replace(/SOLDADO\s+(?:DE\s+)?2[ªº°]\s+CLASSE/gi,'SOLDADO')
        .replace(/CB PM|CABO PM/gi,'CABO').replace(/ST /gi,'SUBTENENTE ').replace(/SUBTENETE/gi,'SUBTENENTE')
        .replace(/TEN CEL/gi,'TENENTE CORONEL').replace(/MAJ PM/gi,'MAJOR').replace(/CAP PM/gi,'CAPITÃO').replace(/CEL PM/gi,'CORONEL')
        .replace(/\b(CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|[12]º\s+TENENTE|SUBTENENTE|[123]º\s+SARGENTO|CABO|SOLDADO)\s+PM\b/gi,'$1')
        .replace(/\s+[QR][A-Z]+\s+/gi,' ').replace(/\s+RG\.?\s+/gi,' ').replace(/\s+REF\.?\s+/gi,' ').replace(/\s+R\/R\s+/gi,' ')
        .replace(/\s+/g,' ').trim();
    }
    function exNome(txt) {
      const pats=[/O\(A\)\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i,/O\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i,/A\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i];
      for(const p of pats){const m=txt.match(p);if(m){let n=m[1].replace(/,.*$/,'').trim();return normTexto(normPosto(n));}}
      return null;
    }
    function exNumId(txt) {
      const m=txt.match(/\*(\d{1,3}(?:\.\d{2})?)\*/)||txt.match(/\s+(\d{3})\s+/);
      if(!m) return null;
      return m[1].replace(/\./g,'').padStart(3,'0');
    }
    function normData(d){const p=d.split('/');return p.length===3?`${p[0].padStart(2,'0')}/${p[1].padStart(2,'0')}/${p[2]}`:d;}
    function exPeriodo(txt) {
      let t=txt.replace(/DEVENDO APRESENTAR-SE.*?EM\s+\d{1,2}\/\d{1,2}\/\d{4}/gi,'')
               .replace(/PERÍODO\s+AQUISITIVO\s+DE\s+\d{1,2}\/\d{1,2}\/\d{4}\s+A(?:TÉ)?\s+\d{1,2}\/\d{1,2}\/\d{4}/gi,'');
      const pats=[/(?:NO\s+)?PERÍODO DE\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:TÉ)?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
                  /DO DIA\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:O\s+DIA\s+|\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/i,
                  /DE\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:TÉ)?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i];
      for(const p of pats){const m=t.match(p);if(m)return`${normData(m[1])} A ${normData(m[2])}`;}
      return null;
    }
    function exDias(txt) {
      const m=txt.match(/(?:PERFAZENDO O TOTAL DE|NUM TOTAL DE|TOTAL DE)\s+(\d+)\s+(?:\([^)]+\))?\s*(DIA|MES)/i);
      if(!m) return null;
      const n=parseInt(m[1]);
      return /MES/i.test(m[2])?Math.round(n*30.4):n;
    }
    function exMotivo(txt) {
      const m=txt.match(/MOTIVO:\s+([^.]+?)(?:\.|EXERCÍCIO|COM\s+PERÍODO|DEVENDO|$)/i);
      if(!m) return null;
      let mot=m[1].replace(/\s*\([^)]*\)/g,'').replace(/,.*$/,'').trim();
      return normTexto(mot);
    }
    function exExercicio(txt){const m=txt.match(/EXERCÍCIO:\s*(\d{4})/i);return m?parseInt(m[1]):null;}
    function exAssinatura(txt){const p=txt.trim().split(/\s+/);return p[p.length-1]||'';}

    function dividirBloco(html) {
      let parts=html.split('<br>');
      if(parts.length>=2){
        return{p1:parts[0].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),
               p2:parts.slice(1).join(' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()};
      }
      let t=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      const m=t.match(/^(.*?ESTÁ\s+AUTORIZADO.*?)(O\s+(?:CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|[12]º\s+TENENTE|SUBTENENTE|[123]º\s+SARGENTO|CABO|SOLDADO).*)$/i);
      if(m)return{p1:m[1].trim(),p2:m[2].trim()};
      return{p1:t,p2:''};
    }

    function compararCampo(v1,v2,campo){
      if(v1===null&&v2===null)return{ok:true,obs:`${campo}: ambos não encontrados`};
      if(v1===null||v2===null)return{ok:true,obs:`${campo}: valor em apenas uma parte`};
      if(campo==='Total Dias'){
        const d=Math.abs(parseInt(v1)-parseInt(v2));
        return d<=4?{ok:true,obs:`${campo}: OK (${v1}≈${v2})`}:{ok:false,obs:`${campo}: DIVERGÊNCIA (${v1}≠${v2}, diff=${d}d)`};
      }
      if(campo==='Número ID'){
        const a=v1.toString(),b=v2.toString();
        if(a===b||a.startsWith(b)||b.startsWith(a))return{ok:true,obs:`${campo}: OK`};
        return{ok:false,obs:`${campo}: DIVERGÊNCIA (${a}≠${b})`};
      }
      if(campo==='Nome'){
        if(v1===v2||v1.includes(v2)||v2.includes(v1))return{ok:true,obs:`${campo}: OK`};
        return{ok:false,obs:`${campo}: DIVERGÊNCIA (${v1} ≠ ${v2})`};
      }
      if(campo==='Motivo'){
        if(v1===v2||v1.includes(v2)||v2.includes(v1))return{ok:true,obs:`${campo}: OK`};
        return{ok:false,obs:`${campo}: DIVERGÊNCIA (${v1} ≠ ${v2})`};
      }
      return v1.toString()===v2.toString()?{ok:true,obs:`${campo}: OK`}:{ok:false,obs:`${campo}: DIVERGÊNCIA (${v1}≠${v2})`};
    }

    const blocos=document.querySelectorAll('td[width="90%"]');
    const resultado={total:0,divergencias:0,registros:[]};

    blocos.forEach((bloco)=>{
      const html=bloco.innerHTML||'';
      if(!html.includes('ESTÁ AUTORIZADO'))return;
      resultado.total++;
      const{p1,p2}=dividirBloco(html);
      const d1={nome:exNome(p1),id:exNumId(p1),periodo:exPeriodo(p1),dias:exDias(p1),motivo:exMotivo(p1),exercicio:exExercicio(p1)};
      const d2={nome:exNome(p2),id:exNumId(p2),periodo:exPeriodo(p2),dias:exDias(p2),motivo:exMotivo(p2),exercicio:exExercicio(p2)};
      const comps={
        Nome:compararCampo(d1.nome,d2.nome,'Nome'),
        'Número ID':compararCampo(d1.id,d2.id,'Número ID'),
        Período:compararCampo(d1.periodo,d2.periodo,'Período'),
        'Total Dias':compararCampo(d1.dias,d2.dias,'Total Dias'),
        Motivo:compararCampo(d1.motivo,d2.motivo,'Motivo'),
        Exercício:compararCampo(d1.exercicio,d2.exercicio,'Exercício')
      };
      const divs=Object.values(comps).filter(c=>!c.ok);
      const reg={
        nome:d1.nome||d2.nome||'(não extraído)',
        assinatura:exAssinatura(p2),
        divergencias:divs.length,
        detalhes:divs.map(d=>d.obs)
      };
      if(divs.length>0){resultado.divergencias++;resultado.registros.push(reg);}
    });
    return resultado;
  } catch(e) { return{erro:e.message}; }
}

// ── TÓPICO 2: Divergências gerais (melhorado v2) ──────────────────────────────
function scriptDivergencias() {
  // Reutiliza lógica idêntica ao scriptAfastamentos mas com foco em ESTÁ AUTORIZADO
  try {
    function normTexto(t){return(t||'').trim().replace(/\s+/g,' ').replace(/[.*()]/g,'').replace(/&nbsp;/g,' ').replace(/[ÃÂ]/g,'A').replace(/[ÕÔ]/g,'O').replace(/Ê/g,'E').replace(/Î/g,'I').replace(/Û/g,'U').replace(/[ÀÁ]/g,'A').replace(/[ÈÉ]/g,'E').replace(/[ÌÍ]/g,'I').replace(/[ÒÓ]/g,'O').replace(/[ÙÚ]/g,'U').replace(/Ç/g,'C').toUpperCase();}
    function normPosto(t){return(t||'').replace(/1º TEN(ENTE)?/gi,'1º TENENTE').replace(/2º TEN(ENTE)?/gi,'2º TENENTE').replace(/SUB\s+TEN/gi,'SUBTENENTE').replace(/[123][°º]\s*SGT/gi,(m)=>m[0]+'º SARGENTO').replace(/\bCB\b/gi,'CABO').replace(/SD PM|SOLDADO PM|SOLDADO QPPM/gi,'SOLDADO').replace(/SOLDADO\s+(?:DE\s+)?2[ªº°]\s+CLASSE/gi,'SOLDADO').replace(/\s+[QR][A-Z]+\s+/gi,' ').replace(/\s+/g,' ').trim();}
    function exNome(txt){const pats=[/O\(A\)\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i,/O\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i,/A\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i];for(const p of pats){const m=txt.match(p);if(m){return normTexto(normPosto(m[1].replace(/,.*$/,'').trim()));}}return null;}
    function exNumId(txt){const m=txt.match(/\*(\d{1,3}(?:\.\d{2})?)\*/)||txt.match(/\s+(\d{3})\s+/);return m?m[1].replace(/\./g,'').padStart(3,'0'):null;}
    function normData(d){const p=d.split('/');return p.length===3?`${p[0].padStart(2,'0')}/${p[1].padStart(2,'0')}/${p[2]}`:d;}
    function exPeriodo(txt){let t=txt.replace(/PERÍODO\s+AQUISITIVO\s+DE\s+\d{1,2}\/\d{1,2}\/\d{4}\s+A(?:TÉ)?\s+\d{1,2}\/\d{1,2}\/\d{4}/gi,'');const pats=[/(?:NO\s+)?PERÍODO DE\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:TÉ)?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,/DE\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:TÉ)?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i];for(const p of pats){const m=t.match(p);if(m)return`${normData(m[1])} A ${normData(m[2])}`;}return null;}
    function exDias(txt){const m=txt.match(/(?:PERFAZENDO O TOTAL DE|NUM TOTAL DE|TOTAL DE)\s+(\d+)\s+(?:\([^)]+\))?\s*(DIA|MES)/i);if(!m)return null;const n=parseInt(m[1]);return/MES/i.test(m[2])?Math.round(n*30.4):n;}
    function exMotivo(txt){const m=txt.match(/MOTIVO:\s+([^.]+?)(?:\.|EXERCÍCIO|COM\s+PERÍODO|DEVENDO|$)/i);if(!m)return null;return normTexto(m[1].replace(/\s*\([^)]*\)/g,'').replace(/,.*$/,'').trim());}
    function exExercicio(txt){const m=txt.match(/EXERCÍCIO:\s*(\d{4})/i);return m?parseInt(m[1]):null;}
    function exAssinatura(txt){const p=txt.trim().split(/\s+/);return p[p.length-1]||'';}
    function dividirBloco(html){let parts=html.split('<br>');if(parts.length>=2){return{p1:parts[0].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),p2:parts.slice(1).join(' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()};}let t=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();const m=t.match(/^(.*?ESTÁ\s+AUTORIZADO.*?)(O\s+(?:CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|[12]º\s+TENENTE|SUBTENENTE|[123]º\s+SARGENTO|CABO|SOLDADO).*)$/i);if(m)return{p1:m[1].trim(),p2:m[2].trim()};return{p1:t,p2:''};}
    function cmp(v1,v2,campo){if(v1===null&&v2===null)return{ok:true};if(v1===null||v2===null)return{ok:true};const a=v1.toString(),b=v2.toString();if(campo==='Total Dias'){const d=Math.abs(parseInt(a)-parseInt(b));return d<=4?{ok:true}:{ok:false,obs:`${campo}: ${a}≠${b} (diff=${d}d)`};}if(campo==='Número ID'){if(a===b||a.startsWith(b)||b.startsWith(a))return{ok:true};return{ok:false,obs:`${campo}: ${a}≠${b}`};}if(a===b||a.includes(b)||b.includes(a))return{ok:true};return{ok:false,obs:`${campo}: "${a}" ≠ "${b}"`};}

    const blocos=document.querySelectorAll('td[width="90%"]');
    const resultado={total:0,divergencias:0,registros:[]};
    blocos.forEach(bloco=>{
      const html=bloco.innerHTML||'';
      if(!html.includes('ESTÁ AUTORIZADO'))return;
      resultado.total++;
      const{p1,p2}=dividirBloco(html);
      const d1={nome:exNome(p1),id:exNumId(p1),periodo:exPeriodo(p1),dias:exDias(p1),motivo:exMotivo(p1),exercicio:exExercicio(p1)};
      const d2={nome:exNome(p2),id:exNumId(p2),periodo:exPeriodo(p2),dias:exDias(p2),motivo:exMotivo(p2),exercicio:exExercicio(p2)};
      const checks=[cmp(d1.nome,d2.nome,'Nome'),cmp(d1.id,d2.id,'Número ID'),cmp(d1.periodo,d2.periodo,'Período'),cmp(d1.dias,d2.dias,'Total Dias'),cmp(d1.motivo,d2.motivo,'Motivo'),cmp(d1.exercicio,d2.exercicio,'Exercício')];
      const divs=checks.filter(c=>!c.ok);
      if(divs.length>0){resultado.divergencias++;resultado.registros.push({nome:d1.nome||d2.nome||'(não extraído)',assinatura:exAssinatura(p2),divergencias:divs.length,detalhes:divs.map(d=>d.obs)});}
    });
    return resultado;
  } catch(e){return{erro:e.message};}
}

// ── TÓPICO 3: Transferência de Unidade ───────────────────────────────────────
function scriptTransferencia() {
  try {
    function limparNome(t){if(!t)return'';let s=t.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s.replace(/\b(2º|1º|3º|TENENTE|TEN|SOLDADO|SD|CABO|CB|SARGENTO|SGT|SUBTENENTE|SUB|MAJOR|MAJ|CAPITAO|CAP|CORONEL|CEL|ASPIRANTE|ASP|ALUNO|QOPM|QPPM|QPE|QPS|SBF|PMGO|PM|DE\s\dª\sCLASSE|\*\d+\*|\d+[\.\d]*)\b/gi,'').replace(/[^\w\s]/gi,'').replace(/\s+/g,' ').trim();}
    function obterIds(u){if(!u)return new Set();let t=u.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/COMANDO REGIONAL/g,'CRPM').replace(/BATALHAO/g,'BPM').replace(/COMPANHIA INDEPENDENTE/g,'CIPM').replace(/POLICIA MILITAR/g,'').replace(/NAO CADASTRADO/g,'');const m=t.match(/\d+|CRPM|BPM|CIPM|CPC|CME|CPM|CPCHOQUE/g)||[];return new Set(m.map(x=>x.replace(/^0+/,'')));}
    function unidsOk(u1,u2){const a=obterIds(u1),b=obterIds(u2);if(!a.size||!b.size)return true;let n=0;b.forEach(v=>{if(a.has(v))n++;});return n>0;}

    const elems=Array.from(document.querySelectorAll('td, b, em, div, p'));
    let idxTopico=-1;
    for(let i=0;i<elems.length;i++){const t=(elems[i].innerText||'').toUpperCase().trim();if(t.includes('TRANSFERÊNCIA DE UNIDADE')||t.includes('TRANSFERENCIA DE UNIDADE')){idxTopico=i;break;}}
    if(idxTopico===-1)return{erro:'Tópico "TRANSFERÊNCIA DE UNIDADE" não encontrado na página.'};

    const tabelas=Array.from(document.querySelectorAll('table'));
    const blocos=[];
    tabelas.forEach(tb=>{
      if(tb.compareDocumentPosition(elems[idxTopico])&Node.DOCUMENT_POSITION_PRECEDING){
        if(tb.innerText.includes('TRANSFIRO')){
          const td=tb.querySelector('td[width="90%"]')||tb.querySelector('td');
          if(td&&td.innerText.includes('TRANSFIRO')&&!blocos.includes(td))blocos.push(td);
        }
      }
    });
    if(!blocos.length)return{erro:'Nenhum bloco de transferência encontrado.'};

    const resultado={total:blocos.length,divergencias:0,registros:[]};
    blocos.forEach((bloco,i)=>{
      const txt=bloco.innerText.replace(/\s+/g,' ').trim();
      const divM=txt.match(/\d{2}\/\d{2}\/\d{4}\./);
      if(!divM)return;
      const pos=divM.index+divM[0].length;
      const p1=txt.substring(0,pos).trim(), p2=txt.substring(pos).trim();
      const nM1=p1.match(/(?:TENENTE|SOLDADO|CABO|SARGENTO|MAJOR|CAPITAO|SUBTENENTE|CORONEL|TEN|SD|CB|SGT|MAJ|CAP|CEL|ASP|ALUNO).*?,\s(?:[\d\*]*),\s(.*?),\sCPF/i)||p1.match(/TRANSFIRO O .*?,\s(?:[\d\*]*),\s(.*?),\sCPF/i);
      const nomeP1=nM1?nM1[1].trim():'';
      const origemP1=p1.match(/DA\(O\)\s(.*?)\sPARA/i)?.[1]||'';
      const destinoP1=p1.match(/PARA\sA\(O\)\s(.*?)(?:,|$)/i)?.[1]||'';
      const nM2=p2.match(/TRANSFIRO O (.*?)(?:, NO INTERESSE|, POR INTERESSE|, NO INT| NO INTERESSE)/i);
      const nomeP2Raw=nM2?nM2[1]:'';
      const origemP2=p2.match(/(?:DO|DA)\s(.*?)\sPARA/i)?.[1]||'';
      const destinoP2=p2.match(/PARA\s(?:O|A)\s(.*?)(?:,|$|\.)/i)?.[1]||'';
      const n1=limparNome(nomeP1),n2=limparNome(nomeP2Raw);
      const erros=[];
      if(n1&&n2&&n1!==n2&&!n1.includes(n2)&&!n2.includes(n1))erros.push('NOME');
      if(!unidsOk(origemP1,origemP2))erros.push(`ORIGEM (${origemP1||'?'} ≠ ${origemP2||'?'})`);
      if(!unidsOk(destinoP1,destinoP2))erros.push(`DESTINO (${destinoP1||'?'} ≠ ${destinoP2||'?'})`);
      if(erros.length){resultado.divergencias++;resultado.registros.push({nome:nomeP1||'(não extraído)',divergencias:erros.length,detalhes:erros.map(e=>'Divergência: '+e)});}
    });
    return resultado;
  } catch(e){return{erro:e.message};}
}

// ── TÓPICO 4: Período Aquisitivo ──────────────────────────────────────────────
function scriptAquisitivo() {
  try {
    function normTxt(t){if(typeof t!=='string')return'';return t.replace(/\u00A0/g,' ').trim().toUpperCase().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
    function parseData(s){const p=s.split('/');if(p.length!==3)return null;const d=new Date(p[2],p[1]-1,p[0]);return(d.getFullYear()==p[2]&&d.getMonth()==p[1]-1&&d.getDate()==p[0])?d:null;}
    const agora=new Date();
    const lim60=new Date();lim60.setDate(agora.getDate()+60);

    const blocos=document.querySelectorAll('td[width="90%"]');
    const registros=[];
    blocos.forEach((bloco,i)=>{
      const txt=bloco.textContent||'';
      const mA=txt.match(/(O\(A\)|O)\s+(.*?)\s+ESTÁ\s+AUTORIZADO/i);
      const assinatura=mA?normTxt(mA[2]):'';
      const nomeCompleto=assinatura.replace(/(CAPITÃO|MAJOR|TENENTE|CORONEL|SARGENTO|CABO|SOLDADO|SD|CB|SGT|TEN|CEL|MAJ)\s*[\*\d\.\s]+/i,'').trim();
      const mP=txt.match(/PERÍODO\s+AQUISITIVO\s+DE\s*(\d{2}\/\d{2}\/\d{4})\s*A\s*(\d{2}\/\d{2}\/\d{4})/i);
      const mE=txt.match(/EXERCÍCIO:\s*(\d{4})/i);
      registros.push({
        num:i+1,nome:nomeCompleto,assinatura,
        periodo:mP?mP[0]:'NÃO ENCONTRADO',
        dtInicio:mP?parseData(mP[1]):null,dtFim:mP?parseData(mP[2]):null,dtFimStr:mP?mP[2]:null,
        exercicio:mE?mE[1]:'',anoInicio:mP?mP[1].split('/')[2]:''
      });
    });

    // Duplicatas divergentes
    const mapa={};
    registros.forEach(r=>{if(r.assinatura&&r.assinatura!==''){if(!mapa[r.assinatura])mapa[r.assinatura]=[];mapa[r.assinatura].push(r);}});
    const divDups=[];
    Object.values(mapa).filter(g=>g.length>1).forEach(g=>{const prim=g[0].periodo;if(g.some(r=>r.periodo!==prim))divDups.push(g);});

    // Incoerências exercício vs início
    const incoer=registros.filter(r=>r.exercicio&&r.anoInicio&&r.exercicio!==r.anoInicio);

    // Prazos > 60 dias
    const prazos=registros.filter(r=>r.dtFim&&r.dtFim>lim60);

    const resultado={
      totalBlocos:registros.length,
      divergenciasDuplicatas:divDups.length,
      incoerenciasExercicio:incoer.length,
      alertasPrazo:prazos.length,
      registros:[]
    };

    divDups.forEach(g=>{
      resultado.registros.push({nome:g[0].assinatura,divergencias:1,detalhes:g.map(r=>`Reg ${r.num}: ${r.periodo}`)});
    });
    incoer.forEach(r=>{
      resultado.registros.push({nome:r.nome||r.assinatura,divergencias:1,detalhes:[`Exercício ${r.exercicio} ≠ Início Aquisitivo ${r.anoInicio}`]});
    });
    prazos.forEach(r=>{
      const dias=Math.floor((r.dtFim-agora)/(1000*60*60*24));
      resultado.registros.push({nome:r.nome||r.assinatura,divergencias:0,detalhes:[`⚠️ Data Fim ${r.dtFimStr} (${dias} dias à frente)`],alerta:true});
    });
    return resultado;
  } catch(e){return{erro:e.message};}
}

// ── TÓPICO 5: Suspensões de Afastamento ──────────────────────────────────────
function scriptSuspensoes() {
  try {
    function parseDate(s){const p=s.split('/');const d=new Date(p[2],p[1]-1,p[0]);return(d.getFullYear()==p[2]&&d.getMonth()==p[1]-1&&d.getDate()==p[0])?d:null;}
    function calcDias(a,b){return Math.ceil(Math.abs(b-a)/(1000*60*60*24))+1;}
    function normMotivo(m){return typeof m==='string'?m.toUpperCase().trim().replace(/[., ]*$/,'').replace(/\s+/g,' '):''}
    function findMotives(txt){
      const re=/(?:MOTIVO RELATADO|MOTIVO DA SUSPENSÃO|MOTIVO):\s*([^\n\r.]+?)(?=\.|\s*(?:GOIÂNIA|ITEM DOPM|PROCESSO SEI|PM\/CH\.GAB\.CMT)|$|\s*(?:MOTIVO RELATADO|MOTIVO DA SUSPENSÃO|MOTIVO):)/gi;
      const r=[];let m;while((m=re.exec(txt))!==null)r.push(m[1].trim());return r;
    }
    const regex=/O AFASTAMENTO FÉRIAS EXERCÍCIO (\d{4}), DO (.*?) \*(\d{3}[\.\d]*)\* (.*?) COM PERÍODO ENTRE (\d{2}\/\d{2}\/\d{4}) A (\d{2}\/\d{2}\/\d{4}) TOTALIZANDO (\d+) DIAS,\s+FICA SUSPENSO\s+A CONTAR DE (\d{2}\/\d{2}\/\d{4})\. MOTIVO RELATADO: (.*)/s;

    const todosBlocos=document.querySelectorAll('table.frm-borda[bgcolor="#99ccff"]');
    const blocosSusp=Array.from(todosBlocos).filter(t=>(t.textContent||'').includes('FICA SUSPENSO'));
    if(!blocosSusp.length)return{erro:'Nenhum bloco de suspensão ("FICA SUSPENSO") encontrado.'};

    const resultado={totalBlocos:blocosSusp.length,problemas:0,registros:[]};
    blocosSusp.forEach((tabela,idx)=>{
      const cel=tabela.querySelector('td[width="90%"]');
      if(!cel){resultado.problemas++;resultado.registros.push({nome:'BLOCO #'+(idx+1),divergencias:1,detalhes:['Estrutura inválida: célula não encontrada']});return;}
      const fullText=cel.textContent;
      const lines=fullText.trim().split('\n').filter(l=>l.trim().length>0);
      const m=(lines[0]||'').match(regex);
      const inc=[];
      if(!m){inc.push('Regex falhou: padrão principal não encontrado na primeira linha');}
      else{
        const[,exercicio,posto,numero,nome,dtIniStr,dtFimStr,diasTxtStr,dtSuspStr]=m;
        const dtIni=parseDate(dtIniStr),dtFim=parseDate(dtFimStr),dtSusp=parseDate(dtSuspStr);
        const diasInf=parseInt(diasTxtStr,10);
        if(!dtIni||!dtFim||!dtSusp)inc.push('Data inválida (Início/Fim/Suspensão)');
        if(dtSusp&&dtIni&&dtSusp>dtIni)inc.push(`Data Suspensão (${dtSuspStr}) posterior ao Início Férias (${dtIniStr})`);
        if(dtIni&&dtFim){const dc=calcDias(dtIni,dtFim);if(dc!==diasInf)inc.push(`Duração: calculado ${dc}d ≠ informado ${diasInf}d`);}
        const motivos=findMotives(fullText);
        if(motivos.length>=2){const n1=normMotivo(motivos[0]);for(let i=1;i<motivos.length;i++){const nN=normMotivo(motivos[i]);if(n1!==nN)inc.push(`Motivo #${i+1} diverge: "${motivos[0]}" ≠ "${motivos[i]}"`);}}}
      if(inc.length){resultado.problemas++;resultado.registros.push({nome:m?`${m[2].trim()} ${m[4].trim()}`:'BLOCO #'+(idx+1),divergencias:inc.length,detalhes:inc});}
    });
    return resultado;
  } catch(e){return{erro:e.message};}
}

// ══════════════════════════════════════════════════════════════════════════════
//  MONTAGEM DO RELATÓRIO
// ══════════════════════════════════════════════════════════════════════════════

function secao(titulo, subtitulo, resultado) {
  const linha = '='.repeat(76);
  const sub   = '-'.repeat(76);
  let s = `\n${linha}\n`;
  s += ` ${titulo}\n`;
  if (subtitulo) s += ` ${subtitulo}\n`;
  s += `${linha}\n`;

  if (resultado.erro) {
    s += `\n  ⚠️  Módulo não executado: ${resultado.erro}\n`;
    return s;
  }

  // Resumo numérico por módulo
  if (resultado.total !== undefined)
    s += `  Registros analisados  : ${resultado.total}\n`;
  if (resultado.totalBlocos !== undefined)
    s += `  Blocos analisados     : ${resultado.totalBlocos}\n`;
  if (resultado.divergencias !== undefined)
    s += `  Com divergências      : ${resultado.divergencias}\n`;
  if (resultado.divergenciasDuplicatas !== undefined)
    s += `  Duplicatas divergentes: ${resultado.divergenciasDuplicatas}\n`;
  if (resultado.incoerenciasExercicio !== undefined)
    s += `  Incoerências exercício: ${resultado.incoerenciasExercicio}\n`;
  if (resultado.alertasPrazo !== undefined)
    s += `  Alertas prazo >60 dias: ${resultado.alertasPrazo}\n`;
  if (resultado.problemas !== undefined)
    s += `  Problemas detectados  : ${resultado.problemas}\n`;

  const regs = resultado.registros || [];
  if (!regs.length) {
    s += `\n  ✅  Nenhuma divergência encontrada.\n`;
    return s;
  }

  s += `\n${sub}\n  DETALHAMENTO\n${sub}\n`;
  regs.forEach((r, i) => {
    const icone = r.alerta ? '⚠️' : (r.divergencias > 0 ? '❌' : '⚠️');
    s += `\n  ${icone} [${String(i + 1).padStart(2, '0')}] ${r.nome}\n`;
    (r.detalhes || []).forEach(d => { s += `        • ${d}\n`; });
  });
  return s;
}

function montarRelatorio(resultados, url) {
  const data = new Date().toLocaleString('pt-BR');
  let rel = '';
  rel += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
  rel += '║          RELATÓRIO UNIFICADO DE CONFERÊNCIA — DOPM / PMGO                  ║\n';
  rel += '╚══════════════════════════════════════════════════════════════════════════════╝\n';
  rel += `  Gerado em : ${data}\n`;
  rel += `  Página    : ${url || 'desconhecida'}\n`;
  rel += `  Módulos   : 5 (Afastamentos · Divergências · Transferência · Aquisitivo · Suspensões)\n`;

  const titulos = [
    ['TÓPICO 1 — AFASTAMENTOS',              'Divergências entre partes duplicadas dos blocos de afastamento'],
    ['TÓPICO 2 — DIVERGÊNCIAS GERAIS',       'Nome, Número ID, Período, Total de Dias, Motivo, Exercício'],
    ['TÓPICO 3 — TRANSFERÊNCIA DE UNIDADE',  'Nome, Unidade de Origem e Unidade de Destino'],
    ['TÓPICO 4 — PERÍODO AQUISITIVO',        'Duplicatas divergentes · Incoerências exercício · Alertas de prazo'],
    ['TÓPICO 5 — SUSPENSÕES DE AFASTAMENTO', 'Datas, duração e coerência dos motivos']
  ];

  resultados.forEach((res, i) => {
    rel += secao(titulos[i][0], titulos[i][1], res);
  });

  rel += '\n' + '='.repeat(76) + '\n';
  rel += '  Fim do relatório\n';
  rel += '='.repeat(76) + '\n';
  return rel;
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXECUÇÃO PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

document.getElementById('btnRun').addEventListener('click', async () => {
  if (running) return;
  running = true;
  resetUI();

  const tab = await getActiveTab();
  const url = tab?.url || '';
  const ok  = url.includes('sei.go.gov.br') || url.includes('sisp.ssp.go.gov.br');

  if (!ok) {
    document.getElementById('warningBox').classList.add('show');
    setStatus('Acesse um site compatível primeiro.', 'err');
    running = false;
    return;
  }
  document.getElementById('warningBox').classList.remove('show');

  const scripts = [
    { id: 'afastamentos',  fn: scriptAfastamentos,  label: 'Afastamentos'        },
    { id: 'divergencias',  fn: scriptDivergencias,  label: 'Divergências'        },
    { id: 'transferencia', fn: scriptTransferencia, label: 'Transferências'      },
    { id: 'aquisitivo',    fn: scriptAquisitivo,    label: 'Aquisitivo'          },
    { id: 'suspensoes',    fn: scriptSuspensoes,    label: 'Suspensões'          }
  ];

  const resultados = [];
  const btn = document.getElementById('btnRun');
  btn.disabled = true;
  btn.textContent = '⏳ Executando…';

  for (let i = 0; i < scripts.length; i++) {
    const { id, fn, label } = scripts[i];
    setState(id, 'running', 'Executando…');
    setStatus(`Executando: ${label}…`);
    setProgress(i, scripts.length);

    const res = await injectAndRun(tab.id, fn);
    resultados.push(res);

    if (res.erro) {
      setState(id, 'skip', 'N/A');
    } else {
      const divs = res.divergencias || res.problemas || 0;
      const alertas = res.alertasPrazo || 0;
      if (divs > 0)         setState(id, 'error',   `${divs} divergência${divs>1?'s':''}`);
      else if (alertas > 0) setState(id, 'running',  `${alertas} alerta${alertas>1?'s':''}`);
      else                  setState(id, 'done',     '✓ OK');
    }
  }

  setProgress(scripts.length, scripts.length);

  // Montar relatório final
  relatorioFinal = montarRelatorio(resultados, url);

  const totalDivs = resultados.reduce((acc, r) => acc + (r.divergencias || r.problemas || 0), 0);
  const totalAlertas = resultados.reduce((acc, r) => acc + (r.alertasPrazo || 0), 0);

  if (totalDivs > 0 || totalAlertas > 0) {
    setStatus(`Concluído — ${totalDivs} divergência(s) · ${totalAlertas} alerta(s)`, 'err');
  } else {
    setStatus('Concluído — nenhuma divergência encontrada ✓', 'ok');
  }

  document.getElementById('btnDownload').disabled = false;
  btn.disabled = false;
  btn.textContent = '▶ Executar Conferência Completa';
  running = false;
});

// ── Download ──────────────────────────────────────────────────────────────────
document.getElementById('btnDownload').addEventListener('click', () => {
  if (!relatorioFinal) return;
  const blob = new Blob([relatorioFinal], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `Conferencia_DOPM_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});
