# Validación — Admin parte 3 (Trabajo, retoque real, Personalizar)

Rama `feature/admin-trabajo` desde `39d618f` (HEAD de `feature/admin-tiendas`, PR #53 abierto, sin commits nuevos durante este
trabajo). Base de comparación: worktree desechable de `origin/feature/admin-tiendas` en el mismo contenedor, mismo
`node_modules`, mismo Chromium (`/opt/pw-browsers/chromium`) y el mismo modo de servidor (build de producción o `next dev`
según pida cada script). Handoff: [handoffs/admin-trabajo-claude.md](handoffs/admin-trabajo-claude.md).

## 1. Pruebas aprobadas

| Prueba | Resultado |
|---|---|
| `npx next typegen && npx tsc --noEmit` | Pasa. |
| `npm test` | **304/304**. Nuevos: `admin-trabajo` (ciclo compartido demo, doble envío, foto cambiada, producto retirado, fila), `svg-cabecera` (43: la cabecera real de Michel pasa; 40 ataques rechazados; el catálogo público ignora la insegura), `admin-personalizar` (merge/null, orden/opiniones, problemas, `yaAplicado`, contraste, «Pronto»). |
| `npm run lint` | 0 errores, **27 advertencias, idénticas por archivo y regla a la base** (cero nuevas). |
| `npm run build` | Pasa, **0 advertencias** (la base: 0). |
| `npm run probar:admin-db` | Replay completo en Postgres 17.6 desechable de las 43 migraciones; pruebas nuevas `scripts/probar-admin-trabajo-db.sql` (lecturas solo admin, orden sin retirados, reservar/entregar una vez/devolver, doble envío, foto cambiada y producto retirado sin sustituir ni cobrar); **44 funciones** iguales en md5 y ACL a producción. |
| `npm run revisar:migraciones` con la lista de Supabase | 43/43, **cero diferencias de versión**. |
| `probar:admin-trabajo` (nuevo, build final) | **78/78**. Catálogos (empezar → 3 pasos → revisar, la tienda ve cada paso, saltos inválidos no ofrecidos, enlace inválido no cambia nada); taller (pedir reserva sin cobrar, doble toque en Entregar cobra una vez, foto cambia en producto y catálogo `?demo`, original en el historial, devolver con motivo sin cobrar y libera la reserva, la tienda ve tostada y motivo); Personalizar (teclado, Atrás cierra la hoja, contador, borrador tras recargar, orden, aviso AA, SVG malicioso rechazado, merge sin borrar la cabecera, catálogo `?demo` refleja botón y Búsqueda); acceso en el menú (demo → `/admin-demo`); 360/390/430 × claro/oscuro sin scroll horizontal, menos movimiento en 360, segmento con flechas. **Cero peticiones a Supabase.** |
| Regresiones del panel y catálogo demo (build de producción) | Pasan: `probar-admin-tiendas`, `agotados-y-likes`, `aviso-publico`, `contadores-catalogo`, `detalle-promos`, `eliminar-producto`, `espera-tienda`, `historial-ajustes-lista`, `historial-interno`, `hojas`, `inventario`, `pedido-catalogo-panel`, `producto` (ficha con fotos, el cambio más grande del panel), `proximamente`, `reemplazo-promos`, `teclado`. |
| Scripts que piden `next dev` | Pasan en dev: `espera-fallos`, `visibilidad-catalogo`, `pedido-catalogo-transporte`, `ver-como-transporte` (12/12). |
| Lecturas reales (sin escribir) | Ver §3. |

**Fallo propio encontrado y corregido:** `probar-ver-como-transporte` falló en la rama (pasaba en la base) porque guarda su propia
lista de lecturas permitidas en Ver como y esta rama agrega `trabajosRetoque`. Se añadió de forma explícita en el script (no se
deriva del código, para que la prueba siga siendo independiente); después pasó 12/12. También `tests/catalogo-react.test.mjs`
falló por un import sin extensión en `lib/tienda/tema.ts` (carga nativa de Node); corregido con `.ts`, como el resto de `lib/`.

Al correr la batería, varios scripts reescriben capturas de otras funciones en `docs/capturas/`; se revirtieron y solo se
agregan las de `docs/capturas/admin-trabajo/`.

## 2. Fallos que ya existían (misma firma en la base)

Cada uno se corrió en la base con el mismo modo de servidor; la secuencia de pasos y el punto de falla coinciden (huella md5 de
las líneas ✓/✗/espera, sin tiempos).

| Script | Dónde falla (rama = base) | Evidencia de la causa |
|---|---|---|
| `catalogo-errores`, `catalogo-react` | Esperan el catálogo **real** de Michel. | Leen `/tienda/esencias-michel` sin `?demo`; el proxy de este contenedor rechaza `euihaeyfdlpvmbtfzvnt.supabase.co` (`CONNECT tunnel failed, response 403`). `catalogo-react` además: `DEMUXER_ERROR_NO_SUPPORTED_STREAMS` (este Chromium no decodifica el video) y WebKit no instalado. |
| `catalogo-pulido` | `assert(boxes.num.top>=boxes.circle.bottom)` (likes). | Idéntico en la base; no toca código de esta rama. |
| `inventario-fallos` | Tras 8 casos ✅, espera «Ver más ajustes» (build y dev). | Idéntico en la base en ambos modos. |
| `proxima-jugada` | Se detiene a propósito: «Tu próxima jugada está apagada (lib/funciones.ts)». | Diseño del script; su gemelo `probar-proximamente` pasa. |

## 3. Comprobaciones bloqueadas

- **Escrituras reales** (retoque con Storage y Auth reales, avanzar catálogo, guardar personalización en producción): no se
  ejecutaron. En Supabase solo existe Esencias Michel y, por instrucción, no se usa para nada que cambie créditos, fotos,
  personalización o catálogo; no se creó una tienda de ensayo sin autorización. Las escrituras quedan probadas en el replay
  (RPC reales sobre Postgres desechable) y en la demo, que no sustituyen la prueba real.
- **Lo que sí se comprobó en real, solo lectura** (`BEGIN READ ONLY … ROLLBACK`): `admin_productos_tienda` como el admin activo
  devuelve 15 productos en el mismo orden que `catalogo_publico`; `admin_personalizacion_tienda` devuelve slug/estado/
  personalización; un usuario cualquiera recibe `no_admin`. Políticas: `trabajos_retoque` se lee por miembros, Ver como y admin;
  bucket `retoques` público, insert/update solo admin. La cabecera de Michel en producción tiene el mismo md5 que la del seed
  (la acepta el validador). Michel sigue con 95 créditos y 0 trabajos.
- **Acceso «Administrar Deslizapp» en real** (admin lo ve; dueño no admin, incluida la prima, no; Ver como no): sin sesiones
  reales en este contenedor. Comportamiento cubierto por código (`soy_admin()` estricto, oculto en error y en Ver como) y por el
  layout de `/admin`, que vuelve a autorizar en el servidor.
- **Red del contenedor:** `*.supabase.co` y `*.vercel.app` están bloqueados por la política de red, así que tampoco se pudo
  abrir la preview desde aquí ni correr los scripts que leen el catálogo real.
- **iPhone/Safari físico:** no disponible; los anchos, temas, teclado y Atrás se simularon en Chromium.

## 4. Pasos para Lewis en el iPhone (preview del PR)

**Demo (no toca nada real):**
1. Abre la preview, entra en **demo** y elige **Luna Bisutería** (menú del nombre de la tienda).
2. Menú del nombre → **Admin de la demo** → Hoy → Trabajo: revisa Catálogos (en el panel, pestaña Catálogo, puedes «Pedirlo»
   antes; luego en el admin «Empezar» y «Pasar a…», y mira el paso en la pestaña Catálogo de la tienda).
3. En la tienda: Catálogo → Tobillera Arena → Editar → toca la foto → **Retocar**. Mira «En el taller» y que los créditos no
   bajaron. Repite con Anillo Brisa.
4. Admin de la demo → Trabajo → Fotos: sube cualquier foto en «Después» → **Entregar**. Vuelve a Tobillera Arena: la foto nueva
   y «Tu foto salió del taller.»; los créditos bajaron 5 (Tu plan).
5. En el admin, la siguiente foto (Anillo Brisa) → **Devolver** con un motivo. En la tienda: «Devuelta», el motivo y «Subir
   otra»; los créditos no bajaron.
6. Admin → Tiendas → la tienda → **Personalizar**: cambia «Botón de comprar», apaga Búsqueda, mueve un producto, **Guardar
   cambios** → «Ver como lo verá un cliente».

**Real (solo mirar, sin escribir en Michel):**
7. Con tu cuenta admin, abre el menú del nombre de la tienda: debe salir **Administrar Deslizapp** y llevarte a `/admin`.
   Trabajo y Personalizar se pueden abrir y leer; no guardes nada en Michel hasta tener una tienda de ensayo.
8. Con una cuenta que no sea admin (por ejemplo la de tu prima): el menú **no** debe mostrar el acceso, y `/admin` da 404.
9. Durante Ver como, el acceso tampoco aparece.

No hay recorridos reales aprobados en este PR: los pasos 7–9 están pendientes de que los hagas tú.
