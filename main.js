/* ==========================================================
   Kozei STUDIO — JavaScript
   Módulos:
   1. Configuración y utilidades
   2. Iconos (SVG en línea)
   3. Texto dividido en palabras
   4. Aparición al hacer scroll
   5. Encabezado, menú móvil, progreso y navegación activa
   6. Texto con opacidad ligada al scroll
   7. Hero: parallax, mascota y paleta
   8. Efectos de tarjetas y botones
   9. Enlaces de WhatsApp
   10. Inscripción a cursos (inscripcion.html)
   ========================================================== */

(() => {
  "use strict";

  /* ---------- 1. Configuración y utilidades ---------- */
  const CONFIG = {
    whatsapp: "5353850111", // número de WhatsApp (sin + ni espacios)
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    canHover: window.matchMedia("(hover: hover)").matches,
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /* ---------- 2. Iconos ---------- */
  const svg = (inner) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  const ICONS = {
    logo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v16M7 12l9-8M7 12l9 8"/></svg>`,
    arrow: svg(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
    check: svg(`<path d="M5 12.5l4.5 4.5L19 7.5"/>`),
    chat: svg(`<path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z"/>`),
    calendar: svg(`<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>`),
    clock: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`),
    award: svg(`<circle cx="12" cy="9" r="6"/><path d="M8.5 14.5L7 22l5-3 5 3-1.5-7.5"/>`),
    tag: svg(`<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>`),
    file: svg(`<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>`),
    video: svg(`<rect x="2" y="5" width="14" height="14" rx="3"/><path d="M16 10l6-3v10l-6-3z"/>`),
    users: svg(`<path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/>`),
    briefcase: svg(`<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18"/>`),
    globe: svg(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>`),
    store: svg(`<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0"/>`),
    sliders: svg(`<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>`),
    book: svg(`<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21a2 2 0 012-2h13"/>`),
    pen: svg(`<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>`),
    code: svg(`<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>`),
        palette: svg(`<path d="M12 3a9 9 0 100 18c1.5 0 2-1 2-2 0-1-.7-1.3-.7-2.2 0-.9.7-1.8 1.8-1.8H18a3 3 0 003-3c0-5-4-9-9-9z"/><circle cx="7.5" cy="10.5" r="1.2"/><circle cx="10.5" cy="6.8" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/><circle cx="17.5" cy="11" r="1.2"/>`),
    camera: svg(`<path d="M4 7h3l2-3h6l2 3h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"/><circle cx="12" cy="13" r="4"/>`),
    target: svg(`<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>`),
        sparkles: svg(`<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.9 2.6L22.5 18l-2.6.9L19 21.5l-.9-2.6L15.5 18l2.6-.9z"/>`),
    mic: svg(`<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v4M8 22h8"/>`),
    phone: svg(`<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/>`),
  };

  // Inserta el icono indicado en cada elemento con data-icon="nombre"
  $$("[data-icon]").forEach((el) => {
    const icon = ICONS[el.dataset.icon];
    if (icon) el.innerHTML = icon;
  });

  // Si img/logo.png no carga, se muestra la "K" de respaldo
  $$(".brand__mark img").forEach((img) => {
    const fallback = () => {
      img.parentElement.classList.add("is-fallback");
      img.parentElement.innerHTML = ICONS.logo;
    };
    if (img.complete && img.naturalWidth === 0) fallback();
    else img.addEventListener("error", fallback, { once: true });
  });

  /* ---------- 3. Texto dividido en palabras ---------- */
  /**
   * Convierte un elemento con [data-split] en palabras que "suben" desde una
   * máscara. Conserva las clases de los <span> internos (por ejemplo .muted).
   */
  function splitText(el) {
    const label = el.textContent.trim().replace(/\s+/g, " ");
    const words = [];

    el.childNodes.forEach((node) => {
      const cls = node.nodeType === 1 ? node.className : "";
      node.textContent.split(/\s+/).filter(Boolean).forEach((text) => words.push({ text, cls }));
    });

    el.setAttribute("aria-label", label); // accesibilidad
    el.textContent = "";

    words.forEach(({ text, cls }, i) => {
      const outer = document.createElement("span");
      outer.className = "split-word";
      outer.setAttribute("aria-hidden", "true");

      const inner = document.createElement("span");
      inner.className = `split-inner ${cls}`.trim();
      inner.style.setProperty("--i", i);
      inner.textContent = text;

      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }

  $$("[data-split]").forEach(splitText);

  /* ---------- 4. Aparición al hacer scroll ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
  );

  $$("[data-split], .reveal, [data-card]").forEach((el) => revealObserver.observe(el));

  // Tarjetas: entrada escalonada dentro de cada grupo
  $$(".courses, .features, .services, .plans__grid, .perks").forEach((group) => {
    $$("[data-card]", group).forEach((card, i) => card.style.setProperty("--d", `${i * 0.12}s`));
  });

  // El hero ya está visible al cargar: su animación arranca sin esperar al scroll
  setTimeout(() => {
    $$(".hero [data-split], .hero .reveal").forEach((el) => el.classList.add("is-in"));
  }, 150);

  /* ---------- 5. Encabezado, menú móvil, progreso y navegación activa ---------- */
  const header = $("#header");
  const fab = $("#fab");
  const progressBar = $("#progressBar");
  const nav = $("#nav");
  const menuToggle = $("#menuToggle");

  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
    if (fab) fab.classList.toggle("is-visible", window.scrollY > 500);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  }

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }

  menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  // Marca el enlace de la sección que cruza el centro de la pantalla
  const navLinks = $$(".nav__link");
  const railLinks = $$(".rail a");
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        if (fab) fab.classList.toggle("is-hidden", id === "contacto");
        navLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.section.split(" ").includes(id)));
        railLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.target === id));
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  $$("main section[id]").forEach((s) => sectionObserver.observe(s));

  /* ---------- 6. Texto con opacidad ligada al scroll ---------- */
  const scrollText = $("#scrollText");
  const chars = [];

  if (scrollText) {
    const text = scrollText.textContent.trim().replace(/\s+/g, " ");
    scrollText.textContent = "";
    scrollText.setAttribute("aria-label", text);

    text.split(" ").forEach((wordText, w, arr) => {
      const word = document.createElement("span");
      word.className = "word";
      word.setAttribute("aria-hidden", "true");
      [...wordText].forEach((ch) => {
        const c = document.createElement("span");
        c.className = "char";
        c.textContent = ch;
        word.appendChild(c);
        chars.push(c);
      });
      scrollText.appendChild(word);
      if (w < arr.length - 1) scrollText.appendChild(document.createTextNode(" "));
    });
  }

  function updateScrollText() {
    if (!scrollText || CONFIG.reducedMotion) return;
    const rect = scrollText.getBoundingClientRect();
    const vh = window.innerHeight;
    // Progreso: 0 cuando el párrafo entra al 85 % del viewport, 1 cuando llega al 35 %
    const start = vh * 0.85;
    const end = vh * 0.35 - rect.height;
    const progress = clamp((start - rect.top) / (start - end), 0, 1);

    chars.forEach((c, i) => {
      const p = i / chars.length;
      const local = clamp((progress * 1.15 - (p - 0.1)) / 0.15, 0, 1);
      c.style.opacity = (0.2 + 0.8 * local).toFixed(3);
    });
  }

  // Proceso: los pasos se encienden y la línea se llena al avanzar el scroll
  const stepsWrap = $("#steps");
  const steps = $$(".step");

  function updateSteps() {
    if (!stepsWrap) return;
    if (CONFIG.reducedMotion) {
      steps.forEach((s) => s.classList.add("is-on", "is-done"));
      return;
    }
    const r = stepsWrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = clamp((vh * 0.85 - r.top) / (r.height * 0.7 + vh * 0.25), 0, 1);
    const count = Math.min(steps.length, Math.ceil(p * steps.length));
    steps.forEach((s, i) => {
      s.classList.toggle("is-on", i < count);
      s.classList.toggle("is-done", i < count - 1);
    });
  }

  // Un solo listener de scroll, limitado a un cuadro de animación
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateHeader();
        updateScrollText();
        updateSteps();
        ticking = false;
      });
    },
    { passive: true }
  );
  updateHeader();
  updateScrollText();
  updateSteps();

  /* ---------- 7. Hero: parallax, mascota y paleta ---------- */
  const hero = $(".hero");
  const stage = $("#stage");

  // La maqueta del hero solo existe en index.html
  if (hero && stage) {
  // 7.1 Parallax y foco de luz que siguen al cursor
  if (CONFIG.canHover && !CONFIG.reducedMotion) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      stage.style.setProperty("--px", (x - 0.5).toFixed(3));
      stage.style.setProperty("--py", (y - 0.5).toFixed(3));
      hero.style.setProperty("--sx", `${e.clientX - r.left}px`);
      hero.style.setProperty("--sy", `${e.clientY - r.top}px`);
    });
    hero.addEventListener("pointerleave", () => {
      stage.style.setProperty("--px", 0);
      stage.style.setProperty("--py", 0);
    });
  }

  // 7.2 Mascota: si img/cat.png no carga, se muestra la "K" de respaldo
  const mascot = $("#mascot");
  const catBox = $("#catBox");
  if (mascot) {
    const fallback = () => {
      const box = document.createElement("div");
      box.className = "mascot-fallback";
      box.innerHTML = ICONS.logo;
      mascot.replaceWith(box);
    };
    if (mascot.complete && mascot.naturalWidth === 0) fallback();
    else mascot.addEventListener("error", fallback, { once: true });
  }

  // 7.3 Globo de diálogo: cambia de mensaje (al tocarlo o tocando a la mascota)
  const bubble = $("#bubble");
  const bubbleText = $("#bubbleText");
  const MESSAGES = [
    "¡Miau! ¿Qué creamos hoy?",
    "Yo cuido tu marca.",
    "Tu web, lista para el celular.",
    "¿Y si lo haces tú? Mira los cursos.",
    "Escríbenos por WhatsApp.",
  ];
  let msg = 0;

  function nextMessage() {
    msg = (msg + 1) % MESSAGES.length;
    bubbleText.textContent = MESSAGES[msg];
    bubble.classList.remove("is-pop");
    void bubble.offsetWidth; // reinicia la animación
    bubble.classList.add("is-pop");
    if (catBox && !CONFIG.reducedMotion) {
      catBox.classList.remove("is-hop");
      void catBox.offsetWidth;
      catBox.classList.add("is-hop");
    }
  }
  if (bubble) bubble.addEventListener("click", nextMessage);
  if (catBox) catBox.addEventListener("click", nextMessage);

  // 7.4 Paleta: cambia el color del arco detrás de la mascota
  const swatches = $$(".swatch");
  swatches.forEach((btn) => {
    btn.addEventListener("click", () => {
      stage.style.setProperty("--brand", btn.dataset.brand);
      stage.style.setProperty("--brand-2", btn.dataset.brand2);
      swatches.forEach((s) => {
        const active = s === btn;
        s.classList.toggle("is-active", active);
        s.setAttribute("aria-pressed", String(active));
      });
    });
  });

  }

  /* ---------- 8. Efectos de tarjetas y botones ---------- */
  // Resplandor que sigue al cursor dentro de cada tarjeta
  $$("[data-card]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  // Botones "magnéticos": se acercan suavemente al cursor
  if (CONFIG.canHover && !CONFIG.reducedMotion) {
    $$(".btn--magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.16;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.26;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener("pointerleave", () => (btn.style.transform = ""));
    });
  }

  /* ---------- 9. Enlaces de WhatsApp y selector de necesidad ---------- */
  const waLink = (message) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;

  $$("[data-wa]").forEach((link) => {
    link.href = waLink(link.dataset.wa);
  });

  // Contacto: al elegir qué necesitas, el botón abre WhatsApp con ese mensaje
  const NEEDS = {
    web: "Hola, quiero una página web para mi negocio.",
    tienda: "Hola, quiero una tienda online para mi negocio.",
    curso: "Hola, quiero información sobre los cursos de Kozei STUDIO.",
    otro: "Hola, tengo una consulta para Kozei STUDIO.",
  };
  const contactBtn = $("#contactBtn");
  const picks = $$(".pick");

  picks.forEach((pick) => {
    pick.addEventListener("click", () => {
      picks.forEach((p) => p.setAttribute("aria-pressed", String(p === pick)));
      contactBtn.href = waLink(NEEDS[pick.dataset.need]);
    });
  });

  // Cuenta atrás hasta el inicio del curso (1 de diciembre)
  const countdown = $("#countdown");
  if (countdown) {
    const start = new Date(2026, 11, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((start - today) / 86400000);
    if (days > 1) countdown.innerHTML = `<span class="pill__count-pre">Faltan </span>${days} días`;
    else if (days === 1) countdown.textContent = "Empieza mañana";
    else if (days === 0) countdown.textContent = "Empieza hoy";
    else countdown.remove();
  }

  // Año actual en el pie de página
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- 10. Inscripción a cursos (inscripcion.html) ---------- */
  // Datos de pago por Transfermóvil. Si "card" queda vacío, la página
  // pide el número de tarjeta por WhatsApp.
  const PAYMENT = {
    method: "Transfermóvil",
    card: "9224 9598 7903 4211", // tarjeta que recibe la transferencia
    confirmPhone: "53850111",    // número a confirmar en Transfermóvil
    holder: "",                  // nombre del titular (opcional)
    note: "Guarda la captura de la transferencia terminada: nos la envías por WhatsApp.",
  };

  // Para abrir una nueva edición: pon open en true y actualiza start y duration.
  // El enlace de cada curso es inscripcion.html?curso=<clave>
  const COURSES = {
    "diseno-grafico": {
      open: true,
      title: "Diseño gráfico básico para emprendedores",
      text: "Aprende los fundamentos del diseño para que tus publicaciones, tu logo y tus materiales se vean profesionales.",
      start: "1 de diciembre",
      duration: "1 semana",
      finish: { label: "Al terminar", value: "Certificado", icon: "award" },
      price: "2,000 CUP",
      // PDF con el detalle del contenido. Cambia el nombre si tu archivo se llama distinto.
      pdf: {
        url: "documents/Diseno-grafico-para-emprendedores.pdf",
        label: "Descargar contenido detallado (PDF)",
      },
      topics: [
        "Qué es la identidad visual",
        "Logotipo y versiones",
        "Paleta de colores",
        "Tipografías y cómo combinarlas",
        "Composición y jerarquía",
        "Cómo hacer posts profesionales",
        "Mini manual de marca",
      ],
    },
    "claude-basico": {
      open: false,
      title: "Aprende Claude Básico",
      closedText: "Las inscripciones de esta edición están cerradas. Habrá una nueva edición a mediados de diciembre.",
      text: "Aprende desde cero a usar Claude: crea tu cuenta, conecta tus herramientas, configura skills y escribe prompts que funcionan.",
      start: "Por confirmar",
      duration: "3 días",
      finish: { label: "Modalidad", value: "Online", icon: "globe" },
      price: "1,000 CUP",
      topics: [
        "Qué es Claude",
        "Crear tu cuenta en Claude",
        "Qué son los conectores y en qué nos ayudan",
        "Cómo configurarlos",
        "Qué son las Skills, cómo nos ayudan y cómo configurarlas",
        "Cómo crear prompts funcionales para Claude",
      ],
    },
  };

  const enrollForm = $("#enrollForm");
  if (enrollForm) {
    const key = new URLSearchParams(location.search).get("curso");
    const course = COURSES[key];
    const ico = (name) => `<span class="icon">${ICONS[name] || ""}</span>`;

    if (!course || !course.open) {
      // Curso inexistente o cerrado: se explica y se ofrece volver o avisar
      $("#enrollGrid").hidden = true;
      $("#enrollClosed").hidden = false;
      $("#closedTitle").textContent = course ? course.title : "No encontramos ese curso";
      $("#closedText").textContent = course
        ? course.closedText || "Las inscripciones de este curso están cerradas."
        : "Revisa el enlace o elige uno de los cursos abiertos.";
      const notify = $("#closedNotify");
      if (course) notify.href = waLink(`Hola, quiero que me avisen cuando abra la nueva edición de ${course.title}.`);
      else notify.remove();
      document.title = "Curso no disponible | Kozei STUDIO";
    } else {
      document.title = `Inscripción: ${course.title} | Kozei STUDIO`;

      // Información del curso
      $("#courseTitle").textContent = course.title;
      $("#courseText").textContent = course.text;
      const facts = [
        ["calendar", "Comienza", course.start],
        ["clock", "Duración", course.duration],
        [course.finish.icon, course.finish.label, course.finish.value],
        ["tag", "Precio", course.price],
      ];
      $("#courseFacts").innerHTML = facts
        .map(([icon, label, value]) => `<li>${ico(icon)}<div><small>${label}</small><strong>${value}</strong></div></li>`)
        .join("");
      $("#courseTopics").innerHTML = course.topics.map((t) => `<li>${ico("check")}${t}</li>`).join("");

      // Documento PDF con más detalles (solo si el curso tiene uno)
      const docBox = $("#courseDoc");
      if (course.pdf && docBox) {
        const link = $("#courseDocLink");
        link.href = encodeURI(course.pdf.url);
        link.setAttribute("download", course.pdf.url.split("/").pop());
        $("#courseDocLabel").textContent = course.pdf.label || "Descargar PDF";
        docBox.hidden = false;
      }

      // Pago por Transfermóvil
      $("#payAmount").textContent = course.price;
      const cardBox = $("#payCard");
      if (PAYMENT.card) {
        $("#payNumber").textContent = PAYMENT.card;
        $("#payHolder").textContent = PAYMENT.holder;
        $("#payConfirm").textContent = PAYMENT.confirmPhone ? `Número a confirmar: ${PAYMENT.confirmPhone}` : "";
        $("#payCopy").addEventListener("click", async () => {
          const btn = $("#payCopy");
          try {
            await navigator.clipboard.writeText(PAYMENT.card.replace(/\s+/g, ""));
            btn.textContent = "Copiado";
          } catch (err) {
            btn.textContent = "Cópiala a mano";
          }
          setTimeout(() => (btn.textContent = "Copiar número"), 2200);
        });
      } else {
        cardBox.innerHTML = `<span class="pay__number pay__number--pending">Escríbenos por WhatsApp y te enviamos el número de tarjeta.</span>`;
      }
      $("#payNote").textContent = PAYMENT.note;

      // Formulario
      const fields = {
        name: { el: $("#fName"), test: (v) => v.length >= 5, msg: "Escribe tu nombre y apellidos." },
        phone: { el: $("#fPhone"), test: (v) => v.replace(/\D/g, "").length >= 8, msg: "Escribe un número de WhatsApp válido." },
        province: { el: $("#fProvince"), test: (v) => v.length >= 3, msg: "Escribe tu provincia." },
        email: { el: $("#fEmail"), test: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: "Revisa el correo electrónico." },
      };
      const agree = $("#fAgree");

      const setError = (wrap, message) => {
        wrap.classList.toggle("is-invalid", Boolean(message));
        wrap.querySelector(".field__error").textContent = message || "";
      };

      Object.values(fields).forEach(({ el, test, msg }) => {
        el.addEventListener("input", () => {
          if (el.closest(".field").classList.contains("is-invalid")) setError(el.closest(".field"), test(el.value.trim()) ? "" : msg);
        });
      });

      enrollForm.addEventListener("submit", (e) => {
        e.preventDefault();
        let firstInvalid = null;

        Object.values(fields).forEach(({ el, test, msg }) => {
          const ok = test(el.value.trim());
          setError(el.closest(".field"), ok ? "" : msg);
          if (!ok && !firstInvalid) firstInvalid = el;
        });
        const agreeWrap = agree.closest(".field");
        setError(agreeWrap, agree.checked ? "" : "Marca esta casilla para continuar.");
        if (!agree.checked && !firstInvalid) firstInvalid = agree;

        if (firstInvalid) {
          firstInvalid.focus();
          return;
        }

        const lines = [
          `Hola, quiero inscribirme en el curso *${course.title}* (comienza el ${course.start}).`,
          "",
          `Nombre: ${fields.name.el.value.trim()}`,
          `WhatsApp: ${fields.phone.el.value.trim()}`,
          `Provincia: ${fields.province.el.value.trim()}`,
        ];
        const email = fields.email.el.value.trim();
        if (email) lines.push(`Correo: ${email}`);
        lines.push("", `Pago: ${course.price} por ${PAYMENT.method}. Te envío la captura a continuación.`);

        const url = waLink(lines.join("\n"));
        const submit = $("#enrollSubmit");
        submit.disabled = true;
        $("#enrollFallbackLink").href = url;
        $("#enrollFallback").hidden = false;
        window.location.href = url;
        setTimeout(() => (submit.disabled = false), 4000);
      });
    }
  }
})();
