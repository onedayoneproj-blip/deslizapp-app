# Hoja

Panel que sube desde abajo para detalles, formularios, selecciones y listas de acciones.

- Fondo `fondo`, esquinas superiores `radio-xl`, `sombra-hoja`, agarradera arriba, título `titulo-hoja` y botón cerrar redondo `superficie-hundida` de 44 px.
- **Automática** (por defecto): mide su contenido hasta el 92 % de la pantalla y hace scroll dentro si no cabe.
- **Completa:** toda la pantalla, solo si hay teclado o una lista que crece mientras se usa (buscar cliente, elegir productos). Nunca deja un hueco vacío abajo sin teclado.
- La acción principal va al pie, fija, en botón grande.
- Máximo dos hojas apiladas; solo la de arriba responde a deslizar, tocar fuera, Escape y atrás.
- Con cambios sin guardar, cerrar abre la **Alerta** "¿Salir sin guardar?".

Ya existe en `components/hoja.tsx`; el cambio es que la altura se elige con esta regla y que use los tokens.

**Props actuales:** `abierta`, `alCerrar`, `titulo`, `altura: "auto" | "grande"`, `fijoArriba?`, `avisarAlSalir?`.
