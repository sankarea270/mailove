# Bóveda de videos con Cloudflare R2 + Worker

El Worker (`vault-worker.js`) es el "candado": recibe la contraseña, la valida
contra un secreto y da acceso a los videos guardados en R2 (10 GB gratis).
La contraseña **no** vive en el código del sitio.

## Pasos (todo desde el panel de Cloudflare, sin instalar nada)

### 1. Cuenta y R2
1. Crea cuenta gratis en https://dash.cloudflare.com
2. Menú **R2** → **Create bucket** → nombre: `mailove-videos`.
   - Nota: R2 pide una tarjeta para activarse, pero **no cobra** dentro del
     nivel gratis (10 GB de almacenamiento + lecturas de sobra).

### 2. Crear el Worker
1. **Workers & Pages** → **Create** → **Create Worker** → nombre `mailove-vault` → **Deploy**.
2. **Edit code** → borra lo que haya y pega TODO el contenido de
   `worker/vault-worker.js` → **Deploy**.

### 3. Conectar R2 al Worker
Worker → **Settings** → **Bindings** → **Add binding** → **R2 bucket**:
- Variable name: `VIDEOS`  (exactamente así)
- R2 bucket: `mailove-videos`
- **Save and deploy**

### 4. Secretos y variable
Worker → **Settings** → **Variables and Secrets** → añade:
| Nombre | Tipo | Valor |
|---|---|---|
| `VAULT_PASSWORD` | Secret | la contraseña que ella escribirá |
| `AUTH_SECRET` | Secret | `ad317951ce98e5fc258cd0b68a9e2666c4d58cd29a2f5e2314becf682603fa6b` |
| `ALLOWED_ORIGIN` | Text | `https://sankarea270.github.io` |

Luego **Deploy** de nuevo.

### 5. Conectar el sitio al Worker
1. Copia la URL del Worker (arriba en su página), algo como
   `https://mailove-vault.TU-SUBDOMINIO.workers.dev`
2. Pégala en `vault.js`, en `WORKER_URL` (¡sin barra `/` al final!).
3. Sube los cambios a GitHub.

## Subir videos
- **Grandes (>100 MB):** arrástralos al bucket desde el panel de **R2** (o con
  `wrangler r2 object put`). El navegador tiene un tope de ~100 MB por subida.
- **Clips pequeños:** desde la web, tras poner la contraseña, con "Guardar video".
- Consejo: comprime con HandBrake (gratis) para que pesen y carguen menos.

## Seguridad
- La contraseña es un **secreto del Worker** (no está en el sitio).
- Sin la contraseña, R2 no entrega ningún video (el bucket es privado).
- El token dura 7 días; para revocar todo, cambia `AUTH_SECRET` y redeploy.
