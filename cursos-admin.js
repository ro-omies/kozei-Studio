/* ==========================================================
   Kozei STUDIO · Cursos online · Panel de administración
   Solo funciona para cuentas con rol «admin» (lo garantiza la
   base de datos; este archivo solo dibuja la interfaz).

   Índice:
    1. Datos y utilidades
    2. Estructura del panel
    3. Resumen
    4. Solicitudes de acceso
    5. Usuarios
    6. Cursos, capítulos, PDF y cuestionarios
    7. Comentarios
    8. Ajustes del sitio
   ========================================================== */

(() => {
  "use strict";
  const K = window.KozeiApp;
  if (!K) return;
  const { sb, state, CFG, $, $$, esc, ICONS, loaderHTML, emptyHTML, friendly, busy, toast, openModal, closeModal, showView, fmtShort, cleanPhone, waLink } = K;

  /* ---------- 1. Datos y utilidades ---------- */
  const A = {
    tab: "resumen",
    courseId: null,
    userFilter: "all",
    userQ: "",
    data: { profiles: [], enrollments: [], courses: [], lessons: [], files: [], requests: [], comments: [], questions: [] },
  };

  async function load() {
    const [profiles, enrollments, courses, lessons, files, requests, comments, questions] = await Promise.all([
      sb.from("profiles").select("*").order("created_at", { ascending: false }),
      sb.from("enrollments").select("user_id,course_id"),
      sb.from("courses").select("*").order("position", { ascending: true }).order("created_at", { ascending: true }),
      sb.from("lessons").select("*").order("position", { ascending: true }).order("created_at", { ascending: true }),
      sb.from("lesson_files").select("*").order("created_at", { ascending: true }),
      sb.from("access_requests").select("*").order("created_at", { ascending: true }),
      sb.from("lesson_comments").select("*").order("created_at", { ascending: false }).limit(100),
      sb.from("lesson_questions").select("id,lesson_id"),
    ]);
    const failed = [profiles, enrollments, courses, lessons, files, requests, comments, questions].find((r) => r.error);
    if (failed) throw failed.error;
    const d = A.data;
    d.profiles = profiles.data || [];
    d.enrollments = enrollments.data || [];
    d.courses = courses.data || [];
    d.lessons = lessons.data || [];
    d.files = files.data || [];
    d.requests = requests.data || [];
    d.comments = comments.data || [];
    d.questions = questions.data || [];
    const settings = await sb.from("site_settings").select("key,value");
    (settings.data || []).forEach((r) => (state.settings[r.key] = r.value));
  }

  const profileById = (id) => A.data.profiles.find((p) => p.id === id);
  const courseById = (id) => A.data.courses.find((c) => c.id === id);
  const lessonById = (id) => A.data.lessons.find((l) => l.id === id);
  const initial = (text) => String(text || "?").trim().charAt(0).toUpperCase();
  const waProfile = (p) => {
    const n = cleanPhone(p.whatsapp);
    return n ? `<a href="https://wa.me/${n}" target="_blank" rel="noopener">${esc(p.whatsapp)}</a>` : "Sin WhatsApp";
  };

  const row = ({ av, title, subs = [], meta = "", actions = "" }) => `
    <article class="row">
      <div class="row__main">
        <span class="avatar">${esc(av)}</span>
        <div class="row__text">
          <div class="row__title">${title}</div>
          ${subs.map((s) => `<div class="row__sub">${s}</div>`).join("")}
        </div>
      </div>
      <div class="row__meta">${meta}</div>
      <div class="row__actions">${actions}</div>
    </article>`;

  const safeName = (name) =>
    name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").slice(-80);

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

  async function removeStorage(paths) {
    if (!paths.length) return;
    const { error } = await sb.storage.from(CFG.STORAGE_BUCKET).remove(paths);
    if (error) console.error("No se pudieron borrar algunos archivos:", error);
  }

  function notifyModal(profile, courseTitles) {
    const number = cleanPhone(profile.whatsapp);
    if (!number || !courseTitles.length) return;
    const url = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}cursos-online.html`;
    const text = `Hola ${(profile.full_name || "").split(" ")[0]}, ya habilitamos tu acceso a ${courseTitles.map((t) => `«${t}»`).join(", ")} en los cursos online de Kozei STUDIO. Entra con tu correo y contraseña aquí: ${url}`;
    openModal({
      title: "Acceso habilitado",
      html: `<p>¿Quieres avisarle ahora a ${esc(profile.full_name || profile.email)} por WhatsApp?</p>
        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" data-close>Ahora no</button>
          <a class="btn btn--primary" href="${waLink(text, number)}" target="_blank" rel="noopener" data-close>${ICONS.chat} Avisar por WhatsApp</a>
        </div>`,
    });
  }

  /* ---------- 2. Estructura del panel ---------- */
  async function showAdmin() {
    const token = K.token();
    showView("admin");
    const view = $("#view-admin");
    view.innerHTML = loaderHTML;
    try {
      await load();
    } catch (err) {
      if (token !== K.currentToken()) return;
      view.innerHTML = emptyHTML("No pudimos cargar el panel", friendly(err), `<button class="btn btn--primary" id="retryAdmin" type="button">Reintentar</button>`);
      $("#retryAdmin").addEventListener("click", showAdmin);
      return;
    }
    if (token !== K.currentToken()) return;
    render();
  }

  async function refresh() {
    try {
      await load();
    } catch (err) {
      toast(friendly(err), "err");
    }
    render();
  }

  const TABS = [
    ["resumen", "Resumen"],
    ["solicitudes", "Solicitudes"],
    ["usuarios", "Usuarios"],
    ["cursos", "Cursos"],
    ["comentarios", "Comentarios"],
    ["ajustes", "Ajustes"],
  ];

  function render() {
    const pending = A.data.requests.length;
    const view = $("#view-admin");
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h1 class="h2">Panel de administración</h1>
          <p>Gestiona cursos, usuarios, pagos y la información del sitio.</p>
        </div>
      </div>
      <div class="atabs" role="tablist">
        ${TABS.map(([key, label]) => `<button type="button" role="tab" class="${A.tab === key ? "is-active" : ""}" data-tab="${key}">${label}${key === "solicitudes" && pending ? `<span class="count">${pending}</span>` : ""}</button>`).join("")}
      </div>
      <div id="adminBody"></div>`;

    $$(".atabs button", view).forEach((b) =>
      b.addEventListener("click", () => {
        A.tab = b.dataset.tab;
        A.courseId = null;
        render();
      })
    );
    ({ resumen: renderSummary, solicitudes: renderRequests, usuarios: renderUsers, cursos: renderCourses, comentarios: renderComments, ajustes: renderSettings })[A.tab]();
  }

  /* ---------- 3. Resumen ---------- */
  function renderSummary() {
    const d = A.data;
    const students = d.profiles.filter((p) => p.role !== "admin");
    const published = d.courses.filter((c) => c.published).length;
    const cards = [
      ["Usuarios registrados", students.length, "usuarios"],
      ["Inscripciones", d.enrollments.length, "usuarios"],
      ["Solicitudes por confirmar", d.requests.length, "solicitudes"],
      ["Cursos publicados", `${published} de ${d.courses.length}`, "cursos"],
      ["Comentarios recientes", d.comments.length, "comentarios"],
    ];
    $("#adminBody").innerHTML = `
      <div class="stats">
        ${cards.map(([label, value, tab]) => `
          <button class="stat card" type="button" data-go="${tab}">
            <strong>${esc(value)}</strong><span>${esc(label)}</span>
          </button>`).join("")}
      </div>

      <div class="card tips">
        <h2>¿Cómo habilitar un curso de pago?</h2>
        <ol class="flow">
          <li><span>1</span><div><strong>El alumno paga por Transfermóvil</strong><p>Y te envía la captura por WhatsApp. También puede pulsar «Ya pagué: avisar».</p></div></li>
          <li><span>2</span><div><strong>Entras a «Solicitudes»</strong><p>Verifica la captura y pulsa <b>Habilitar curso</b>. También puedes habilitar desde «Usuarios».</p></div></li>
          <li><span>3</span><div><strong>Listo</strong><p>El alumno ya ve el curso. Puedes avisarle por WhatsApp con un clic.</p></div></li>
        </ol>
        <p class="hint">Los datos de pago que ve el alumno (número de cuenta y teléfono móvil de Transfermóvil) se editan en la pestaña <b>Ajustes</b>.</p>
      </div>`;
    $$("[data-go]", $("#adminBody")).forEach((b) => b.addEventListener("click", () => { A.tab = b.dataset.go; render(); }));
  }

  /* ---------- 4. Solicitudes de acceso ---------- */
  async function grantAccess(userId, courseId) {
    const ins = await sb.from("enrollments").insert({ user_id: userId, course_id: courseId });
    if (ins.error && ins.error.code !== "23505") throw ins.error;
    const del = await sb.from("access_requests").delete().eq("user_id", userId).eq("course_id", courseId);
    if (del.error) throw del.error;
  }

  function renderRequests() {
    const list = A.data.requests;
    $("#adminBody").innerHTML = list.length
      ? `<div class="rows" id="reqRows">${list.map((r) => {
          const p = profileById(r.user_id) || {};
          const c = courseById(r.course_id) || {};
          return row({
            av: initial(p.full_name || p.email),
            title: esc(p.full_name || "Sin nombre"),
            subs: [esc(p.email || ""), `${waProfile(p)} · Pidió: <strong>${esc(c.title || "curso eliminado")}</strong> · ${esc(fmtShort(r.created_at))}`],
            meta: `<span class="badge badge--wait">Por confirmar pago</span>${c.price ? `<span class="badge badge--draft">${esc(c.price)}</span>` : ""}`,
            actions: `<button class="btn btn--primary btn--sm" data-act="grant" data-u="${esc(r.user_id)}" data-c="${esc(r.course_id)}">Habilitar curso</button>
                      <button class="btn btn--ghost btn--sm" data-act="reject" data-u="${esc(r.user_id)}" data-c="${esc(r.course_id)}">Rechazar</button>`,
          });
        }).join("")}</div>`
      : emptyHTML("No hay solicitudes pendientes", "Cuando un alumno avise que ya pagó, aparecerá aquí para que lo habilites.");

    const rows = $("#reqRows");
    if (!rows) return;
    rows.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const { u, c } = btn.dataset;
      const profile = profileById(u);
      const course = courseById(c);
      if (btn.dataset.act === "grant") {
        busy(btn, true, "Habilitando…");
        try {
          await grantAccess(u, c);
        } catch (err) {
          busy(btn, false);
          return toast(friendly(err), "err");
        }
        toast("Curso habilitado.");
        await refresh();
        if (profile && course) notifyModal(profile, [course.title]);
      } else if (window.confirm("¿Rechazar esta solicitud?")) {
        const { error } = await sb.from("access_requests").delete().eq("user_id", u).eq("course_id", c);
        if (error) return toast(friendly(error), "err");
        toast("Solicitud eliminada.");
        refresh();
      }
    });
  }

  /* ---------- 5. Usuarios ---------- */
  function renderUsers() {
    const d = A.data;
    const enrolledBy = (id) => d.enrollments.filter((e) => e.user_id === id);
    const all = d.profiles;
    const filters = [
      ["all", "Todos", all.length],
      ["with", "Con cursos", all.filter((p) => p.role !== "admin" && enrolledBy(p.id).length).length],
      ["none", "Sin cursos", all.filter((p) => p.role !== "admin" && !enrolledBy(p.id).length).length],
      ["suspended", "Suspendidos", all.filter((p) => p.status === "suspended").length],
      ["admin", "Administración", all.filter((p) => p.role === "admin").length],
    ];
    const q = A.userQ.trim().toLowerCase();
    const list = all.filter((p) => {
      const n = enrolledBy(p.id).length;
      if (A.userFilter === "with" && (p.role === "admin" || !n)) return false;
      if (A.userFilter === "none" && (p.role === "admin" || n)) return false;
      if (A.userFilter === "suspended" && p.status !== "suspended") return false;
      if (A.userFilter === "admin" && p.role !== "admin") return false;
      return !q || [p.full_name, p.email, p.whatsapp].some((v) => String(v || "").toLowerCase().includes(q));
    });

    $("#adminBody").innerHTML = `
      <div class="toolbar">
        <div class="pills" role="group" aria-label="Filtrar usuarios">
          ${filters.map(([key, label, n]) => `<button type="button" class="pill ${A.userFilter === key ? "is-active" : ""}" data-filter="${key}">${label} (${n})</button>`).join("")}
        </div>
        <label class="field"><input type="search" id="userSearch" placeholder="Buscar por nombre, correo o WhatsApp" value="${esc(A.userQ)}" aria-label="Buscar usuarios" /></label>
      </div>
      <div class="rows" id="userRows">
        ${list.length ? list.map((p) => {
          const courses = enrolledBy(p.id).map((e) => courseById(e.course_id)).filter(Boolean);
          const isMe = p.id === state.user.id;
          const badges = [
            p.role === "admin" ? `<span class="badge badge--ok">Administración</span>` : "",
            p.status === "suspended" ? `<span class="badge badge--off">Suspendido</span>` : "",
          ].join("");
          return row({
            av: initial(p.full_name || p.email),
            title: esc(p.full_name || "Sin nombre"),
            subs: [esc(p.email || ""), `${waProfile(p)} · Registro: ${esc(fmtShort(p.created_at))}`,
              courses.length ? `<span class="chips">${courses.map((c) => `<span class="chip">${esc(c.title)}</span>`).join("")}</span>` : ""],
            meta: badges || `<span class="badge badge--draft">${courses.length} ${courses.length === 1 ? "curso" : "cursos"}</span>`,
            actions: `
              <button class="btn btn--primary btn--sm" data-act="access" data-id="${esc(p.id)}">Gestionar cursos</button>
              ${courses.length ? `<button class="btn btn--ghost btn--sm" data-act="notify" data-id="${esc(p.id)}">Avisar</button>` : ""}
              ${isMe ? "" : p.status === "suspended"
                ? `<button class="btn btn--ghost btn--sm" data-act="unsuspend" data-id="${esc(p.id)}">Reactivar</button>`
                : `<button class="btn btn--danger btn--sm" data-act="suspend" data-id="${esc(p.id)}">Suspender</button>`}
              ${isMe ? "" : `<button class="btn btn--ghost btn--sm" data-act="role" data-id="${esc(p.id)}">${p.role === "admin" ? "Quitar admin" : "Hacer admin"}</button>`}`,
          });
        }).join("") : emptyHTML("No hay usuarios aquí", "Prueba con otro filtro o búsqueda.")}
      </div>`;

    const body = $("#adminBody");
    $$("[data-filter]", body).forEach((b) => b.addEventListener("click", () => { A.userFilter = b.dataset.filter; renderUsers(); }));
    $("#userSearch").addEventListener("input", (e) => {
      A.userQ = e.target.value;
      const pos = e.target.selectionStart;
      renderUsers();
      const input = $("#userSearch");
      input.focus();
      input.setSelectionRange(pos, pos);
    });
    $("#userRows").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const p = profileById(btn.dataset.id);
      if (!p) return;
      const act = btn.dataset.act;
      if (act === "access") openAccessModal(p);
      if (act === "notify") notifyModal(p, enrolledBy(p.id).map((en) => (courseById(en.course_id) || {}).title).filter(Boolean));
      if (act === "suspend" || act === "unsuspend") setStatus(p, act === "suspend" ? "suspended" : "active");
      if (act === "role") toggleRole(p);
    });
  }

  async function setStatus(p, status) {
    if (status === "suspended" && !window.confirm(`¿Suspender el acceso de ${p.full_name || p.email}?`)) return;
    const { error } = await sb.from("profiles").update({ status }).eq("id", p.id);
    if (error) return toast(friendly(error), "err");
    toast(status === "suspended" ? "Acceso suspendido." : "Acceso reactivado.");
    refresh();
  }

  async function toggleRole(p) {
    const makeAdmin = p.role !== "admin";
    const question = makeAdmin
      ? `¿Dar acceso de administración a ${p.full_name || p.email}? Podrá ver y editar todo el panel.`
      : `¿Quitar el acceso de administración a ${p.full_name || p.email}?`;
    if (!window.confirm(question)) return;
    const { error } = await sb.from("profiles").update({ role: makeAdmin ? "admin" : "student" }).eq("id", p.id);
    if (error) return toast(friendly(error), "err");
    toast("Rol actualizado.");
    refresh();
  }

  function openAccessModal(profile) {
    const owned = new Set(A.data.enrollments.filter((e) => e.user_id === profile.id).map((e) => e.course_id));
    const requested = new Set(A.data.requests.filter((r) => r.user_id === profile.id).map((r) => r.course_id));
    openModal({
      title: `Cursos de ${profile.full_name || profile.email}`,
      html: `
        <form id="accessForm" class="form">
          <p class="hint">Marca los cursos a los que tendrá acceso. Al guardar, los que marques se habilitan y los que desmarques se quitan.</p>
          <div class="checks">
            ${A.data.courses.length ? A.data.courses.map((c) => `
              <label class="check">
                <input type="checkbox" name="course" value="${esc(c.id)}" ${owned.has(c.id) ? "checked" : ""} />
                <span>${esc(c.title)} ${c.price ? `<em class="muted">(${esc(c.price)})</em>` : ""}
                  ${requested.has(c.id) ? `<span class="badge badge--wait">Pidió acceso</span>` : ""}
                  ${c.published ? "" : `<span class="badge badge--draft">Borrador</span>`}</span>
              </label>`).join("") : `<p class="muted">Aún no has creado cursos. Ve a la pestaña «Cursos».</p>`}
          </div>
          <div class="modal__foot">
            <button class="btn btn--ghost" type="button" data-close>Cancelar</button>
            <button class="btn btn--primary" type="submit">Guardar</button>
          </div>
        </form>`,
      onMount: (box) => {
        $("#accessForm", box).addEventListener("submit", async (e) => {
          e.preventDefault();
          const selected = new Set($$("input[name=course]:checked", e.target).map((i) => i.value));
          const toAdd = [...selected].filter((id) => !owned.has(id));
          const toRemove = [...owned].filter((id) => !selected.has(id));
          const btn = $("button[type=submit]", e.target);
          busy(btn, true, "Guardando…");
          try {
            if (toRemove.length) {
              const r = await sb.from("enrollments").delete().eq("user_id", profile.id).in("course_id", toRemove);
              if (r.error) throw r.error;
            }
            if (toAdd.length) {
              const i = await sb.from("enrollments").insert(toAdd.map((course_id) => ({ user_id: profile.id, course_id })));
              if (i.error) throw i.error;
              const d = await sb.from("access_requests").delete().eq("user_id", profile.id).in("course_id", toAdd);
              if (d.error) throw d.error;
            }
          } catch (err) {
            busy(btn, false);
            return toast(friendly(err), "err");
          }
          closeModal();
          toast("Accesos actualizados.");
          await refresh();
          if (toAdd.length) notifyModal(profile, toAdd.map((id) => (courseById(id) || {}).title).filter(Boolean));
        });
      },
    });
  }

  /* ---------- 6. Cursos, capítulos, PDF y cuestionarios ---------- */
  function renderCourses() {
    if (A.courseId) return renderLessons();
    const d = A.data;
    $("#adminBody").innerHTML = `
      <div class="toolbar"><button class="btn btn--primary" type="button" id="newCourse">+ Nuevo curso</button></div>
      <div class="rows" id="courseRows">
        ${d.courses.length ? d.courses.map((c) => {
          const n = d.lessons.filter((l) => l.course_id === c.id).length;
          const s = d.enrollments.filter((e) => e.course_id === c.id).length;
          return row({
            av: initial(c.title),
            title: esc(c.title),
            subs: [`${n} ${n === 1 ? "capítulo" : "capítulos"} · ${s} ${s === 1 ? "alumno" : "alumnos"} · Orden ${c.position}`, esc(c.is_free ? "Gratis" : c.price || "Sin precio")],
            meta: `${c.published ? `<span class="badge badge--ok">Publicado</span>` : `<span class="badge badge--draft">Borrador</span>`}${c.is_free ? `<span class="badge badge--ok">Gratis</span>` : ""}`,
            actions: `<button class="btn btn--primary btn--sm" data-act="lessons" data-id="${esc(c.id)}">Capítulos</button>
                      <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${esc(c.id)}">Editar</button>
                      <button class="btn btn--danger btn--sm" data-act="delete" data-id="${esc(c.id)}">Eliminar</button>`,
          });
        }).join("") : emptyHTML("Aún no hay cursos", "Crea el primero y añade sus capítulos con video, PDF y cuestionario.")}
      </div>`;
    $("#newCourse").addEventListener("click", () => openCourseModal(null));
    $("#courseRows").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const c = courseById(btn.dataset.id);
      if (!c) return;
      if (btn.dataset.act === "lessons") { A.courseId = c.id; render(); }
      if (btn.dataset.act === "edit") openCourseModal(c);
      if (btn.dataset.act === "delete") deleteCourse(c);
    });
  }

  function openCourseModal(course) {
    const isNew = !course;
    const nextPos = A.data.courses.reduce((m, c) => Math.max(m, c.position), 0) + 1;
    openModal({
      title: isNew ? "Nuevo curso" : "Editar curso",
      html: `
        <form id="courseForm" class="form">
          <label class="field"><span>Título</span><input type="text" name="title" required maxlength="120" value="${esc(course ? course.title : "")}" placeholder="Ej: Diseño gráfico básico" /></label>
          <label class="field"><span>Descripción breve</span><textarea name="description" maxlength="600" placeholder="De qué trata el curso">${esc(course ? course.description : "")}</textarea></label>
          <div class="field-row">
            <label class="field"><span>Precio (texto visible)</span><input type="text" name="price" maxlength="40" value="${esc(course ? course.price : "")}" placeholder="Ej: 2,000 CUP" /></label>
            <label class="field"><span>Orden</span><input type="number" name="position" value="${course ? course.position : nextPos}" /></label>
          </div>
          <label class="check"><input type="checkbox" name="is_free" ${course && course.is_free ? "checked" : ""} /><span>Curso gratuito (los alumnos se inscriben solos, sin pago)</span></label>
          <label class="check"><input type="checkbox" name="published" ${course && course.published ? "checked" : ""} /><span>Publicado (visible para todos en el catálogo)</span></label>
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
            price: f.price.value.trim() || null,
            position: parseInt(f.position.value, 10) || 0,
            is_free: f.is_free.checked,
            published: f.published.checked,
          };
          if (!payload.title) return toast("Escribe un título.", "err");
          if (payload.is_free && !payload.price) payload.price = "Gratis";
          const btn = $("button[type=submit]", f);
          busy(btn, true, "Guardando…");
          const res = isNew ? await sb.from("courses").insert(payload) : await sb.from("courses").update(payload).eq("id", course.id);
          if (res.error) {
            busy(btn, false);
            return toast(friendly(res.error), "err");
          }
          closeModal();
          toast(isNew ? "Curso creado." : "Curso actualizado.");
          refresh();
        });
      },
    });
  }

  async function deleteCourse(course) {
    if (!window.confirm(`¿Eliminar el curso «${course.title}» con todos sus capítulos, PDF y comentarios? No se puede deshacer.`)) return;
    const ids = A.data.lessons.filter((l) => l.course_id === course.id).map((l) => l.id);
    await removeStorage(A.data.files.filter((f) => ids.includes(f.lesson_id)).map((f) => f.storage_path));
    const { error } = await sb.from("courses").delete().eq("id", course.id);
    if (error) return toast(friendly(error), "err");
    toast("Curso eliminado.");
    refresh();
  }

  function renderLessons() {
    const course = courseById(A.courseId);
    if (!course) { A.courseId = null; return renderCourses(); }
    const lessons = A.data.lessons.filter((l) => l.course_id === course.id);
    $("#adminBody").innerHTML = `
      <div class="crumbs">
        <button class="btn btn--ghost btn--sm" type="button" id="backCourses">${ICONS.back} Cursos</button>
        <h2 class="h2">${esc(course.title)}</h2>
        ${course.published ? `<span class="badge badge--ok">Publicado</span>` : `<span class="badge badge--draft">Borrador</span>`}
      </div>
      <div class="toolbar"><button class="btn btn--primary" type="button" id="newLesson">+ Nuevo capítulo</button></div>
      <div class="rows" id="lessonRows">
        ${lessons.length ? lessons.map((l) => {
          const nf = A.data.files.filter((f) => f.lesson_id === l.id).length;
          const nq = A.data.questions.filter((q) => q.lesson_id === l.id).length;
          return row({
            av: String(l.position),
            title: esc(l.title),
            subs: [`${l.drive_id ? "Video: sí" : "Video: no"} · ${nf} PDF · ${nq} ${nq === 1 ? "pregunta" : "preguntas"}`],
            meta: nq === 5 ? `<span class="badge badge--ok">Cuestionario completo</span>` : `<span class="badge badge--wait">${nq}/5 preguntas</span>`,
            actions: `<button class="btn btn--primary btn--sm" data-act="edit" data-id="${esc(l.id)}">Editar</button>
                      <button class="btn btn--ghost btn--sm" data-act="quiz" data-id="${esc(l.id)}">Cuestionario</button>
                      <button class="btn btn--danger btn--sm" data-act="delete" data-id="${esc(l.id)}">Eliminar</button>`,
          });
        }).join("") : emptyHTML("Este curso aún no tiene capítulos", "Añade el primero: título, contenido, video de Google Drive, PDF y 5 preguntas.")}
      </div>`;
    $("#backCourses").addEventListener("click", () => { A.courseId = null; render(); });
    $("#newLesson").addEventListener("click", () => openLessonModal(course, null));
    $("#lessonRows").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const l = lessonById(btn.dataset.id);
      if (!l) return;
      if (btn.dataset.act === "edit") openLessonModal(course, l);
      if (btn.dataset.act === "quiz") openQuizModal(l);
      if (btn.dataset.act === "delete") deleteLesson(l);
    });
  }

  function fileListHTML(lessonId) {
    const files = A.data.files.filter((f) => f.lesson_id === lessonId);
    if (!files.length) return `<p class="hint">Todavía no hay PDF en este capítulo.</p>`;
    return files.map((f) => `
      <div class="file">
        <span class="file__icon">${ICONS.file}</span>
        <span class="file__name">${esc(f.name)}</span>
        <button class="btn btn--danger btn--sm" type="button" data-del-file="${esc(f.id)}">Quitar</button>
      </div>`).join("");
  }

  function openLessonModal(course, lesson) {
    const isNew = !lesson;
    const nextPos = A.data.lessons.filter((l) => l.course_id === course.id).reduce((m, l) => Math.max(m, l.position), 0) + 1;
    const driveUrl = lesson && lesson.drive_id ? `https://drive.google.com/file/d/${lesson.drive_id}/view` : "";

    openModal({
      title: isNew ? "Nuevo capítulo" : "Editar capítulo",
      size: "lg",
      html: `
        <form id="lessonForm" class="form">
          <label class="field"><span>Título</span><input type="text" name="title" required maxlength="140" value="${esc(lesson ? lesson.title : "")}" placeholder="Ej: Capítulo 1: Introducción" /></label>
          <label class="field"><span>Contenido o instrucciones (texto)</span><textarea name="description" maxlength="4000" placeholder="Texto del capítulo. Las preguntas del cuestionario deben basarse en este contenido, en el video o en los PDF.">${esc(lesson ? lesson.description : "")}</textarea></label>
          <label class="field">
            <span>Enlace del video en Google Drive (opcional)</span>
            <input type="text" name="drive" value="${esc(driveUrl)}" placeholder="https://drive.google.com/file/d/..." />
            <small>En Drive: clic derecho al video → Compartir → «Cualquier persona con el enlace». Pega aquí ese enlace.</small>
          </label>
          <div class="field-row">
            <label class="field"><span>Orden dentro del curso</span><input type="number" name="position" value="${lesson ? lesson.position : nextPos}" /></label>
            <label class="field"><span>Respuestas correctas para aprobar</span><input type="number" name="pass_score" min="1" max="10" value="${lesson ? lesson.pass_score : 3}" /></label>
          </div>
          <div class="modal__foot">
            <button class="btn btn--ghost" type="button" data-close>Cancelar</button>
            <button class="btn btn--primary" type="submit">${isNew ? "Crear capítulo" : "Guardar cambios"}</button>
          </div>
        </form>
        ${isNew
          ? `<p class="hint">Guarda el capítulo para poder subir sus PDF y crear su cuestionario.</p>`
          : `<hr class="sep" />
             <div class="field"><span>PDF del capítulo (los alumnos pueden verlos y descargarlos)</span></div>
             <div class="filelist" id="fileList">${fileListHTML(lesson.id)}</div>
             <div class="upload">
               <input type="file" id="pdfInput" accept="application/pdf" multiple />
               <button class="btn btn--ghost btn--sm" type="button" id="pdfUpload">Subir PDF seleccionados</button>
               <div class="upload__status" id="uploadStatus" role="status"></div>
               <small class="hint">Solo PDF, hasta 50 MB cada uno.</small>
             </div>`}`,
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
            pass_score: Math.min(10, Math.max(1, parseInt(f.pass_score.value, 10) || 3)),
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
          await refresh();
          if (isNew && res.data) {
            toast("Capítulo creado. Ahora puedes subir PDF y crear el cuestionario.");
            openLessonModal(course, lessonById(res.data.id) || res.data);
          } else {
            toast("Capítulo actualizado.");
          }
        });
        if (!isNew) bindLessonFiles(box, lesson);
      },
    });
  }

  function bindLessonFiles(box, lesson) {
    const refreshList = async () => {
      const { data } = await sb.from("lesson_files").select("*").eq("lesson_id", lesson.id).order("created_at", { ascending: true });
      A.data.files = A.data.files.filter((f) => f.lesson_id !== lesson.id).concat(data || []);
      const list = $("#fileList", box);
      if (list) list.innerHTML = fileListHTML(lesson.id);
    };

    $("#fileList", box).addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-del-file]");
      if (!btn) return;
      const file = A.data.files.find((f) => f.id === btn.dataset.delFile);
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
    if (!window.confirm(`¿Eliminar el capítulo «${lesson.title}», sus PDF y su cuestionario?`)) return;
    await removeStorage(A.data.files.filter((f) => f.lesson_id === lesson.id).map((f) => f.storage_path));
    const { error } = await sb.from("lessons").delete().eq("id", lesson.id);
    if (error) return toast(friendly(error), "err");
    toast("Capítulo eliminado.");
    refresh();
  }

  // ----- Editor del cuestionario (preguntas de 2 a 4 opciones) -----
  let qSeq = 0;
  const OPT_LABELS = ["A", "B", "C", "D"];

  function questionBlock(q = { question: "", options: ["", "", "", ""], correct_index: 0 }) {
    const uid = ++qSeq;
    const opts = [0, 1, 2, 3].map((k) => (q.options && q.options[k]) || "");
    return `
      <fieldset class="qb" data-uid="${uid}">
        <legend>Pregunta <span class="qb__n"></span></legend>
        <label class="field"><span class="sr">Pregunta</span><input type="text" class="qb__q" maxlength="300" value="${esc(q.question)}" placeholder="Escribe la pregunta" /></label>
        <div class="qb__opts">
          ${opts.map((text, k) => `
            <label class="qb__opt">
              <input type="radio" name="correct${uid}" value="${k}" ${k === q.correct_index ? "checked" : ""} aria-label="Marcar la opción ${OPT_LABELS[k]} como correcta" />
              <input type="text" class="qb__o" maxlength="200" value="${esc(text)}" placeholder="Opción ${OPT_LABELS[k]}" />
            </label>`).join("")}
        </div>
        <button type="button" class="link-btn" data-rm>Quitar pregunta</button>
      </fieldset>`;
  }

  async function openQuizModal(lesson) {
    const { data, error } = await sb.from("lesson_questions").select("*").eq("lesson_id", lesson.id).order("position", { ascending: true });
    if (error) return toast(friendly(error), "err");
    const existing = data && data.length ? data : [undefined, undefined, undefined, undefined, undefined];

    openModal({
      title: `Cuestionario: ${lesson.title}`,
      size: "lg",
      html: `
        <form id="quizEditor" class="form">
          <p class="hint">Escribe las preguntas según el contenido del capítulo. Marca con el círculo la opción <b>correcta</b>. Se recomiendan 5 preguntas; los alumnos necesitan ${lesson.pass_score} correctas para continuar.</p>
          <div id="qList">${existing.map((q) => questionBlock(q)).join("")}</div>
          <button class="btn btn--ghost btn--sm" type="button" id="addQ">+ Añadir pregunta</button>
          <div class="modal__foot">
            <button class="btn btn--ghost" type="button" data-close>Cancelar</button>
            <button class="btn btn--primary" type="submit">Guardar cuestionario</button>
          </div>
        </form>`,
      onMount: (box) => {
        const list = $("#qList", box);
        const renumber = () => $$(".qb", list).forEach((fs, i) => ($(".qb__n", fs).textContent = String(i + 1)));
        renumber();
        $("#addQ", box).addEventListener("click", () => {
          if ($$(".qb", list).length >= 10) return toast("El máximo es 10 preguntas.", "err");
          list.insertAdjacentHTML("beforeend", questionBlock());
          renumber();
          $$(".qb__q", list).pop().focus();
        });
        list.addEventListener("click", (e) => {
          const rm = e.target.closest("[data-rm]");
          if (!rm) return;
          rm.closest(".qb").remove();
          renumber();
        });

        $("#quizEditor", box).addEventListener("submit", async (e) => {
          e.preventDefault();
          const rows = [];
          for (const [i, fs] of $$(".qb", list).entries()) {
            const question = $(".qb__q", fs).value.trim();
            const texts = $$(".qb__o", fs).map((inp) => inp.value.trim());
            const checked = $("input[type=radio]:checked", fs);
            const correct = checked ? parseInt(checked.value, 10) : -1;
            const filled = texts.filter(Boolean);
            if (!question) return toast(`Escribe el texto de la pregunta ${i + 1}.`, "err");
            if (filled.length < 2) return toast(`La pregunta ${i + 1} necesita al menos 2 opciones.`, "err");
            if (correct < 0 || !texts[correct]) return toast(`Marca una opción correcta (con texto) en la pregunta ${i + 1}.`, "err");
            rows.push({
              lesson_id: lesson.id,
              position: i + 1,
              question,
              options: filled,
              correct_index: texts.slice(0, correct).filter(Boolean).length,
            });
          }
          const btn = $("button[type=submit]", e.target);
          busy(btn, true, "Guardando…");
          const del = await sb.from("lesson_questions").delete().eq("lesson_id", lesson.id);
          if (del.error) { busy(btn, false); return toast(friendly(del.error), "err"); }
          if (rows.length) {
            const ins = await sb.from("lesson_questions").insert(rows);
            if (ins.error) { busy(btn, false); return toast(friendly(ins.error), "err"); }
          }
          closeModal();
          toast(rows.length ? "Cuestionario guardado." : "Cuestionario vaciado.");
          refresh();
        });
      },
    });
  }

  /* ---------- 7. Comentarios ---------- */
  function renderComments() {
    const list = A.data.comments;
    $("#adminBody").innerHTML = list.length
      ? `<p class="hint">Los 100 comentarios más recientes. Puedes responder desde el capítulo correspondiente (tus respuestas salen como «Equipo Kozei»).</p>
         <div class="rows" id="commentRows">${list.map((c) => {
           const l = lessonById(c.lesson_id) || {};
           const course = courseById(l.course_id) || {};
           return row({
             av: initial(c.author_name),
             title: `${esc(c.author_name)} ${c.is_staff ? `<span class="badge badge--ok">Equipo</span>` : ""}`,
             subs: [`<span class="pre">${esc(c.body)}</span>`, `${esc(course.title || "")} › ${esc(l.title || "capítulo eliminado")} · ${esc(fmtShort(c.created_at))}`],
             actions: `${l.id ? `<a class="btn btn--ghost btn--sm" href="#/curso/${esc(l.course_id)}/${esc(l.id)}">Ver capítulo</a>` : ""}
                       <button class="btn btn--danger btn--sm" data-del="${esc(c.id)}">Eliminar</button>`,
           });
         }).join("")}</div>`
      : emptyHTML("Aún no hay comentarios", "Cuando los alumnos comenten un capítulo, los verás aquí.");

    const rows = $("#commentRows");
    if (rows) rows.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-del]");
      if (!btn || !window.confirm("¿Eliminar este comentario?")) return;
      const { error } = await sb.from("lesson_comments").delete().eq("id", btn.dataset.del);
      if (error) return toast(friendly(error), "err");
      toast("Comentario eliminado.");
      refresh();
    });
  }

  /* ---------- 8. Ajustes del sitio ---------- */
  const SETTING_FIELDS = [
    { key: "payment_method", label: "Método de pago", type: "text", hint: "Aparece en las instrucciones de pago." },
    { key: "payment_account", label: "Número de cuenta o tarjeta (Transfermóvil)", type: "text", hint: "Es el número al que el alumno hará la transferencia." },
    { key: "payment_phone", label: "Teléfono móvil asociado (Transfermóvil)", type: "tel", hint: "Transfermóvil pide también el teléfono móvil." },
    { key: "payment_holder", label: "Titular de la cuenta (opcional)", type: "text", hint: "" },
    { key: "payment_note", label: "Mensaje junto a los datos de pago", type: "textarea", hint: "Por ejemplo: recordar enviar la captura por WhatsApp." },
    { key: "whatsapp", label: "WhatsApp donde recibes las capturas", type: "tel", hint: "Solo números, con código de país. Ej: 5353850111" },
    { key: "welcome_text", label: "Mensaje de bienvenida a los alumnos", type: "textarea", hint: "Se muestra debajo de «Hola, nombre!» al entrar." },
  ];

  function renderSettings() {
    $("#adminBody").innerHTML = `
      <form class="card form settings" id="settingsForm" novalidate>
        <h2>Datos de pago y mensajes</h2>
        ${SETTING_FIELDS.map((f) => `
          <label class="field">
            <span>${esc(f.label)}</span>
            ${f.type === "textarea"
              ? `<textarea name="${f.key}" maxlength="500">${esc(state.settings[f.key] || "")}</textarea>`
              : `<input type="${f.type}" name="${f.key}" maxlength="200" value="${esc(state.settings[f.key] || "")}" />`}
            ${f.hint ? `<small>${esc(f.hint)}</small>` : ""}
          </label>`).join("")}
        <button class="btn btn--primary" type="submit">Guardar ajustes</button>
      </form>
      <div class="card tips">
        <h2>Tu acceso de administración</h2>
        <p class="muted">Tu cuenta (${esc(state.user.email)}) tiene el rol de administración. Desde la pestaña <b>Usuarios</b> puedes dar o quitar ese rol a otras personas de confianza.</p>
      </div>`;

    $("#settingsForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const rows = SETTING_FIELDS.map(({ key }) => ({ key, value: f[key].value.trim(), updated_at: new Date().toISOString() }));
      const btn = $("button[type=submit]", f);
      busy(btn, true, "Guardando…");
      const { error } = await sb.from("site_settings").upsert(rows, { onConflict: "key" });
      busy(btn, false);
      if (error) return toast(friendly(error), "err");
      rows.forEach((r) => (state.settings[r.key] = r.value));
      toast("Ajustes guardados.");
    });
  }

  K.showAdmin = showAdmin;
})();
