"use client";

import { Esqueleto } from "./esqueleto";
import { Boton } from "./ui";

// Contenido para una hoja que todavía no tiene sus datos o cuya lectura falló. Se pone DENTRO de la misma <Hoja> que luego
// muestra el contenido real (no es otra hoja): así la hoja entra una sola vez y nunca queda en blanco.

/** Esqueleto de la hoja mientras carga. `forma`: "ficha" (persona o pedido: encabezado y tarjetas) o "lista". */
export function CuerpoCargando({ titulo, forma = "ficha" }: { titulo: string; forma?: "ficha" | "lista" }) {
  return (
      <div role="status" aria-busy="true" aria-label={`Cargando ${titulo.toLowerCase()}`} className="flex flex-col gap-3.5">
        {forma === "ficha" ? (
          <>
            <div className="flex flex-col items-center gap-2">
              <Esqueleto className="h-[78px] w-[78px] rounded-full" />
              <Esqueleto className="h-7 w-2/3 rounded-full" />
              <Esqueleto className="h-4 w-1/2 rounded-full" />
            </div>
            <Esqueleto className="h-12 rounded-full" />
            <Esqueleto className="h-[72px] rounded-radio-m" />
            <Esqueleto className="h-[150px] rounded-radio-l" />
          </>
        ) : (
          <>
            <Esqueleto className="h-[72px] rounded-radio-l" />
            <Esqueleto className="h-[72px] rounded-radio-l" />
            <Esqueleto className="h-[72px] rounded-radio-l" />
          </>
        )}
      </div>
  );
}

/** Una lectura falló: mensaje amable con "Reintentar" y una salida ("Volver a clientes"). */
export function CuerpoConError({ alCerrar, alReintentar, textoVolver }: { alCerrar: () => void; alReintentar: () => void; textoVolver: string }) {
  return (
      <div role="alert" className="py-4 text-center">
        <p className="font-display text-titulo-seccion">No pudimos abrir esto.</p>
        <p className="mt-1 text-texto-secundario">Puede ser tu conexión. Inténtalo otra vez.</p>
        <div className="mt-5 flex flex-col gap-2">
          <Boton anchoCompleto onClick={alReintentar}>
            Reintentar
          </Boton>
          <Boton jerarquia="secundario" anchoCompleto onClick={alCerrar}>
            {textoVolver}
          </Boton>
        </div>
      </div>
  );
}
