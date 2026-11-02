# Cursos online · Kozei STUDIO — puesta en marcha

## Archivos nuevos
| Archivo | Para qué sirve |
|---|---|
| `cursos-online.html` | La plataforma (acceso, mis cursos, reproductor y panel de administración) |
| `cursos-online.css` | Estilos de la plataforma |
| `cursos-online.js` | Lógica de la plataforma |
| `supabase-config.js` | **El único archivo que debes editar** (claves, WhatsApp y datos de pago) |
| `supabase-setup.sql` | Crea las tablas y las reglas de seguridad en Supabase |

Mantén todo en la misma carpeta que `index.html`, junto a la carpeta `img/`.

## Pasos (una sola vez)
1. **Supabase → SQL Editor → New query:** pega `supabase-setup.sql` y pulsa *Run*.
2. **Supabase → Project Settings → API:** copia la *Project URL* y la clave *anon public* en `supabase-config.js`.
   Nunca uses la clave `service_role` en la web.
3. En `supabase-config.js` escribe tu número de tarjeta o cuenta de Transfermóvil (`PAYMENT.account`).
4. **Supabase → Authentication → Providers → Email:** desactiva *Confirm email*.
   Así los alumnos entran sin depender de un correo de confirmación, porque tú verificas el pago a mano.
5. **Supabase → Authentication → URL Configuration:** en *Site URL* pon la dirección de tu web (por ejemplo `https://tu-sitio.netlify.app`).
6. Abre `cursos-online.html`, crea una cuenta con **tu** correo y, en el SQL Editor, ejecuta (con tu correo):
   `update public.profiles set role = 'admin', status = 'active' where email = 'TU_CORREO@ejemplo.com';`
   Cierra sesión y vuelve a entrar: aparece el botón **Panel admin**.
7. Sube la carpeta completa a Netlify.

## Cómo se usa
**Un alumno nuevo:** crea su cuenta → paga por Transfermóvil → te manda el comprobante por WhatsApp.
**Tú:** Panel admin → *Alumnos* → *Activar acceso* → marcas los cursos que pagó → *Activar*.
El sistema te ofrece avisarle por WhatsApp.

**Crear un curso:** Panel admin → *Cursos* → *Nuevo curso* → *Lecciones* → *Nueva lección*.
- **Video:** pega el enlace de Google Drive. El video debe estar compartido como «Cualquier persona con el enlace».
- **PDF:** una vez guardada la lección, súbelos desde la misma ventana (se guardan en un espacio privado de Supabase).
- Marca el curso como **Publicado** para que los alumnos lo vean.

## Qué protege y qué no
- Los alumnos solo ven los cursos que activaste y solo después de iniciar sesión (lo garantizan las reglas de Supabase).
- Los PDF se muestran en pantalla, sin botón de descarga, con enlaces temporales de 5 minutos y marca de agua.
- Los videos llevan marca de agua con el nombre y correo del alumno, sin botón para abrirlos en otra pestaña y sin clic derecho.
- **Límite real:** nadie puede impedir una grabación de pantalla o una foto con otro celular.
  Y como los videos están en Google Drive, el enlace del video es visible para quien inspeccione la página con sesión iniciada.
  Si algún día necesitas más protección, el siguiente paso es alojar los videos en Bunny Stream o Vimeo (enlaces firmados que caducan).
