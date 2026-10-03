// Interruptores de funciones. Una función apagada no se monta, no pide datos y no llama a la base: en su lugar se ve
// "Próximamente" (docs/09 §10, Función en preparación). Para encenderla, cambia su valor a true aquí y en ningún otro lado.

export const FUNCIONES: { proximaJugada: boolean } = {
  /** Tu próxima jugada: galería, barrido, "Escribirle a…", códigos personales y registro de envíos. */
  proximaJugada: false,
};
