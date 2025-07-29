const canvas    = document.getElementById('petal-canvas');
const ctx       = canvas.getContext('2d');
let width = 0, height = 0, petalAspect = 1;
const petals    = [];
const numPetals = 40;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr  = window.devicePixelRatio || 1;

  canvas.width  = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.width  = rect.width  + 'px';
  canvas.style.height = rect.height + 'px';

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  width  = rect.width;
  height = rect.height;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const petalImg = new Image();
petalImg.src   = 'rosa.png';

function createPetal(initY = null) {
  const size = 20 + Math.random() * 60;
  return {
    x:        Math.random() * width,
    y:        initY !== null ? initY : -size,
    size,
    speed:    0.5 + Math.random() * 1.5,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.02,
    angle:    Math.random() * Math.PI * 2,
  };
}

petalImg.onload = () => {
  petalAspect = petalImg.naturalWidth / petalImg.naturalHeight;
  resizeCanvas();

  for (let i = 0; i < numPetals; i++) {
    petals.push(createPetal(Math.random() * -height));
  }

  gsap.ticker.add(updateFrame);
};

function updateFrame() {
  ctx.clearRect(0, 0, width, height);

  petals.forEach(p => {
    p.y += p.speed;
    p.rotation += p.rotSpeed;
    p.x += Math.sin(p.angle) * 0.5;
    p.angle += 0.01;

    if (p.y - p.size > height) {
      Object.assign(p, createPetal(-p.size));
    }

    const w = p.size;
    const h = w / petalAspect;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.drawImage(petalImg, -w/2, -h/2, w, h);
    ctx.restore();
  });
}