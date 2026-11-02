/* ==========================================================
   Kozei STUDIO · Cursos online · Lógica
   Índice:
   1. Configuración y utilidades
   2. Interfaz: vistas, avisos y ventanas emergentes
   3. Sesión (Supabase Auth)
   4. Enrutador
   5. Acceso, registro y recuperación
   6. Cuenta pendiente de activación
   7. Mis cursos
   8. Curso, reproductor y visor de PDF
   9. Panel de administración: alumnos
   10. Panel de administración: cursos y lecciones
   11. Arranque
   ========================================================== */

(() => {
  "use strict";

  /* ---------- 1. Configuración y utilidades ---------- */
  const USER_CFG = window.KOZEI_CONFIG || {};
  const CFG = {
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
    WHATSAPP: "5353850111",
    STORAGE_BUCKET: "course-files",
    PDF_URL_SECONDS: 300,
    WATERMARK: true,
    SANDBOX_VIDEO: true,
    ...USER_CFG,
    PAYMENT: { method: "Transfermóvil", account: "", holder: "", note: "", ...(USER_CFG.PAYMENT || {}) },
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const configured =
    !!CFG.SUPABASE_URL && !/TU-PROYECTO/i.test(CFG.SUPABASE_URL) &&
    !!CFG.SUPABASE_ANON_KEY && !/^TU_/i.test(CFG.SUPABASE_ANON_KEY);
  const sb = configured && window.supabase ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

  const waLink = (message, number = CFG.WHATSAPP) => `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) : "");

  // Normaliza un número cubano de 8 dígitos al formato internacional
  const cleanPhone = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits.length === 8 ? `53${digits}` : digits;
  };

  const ICONS = {
    logo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M7 12l9-8M7 12l9 8"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>`,
    back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`,
    next: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"/></svg>`,
  };

  const loaderHTML = `<div class="loader" role="status" aria-label="Cargando"><span></span></div>`;
  const emptyHTML = (title, text, actions = "") =>
    `<div class="empty"><h2>${esc(title)}</h2><p>${esc(text)}</p>${actions ? `<div class="actions">${actions}</div>` : ""}</div>`;

  // Traduce los errores técnicos a mensajes comprensibles
  function friendly(err) {
    const msg = (err && (err.message || String(err))) || "";
    if (/invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos.";
    if (/already registered|already been registered/i.test(msg)) return "Ese correo ya tiene una cuenta. Entra con tu contraseña.";
    if (/email not confirmed/i.test(msg)) return "Debes confirmar tu correo antes de entrar. Revisa tu bandeja y la carpeta de spam.";
    if (/password should be at least|weak password/i.test(msg)) return "La contraseña es muy débil. Usa al menos 8 caracteres.";
    if (/rate limit|too many/i.test(msg)) return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    if (/failed to fetch|network|load failed/i.test(msg)) return "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.";
    if (/row-level security|permission denied|not authorized/i.test(msg)) return "No tienes permiso para hacer esto.";
    return msg || "Ocurrió un error. Inténtalo de nuevo.";
  }

  function busy(button, on, label = "Un momento…") {
    if (!button) return;
    if (on) {
      button.dataset.label = button.innerHTML;
      button.innerHTML = label;
      button.disabled = true;
    } else {
      if (button.dataset.label) button.innerHTML = button.dataset.label;
      button.disabled = false;
    }
  }

  /* ---------- 2. Interfaz: vistas, avisos y ventanas emergentes ---------- */
  const state = { session: null, user: null, profile: null, recovery: false };
  let routeToken = 0;

  function showView(name) {
    $$(".view").forEach((view) => (view.hidden = view.id !== `view-${name}`));
  }

  function toast(message, type = "ok") {
    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.textContent = message;
    $("#toasts").appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-in"));
    setTimeout(() => {
      el.classList.remove("is-in");
      setTimeout(() => el.remove(), 400);
    }, 4200);
  }

  const modalEl = $("#modal");
  const modalBox = $("#modalBox");
  let lastFocus = null;
  let modalOnClose = null;

  function openModal({ title, html, size = "md", onMount, onClose }) {
    lastFocus = document.activeElement;
    modalOnClose = onClose || null;
    modalBox.className = `modal__box modal__box--${size}`;
    modalBox.innerHTML = `
      <header class="modal__head">
        <h3>${esc(title)}</h3>
        <button class="icon-btn" type="button" data-close aria-label="Cerrar">×</button>
      </header>
      <div class="modal__body">${html}</div>`;
    modalEl.hidden = false;
    document.body.classList.add("is-modal");
    if (onMount) onMount(modalBox);
    const first = $("input:not([type=hidden]):not([type=checkbox]), textarea", modalBox);
    if (first) first.focus();
  }

  function closeModal() {
    if (modalEl.hidden) return;
    modalEl.hidden = true;
    modalBox.innerHTML = "";
    document.body.classList.remove("is-modal");
    if (modalOnClose) modalOnClose();
    modalOnClose = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl || e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Desalienta el clic derecho sobre el contenido protegido
  document.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".player, .pdfv, .lesson")) e.preventDefault();
  });

  // Logo de respaldo si img/logo.png no carga
  $$(".brand__mark img").forEach((img) => {
    const fallback = () => {
      img.parentElement.classList.add("is-fallback");
      img.parentElement.innerHTML = ICONS.logo;
    };
    if (img.complete && img.naturalWidth === 0) fallback();
    else img.addEventListener("error", fallback, { once: true });
  });

  /* ---------- 3. Sesión (Supabase Auth) ---------- */
  async function loadProfile() {
    if (!state.user) {
      state.profile = null;
      return;
    }
    const { data, error } = await sb.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
    if (error) console.error("No se pudo cargar el perfil:", error);
    state.profile = data || null;
  }

  async function onAuth(event, session) {
    const previousId = state.user ? state.user.id : null;
    state.session = session;
    state.user = session ? session.user : null;

    if (event === "INITIAL_SESSION") return; // lo gestiona init()
    if (event === "PASSWORD_RECOVERY") {
      state.recovery = true;
      route();
      return;
    }
    if (event === "SIGNED_OUT" || !state.user) {
      state.profile = null;
      state.recovery = false;
      if (location.hash !== "#/acceso") history.replaceState(null, "", "#/acceso");
      route();
      return;
    }
    if (event === "SIGNED_IN" && previousId === state.user.id && state.profile) return;
    if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
    await loadProfile();
    route();
  }

  async function logout() {
    if (sb) await sb.auth.signOut();
    state.user = null;
    state.profile = null;
    history.replaceState(null, "", "#/acceso");
    route();
  }

  function renderTopNav() {
    const nav = $("#topNav");
    document.body.classList.toggle("is-logged", !!state.user);
    if (!state.user) {
      nav.innerHTML = `<a class="topbar__link" href="index.html">← Volver al sitio</a>`;
      return;
    }
    const p = state.profile;
    const name = (p && p.full_name) || state.user.email;
    const active = p && p.status === "active";
    const hash = location.hash || "#/";
    nav.innerHTML = `
      ${active ? `<a class="topbar__link ${/^#\/(admin)/.test(hash) ? "" : "is-active"}" href="#/">Mis cursos</a>` : ""}
      ${active && p.role === "admin" ? `<a class="topbar__link ${/^#\/admin/.test(hash) ? "is-active" : ""}" href="#/admin">Panel admin</a>` : ""}
      <span class="topbar__user" title="${esc(state.user.email)}">${esc(name)}</span>
      <button class="btn btn--ghost btn--sm" id="logoutBtn" type="button">Salir</button>`;
    $("#logoutBtn").addEventListener("click", logout);
  }

  /* ---------- 4. Enrutador ---------- */
  function route() {
    stopWatermark();
    renderTopNav();
    const hash = location.hash || "#/";

    if (!configured || !sb) {
      showConfigNotice();
      showView("auth");
      $$("#loginForm button, #registerForm button, #loginForm input, #registerForm input").forEach((el) => (el.disabled = true));
      return;
    }
    if (state.recovery) return showView("recover");
    if (!state.user) {
      showView("auth");
      setAuthTab(/registro/.test(hash) ? "register" : "login");
      return;
    }
    const profile = state.profile;
    if (!profile) return renderProfileMissing();
    if (profile.status !== "active") return renderPending();

    const parts = hash.replace(/^#\/?/, "").split("/");
    if (parts[0] === "curso" && parts[1]) return showCourse(parts[1], parts[2]);
    if (parts[0] === "admin" && profile.role === "admin") return showAdmin();
    return showCourses();
  }

  function showConfigNotice() {
    const box = $("#configNotice");
    box.hidden = false;
    box.innerHTML = !window.supabase && configured
      ? "No se pudo cargar la librería de Supabase. Revisa tu conexión a internet."
      : "Falta conectar la plataforma: abre <code>supabase-config.js</code> y escribe tu <code>SUPABASE_URL</code> y tu <code>SUPABASE_ANON_KEY</code>.";
  }

  /* ---------- 5. Acceso, registro y recuperación ---------- */
  function setAuthMsg(text, type = "") {
    const el = $("#authMsg");
    el.textContent = text || "";
    el.className = `auth__msg ${type ? `is-${type}` : ""}`;
  }

  function setAuthTab(tab) {
    $$(".tabs__btn").forEach((btn) => {
      const on = btn.dataset.tab === tab;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", String(on));
    });
    $("#loginForm").hidden = tab !== "login";
    $("#registerForm").hidden = tab !== "register";
    setAuthMsg("");
  }

  function bindAuth() {
    $$(".tabs__btn").forEach((btn) => btn.addEventListener("click", () => setAuthTab(btn.dataset.tab)));

    $("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!sb) return;
      const form = e.target;
      const email = form.email.value.trim().toLowerCase();
      const password = form.password.value;
      if (!email || !password) return setAuthMsg("Escribe tu correo y tu contraseña.", "error");
      const btn = $("button[type=submit]", form);
      busy(btn, true, "Entrando…");
      const { error } = await sb.auth.signInWithPassword({ email, password });
      busy(btn, false);
      if (error) setAuthMsg(friendly(error), "error");
      else setAuthMsg("");
    });

    $("#registerForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!sb) return;
      const form = e.target;
      const fullName = form.full_name.value.trim();
      const whatsapp = form.whatsapp.value.trim();
      const email = form.email.value.trim().toLowerCase();
      const password = form.password.value;

      if (!fullName || !whatsapp || !email || !password) return setAuthMsg("Completa todos los campos.", "error");
      if (!/^\S+@\S+\.\S+$/.test(email)) return setAuthMsg("Escribe un correo válido.", "error");
      if (password.length < 8) return setAuthMsg("La contraseña debe tener al menos 8 caracteres.", "error");
      if (!form.terms.checked) return setAuthMsg("Debes aceptar las condiciones para continuar.", "error");

      const btn = $("button[type=submit]", form);
      busy(btn, true, "Creando cuenta…");
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, whatsapp }, emailRedirectTo: location.origin + location.pathname },
      });
      busy(btn, false);

      if (error) return setAuthMsg(friendly(error), "error");
      // Supabase devuelve un usuario "vacío" cuando el correo ya existe
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return setAuthMsg("Ese correo ya tiene una cuenta. Entra con tu contraseña.", "error");
      }
      if (!data.session) {
        setAuthTab("login");
        setAuthMsg("Cuenta creada. Te enviamos un correo para confirmarla: ábrelo y luego entra aquí.", "ok");
      }
      // Si hay sesión, onAuth() muestra el siguiente paso automáticamente
    });

    $("#forgotBtn").addEventListener("click", async () => {
      if (!sb) return;
      const email = $("#loginForm").email.value.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return setAuthMsg("Escribe tu correo arriba y vuelve a pulsar «Olvidé mi contraseña».", "error");
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) setAuthMsg(friendly(error), "error");
      else setAuthMsg("Te enviamos un correo con el enlace para crear una nueva contraseña.", "ok");
    });

    $("#recoverForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = e.target.password.value;
      if (password.length < 8) return toast("La contraseña debe tener al menos 8 caracteres.", "err");
      const btn = $("button[type=submit]", e.target);
      busy(btn, true, "Guardando…");
      const { error } = await sb.auth.updateUser({ password });
      busy(btn, false);
      if (error) return toast(friendly(error), "err");
      toast("Contraseña actualizada.");
      state.recovery = false;
      await loadProfile();
      history.replaceState(null, "", "#/");
      route();
    });
  }

  /* ---------- 6. Cuenta pendiente de activación ---------- */
  function renderProfileMissing() {
    showView("pending");
    $("#view-pending").innerHTML = `<div class="pending">${emptyHTML(
      "No pudimos cargar tu perfil",
      "Cierra sesión y vuelve a entrar. Si el problema continúa, escríbenos por WhatsApp.",
      `<button class="btn btn--ghost" id="pendingLogout" type="button">Cerrar sesión</button>
       <a class="btn btn--primary" href="${waLink("Hola, no puedo entrar a los cursos online de Kozei STUDIO.")}" target="_blank" rel="noopener">Escribir por WhatsApp</a>`
    )}</div>`;
    $("#pendingLogout").addEventListener("click", logout);
  }

  function renderPending() {
    const p = state.profile;
    const pay = CFG.PAYMENT;
    const suspended = p.status === "suspended";
    const message =
      `Hola, soy ${p.full_name || "alumno/a"} (${p.email || state.user.email}). ` +
      `Ya hice el pago por ${pay.method} para acceder a los cursos online. Te envío el comprobante.`;

    showView("pending");
    $("#view-pending").innerHTML = suspended
      ? `<div class="pending">${emptyHTML(
          "Tu acceso está suspendido",
          "Escríbenos por WhatsApp y lo resolvemos.",
          `<a class="btn btn--primary" href="${waLink("Hola, mi acceso a los cursos online aparece suspendido.")}" target="_blank" rel="noopener">${ICONS.chat} Escribir por WhatsApp</a>
           <button class="btn btn--ghost" id="pendingRefresh" type="button">${ICONS.refresh} Actualizar</button>`
        )}</div>`
      : `
      <div class="pending">
        <div class="pending__head">
          <h1>Tu cuenta está lista. Falta activar el acceso.</h1>
          <p>Hola, ${esc((p.full_name || "").split(" ")[0] || "bienvenido/a")}. Para ver los cursos, realiza el pago y envíanos el comprobante. En cuanto lo confirmemos, activamos tu acceso.</p>
        </div>

        <ol class="steps">
          <li class="is-done"><span class="steps__dot">${ICONS.check.replace("<svg", '<svg width="16" height="16"')}</span><div><strong>Cuenta creada</strong><small>${esc(p.email || state.user.email)}</small></div></li>
          <li class="is-current"><span class="steps__dot">2</span><div><strong>Pago por ${esc(pay.method)}</strong><small>Haz la transferencia con los datos de abajo.</small></div></li>
          <li><span class="steps__dot">3</span><div><strong>Activación del acceso</strong><small>La hacemos nosotros al confirmar el pago.</small></div></li>
        </ol>

        <div class="card paybox">
          <div class="paybox__row">
            <div><div class="paybox__label">Método de pago</div><div class="paybox__value">${esc(pay.method)}</div></div>
          </div>
          <div class="paybox__row">
            <div><div class="paybox__label">Cuenta o tarjeta</div><div class="paybox__value" id="payAccount">${esc(pay.account || "Pídela por WhatsApp")}</div></div>
            ${pay.account ? `<button class="btn btn--ghost btn--sm" id="copyAccount" type="button">${ICONS.copy} Copiar</button>` : ""}
          </div>
          ${pay.holder ? `<div class="paybox__row"><div><div class="paybox__label">Titular</div><div class="paybox__value">${esc(pay.holder)}</div></div></div>` : ""}
          ${pay.note ? `<p class="hint">${esc(pay.note)}</p>` : ""}
        </div>

        <div class="actions">
          <a class="btn btn--primary" href="${waLink(message)}" target="_blank" rel="noopener">${ICONS.chat} Enviar comprobante por WhatsApp</a>
          <button class="btn btn--ghost" id="pendingRefresh" type="button">${ICONS.refresh} Ya me activaron, actualizar</button>
        </div>
      </div>`;

    const copyBtn = $("#copyAccount");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pay.account);
          toast("Número copiado.");
        } catch {
          toast("No se pudo copiar. Selecciónalo y cópialo a mano.", "err");
        }
      });
    }
    $("#pendingRefresh").addEventListener("click", async (e) => {
      busy(e.currentTarget, true, "Revisando…");
      await loadProfile();
      route();
      if (state.profile && state.profile.status !== "active") toast("Tu acceso todavía no está activo. Te avisaremos por WhatsApp.", "err");
    });
  }

  /* ---------- 7. Mis cursos ---------- */
  async function showCourses() {
    const token = ++routeToken;
    showView("courses");
    const view = $("#view-courses");
    view.innerHTML = loaderHTML;

    const [courses, lessons, progress] = await Promise.all([
      sb.from("courses").select("*").order("position", { ascending: true }).order("created_at", { ascending: true }),
      sb.from("lessons").select("id,course_id"),
      sb.from("lesson_progress").select("lesson_id").eq("user_id", state.user.id),
    ]);
    if (token !== routeToken) return;

    if (courses.error) {
      view.innerHTML = emptyHTML("No pudimos cargar tus cursos", friendly(courses.error), `<button class="btn btn--primary" id="retryCourses" type="button">Reintentar</button>`);
      $("#retryCourses").addEventListener("click", showCourses);
      return;
    }

    const doneSet = new Set((progress.data || []).map((r) => r.lesson_id));
    const byCourse = {};
    (lessons.data || []).forEach((l) => (byCourse[l.course_id] = (byCourse[l.course_id] || []).concat(l.id)));
    const list = courses.data || [];
    const first = ((state.profile.full_name || "").split(" ")[0]) || "";

    view.innerHTML = `
      <div class="page-head">
        <div>
          <h1 class="h2">Mis cursos${first ? `, ${esc(first)}` : ""}</h1>
          <p>Elige un curso para continuar donde lo dejaste.</p>
        </div>
      </div>
      ${
        list.length
          ? `<div class="grid">${list
              .map((c) => {
                const ids = byCourse[c.id] || [];
                const done = ids.filter((id) => doneSet.has(id)).length;
                const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
                return `
                <a class="course-card" href="#/curso/${esc(c.id)}">
                  <div class="course-card__art"><span>${esc((c.title || "?").trim().charAt(0).toUpperCase())}</span></div>
                  <div>
                    <h3>${esc(c.title)}</h3>
                    ${c.published ? "" : `<span class="badge badge--draft">Borrador</span>`}
                  </div>
                  <p>${esc(c.description || "")}</p>
                  <div class="progress">
                    <div class="progress__bar"><i style="width:${pct}%"></i></div>
                    <small>${ids.length ? `${done} de ${ids.length} lecciones · ${pct}%` : "Pronto habrá lecciones"}</small>
                  </div>
                </a>`;
              })
              .join("")}</div>`
          : emptyHTML(
              "Aún no tienes cursos asignados",
              "Tu cuenta está activa, pero todavía no te hemos asignado ningún curso. Escríbenos por WhatsApp y lo revisamos.",
              `<a class="btn btn--primary" href="${waLink("Hola, mi cuenta de cursos online está activa pero no veo ningún curso.")}" target="_blank" rel="noopener">${ICONS.chat} Escribir por WhatsApp</a>`
            )
      }`;
  }

  /* ---------- 8. Curso, reproductor y visor de PDF ---------- */
  let cs = null; // curso abierto
  let wmTimer = null;

  const wmText = () => [state.profile && state.profile.full_name, state.user && state.user.email].filter(Boolean).join(" · ");

  function startWatermark() {
    stopWatermark();
    const wm = $("#wm");
    if (!wm) return;
    const move = () => {
      wm.style.left = `${4 + Math.random() * 45}%`;
      wm.style.top = `${8 + Math.random() * 72}%`;
    };
    move();
    wmTimer = setInterval(move, 5000);
  }
  function stopWatermark() {
    clearInterval(wmTimer);
    wmTimer = null;
  }

  async function showCourse(courseId, lessonId) {
    const token = ++routeToken;
    showView("course");
    const view = $("#view-course");
    view.innerHTML = loaderHTML;

    const courseRes = await sb.from("courses").select("*").eq("id", courseId).maybeSingle();
    if (token !== routeToken) return;
    if (courseRes.error || !courseRes.data) {
      view.innerHTML = emptyHTML(
        "No encontramos este curso",
        "Puede que no tengas acceso a él o que ya no esté disponible.",
        `<a class="btn btn--primary" href="#/">Volver a mis cursos</a>`
      );
      return;
    }

    const lessonsRes = await sb.from("lessons").select("*").eq("course_id", courseId)
      .order("position", { ascending: true }).order("created_at", { ascending: true });
    const lessons = lessonsRes.data || [];
    const ids = lessons.map((l) => l.id);

    let files = [];
    let done = [];
    if (ids.length) {
      const [f, p] = await Promise.all([
        sb.from("lesson_files").select("*").in("lesson_id", ids).order("created_at", { ascending: true }),
        sb.from("lesson_progress").select("lesson_id").eq("user_id", state.user.id).in("lesson_id", ids),
      ]);
      files = f.data || [];
      done = (p.data || []).map((r) => r.lesson_id);
    }
    if (token !== routeToken) return;

    const filesBy = {};
    files.forEach((f) => (filesBy[f.lesson_id] = (filesBy[f.lesson_id] || []).concat(f)));
    const doneSet = new Set(done);
    const current = lessons.find((l) => l.id === lessonId) || lessons.find((l) => !doneSet.has(l.id)) || lessons[0] || null;
    cs = { course: courseRes.data, lessons, filesBy, done: doneSet, current: current ? current.id : null };
    renderCourse();
  }

  function renderCourse() {
    const { course, lessons } = cs;
    $("#view-course").innerHTML = `
      <a class="back" href="#/">${ICONS.back} Mis cursos</a>
      <div class="lms">
        <div class="lms__main" id="lessonMain"></div>
        <aside class="sidebar card">
          <h3>${esc(course.title)}</h3>
          <div class="progress">
            <div class="progress__bar"><i id="cBar"></i></div>
            <small id="cTxt"></small>
          </div>
          <div class="lessons" id="lessonList">
            ${lessons
              .map(
                (l, i) => `
              <button class="lessons__item" type="button" data-id="${esc(l.id)}">
                <span class="lessons__dot">${i + 1}</span>
                <span class="lessons__title">${esc(l.title)}</span>
              </button>`
              )
              .join("")}
          </div>
        </aside>
      </div>`;

    $("#lessonList").addEventListener("click", (e) => {
      const item = e.target.closest(".lessons__item");
      if (item) selectLesson(item.dataset.id, true);
    });
    selectLesson(cs.current, false);
  }

  function updateCourseProgress() {
    const total = cs.lessons.length;
    const done = cs.lessons.filter((l) => cs.done.has(l.id)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const bar = $("#cBar");
    if (bar) bar.style.width = `${pct}%`;
    const txt = $("#cTxt");
    if (txt) txt.textContent = total ? `${done} de ${total} lecciones · ${pct}%` : "Este curso aún no tiene lecciones";
    $$(".lessons__item").forEach((item, i) => {
      const lesson = cs.lessons[i];
      const isDone = cs.done.has(lesson.id);
      item.classList.toggle("is-done", isDone);
      item.classList.toggle("is-active", lesson.id === cs.current);
      $(".lessons__dot", item).innerHTML = isDone ? ICONS.check : String(i + 1);
    });
  }

  function playerHTML(lesson) {
    if (!lesson.drive_id) {
      return `<div class="player player--empty"><p>Esta lección no tiene video. Revisa los materiales de abajo.</p></div>`;
    }
    const src = `https://drive.google.com/file/d/${encodeURIComponent(lesson.drive_id)}/preview`;
    const sandbox = CFG.SANDBOX_VIDEO ? ` sandbox="allow-scripts allow-same-origin allow-presentation"` : "";
    return `
      <div class="player" id="player">
        <iframe src="${src}" title="${esc(lesson.title)}" allow="autoplay; fullscreen" allowfullscreen${sandbox}></iframe>
        <span class="player__block" aria-hidden="true"></span>
        ${CFG.WATERMARK ? `<div class="wm" id="wm">${esc(wmText())}</div>` : ""}
      </div>`;
  }

  function selectLesson(lessonId, userClick) {
    const main = $("#lessonMain");
    if (!cs.lessons.length) {
      main.innerHTML = emptyHTML("Este curso aún no tiene lecciones", "Pronto subiremos el contenido. Te avisaremos por WhatsApp.");
      updateCourseProgress();
      return;
    }
    const index = Math.max(0, cs.lessons.findIndex((l) => l.id === lessonId));
    const lesson = cs.lessons[index];
    cs.current = lesson.id;
    history.replaceState(null, "", `#/curso/${cs.course.id}/${lesson.id}`);

    const files = cs.filesBy[lesson.id] || [];
    const prev = cs.lessons[index - 1];
    const next = cs.lessons[index + 1];
    const isDone = cs.done.has(lesson.id);

    main.innerHTML = `
      ${playerHTML(lesson)}
      <div class="lesson">
        <h2>${esc(lesson.title)}</h2>
        ${lesson.description ? `<p class="lesson__text">${esc(lesson.description)}</p>` : ""}
        <div class="lesson__bar">
          <button class="btn ${isDone ? "btn--done" : "btn--primary"}" id="doneBtn" type="button">${isDone ? `${ICONS.check} Lección vista` : "Marcar como vista"}</button>
          ${prev ? `<button class="btn btn--ghost" type="button" data-go="${esc(prev.id)}">${ICONS.back} Anterior</button>` : ""}
          ${next ? `<button class="btn btn--ghost" type="button" data-go="${esc(next.id)}">Siguiente ${ICONS.next}</button>` : ""}
        </div>
      </div>
      ${
        files.length
          ? `<div class="files">
              <h3>Materiales de la lección</h3>
              ${files
                .map(
                  (f) => `
                <div class="file">
                  <span class="file__icon">${ICONS.file}</span>
                  <span class="file__name">${esc(f.name)}</span>
                  <button class="btn btn--ghost btn--sm" type="button" data-pdf="${esc(f.id)}">Ver</button>
                </div>`
                )
                .join("")}
            </div>`
          : ""
      }`;

    $("#doneBtn").addEventListener("click", () => toggleDone(lesson.id));
    $$("[data-go]", main).forEach((b) => b.addEventListener("click", () => selectLesson(b.dataset.go, true)));
    $$("[data-pdf]", main).forEach((b) => b.addEventListener("click", () => openPdf(files.find((f) => f.id === b.dataset.pdf))));

    updateCourseProgress();
    startWatermark();
    if (userClick && window.innerWidth < 900) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleDone(lessonId) {
    const wasDone = cs.done.has(lessonId);
    const uid = state.user.id;
    const res = wasDone
      ? await sb.from("lesson_progress").delete().eq("user_id", uid).eq("lesson_id", lessonId)
      : await sb.from("lesson_progress").insert({ user_id: uid, lesson_id: lessonId });
    if (res.error) {
      return toast(state.profile.role === "admin" ? "El progreso solo se guarda para alumnos matriculados." : friendly(res.error), "err");
    }
    if (wasDone) cs.done.delete(lessonId);
    else {
      cs.done.add(lessonId);
      toast("¡Lección completada!");
    }
    selectLesson(lessonId, false);
  }

  // Marca de agua repetida sobre cada página del PDF
  function drawPdfWatermark(ctx, w, h) {
    if (!CFG.WATERMARK) return;
    const text = wmText();
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#000";
    ctx.font = `600 ${Math.max(14, Math.round(w / 34))}px sans-serif`;
    ctx.rotate(-Math.PI / 7);
    const stepX = ctx.measureText(text).width + w / 6;
    const stepY = w / 5;
    for (let y = -h, row = 0; y < h * 1.6; y += stepY, row++) {
      for (let x = -w; x < w * 1.6; x += stepX) ctx.fillText(text, x + (row % 2 ? stepX / 2 : 0), y);
    }
    ctx.restore();
  }

  async function renderPdf(url, container) {
    const lib = window.pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await lib.getDocument({ url }).promise;
    container.innerHTML = "";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(260, Math.min(container.clientWidth || modalBox.clientWidth - 40 || 600, 860));

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const scale = width / base.width;
      const viewport = page.getViewport({ scale: scale * dpr });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      drawPdfWatermark(ctx, canvas.width, canvas.height);
      container.appendChild(canvas);
    }
    const note = document.createElement("p");
    note.className = "pdfv__note";
    note.textContent = "Material de uso personal. No se permite descargarlo ni compartirlo.";
    container.appendChild(note);
  }

  async function openPdf(file) {
    if (!file) return;
    openModal({
      title: file.name,
      size: "xl",
      html: `<div class="pdfv" id="pdfv"><p class="muted">Cargando documento…</p></div>`,
    });
    const box = $("#pdfv");
    try {
      const { data, error } = await sb.storage.from(CFG.STORAGE_BUCKET).createSignedUrl(file.storage_path, CFG.PDF_URL_SECONDS);
      if (error) throw error;
      if (window.pdfjsLib) {
        await renderPdf(data.signedUrl, box);
      } else {
        box.innerHTML = `<iframe title="${esc(file.name)}" src="${esc(data.signedUrl)}#toolbar=0&navpanes=0"></iframe>`;
      }
    } catch (err) {
      console.error(err);
      box.innerHTML = `<p class="muted">No se pudo abrir el documento. ${esc(friendly(err))}</p>`;
    }
  }

  /* ---------- 9. Panel de administración: alumnos ---------- */
  const admin = { tab: "alumnos", filter: "pending", q: "", courseId: null, profiles: [], enrollments: [], courses: [], lessons: [], files: [] };

  async function adminLoad() {
    const [profiles, enrollments, courses, lessons, files] = await Promise.all([
      sb.from("profiles").select("*").order("created_at", { ascending: false }),
      sb.from("enrollments").select("user_id,course_id"),
      sb.from("courses").select("*").order("position", { ascending: true }).order("created_at", { ascending: true }),
      sb.from("lessons").select("*").order("position", { ascending: true }).order("created_at", { ascending: true }),
      sb.from("lesson_files").select("*").order("created_at", { ascending: true }),
    ]);
    const failed = [profiles, enrollments, courses, lessons, files].find((r) => r.error);
    if (failed) throw failed.error;
    admin.profiles = profiles.data || [];
    admin.enrollments = enrollments.data || [];
    admin.courses = courses.data || [];
    admin.lessons = lessons.data || [];
    admin.files = files.data || [];
  }

  async function showAdmin() {
    const token = ++routeToken;
    showView("admin");
    const view = $("#view-admin");
    view.innerHTML = loaderHTML;
    try {
      await adminLoad();
    } catch (err) {
      if (token !== routeToken) return;
      view.innerHTML = emptyHTML("No pudimos cargar el panel", friendly(err), `<button class="btn btn--primary" id="retryAdmin" type="button">Reintentar</button>`);
      $("#retryAdmin").addEventListener("click", showAdmin);
      return;
    }
    if (token !== routeToken) return;
    renderAdmin();
  }

  async function adminRefresh() {
    try {
      await adminLoad();
    } catch (err) {
      toast(friendly(err), "err");
    }
    renderAdmin();
  }

  function renderAdmin() {
    const students = admin.profiles.filter((p) => p.role !== "admin");
    const pending = students.filter((p) => p.status === "pending").length;
    const view = $("#view-admin");

    view.innerHTML = `
      <div class="page-head">
        <div>
          <h1 class="h2">Panel de administración</h1>
          <p>Activa alumnos cuando confirmes su pago y gestiona tus cursos.</p>
        </div>
      </div>
      <div class="atabs" role="tablist">
        <button type="button" class="${admin.tab === "alumnos" ? "is-active" : ""}" data-tab="alumnos">Alumnos${pending ? `<span class="count">${pending}</span>` : ""}</button>
        <button type="button" class="${admin.tab === "cursos" ? "is-active" : ""}" data-tab="cursos">Cursos</button>
      </div>
      <div id="adminBody"></div>`;

    $$(".atabs button", view).forEach((b) =>
      b.addEventListener("click", () => {
        admin.tab = b.dataset.tab;
        admin.courseId = null;
        renderAdmin();
      })
    );
    if (admin.tab === "alumnos") renderStudents();
    else renderCoursesAdmin();
  }

  function studentRowHTML(p) {
    const wa = cleanPhone(p.whatsapp);
    const count = admin.enrollments.filter((e) => e.user_id === p.id).length;
    const badge =
      p.status === "active" ? `<span class="badge badge--ok">Activo</span>`
      : p.status === "suspended" ? `<span class="badge badge--off">Suspendido</span>`
      : `<span class="badge badge--wait">Pendiente de pago</span>`;
    const actions =
      p.status === "pending" ? `<button class="btn btn--primary btn--sm" data-act="access" data-id="${esc(p.id)}">Activar acceso</button>`
      : p.status === "active" ? `
          <button class="btn btn--ghost btn--sm" data-act="access" data-id="${esc(p.id)}">Editar accesos</button>
          <button class="btn btn--ghost btn--sm" data-act="notify" data-id="${esc(p.id)}">Avisar</button>
          <button class="btn btn--danger btn--sm" data-act="suspend" data-id="${esc(p.id)}">Suspender</button>`
      : `<button class="btn btn--ghost btn--sm" data-act="access" data-id="${esc(p.id)}">Reactivar</button>`;

    return `
      <article class="row">
        <div class="row__main">
          <span class="avatar">${esc((p.full_name || p.email || "?").trim().charAt(0).toUpperCase())}</span>
          <div class="row__text">
            <div class="row__title">${esc(p.full_name || "Sin nombre")}</div>
            <div class="row__sub">${esc(p.email || "")}</div>
            <div class="row__sub">${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener">${esc(p.whatsapp)}</a>` : "Sin WhatsApp"} · Registro: ${esc(fmtDate(p.created_at))}</div>
          </div>
        </div>
        <div class="row__meta">${badge}<span class="badge badge--draft">${count} ${count === 1 ? "curso" : "cursos"}</span></div>
        <div class="row__actions">${actions}</div>
      </article>`;
  }

  function renderStudents() {
    const students = admin.profiles.filter((p) => p.role !== "admin");
    const counts = {
      pending: students.filter((p) => p.status === "pending").length,
      active: students.filter((p) => p.status === "active").length,
      suspended: students.filter((p) => p.status === "suspended").length,
      all: students.length,
    };
    const q = admin.q.trim().toLowerCase();
    const list = students.filter((p) => {
      if (admin.filter !== "all" && p.status !== admin.filter) return false;
      if (!q) return true;
      return [p.full_name, p.email, p.whatsapp].some((v) => String(v || "").toLowerCase().includes(q));
    });

    const body = $("#adminBody");
    body.innerHTML = `
      <div class="toolbar">
        <div class="pills" role="group" aria-label="Filtrar alumnos">
          ${[["pending", "Pendientes"], ["active", "Activos"], ["suspended", "Suspendidos"], ["all", "Todos"]]
            .map(([key, label]) => `<button type="button" class="pill ${admin.filter === key ? "is-active" : ""}" data-filter="${key}">${label} (${counts[key]})</button>`)
            .join("")}
        </div>
        <label class="field"><input type="search" id="studentSearch" placeholder="Buscar por nombre, correo o WhatsApp" value="${esc(admin.q)}" aria-label="Buscar alumnos" /></label>
      </div>
      <div class="rows" id="studentRows">
        ${list.length ? list.map(studentRowHTML).join("") : emptyHTML("No hay alumnos aquí", admin.filter === "pending" ? "Cuando alguien cree una cuenta aparecerá en esta lista." : "Prueba con otro filtro o búsqueda.")}
      </div>`;

    $$("[data-filter]", body).forEach((b) => b.addEventListener("click", () => { admin.filter = b.dataset.filter; renderStudents(); }));
    $("#studentSearch").addEventListener("input", (e) => {
      admin.q = e.target.value;
      const cursor = e.target.selectionStart;
      renderStudents();
      const input = $("#studentSearch");
      input.focus();
      input.setSelectionRange(cursor, cursor);
    });
    $("#studentRows").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const profile = admin.profiles.find((p) => p.id === btn.dataset.id);
      if (!profile) return;
      if (btn.dataset.act === "access") openAccessModal(profile);
      if (btn.dataset.act === "suspend") suspendStudent(profile);
      if (btn.dataset.act === "notify") notifyStudent(profile);
    });
  }

  function openAccessModal(profile) {
    const owned = new Set(admin.enrollments.filter((e) => e.user_id === profile.id).map((e) => e.course_id));
    const wasActive = profile.status === "active";
    openModal({
      title: wasActive ? `Accesos de ${profile.full_name || profile.email}` : `Activar a ${profile.full_name || profile.email}`,
      html: `
        <form id="accessForm" class="form">
          <p class="hint">Marca los cursos a los que tendrá acceso. Puedes cambiarlo cuando quieras.</p>
          <div class="checks">
            ${
              admin.courses.length
                ? admin.courses.map((c) => `
                  <label class="check">
                    <input type="checkbox" name="course" value="${esc(c.id)}" ${owned.has(c.id) ? "checked" : ""} />
                    <span>${esc(c.title)} ${c.published ? "" : `<em class="muted">(borrador: no se verá hasta publicarlo)</em>`}</span>
                  </label>`).join("")
                : `<p class="muted">Aún no has creado cursos. Ve a la pestaña «Cursos» para crear el primero.</p>`
            }
          </div>
          <div class="modal__foot">
            <button class="btn btn--ghost" type="button" data-close>Cancelar</button>
            <button class="btn btn--primary" type="submit">${wasActive ? "Guardar accesos" : "Activar acceso"}</button>
          </div>
        </form>`,
      onMount: (box) => {
        $("#accessForm", box).addEventListener("submit", async (e) => {
          e.preventDefault();
          const selected = $$("input[name=course]:checked", e.target).map((i) => i.value);
          const btn = $("button[type=submit]", e.target);
          busy(btn, true, "Guardando…");
          try {
            const a = await sb.from("profiles").update({ status: "active" }).eq("id", profile.id);
            if (a.error) throw a.error;
            const d = await sb.from("enrollments").delete().eq("user_id", profile.id);
            if (d.error) throw d.error;
            if (selected.length) {
              const i = await sb.from("enrollments").insert(selected.map((course_id) => ({ user_id: profile.id, course_id })));
              if (i.error) throw i.error;
            }
            closeModal();
            toast(wasActive ? "Accesos actualizados." : "Acceso activado.");
            await adminRefresh();
            if (!wasActive) notifyStudent({ ...profile, status: "active" }, true);
          } catch (err) {
            busy(btn, false);
            toast(friendly(err), "err");
          }
        });
      },
    });
  }

  async function suspendStudent(profile) {
    if (!window.confirm(`¿Suspender el acceso de ${profile.full_name || profile.email}?`)) return;
    const { error } = await sb.from("profiles").update({ status: "suspended" }).eq("id", profile.id);
    if (error) return toast(friendly(error), "err");
    toast("Acceso suspendido.");
    adminRefresh();
  }

  function notifyStudent(profile, afterActivate = false) {
    const number = cleanPhone(profile.whatsapp);
    if (!number) return toast("Este alumno no tiene WhatsApp registrado.", "err");
    const url = `${location.origin}${location.pathname}`;
    const text = `Hola ${(profile.full_name || "").split(" ")[0]}, ya activamos tu acceso a los cursos online de Kozei STUDIO. Entra con tu correo y contraseña aquí: ${url}`;
    if (afterActivate) {
      openModal({
        title: "Acceso activado",
        html: `<p>¿Quieres avisarle ahora por WhatsApp?</p>
          <div class="modal__foot">
            <button class="btn btn--ghost" type="button" data-close>Ahora no</button>
            <a class="btn btn--primary" href="${waLink(text, number)}" target="_blank" rel="noopener" data-close>${ICONS.chat} Avisar por WhatsApp</a>
          </div>`,
      });
      return;
    }
    window.open(waLink(text, number), "_blank", "noopener");
  }

  /* ---------- 10. Panel de administración: cursos y lecciones ---------- */
  // Acepta un enlace de Google Drive o el ID suelto y devuelve el ID
  function parseDriveId(input) {
    const value = String(input || "").trim();
    if (!value) return "";
    const byPath = value.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (byPath) return byPath[1];
    const byQuery = value.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (byQuery) return byQuery[1];
    if (/^[a-zA-Z0-9_-]{15,}$/.test(value)) return value;
    return null;
  }

  const safeName = (name) =>
    name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").slice(-80);

  function renderCoursesAdmin() {
    if (admin.courseId) return renderLessonsAdmin();
    const body = $("#adminBody");
    body.innerHTML = `
      <div class="toolbar">
        <button class="btn btn--primary" type="button" id="newCourse">+ Nuevo curso</button>
      </div>
      <div class="rows">
        ${
          admin.courses.length
            ? admin.courses.map((c) => {
                const lessons = admin.lessons.filter((l) => l.course_id === c.id).length;
                const students = admin.enrollments.filter((e) => e.course_id === c.id).length;
                return `
                <article class="row">
                  <div class="row__main">
                    <span class="avatar">${esc((c.title || "?").trim().charAt(0).toUpperCase())}</span>
                    <div class="row__text">
                      <div class="row__title">${esc(c.title)}</div>
                      <div class="row__sub">${lessons} ${lessons === 1 ? "lección" : "lecciones"} · ${students} ${students === 1 ? "alumno" : "alumnos"} · Orden ${c.position}</div>
                    </div>
                  </div>
                  <div class="row__meta">${c.published ? `<span class="badge badge--ok">Publicado</span>` : `<span class="badge badge--draft">Borrador</span>`}</div>
                  <div class="row__actions">
                    <button class="btn btn--primary btn--sm" data-act="lessons" data-id="${esc(c.id)}">Lecciones</button>
                    <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${esc(c.id)}">Editar</button>
                    <button class="btn btn--danger btn--sm" data-act="delete" data-id="${esc(c.id)}">Eliminar</button>
                  </div>
                </article>`;
              }).join("")
            : emptyHTML("Aún no hay cursos", "Crea tu primer curso y luego añade sus lecciones con video y PDF.")
        }
      </div>`;

    $("#newCourse").addEventListener("click", () => openCourseModal(null));
    $(".rows", body).addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const course = admin.courses.find((c) => c.id === btn.dataset.id);
      if (!course) return;
      if (btn.dataset.act === "lessons") { admin.courseId = course.id; renderAdmin(); }
      if (btn.dataset.act === "edit") openCourseModal(course);
      if (btn.dataset.act === "delete") deleteCourse(course);
    });
  }

  function openCourseModal(course) {
    const isNew = !course;
    const nextPos = admin.courses.reduce((m, c) => Math.max(m, c.position), 0) + 1;
    openModal({
      title: isNew ? "Nuevo curso" : "Editar curso",
      html: `
        <form id="courseForm" class="form">
          <label class="field"><span>Título</span><input type="text" name="title" required maxlength="120" value="${esc(course ? course.title : "")}" placeholder="Ej: Diseño gráfico básico" /></label>
          <label class="field"><span>Descripción</span><textarea name="description" maxlength="600" placeholder="De qué trata el curso">${esc(course ? course.description : "")}</textarea></label>
          <div class="field-row">
            <label class="field"><span>Orden</span><input type="number" name="position" value="${course ? course.position : nextPos}" /></label>
            <label class="check" style="align-self:end;padding-bottom:.8rem"><input type="checkbox" name="published" ${course && course.published ? "checked" : ""} /><span>Publicado (los alumnos lo ven)</span></label>
          </div>
          <div class="modal__foot">
            <button class="btn btn--ghost" type="button" data-close>Cancelar</button>
            <button class="btn btn--primary" type="submit">${isNew ? "Crear curso" : "Guardar cambios"}</button>
          </div>
        </form>`,
      onMount: (box) => {
        $("#courseForm", box).addEventListener("submit", async (e) => {
          e.preventDefault();
          const f = e.target;
          const payload = {
            title: f.title.value.trim(),
            description: f.description.value.trim(),
            position: parseInt(f.position.value, 10) || 0,
            published: f.published.checked,
          };
          if (!payload.title) return toast("Escribe un título.", "err");
          const btn = $("button[type=submit]", f);
          busy(btn, true, "Guardando…");
          const res = isNew ? await sb.from("courses").insert(payload) : await sb.from("courses").update(payload).eq("id", course.id);
          if (res.error) {
            busy(btn, false);
            return toast(friendly(res.error), "err");
          }
          closeModal();
          toast(isNew ? "Curso creado." : "Curso actualizado.");
          adminRefresh();
        });
      },
    });
  }

  async function removeStorage(paths) {
    if (!paths.length) return;
    const { error } = await sb.storage.from(CFG.STORAGE_BUCKET).remove(paths);
    if (error) console.error("No se pudieron borrar algunos archivos:", error);
  }

  async function deleteCourse(course) {
    if (!window.confirm(`¿Eliminar el curso «${course.title}» con todas sus lecciones y PDF? Esta acción no se puede deshacer.`)) return;
    const lessonIds = admin.lessons.filter((l) => l.course_id === course.id).map((l) => l.id);
    await removeStorage(admin.files.filter((f) => lessonIds.includes(f.lesson_id)).map((f) => f.storage_path));
    const { error } = await sb.from("courses").delete().eq("id", course.id);
    if (error) return toast(friendly(error), "err");
    toast("Curso eliminado.");
    adminRefresh();
  }

  function renderLessonsAdmin() {
    const course = admin.courses.find((c) => c.id === admin.courseId);
    if (!course) { admin.courseId = null; return renderCoursesAdmin(); }
    const lessons = admin.lessons.filter((l) => l.course_id === course.id);
    const body = $("#adminBody");

    body.innerHTML = `
      <div class="crumbs">
        <button class="btn btn--ghost btn--sm" type="button" id="backCourses">${ICONS.back} Cursos</button>
        <h2 class="h2">${esc(course.title)}</h2>
        ${course.published ? `<span class="badge badge--ok">Publicado</span>` : `<span class="badge badge--draft">Borrador</span>`}
      </div>
      <div class="toolbar"><button class="btn btn--primary" type="button" id="newLesson">+ Nueva lección</button></div>
      <div class="rows">
        ${
          lessons.length
            ? lessons.map((l) => {
                const nFiles = admin.files.filter((f) => f.lesson_id === l.id).length;
                return `
                <article class="row">
                  <div class="row__main">
                    <span class="avatar">${l.position}</span>
                    <div class="row__text">
                      <div class="row__title">${esc(l.title)}</div>
                      <div class="row__sub">${l.drive_id ? "Video: sí" : "Video: falta"} · ${nFiles} ${nFiles === 1 ? "PDF" : "PDF"}</div>
                    </div>
                  </div>
                  <div class="row__meta">${l.drive_id ? `<span class="badge badge--ok">Con video</span>` : `<span class="badge badge--wait">Sin video</span>`}</div>
                  <div class="row__actions">
                    <button class="btn btn--primary btn--sm" data-act="edit" data-id="${esc(l.id)}">Editar</button>
                    <button class="btn btn--danger btn--sm" data-act="delete" data-id="${esc(l.id)}">Eliminar</button>
                  </div>
                </article>`;
              }).join("")
            : emptyHTML("Este curso aún no tiene lecciones", "Añade la primera: pega el enlace del video de Google Drive y sube sus PDF.")
        }
      </div>`;

    $("#backCourses").addEventListener("click", () => { admin.courseId = null; renderAdmin(); });
    $("#newLesson").addEventListener("click", () => openLessonModal(course, null));
    $(".rows", body).addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const lesson = lessons.find((l) => l.id === btn.dataset.id);
      if (!lesson) return;
      if (btn.dataset.act === "edit") openLessonModal(course, lesson);
      if (btn.dataset.act === "delete") deleteLesson(lesson);
    });
  }

  function fileListHTML(lessonId) {
    const files = admin.files.filter((f) => f.lesson_id === lessonId);
    if (!files.length) return `<p class="hint">Todavía no hay PDF en esta lección.</p>`;
    return files.map((f) => `
      <div class="file">
        <span class="file__icon">${ICONS.file}</span>
        <span class="file__name">${esc(f.name)}</span>
        <button class="btn btn--danger btn--sm" type="button" data-del-file="${esc(f.id)}">Quitar</button>
      </div>`).join("");
  }

  function openLessonModal(course, lesson) {
    const isNew = !lesson;
    const nextPos = admin.lessons.filter((l) => l.course_id === course.id).reduce((m, l) => Math.max(m, l.position), 0) + 1;
    const driveUrl = lesson && lesson.drive_id ? `https://drive.google.com/file/d/${lesson.drive_id}/view` : "";

    openModal({
      title: isNew ? "Nueva lección" : "Editar lección",
      size: "lg",
      html: `
        <form id="lessonForm" class="form">
          <label class="field"><span>Título</span><input type="text" name="title" required maxlength="140" value="${esc(lesson ? lesson.title : "")}" placeholder="Ej: 1. Introducción" /></label>
          <label class="field"><span>Descripción (opcional)</span><textarea name="description" maxlength="1200" placeholder="Resumen o instrucciones de la lección">${esc(lesson ? lesson.description : "")}</textarea></label>
          <label class="field">
            <span>Enlace del video en Google Drive</span>
            <input type="text" name="drive" value="${esc(driveUrl)}" placeholder="https://drive.google.com/file/d/..." />
            <small>En Drive: clic derecho al video → Compartir → «Cualquier persona con el enlace». Pega aquí ese enlace.</small>
          </label>
          <label class="field"><span>Orden dentro del curso</span><input type="number" name="position" value="${lesson ? lesson.position : nextPos}" /></label>
          <div class="modal__foot">
            <button class="btn btn--ghost" type="button" data-close>Cancelar</button>
            <button class="btn btn--primary" type="submit">${isNew ? "Crear lección" : "Guardar cambios"}</button>
          </div>
        </form>

        ${
          isNew
            ? `<p class="hint">Guarda la lección para poder subir sus PDF.</p>`
            : `<hr style="border:0;border-top:1px solid var(--rule)" />
               <div class="field"><span>PDF de la lección</span></div>
               <div class="filelist" id="fileList">${fileListHTML(lesson.id)}</div>
               <div class="upload">
                 <input type="file" id="pdfInput" accept="application/pdf" multiple />
                 <button class="btn btn--ghost btn--sm" type="button" id="pdfUpload">Subir PDF seleccionados</button>
                 <div class="upload__status" id="uploadStatus" role="status"></div>
                 <small class="hint">Solo PDF, hasta 50 MB cada uno. Los alumnos los verán en pantalla, sin botón de descarga.</small>
               </div>`
        }`,
      onMount: (box) => {
        $("#lessonForm", box).addEventListener("submit", async (e) => {
          e.preventDefault();
          const f = e.target;
          const driveId = parseDriveId(f.drive.value);
          if (driveId === null) return toast("El enlace de Google Drive no parece válido.", "err");
          const payload = {
            course_id: course.id,
            title: f.title.value.trim(),
            description: f.description.value.trim(),
            drive_id: driveId || null,
            position: parseInt(f.position.value, 10) || 0,
          };
          if (!payload.title) return toast("Escribe un título.", "err");
          const btn = $("button[type=submit]", f);
          busy(btn, true, "Guardando…");
          const res = isNew
            ? await sb.from("lessons").insert(payload).select().single()
            : await sb.from("lessons").update(payload).eq("id", lesson.id);
          if (res.error) {
            busy(btn, false);
            return toast(friendly(res.error), "err");
          }
          closeModal();
          await adminRefresh();
          if (isNew && res.data) {
            toast("Lección creada. Ahora puedes subir sus PDF.");
            openLessonModal(course, admin.lessons.find((l) => l.id === res.data.id) || res.data);
          } else {
            toast("Lección actualizada.");
          }
        });

        if (!isNew) bindLessonFiles(box, lesson);
      },
    });
  }

  function bindLessonFiles(box, lesson) {
    const refreshList = async () => {
      const { data } = await sb.from("lesson_files").select("*").eq("lesson_id", lesson.id).order("created_at", { ascending: true });
      admin.files = admin.files.filter((f) => f.lesson_id !== lesson.id).concat(data || []);
      const list = $("#fileList", box);
      if (list) list.innerHTML = fileListHTML(lesson.id);
    };

    $("#fileList", box).addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-del-file]");
      if (!btn) return;
      const file = admin.files.find((f) => f.id === btn.dataset.delFile);
      if (!file || !window.confirm(`¿Quitar «${file.name}»?`)) return;
      busy(btn, true, "…");
      await removeStorage([file.storage_path]);
      const { error } = await sb.from("lesson_files").delete().eq("id", file.id);
      if (error) { busy(btn, false); return toast(friendly(error), "err"); }
      await refreshList();
      toast("PDF eliminado.");
    });

    $("#pdfUpload", box).addEventListener("click", async () => {
      const input = $("#pdfInput", box);
      const status = $("#uploadStatus", box);
      const picked = [...input.files];
      if (!picked.length) return toast("Elige uno o más archivos PDF.", "err");
      const btn = $("#pdfUpload", box);
      busy(btn, true, "Subiendo…");
      let ok = 0;
      for (const [i, file] of picked.entries()) {
        status.textContent = `Subiendo ${i + 1} de ${picked.length}: ${file.name}`;
        if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) { toast(`«${file.name}» no es un PDF.`, "err"); continue; }
        if (file.size > 50 * 1024 * 1024) { toast(`«${file.name}» supera los 50 MB.`, "err"); continue; }
        const path = `${lesson.course_id}/${lesson.id}/${Date.now()}-${safeName(file.name)}`;
        const up = await sb.storage.from(CFG.STORAGE_BUCKET).upload(path, file, { contentType: "application/pdf", upsert: false });
        if (up.error) { toast(friendly(up.error), "err"); continue; }
        const ins = await sb.from("lesson_files").insert({ lesson_id: lesson.id, name: file.name, storage_path: path });
        if (ins.error) { await removeStorage([path]); toast(friendly(ins.error), "err"); continue; }
        ok++;
      }
      busy(btn, false);
      input.value = "";
      status.textContent = ok ? `Listo: ${ok} ${ok === 1 ? "archivo subido" : "archivos subidos"}.` : "";
      await refreshList();
      if (ok) toast(ok === 1 ? "PDF subido." : `${ok} PDF subidos.`);
    });
  }

  async function deleteLesson(lesson) {
    if (!window.confirm(`¿Eliminar la lección «${lesson.title}» y sus PDF?`)) return;
    await removeStorage(admin.files.filter((f) => f.lesson_id === lesson.id).map((f) => f.storage_path));
    const { error } = await sb.from("lessons").delete().eq("id", lesson.id);
    if (error) return toast(friendly(error), "err");
    toast("Lección eliminada.");
    adminRefresh();
  }

  /* ---------- 11. Arranque ---------- */
  async function init() {
    bindAuth();
    window.addEventListener("hashchange", () => {
      if (state.user || !configured) route();
      else if (/registro/.test(location.hash)) setAuthTab("register");
    });

    if (!configured || !sb) {
      route();
      return;
    }

    sb.auth.onAuthStateChange((event, session) => {
      // Se aplaza para no bloquear al cliente de Supabase dentro del callback
      setTimeout(() => onAuth(event, session), 0);
    });

    const { data } = await sb.auth.getSession();
    state.session = data.session;
    state.user = data.session ? data.session.user : null;
    await loadProfile();
    route();
  }

  init();
})();
