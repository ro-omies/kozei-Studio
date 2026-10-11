// Menú móvil
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
});

mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menú');
  });
});

// Resalta en el menú la sección que se está viendo
const navLinks = Array.from(mainNav.querySelectorAll('a'));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  sections.forEach((section) => observer.observe(section));
}

// Formulario: arma el mensaje y abre WhatsApp
const WHATSAPP_NUMBER = '5353850111'; // cambia este número si quieres recibir los mensajes en otro

const form = document.getElementById('contactForm');
const formError = document.getElementById('formError');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const nombre = form.nombre.value.trim();
  const mensaje = form.mensaje.value.trim();

  if (!nombre || !mensaje) {
    formError.hidden = false;
    return;
  }

  formError.hidden = true;
  const texto = `Hola, soy ${nombre}. ${mensaje}`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank', 'noopener');
  form.reset();
});

// Año del pie de página
document.getElementById('year').textContent = new Date().getFullYear();

// FAQ: al abrir una pregunta se cierran las demás
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach((item) => {
  item.addEventListener('toggle', () => {
    if (item.open) {
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    }
  });
});