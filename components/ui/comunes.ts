// Piezas compartidas por los componentes base (components/ui/). Solo tokens del sistema (docs/09-sistema-de-diseno.md).

/** Anillo de foco de teclado: 3 px del color `foco`, separado del borde. Lo llevan todos los controles. */
export const FOCO = "outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco";

/** Une clases saltándose las vacías. */
export const clases = (...lista: (string | false | null | undefined)[]) => lista.filter(Boolean).join(" ");

/** Área de toque de 44 px para un control de 36 px (pseudo-elemento invisible: no cambia lo que se ve). */
export const TOQUE_44 = "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']";
