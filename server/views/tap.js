function esc(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STYLES = `
body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f9fa;color:#1c2530}
.wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.25rem}
.card{width:100%;max-width:24rem;background:#fff;border-radius:1rem;padding:2rem 1.75rem;box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 24px rgba(0,0,0,.06)}
.brand{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#2563eb;text-align:center}
h1{margin:.25rem 0 0;font-size:17px;font-weight:500;text-align:center}
.sub{margin:.4rem 0 0;font-size:13px;color:#5f6b7a;text-align:center}
label{display:block;margin-top:1rem}
label span{display:block;font-size:12.5px;font-weight:500;margin-bottom:.35rem}
input{width:100%;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:.75rem;padding:.65rem .9rem;font-size:15px}
.hint{margin-top:.35rem;font-size:11.5px;color:#5f6b7a}
.row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
.err{margin-top:1rem;padding:.5rem .75rem;border-radius:.5rem;background:#fce8e6;color:#c5221f;font-size:13px}
.btn{margin-top:1.25rem;width:100%;border:none;border-radius:999px;padding:.9rem 1.5rem;font-size:15px;font-weight:500;color:#fff;background:#2563eb;cursor:pointer}
.btn:disabled{opacity:.5;cursor:not-allowed}
.ok{text-align:center}
.ok p{margin:.5rem 0 0;font-size:13px;color:#5f6b7a}
.mono{margin-top:.25rem;font-family:ui-monospace,monospace;font-size:11.5px;word-break:break-all}
.box{margin-top:1.25rem;padding:.75rem .9rem;border-radius:.75rem;background:#f8f9fa;font-size:12.5px;color:#5f6b7a;text-align:left}
.center{text-align:center;color:#64748b;font-size:14px}
a{color:#2563eb}
.muted{font-size:12px;color:#94a3b8}
`;

function layout(title, body, extraScript = "") {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · MetricsField</title>
<style>${STYLES}</style>
</head>
<body>
${body}
${extraScript}
</body>
</html>`;
}

function paginaInactiva() {
  return layout(
    "Cartel desactivado",
    `<div class="wrap"><p class="center">Este cartel está temporalmente desactivado.</p></div>`,
  );
}

function paginaRedireccion(url, slug) {
  const u = esc(url);
  const s = esc(slug);
  return layout(
    "Redirigiendo",
    `<div class="wrap">
<div class="card ok">
<p>Redirigiendo…</p>
<p><a href="${u}">Si no pasa nada, tocá acá</a></p>
<p class="muted" style="margin-top:2rem"><a href="/t/${s}/editar">¿Sos el dueño de este cartel? Editar</a></p>
</div>
</div>`,
    `<script>location.replace(${JSON.stringify(url)});</script>`,
  );
}

function paginaActivar(slug) {
  const s = esc(slug);
  return layout(
    "Activar cartel",
    `<div class="wrap">
<form class="card" id="form-activar">
<div class="brand">MetricsField</div>
<h1>Activá tu cartel</h1>
<p class="sub">Este QR/NFC todavía no está configurado. Completá esto una vez y queda listo.</p>
<label><span>Nombre de tu negocio</span><input name="nombre" required placeholder="Ej: Barbería Güemes"></label>
<label><span>Link de tu reseña de Google</span><input name="url" required type="url" placeholder="https://g.page/r/..."><span class="hint">En Google Maps: buscá tu negocio → "Escribir una reseña" → copiá el link.</span></label>
<div class="row">
<label><span>Elegí un PIN</span><input name="pin" required inputmode="numeric" pattern="\\d{4,8}" placeholder="4 a 8 números"></label>
<label><span>Repetilo</span><input name="pinConfirmar" required inputmode="numeric" pattern="\\d{4,8}" placeholder="De nuevo"></label>
</div>
<p class="hint">Con este PIN vas a poder cambiar el link más adelante.</p>
<div id="error" class="err" hidden></div>
<button class="btn" type="submit">Activar mi cartel</button>
</form>
<div class="card ok" id="listo" hidden>
<p style="font-size:17px;font-weight:500">¡Listo, tu cartel ya está activo!</p>
<p>Desde ahora, cualquiera que lo toque va directo a dejarte una reseña en Google.</p>
<div class="box">Guardá esto para más adelante:<div class="mono" id="edit-url"></div>Te va a pedir el PIN que elegiste.</div>
</div>
</div>`,
    `<script>
(function(){
  const slug=${JSON.stringify(slug)};
  const form=document.getElementById('form-activar');
  const err=document.getElementById('error');
  const listo=document.getElementById('listo');
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    err.hidden=true;
    const fd=new FormData(form);
    const pin=String(fd.get('pin')||'');
    const pinConfirmar=String(fd.get('pinConfirmar')||'');
    if(pin!==pinConfirmar){err.textContent='Los dos PIN no coinciden.';err.hidden=false;return;}
    const btn=form.querySelector('button');btn.disabled=true;btn.textContent='Activando…';
    try{
      const res=await fetch('/api/t/'+encodeURIComponent(slug)+'/activar',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({nombreNegocio:fd.get('nombre'),urlDestino:fd.get('url'),pin})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok){throw new Error(data.error||'No se pudo activar.');}
      form.hidden=true;
      listo.hidden=false;
      document.getElementById('edit-url').textContent=location.host+'/t/'+slug+'/editar';
    }catch(ex){
      err.textContent=ex.message;err.hidden=false;
      btn.disabled=false;btn.textContent='Activar mi cartel';
    }
  });
})();
</script>`,
  );
}

function paginaEditar(slug, nombreActual, urlActual) {
  return layout(
    "Editar cartel",
    `<div class="wrap">
<form class="card" id="form-editar">
<div class="brand">MetricsField</div>
<h1>Editar tu cartel</h1>
<p class="sub">Cambiá lo que necesites y confirmá con tu PIN.</p>
<label><span>Nombre de tu negocio</span><input name="nombre" required value="${esc(nombreActual)}"></label>
<label><span>Link de tu reseña de Google</span><input name="url" required type="url" value="${esc(urlActual)}"></label>
<label><span>Tu PIN</span><input name="pin" required inputmode="numeric" autocomplete="off"></label>
<div id="error" class="err" hidden></div>
<div id="ok" class="box" hidden>¡Guardado! Los próximos escaneos ya usan el link nuevo.</div>
<button class="btn" type="submit">Guardar cambios</button>
</form>
</div>`,
    `<script>
(function(){
  const slug=${JSON.stringify(slug)};
  const form=document.getElementById('form-editar');
  const err=document.getElementById('error');
  const ok=document.getElementById('ok');
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    err.hidden=true;ok.hidden=true;
    const fd=new FormData(form);
    const btn=form.querySelector('button');btn.disabled=true;btn.textContent='Guardando…';
    try{
      const res=await fetch('/api/t/'+encodeURIComponent(slug)+'/editar',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({nombreNegocio:fd.get('nombre'),urlDestino:fd.get('url'),pin:fd.get('pin')})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok){throw new Error(data.error||'No se pudo guardar.');}
      ok.hidden=false;form.querySelector('[name=pin]').value='';
    }catch(ex){
      err.textContent=ex.message;err.hidden=false;
    }finally{
      btn.disabled=false;btn.textContent='Guardar cambios';
    }
  });
})();
</script>`,
  );
}

function pagina404() {
  return layout("No encontrado", `<div class="wrap"><p class="center">Este cartel no existe.</p></div>`);
}

module.exports = {
  paginaInactiva,
  paginaRedireccion,
  paginaActivar,
  paginaEditar,
  pagina404,
};
