# Onboarding de Deslizapp (lienzo de Lewis, recibido el 9 oct 2026)

33 pantallas de 390×844. Aquí van las capturas (`pantallas/`, índice en `indice.md`); el archivo original del lienzo pesa 11 MB y no se guarda en el repo. **Referencia: nunca copiar el HTML**; se construye con `components/ui/` y el sistema de diseño.

Decisión ya tomada (6 oct 2026, `docs/00`): **opción B**, historias para la introducción y también para recopilar los datos. La opción A (reels) y la C (datos en reels) son alternativas del mismo lienzo.

## Qué es cada grupo y cómo está en el repo (revisado por Planning, 9 oct)

| Grupo | Pantallas | Estado |
|---|---|---|
| Llega el link y se abre | 01, 02, 32 | `/unirse/<código>` existe (entrar con Google, esperando, «ya no sirve»), pero **sin el diseño de la invitación** (boleto «Tu invitación a Deslizapp», «Te guardamos un sitio») ni el mensaje de WhatsApp. Falta aplicar el diseño. |
| Introducción en historias (opción B) | 07, 08, 09, 10 y «Ya lo viste. Ahora la tuya.» | **No existe.** Sin especificación ni prompt. |
| Alternativa en reels (opción A, no elegida) | 03, 04, 05, 06, 07 | No se construye. |
| Datos en historias, 4 capítulos (nombre → qué vende → WhatsApp → tu nombre) + «Tu tienda ya existe» | 12, 13, 14, 15, 17 | **No existe.** Hoy `/unirse` crea la tienda con un formulario simple (nombre y rubro). |
| Tienda pre-llenada: «solo confirma» y, en el admin, «Nueva invitación» con «Dejar la tienda lista» | 16, 32, 33 | **No existe.** Es el caso de Soft Era; hoy se hace a mano con SQL. |
| Inicio del primer día: checklist de 7 pasos y «Pide tu catálogo» al desbloquear | 23, 24 | **No existe** (no hay checklist en el código). Falta definir los 7 pasos. |
| Tipo de producto | 25, 26 | Hecho (tipo de producto, selector de catálogos). Verificar que coincida con el diseño. |
| Tu equipo, invitación, empleada abre el link, «Ya es del equipo» | 27, 28, 29, 30 | Hecho (colaboradores e invitaciones, PR #61). Verificar que coincida con el diseño. |
| Admin: lista de invitaciones | 31 | Existe (Más → invitaciones); el diseño agrega estados «Pre-llenada», «Vacía», «Usadas», «Vencidas». |

## Documentos que hablan de esto
`docs/16-ruta-al-lanzamiento.md` (Ola 1, punto 3: «Prompts por escribir»), `docs/00-contexto-del-proyecto.md` (opción B elegida), `docs/13-admin.md` §11, `docs/14-precios-y-lanzamiento.md` (subir productos como paso del checklist), `docs/15-mi-marca-magica.md` (el cuestionario «Deslizapp quiere conocerte» NO va en el onboarding).

## Pendiente
Escribir la especificación y los prompts por partes (introducción, datos, pre-llenada, checklist, invitación) y definir los 7 pasos del checklist.
