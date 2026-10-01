# Tu próxima jugada: comparación visual

Referencia aprobada: [mockup](../../../referencias/proxima-jugada/mockup-aprobado.png). Sus nombres y cifras son ejemplos; las capturas de abajo usan datos calculados de la demo local.

| Vista | 360 px | 390 px | 430 px |
|---|---|---|---|
| Tarjeta en «Tus clientes» | [Captura](resumen-360.png) | [Captura](resumen-390.png) | [Captura](resumen-430.png) |
| Galería, cuatro cartas | [Captura](galeria-360.png) | [Captura](galeria-390.png) | [Captura](galeria-430.png) |
| Detalle recién abierto | [Captura](detalle-360.png) | [Captura](detalle-390.png) | [Captura](detalle-430.png) |

[Fila sin WhatsApp](sin-whatsapp-390.png) y [ficha abierta desde ella](sin-whatsapp-datos-390.png), en una sesión aislada de la demo. El script quitó el número solo en ese navegador; no cambió el seed ni Supabase.

Para regenerar estas capturas: compilar y arrancar la app localmente, luego ejecutar `CAPTURAS=docs/capturas/proxima-jugada node scripts/probar-proxima-jugada.mjs` con `URL` apuntando al servidor. Las capturas corresponden a Chromium móvil con 844 px de alto; las de 430 px tienen movimiento reducido activo.
