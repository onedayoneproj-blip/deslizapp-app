// Texto y cuenta de la fila "Ver N más" (components/ver-mas.tsx). Puro, con pruebas en tests/ver-mas.test.mjs.

/** Cuántos elementos se muestran de una vez en las listas largas (y cuántos más trae cada "Ver más"). */
export const PASO_LISTA = 30;

/** Cuántos se van a mostrar al tocar "Ver N más": el tramo siguiente, o lo que quede si es menos. */
export const siguientes = (quedan: number, pagina: number = PASO_LISTA) => Math.min(pagina, Math.max(0, quedan));

/** El texto de la fila: "Ver 5 más". */
export const textoVerMas = (quedan: number, pagina: number = PASO_LISTA) => `Ver ${siguientes(quedan, pagina)} más`;
