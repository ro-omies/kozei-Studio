/* ==========================================================
   Kozei STUDIO · página de inscripción
   Aquí editas todo lo que cambia con el tiempo:
   WHATSAPP, PAGO y CURSOS.
   ========================================================== */

const WHATSAPP = "5353850111";

const PAGO = {
  metodo: "Transfermóvil",
  tarjeta: "0000 0000 0000 0000",   // ← PON AQUÍ el número de tu tarjeta
  titular: "Titular: Kozei STUDIO", // ← ajusta o deja vacío ""
  nota: "Si tu transferencia pide un teléfono de confirmación, escríbenos por WhatsApp y te lo damos."
};

/* Para abrir inscripciones de una nueva edición:
   cambia activo a true y actualiza inicio/duracion.
   El enlace del curso es inscripcion.html?curso=<clave> */
const CURSOS = {
  "diseno-grafico": {
    titulo: "Diseño gráfico básico para emprendedores",
    activo: true,
    descripcion: "Aprende los fundamentos del diseño para que tus publicaciones, tu logo y tus materiales se vean profesionales.",
    inicio: "1 de diciembre",
    duracion: "1 semana",
    modalidad: "Online",
    precio: "2,000 CUP",
    extra: "Certificado",
    contenido: [
      "Qué es la identidad visual",
      "Logotipo y versiones",
      "Paleta de colores",
      "Tipografías y cómo combinarlas",
      "Composición y jerarquía",
      "Cómo hacer posts profesionales",
      "Mini manual de marca"
    ]
  },
  "claude-basico": {
    titulo: "Aprende Claude Básico",
    activo: false,
    mensajeCerrado: "Este curso ya cerró sus inscripciones. Habrá una nueva edición a mediados de diciembre; escríbenos por WhatsApp para avisarte cuando abra.",
    descripcion: "Aprende desde cero a usar Claude: crea tu cuenta, conecta tus herramientas, configura skills y escribe prompts que funcionan.",
    inicio: "Por confirmar",
    duracion: "3 días",
    modalidad: "Online",
    precio: "1,000 CUP",
    extra: "PDF, videos y audios",
    contenido: [
      "Qué es Claude",
      "Crear tu cuenta en Claude",
      "Qué son los conectores y en qué nos ayudan",
      "Cómo configurarlos",
      "Qué son las Skills, cómo nos ayudan y cómo configurarlas",
      "Cómo crear prompts funcionales para Claude"
    ]
  }
};

/* ---------------------------------------------------------- */

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const clave = params.get("curso");
const curso = CURSOS[clave];

function mostrarNoDisponible(titulo, texto) {
  $("nd-titulo").textContent = titulo;
  $("nd-texto").textContent = texto;
  $("no-disponible").hidden = false;
  document.title = "Curso no disponible | Kozei STUDIO";
}

if (!curso) {
  mostrarNoDisponible("No encontramos ese curso", "Revisa el enlace o elige un curso abierto desde la web.");
} else if (!curso.activo) {
  mostrarNoDisponible(curso.titulo, curso.mensajeCerrado || "Este curso ya cerró sus inscripciones.");
} else {
  iniciar();
}

function iniciar() {
  document.title = "Inscripción: " + curso.titulo + " | Kozei STUDIO";
  $("contenido").hidden = false;
  $("curso-titulo").textContent = curso.titulo;
  $("curso-desc").textContent = curso.descripcion;

  const datos = [
    ["Comienza", curso.inicio],
    ["Duración", curso.duracion],
    ["Modalidad", curso.modalidad],
    ["Precio", curso.precio]
  ];
  if (curso.extra) datos.push(["Incluye", curso.extra]);
  datos.forEach(([k, v]) => {
    const wrap = document.createElement("div");
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    wrap.append(dt, dd);
    $("curso-datos").append(wrap);
  });

  curso.contenido.forEach((t) => {
    const li = document.createElement("li"); li.textContent = t;
    $("curso-contenido").append(li);
  });

  $("pago-monto").textContent = curso.precio;
  $("pago-tarjeta").textContent = PAGO.tarjeta;
  $("pago-titular").textContent = PAGO.titular;
  $("pago-nota").textContent = PAGO.nota;

  $("copiar").addEventListener("click", copiarTarjeta);
  $("form").addEventListener("submit", enviar);
}

async function copiarTarjeta() {
  const btn = $("copiar");
  const numero = PAGO.tarjeta.replace(/\s+/g, "");
  try {
    await navigator.clipboard.writeText(numero);
    btn.textContent = "Copiado";
  } catch (e) {
    btn.textContent = "Cópiala a mano";
  }
  setTimeout(() => (btn.textContent = "Copiar"), 2000);
}

function marcar(campo, mensaje) {
  const err = $("e-" + campo);
  err.textContent = mensaje || "";
  const field = err.previousElementSibling && err.previousElementSibling.closest
    ? err.previousElementSibling.closest(".field") : null;
  if (field) field.classList.toggle("invalid", Boolean(mensaje));
  return !mensaje;
}

function validar(v) {
  const digitos = v.telefono.replace(/\D/g, "");
  const resultados = [
    marcar("nombre", v.nombre.length < 5 ? "Escribe tu nombre y apellidos." : ""),
    marcar("telefono", digitos.length < 8 ? "Escribe un número de WhatsApp válido." : ""),
    marcar("provincia", v.provincia.length < 3 ? "Escribe tu provincia." : ""),
    marcar("correo", v.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo) ? "Revisa el correo electrónico." : ""),
    marcar("acepto", $("acepto").checked ? "" : "Marca esta casilla para continuar.")
  ];
  return resultados.every(Boolean);
}

function enviar(ev) {
  ev.preventDefault();
  const v = {
    nombre: $("nombre").value.trim(),
    telefono: $("telefono").value.trim(),
    provincia: $("provincia").value.trim(),
    correo: $("correo").value.trim()
  };
  if (!validar(v)) {
    const primero = document.querySelector(".field.invalid input") || $("acepto");
    primero.focus();
    return;
  }

  const lineas = [
    "Hola, quiero formalizar mi inscripción en el curso *" + curso.titulo + "*.",
    "",
    "Inicio: " + curso.inicio,
    "Precio: " + curso.precio + " (pago por " + PAGO.metodo + ")",
    "",
    "Nombre: " + v.nombre,
    "WhatsApp: " + v.telefono,
    "Provincia: " + v.provincia
  ];
  if (v.correo) lineas.push("Correo: " + v.correo);
  lineas.push("", "Te envío la captura del pago a continuación.");

  const url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(lineas.join("\n"));

  $("enviar").disabled = true;
  $("enviar").textContent = "Abriendo WhatsApp…";
  $("fallback-link").href = url;
  $("fallback").hidden = false;
  window.location.href = url;

  setTimeout(() => {
    $("enviar").disabled = false;
    $("enviar").textContent = "Continuar a WhatsApp";
  }, 4000);
}
