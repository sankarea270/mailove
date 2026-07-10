// vault.js

const SECRET_PASSWORD = 'shiro';

const secretInput   = document.getElementById('secret-input');
const videoVault    = document.getElementById('video-vault');
const videoInput    = document.getElementById('video-input');
const videoList     = document.getElementById('video-list');
const playerWrap    = document.getElementById('video-player-wrap');
const videoPlayer   = document.getElementById('video-player');

let unlocked = false;

secretInput.addEventListener('input', () => {
  if (unlocked) return;
  if (secretInput.value.trim().toLowerCase() === SECRET_PASSWORD) {
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
});

const DB_NAME = 'mailove-vault';
const STORE   = 'videos';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  return dbPromise;
}

async function saveVideo(file) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({
      name: file.name,
      type: file.type,
      blob: file,
      created: Date.now()
    });
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function getAllVideos() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const items = req.result.sort((a, b) => b.created - a.created);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

async function deleteVideo(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function loadVideos() {
  videoList.innerHTML = '';
  playerWrap.classList.add('is-hidden');
  videoPlayer.pause();
  videoPlayer.removeAttribute('src');

  let videos = [];
  try {
    videos = await getAllVideos();
  } catch (err) {
    console.error('Error al leer videos:', err);
  }

  if (videos.length === 0) {
    const empty = document.createElement('p');
    empty.id = 'vault-empty';
    empty.textContent = 'Aún no hay videos. Guarda uno para empezar.';
    videoList.appendChild(empty);
    return;
  }

  const empty = document.getElementById('vault-empty');
  if (empty) empty.remove();

  videos.forEach(item => {
    const card = document.createElement('div');
    card.className = 'video-thumb';

    const url = URL.createObjectURL(item.blob);
    const preview = document.createElement('video');
    preview.src = url;
    preview.muted = true;
    preview.playsInline = true;

    const name = document.createElement('div');
    name.className = 'video-name';
    name.textContent = item.name || 'video';

    const del = document.createElement('button');
    del.className = 'video-delete';
    del.type = 'button';
    del.textContent = '×';
    del.title = 'Eliminar';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteVideo(item.id);
      URL.revokeObjectURL(url);
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
  });
}

videoInput.addEventListener('change', async () => {
  const files = Array.from(videoInput.files || []);
  for (const file of files) {
    if (file && file.type.startsWith('video/')) {
      try {
        await saveVideo(file);
      } catch (err) {
        console.error('Error al guardar video:', err);
      }
    }
  }
  videoInput.value = '';
  loadVideos();
});
