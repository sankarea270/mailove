// cursor.js — cursor de corazón morado + corazones en doble clic (diseños que ciclan)

(function () {
  const NUM_DESIGNS = 5;
  let uid = 0;
  const heartPath =
    "M16 28 C16 28 1 18 1 9 C1 3.5 5 1 9 1 C12 1 15 3 16 5 " +
    "C17 3 20 1 23 1 C27 1 31 3.5 31 9 C31 18 16 28 16 28 Z";

  function pixelHeart(color) {
    const cols = 7, rows = 6, cw = 32 / cols, ch = 29 / rows;
    const map = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
    let r = "";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (map[y][x] === "1") {
          r += `<rect x="${(x * cw).toFixed(2)}" y="${(y * ch).toFixed(2)}" ` +
               `width="${(cw - 0.8).toFixed(2)}" height="${(ch - 0.8).toFixed(2)}" ` +
               `rx="2" fill="${color}"/>`;
        }
      }
    }
    return r;
  }

  function heartSVG(design) {
    const id = "hg" + (uid++);
    let inner = "";
    if (design === 0) {
      inner = `<defs><radialGradient id="${id}" cx="0.35" cy="0.3" r="0.85">` +
        `<stop offset="0" stop-color="#e9c6ff"/><stop offset="0.5" stop-color="#b15cff"/>` +
        `<stop offset="1" stop-color="#7b2cbf"/></radialGradient></defs>` +
        `<path d="${heartPath}" fill="url(#${id})"/>`;
    } else if (design === 1) {
      inner = `<path d="${heartPath}" fill="none" stroke="#c77dff" stroke-width="3"/>`;
    } else if (design === 2) {
      inner = pixelHeart("#b15cff");
    } else if (design === 3) {
      inner = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="#c77dff"/><stop offset="1" stop-color="#6a0dad"/>` +
        `</linearGradient></defs>` +
        `<path d="${heartPath}" fill="url(#${id})"/>` +
        `<path d="${heartPath}" fill="none" stroke="#e9c6ff" stroke-width="1.4" ` +
        `transform="translate(16 14) scale(0.55) translate(-16 -14)"/>`;
    } else {
      inner = `<defs><radialGradient id="${id}" cx="0.4" cy="0.35" r="0.9">` +
        `<stop offset="0" stop-color="#f3c4ff"/><stop offset="1" stop-color="#9d4edd"/>` +
        `</radialGradient></defs>` +
        `<path d="${heartPath}" fill="url(#${id})"/>` +
        `<circle cx="11" cy="8" r="1.6" fill="#ffffff" opacity="0.9"/>` +
        `<circle cx="21" cy="11" r="1.2" fill="#ffffff" opacity="0.7"/>`;
    }
    return `<svg viewBox="0 0 32 29" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${inner}</svg>`;
  }

  const cursor = document.createElement("div");
  cursor.id = "heart-cursor";
  cursor.innerHTML = heartSVG(0);
  document.body.appendChild(cursor);

  let tx = window.innerWidth / 2, ty = window.innerHeight / 2, cx = tx, cy = ty;
  window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; });

  (function loop() {
    cx += (tx - cx) * 0.25;
    cy += (ty - cy) * 0.25;
    cursor.style.left = cx + "px";
    cursor.style.top = cy + "px";
    requestAnimationFrame(loop);
  })();

  let designIdx = 0;
  window.addEventListener("dblclick", (e) => {
    const h = document.createElement("div");
    h.className = "burst-heart";
    h.innerHTML = heartSVG(designIdx % NUM_DESIGNS);
    h.style.left = e.clientX + "px";
    h.style.top = e.clientY + "px";
    document.body.appendChild(h);
    h.addEventListener("animationend", () => h.remove());
    designIdx++;
  });
})();
