// vault.js — bóveda de videos privada con Supabase.
// La contraseña que ella escribe es la de una cuenta COMPARTIDA de Supabase
// (no vive en este código). Al validarla, Supabase da acceso al bucket privado.

// ── 1) Rellena estos valores con los de TU proyecto (ver pasos abajo) ──────────
const SUPABASE_URL      = 'https://fcosljygktbfrsjiswge.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjb3Nsanlna3RiZnJzamlzd2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4ODM3NDEsImV4cCI6MjA5OTQ1OTc0MX0.l4kE_wOYAzWg9oHoiIF-lJjQrJLZeAdDRh6b_FROl-k';        // clave "anon/public": es segura de exponer
const SHARED_EMAIL      = 'manuel270147123@gmail.com'; // email de la cuenta compartida que crees
const BUCKET            = 'videos';              // nombre del bucket privado
// ──────────────────────────────────────────────────────────────────────────────

const secretInput   = document.getElementById('secret-input');
const videoVault    = document.getElementById('video-vault');
const videoInput    = document.getElementById('video-input');
const videoList     = document.getElementById('video-list');
const playerWrap    = document.getElementById('video-player-wrap');
const videoPlayer   = document.getElementById('video-player');

let sb = null;
if (typeof supabase !== 'undefined' && supabase.createClient) {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error('No se cargó el cliente de Supabase (revisa la etiqueta <script> del CDN).');
}

let unlocked = false;

// Escribe la contraseña y presiona Enter para abrir la bóveda.
secretInput.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter' || unlocked || !sb) return;
  e.preventDefault();
  const pass = secretInput.value.trim();
  if (!pass) return;

  secretInput.disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email: SHARED_EMAIL, password: pass });
  secretInput.disabled = false;

  if (error) {
    // Contraseña incorrecta: pequeño aviso visual y limpiar.
    secretInput.value = '';
    gsap.fromTo(secretInput, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
    return;
  }

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
});

async function loadVideos() {
  videoList.innerHTML = '';
  playerWrap.classList.add('is-hidden');
  videoPlayer.pause();
  videoPlayer.removeAttribute('src');

  let files = [];
  try {
    const { data, error } = await sb.storage.from(BUCKET).list('', {
      sortBy: { column: 'created_at', order: 'desc' }
    });
    if (error) throw error;
    files = (data || []).filter(f => f.id); // ignora entradas de carpeta
  } catch (err) {
    console.error('Error al leer videos:', err);
  }

  if (files.length === 0) {
    const empty = document.createElement('p');
    empty.id = 'vault-empty';
    empty.textContent = 'Aún no hay videos. Guarda uno para empezar.';
    videoList.appendChild(empty);
    return;
  }

  for (const item of files) {
    let url = '';
    try {
      const { data: signed } = await sb.storage.from(BUCKET).createSignedUrl(item.name, 3600);
      url = signed?.signedUrl || '';
    } catch (err) {
      console.error('Error al firmar URL:', err);
      continue;
    }

    const card = document.createElement('div');
    card.className = 'video-thumb';

    const preview = document.createElement('video');
    preview.src = url;
    preview.muted = true;
    preview.playsInline = true;

    const name = document.createElement('div');
    name.className = 'video-name';
    name.textContent = item.name.replace(/^\d+-/, '') || 'video';

    const del = document.createElement('button');
    del.className = 'video-delete';
    del.type = 'button';
    del.textContent = '×';
    del.title = 'Eliminar';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await sb.storage.from(BUCKET).remove([item.name]);
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

videoInput.addEventListener('change', async () => {
  if (!unlocked || !sb) return;
  const files = Array.from(videoInput.files || []);
  for (const file of files) {
    if (file && file.type.startsWith('video/')) {
      const safe = file.name.replace(/[^\w.\-]/g, '_');
      const path = `${Date.now()}-${safe}`;
      try {
        const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (error) throw error;
      } catch (err) {
        console.error('Error al guardar video:', err);
      }
    }
  }
  videoInput.value = '';
  loadVideos();
});

