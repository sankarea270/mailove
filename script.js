document.addEventListener('DOMContentLoaded', () => {

  gsap.registerPlugin(TextPlugin);

  const overlay = document.getElementById('overlay');
  const heart = document.getElementById('heart');
  const title = document.getElementById('overlay-title');
  const mainContent = document.getElementById('main-content');
  const modelContainer = document.getElementById('model-container');
  const audio = document.getElementById('bg-music');

  gsap.set([title, heart], { autoAlpha: 0, scale: 1 });
  gsap.set([mainContent, modelContainer], { autoAlpha: 0 });

  if (localStorage.getItem('mailove_proposal') === 'aceptado') {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'auto';
    modelContainer.style.display = 'block';
    gsap.to(modelContainer, { duration: 0.5, autoAlpha: 1 });
    mainContent.style.display = 'block';
    gsap.to(mainContent, { duration: 0.5, autoAlpha: 1 });
    reproducirMusica(audio);
    initContador();
    animatePoema();
    initNarrativas();
    return;
  }

  gsap.to(title, { duration: 1, delay: 0.2, autoAlpha: 1 });
  gsap.to(heart, {
    duration: 1,
    delay: 0.5,
    scale: 1,
    autoAlpha: 1,
    ease: 'back.out(1.7)'
  });

  setTimeout(() => {
    heart.style.cursor = 'pointer';
    heart.addEventListener('click', handleHeartClick);
  }, 2000);

  function handleHeartClick() {
    heart.removeEventListener('click', handleHeartClick);

    gsap.to([heart, title], {
      duration: 0.4,
      scale: 2,
      autoAlpha: 0,
      ease: 'power2.in',
      stagger: 0.1,
      onComplete: showProposal
    });
  }

  function showProposal() {
    overlay.innerHTML = `
      <div class="proposal-wrap">
        <h1 class="proposal-title">Mi princesa,</h1>
        <p class="proposal-question">¿puedo ser tu novio?</p>
        <div class="proposal-buttons">
          <button id="btn-si">Sí</button>
          <button id="btn-no">No</button>
        </div>
      </div>
    `;

    const btnSi = document.getElementById('btn-si');
    const btnNo = document.getElementById('btn-no');

    gsap.set([btnSi, btnNo], { autoAlpha: 0 });
    gsap.to('.proposal-title', { duration: 0.8, autoAlpha: 1 });
    gsap.to('.proposal-question', { duration: 0.8, delay: 0.3, autoAlpha: 1 });
    gsap.to([btnSi, btnNo], { duration: 0.6, delay: 0.8, autoAlpha: 1, stagger: 0.1 });

    function moverNo() {
      const w = window.innerWidth - 140;
      const h = window.innerHeight - 60;
      btnNo.style.position = 'fixed';
      btnNo.style.left = Math.random() * w + 'px';
      btnNo.style.top = Math.random() * h + 'px';
      btnNo.style.transition = 'left 0.12s, top 0.12s';
      btnNo.style.zIndex = '1001';
    }

    btnNo.addEventListener('mouseenter', moverNo);
    btnNo.addEventListener('touchstart', (e) => { e.preventDefault(); moverNo(); });
    btnNo.addEventListener('click', moverNo);

    btnSi.addEventListener('click', () => {
      localStorage.setItem('mailove_proposal', 'aceptado');
      gsap.to('.proposal-wrap', {
        duration: 0.3,
        autoAlpha: 0,
        onComplete: showAccepted
      });
    });
  }

  function showAccepted() {
    overlay.innerHTML = `
      <h1 class="accepted-text">Sabía que dirías que sí</h1>
    `;

    gsap.set('.accepted-text', { autoAlpha: 0, scale: 0.5 });
    gsap.to('.accepted-text', {
      duration: 0.6,
      autoAlpha: 1,
      scale: 1,
      ease: 'back.out(2)'
    });

    setTimeout(() => {
      gsap.to(overlay, {
        duration: 0.5,
        autoAlpha: 0,
        onComplete: revealContent
      });
    }, 1500);
  }

  function revealContent() {
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'auto';

    modelContainer.style.display = 'block';
    gsap.to(modelContainer, { duration: 0.5, autoAlpha: 1 });
    mainContent.style.display = 'block';
    gsap.to(mainContent, { duration: 0.5, autoAlpha: 1 });

    reproducirMusica(audio);

    initContador();
    animatePoema();
    initNarrativas();
  }
});

// Fecha real desde la que cuenta el contador (vuestro aniversario).
// Cambia esta fecha si quieres que cuente desde otro momento.
const FECHA_INICIO = new Date('2025-07-22T08:10:15Z');

// Reproduce la música; si el navegador bloquea el autoplay (al volver a
// entrar sin haber hecho clic), reintenta en la primera interacción.
function reproducirMusica(audio) {
  const intento = audio.play();
  if (intento && typeof intento.catch === 'function') {
    intento.catch(() => {
      const reanudar = () => {
        audio.play().catch(() => {});
        window.removeEventListener('click', reanudar);
        window.removeEventListener('touchstart', reanudar);
        window.removeEventListener('keydown', reanudar);
      };
      window.addEventListener('click', reanudar);
      window.addEventListener('touchstart', reanudar);
      window.addEventListener('keydown', reanudar);
    });
  }
}

function initNarrativas() {
  const secciones = document.querySelectorAll('.narrative');
  if (!('IntersectionObserver' in window) || secciones.length === 0) {
    secciones.forEach(s => s.classList.add('in-view'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('in-view');
    });
  }, { threshold: 0.35 });
  secciones.forEach(s => obs.observe(s));
}

function initContador() {
  actualizarContador();
  setInterval(actualizarContador, 1000);
}

function actualizarContador() {
  const inicio = FECHA_INICIO;
  const ahora = new Date();

  // Diferencia por componentes de calendario (años/meses reales, sin drift).
  let años    = ahora.getFullYear() - inicio.getFullYear();
  let meses   = ahora.getMonth()    - inicio.getMonth();
  let días    = ahora.getDate()     - inicio.getDate();
  let horas   = ahora.getHours()    - inicio.getHours();
  let minutos = ahora.getMinutes()  - inicio.getMinutes();
  let segundos = ahora.getSeconds() - inicio.getSeconds();

  if (segundos < 0) { segundos += 60; minutos--; }
  if (minutos < 0)  { minutos += 60; horas--; }
  if (horas < 0)    { horas += 24; días--; }
  if (días < 0) {
    // días del mes anterior al actual
    const diasMesPrevio = new Date(ahora.getFullYear(), ahora.getMonth(), 0).getDate();
    días += diasMesPrevio;
    meses--;
  }
  if (meses < 0) { meses += 12; años--; }

  const texto =
    `${años} años ${meses} meses ${días} días ` +
    `${horas} horas ${minutos} minutos ${segundos} segundos amándote mi princesa`;

  document.querySelector('#counter p').textContent = texto;
}

function animatePoema() {

  gsap.to('#poem-container', {
    duration: 1,
    autoAlpha: 1,
    delay: 0.5
  });

  const versos = [
    "You remind me of the color blue,",
    "girl, I'm so in love with you.",
    "Para mí, tú eres mi color azul,",
    "y aun en la distancia, sigues siendo mi calma."
  ];

  const lines = document.querySelectorAll('#poem .line');
  const tl = gsap.timeline({ delay: 1.5 });

  lines.forEach((el, i) => {
    tl.to(el, {
        duration: versos[i].length * 0.05,
        text: versos[i],
        ease: 'none',
        autoAlpha: 1
      })
      .to(el, {
        duration: 0.3,
        text: versos[i],
        ease: 'power2.inOut'
      }, '+=0.5');
  });
}
