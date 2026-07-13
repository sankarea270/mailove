// vault.js — bóveda de videos privada sobre Cloudflare R2 (vía un Worker).
// La contraseña NO vive aquí: se envía al Worker, que la valida contra un
// secreto y devuelve un token temporal. R2 guarda los videos (10 GB gratis).

// ── Rellena con la URL de TU Worker (sin barra final). Ej:
//    https://mailove-vault.tu-subdominio.workers.dev
const WORKER_URL = 'https://mailove-vault.manuel270147123.workers.dev';
const TOKEN_KEY  = 'mailove_vault_token';
// ────────────────────────────────────────────────────────────────────────────

const secretInput   = document.getElementById('secret-input');
const videoVault    = document.getElementById('video-vault');
const videoInput    = document.getElementById('video-input');
const videoList     = document.getElementById('video-list');
const playerWrap    = document.getElementById('video-player-wrap');
const videoPlayer   = document.getElementById('video-player');

let unlocked = false;
let token = '';

// Mensaje de estado bajo el campo de contraseña.
const secretMsg = document.createElement('p');
secretMsg.id = 'secret-msg';
secretInput.insertAdjacentElement('afterend', secretMsg);
function setEstado(txt) { secretMsg.textContent = txt || ''; }

function mediaUrl(key) {
  return `${WORKER_URL}/media?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`;
}

async function intentarAbrir() {
  if (unlocked) return;
  const pass = secretInput.value.trim();
  if (!pass) return;

  secretInput.disabled = true;
  setEstado('Abriendo…');

  try {
    const res = await fetch(`${WORKER_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass }),
    });
    if (res.status === 401) throw new Error('invalid');
    if (!res.ok) throw new Error('server ' + res.status);
    token = (await res.json()).token;
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    secretInput.disabled = false;
    secretInput.value = '';
    secretInput.focus();
    setEstado(e.message === 'invalid' ? 'Contraseña incorrecta' : 'Error de conexión con el servidor');
    gsap.fromTo(secretInput, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
    return;
  }

  secretInput.disabled = false;
  setEstado('');
  unlocked = true;
  secretInput.value = '';
  secretInput.blur();
  gsap.to(videoVault, {
    duration: 0.6,
    autoAlpha: 1,
    onStart: () => {
      videoVault.classList.remove('is-hidden');
      videoVault.style.visibility = 'visible';
    }
  });
  loadVideos();
}

secretInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); intentarAbrir(); }
});
secretInput.addEventListener('input', () => { if (!unlocked) setEstado(''); });

async function loadVideos() {
  videoList.innerHTML = '';
  playerWrap.classList.add('is-hidden');
  videoPlayer.pause();
  videoPlayer.removeAttribute('src');

  let items = [];
  try {
    const res = await fetch(`${WORKER_URL}/list`, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) throw new Error('list ' + res.status);
    items = (await res.json()).items || [];
  } catch (err) {
    console.error('Error al leer videos:', err);
  }

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.id = 'vault-empty';
    empty.textContent = 'Aún no hay videos. Guarda uno para empezar.';
    videoList.appendChild(empty);
    return;
  }

  for (const item of items) {
    const url = mediaUrl(item.key);

    const card = document.createElement('div');
    card.className = 'video-thumb';

    const preview = document.createElement('video');
    preview.src = url;
    preview.muted = true;
    preview.playsInline = true;
    preview.preload = 'metadata';   // solo la miniatura, no descarga el video entero

    const name = document.createElement('div');
    name.className = 'video-name';
    name.textContent = item.key.replace(/^\d+-/, '') || 'video';

    const del = document.createElement('button');
    del.className = 'video-delete';
    del.type = 'button';
    del.textContent = '×';
    del.title = 'Eliminar';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await fetch(`${WORKER_URL}/media?key=${encodeURIComponent(item.key)}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        });
      } catch (err) {
        console.error('Error al eliminar:', err);
      }
      loadVideos();
    });

    card.addEventListener('click', () => {
      videoPlayer.src = url;
      playerWrap.classList.remove('is-hidden');
      gsap.fromTo(playerWrap, { autoAlpha: 0 }, { duration: 0.4, autoAlpha: 1 });
      videoPlayer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      videoPlayer.play().catch(() => {});
    });

    card.appendChild(preview);
    card.appendChild(name);
    card.appendChild(del);
    videoList.appendChild(card);
  }
}

// Mensaje de estado de subida (para saber por qué falla, p. ej. peso).
const uploadMsg = document.createElement('p');
uploadMsg.id = 'upload-msg';
videoInput.insertAdjacentElement('afterend', uploadMsg);
function setSubida(txt) { uploadMsg.textContent = txt || ''; }

videoInput.addEventListener('change', async () => {
  if (!unlocked) return;
  const files = Array.from(videoInput.files || []);
  let ok = 0, fail = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file || !file.type.startsWith('video/')) continue;

    const mb = (file.size / (1024 * 1024)).toFixed(0);
    setSubida(`Subiendo ${i + 1}/${files.length} — ${file.name} (${mb} MB)…`);

    try {
      const res = await fetch(`${WORKER_URL}/upload?name=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': file.type || 'video/mp4' },
        body: file,
      });
      if (res.status === 413) throw new Error('too-large');
      if (!res.ok) throw new Error('server ' + res.status);
      ok++;
    } catch (err) {
      fail++;
      if (err.message === 'too-large') {
        setSubida(`"${file.name}" (${mb} MB) supera el límite de subida por el navegador (~100 MB). Comprímelo o súbelo desde el panel de R2.`);
      } else {
        setSubida(`No se pudo subir "${file.name}": ${err.message}`);
      }
      console.error('Error al guardar video:', err);
    }
  }

  videoInput.value = '';
  if (fail === 0 && ok > 0) setSubida(`Guardado ✓ (${ok})`);
  loadVideos();
});
