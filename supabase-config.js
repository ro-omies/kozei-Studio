/* ==========================================================
   Kozei STUDIO · Cursos online · Configuración
   Edita SOLO este archivo para conectar la plataforma.
   ========================================================== */

window.KOZEI_CONFIG = {
  /* --- Supabase ---------------------------------------------------------
     Supabase → Project Settings → API:
       • Project URL            → SUPABASE_URL
       • anon / public key      → SUPABASE_ANON_KEY
     Usa SIEMPRE la clave "anon public". NUNCA pegues aquí la "service_role":
     esa clave da control total y no debe estar en una página web.           */
  SUPABASE_URL: "https://mdvgdcqlzkvfwqqwfnic.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdmdkY3Fsemt2ZndxcXdmbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0ODIyNjAsImV4cCI6MjEwOTA1ODI2MH0.ywf-dhyliNw46kzq9rJFnoqMSig3VKM7SoY0-iAqAV0",

  /* --- Contacto ---------------------------------------------------------
     Número de WhatsApp al que los alumnos envían el comprobante
     (solo dígitos, con código de país).                                    */
  WHATSAPP: "5353850111",

  /* --- Datos de pago (se muestran al alumno cuando su cuenta está pendiente) */
  PAYMENT: {
    method: "Transfermóvil",
    account: "9224-9598-7903-4211", // ← cámbialo por el tuyo
    holder: "Rosio",                                // opcional: nombre del titular
    note: "Indica en la transferencia el curso que quieres y envía el comprobante por WhatsApp.",
  },

  /* --- Almacenamiento de PDF (debe coincidir con el SQL) ------------------- */
  STORAGE_BUCKET: "course-files",
  PDF_URL_SECONDS: 300, // los enlaces temporales de los PDF caducan a los 5 minutos

  /* --- Protección del contenido ------------------------------------------ */
  WATERMARK: true,     // marca de agua con el nombre y correo del alumno
  SANDBOX_VIDEO: true, // impide que el video se abra en otra pestaña.
                       // Si algún video no se reprodujera, pon false.
};
