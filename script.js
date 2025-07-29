// script.js


document.addEventListener('DOMContentLoaded', () => {

  gsap.registerPlugin(TextPlugin);


  const overlay     = document.getElementById('overlay');
  const heart       = document.getElementById('heart');
  const title       = overlay.querySelector('h1');
  const mainContent = document.getElementById('main-content');
  const audio       = document.getElementById('bg-music');

  gsap.set([title, heart],    { autoAlpha: 0, scale: 1 });
  gsap.set(mainContent,        { autoAlpha: 0 });

  gsap.to(title, { duration: 1, delay: 0.2, autoAlpha: 1 });
  gsap.to(heart, {
    duration: 1,
    delay:    0.5,
    scale:    1,
    autoAlpha:1,
    ease:     'back.out(1.7)'
  });

  setTimeout(() => {
    heart.style.cursor = 'pointer';
    heart.addEventListener('click', handleClick);
  }, 2000);

  function handleClick() {
    heart.removeEventListener('click', handleClick);

    gsap.to([heart, title], {
      duration: 0.4,
      scale:    2,
      autoAlpha:0,
      ease:     'power2.in',
      stagger:  0.1
    });

    gsap.to(overlay, {
      duration: 0.5,
      delay:    0.6,
      autoAlpha:0,
      onComplete: () => {
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';

        mainContent.style.display = 'block';
        gsap.to(mainContent, { duration: 0.5, autoAlpha: 1 });

        audio.play().catch(err => console.error('Error al reproducir audio:', err));


        initContador();
        animatePoema();
      }
    });
  }
});

function initContador() {
  actualizarContador();
  setInterval(actualizarContador, 1000);
}


function actualizarContador() {
  const fechaInicio  = new Date('2025-07-22T08:10:15Z');
  const ahora        = new Date();
  let diffSegundos   = Math.floor((ahora - fechaInicio) / 1000);

  const años   = Math.floor(diffSegundos / (365 * 24 * 3600));
  diffSegundos -= años * 365 * 24 * 3600;

  const meses  = Math.floor(diffSegundos / (30 * 24 * 3600));
  diffSegundos -= meses * 30 * 24 * 3600;

  const días   = Math.floor(diffSegundos / (24 * 3600));
  diffSegundos -= días * 24 * 3600;

  const horas    = Math.floor(diffSegundos / 3600);
  diffSegundos  -= horas * 3600;

  const minutos  = Math.floor(diffSegundos / 60);
  const segundos = diffSegundos % 60;

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
    "Girl, I’m so in love with you.",
    "Para mi tu eres mi color azul ,",
    "Aunque este lejos espero verte en mis sueños siempre."
  ];

  const lines = document.querySelectorAll('#poem .line');
  const tl    = gsap.timeline({ delay: 1.5 });

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