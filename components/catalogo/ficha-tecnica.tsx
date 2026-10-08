"use client";

import { useRef, useState } from "react";
import { borradorAlQuitar, contadorDescripcion, fichaVisible, type BorradorFicha } from "@/lib/ficha-tecnica";
import { LARGO_DESCRIPCION } from "@/lib/rubros";
import { reducirFoto } from "@/lib/imagen";
import { Foto } from "../foto";
import { Boton, CampoMultilinea } from "../ui";

/**
 * Descripción: hasta 600 caracteres (es `detalles.descripcion`). La búsqueda del catálogo la usa; el formulario lo dice en una línea.
 */
export function SeccionDescripcion({
  valor,
  alCambiar,
  deshabilitado,
  alTocarBloqueado,
  sinTitulo = false,
}: {
  valor: string;
  alCambiar: (texto: string) => void;
  deshabilitado?: boolean;
  alTocarBloqueado?: () => void;
  /** Dentro de una fila plegable de la hoja de producto: el título ya lo lleva la fila. */
  sinTitulo?: boolean;
}) {
  return (
    <div onClick={deshabilitado ? alTocarBloqueado : undefined}>
      <CampoMultilinea
        etiqueta={sinTitulo ? <span className="sr-only">Descripción</span> : "Descripción"}
        filas={4}
        maxLength={LARGO_DESCRIPCION}
        value={valor}
        disabled={deshabilitado}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder="Cuéntalo como se lo dirías a una clienta."
        ayuda={
          <>
            <span className="block text-right tabular-nums">{contadorDescripcion(valor)}</span>
            <span className="block">Lo que escribas aquí también lo usa la búsqueda de tu catálogo.</span>
          </>
        }
      />
    </div>
  );
}

/**
 * Ficha técnica: UNA foto con las especificaciones, que sube la tienda (opcional). Se guarda junto con el producto. Un Ayudante la
 * ve apagada: `sinPermiso` avisa por qué.
 */
export function SeccionFichaTecnica({
  actual,
  borrador,
  alCambiar,
  sinPermiso,
  porque,
  avisar,
  sinTitulo = false,
}: {
  actual: string | null | undefined;
  borrador: BorradorFicha;
  alCambiar: (b: BorradorFicha) => void;
  sinPermiso: boolean;
  porque: string;
  avisar: (texto: string) => void;
  /** Dentro de una fila plegable: sin título ni tarjeta propia. */
  sinTitulo?: boolean;
}) {
  const archivo = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const foto = fichaVisible(actual, borrador);

  const elegir = () => {
    if (sinPermiso) avisar(porque);
    else archivo.current?.click();
  };
  const leer = async (f: File | undefined) => {
    if (!f) return;
    setLeyendo(true);
    try {
      alCambiar({ tipo: "nueva", foto: await reducirFoto(f) });
      setConfirmando(false);
    } catch {
      avisar("Esa foto no quiso abrir. Prueba con otra.");
    } finally {
      setLeyendo(false);
    }
  };
  const quitar = () => {
    if (sinPermiso) return avisar(porque);
    if (!confirmando) return setConfirmando(true);
    setConfirmando(false);
    // Una foto nueva que aún no se guardó solo se descarta; una guardada se quita al guardar el producto.
    alCambiar(borradorAlQuitar(actual));
  };

  return (
    <section aria-labelledby="titulo-ficha" className="flex flex-col gap-2">
      {sinTitulo ? <h3 id="titulo-ficha" className="sr-only">Ficha técnica</h3> : <h3 id="titulo-ficha" className="font-display text-titulo-seccion text-texto">Ficha técnica</h3>}
      <div className={sinTitulo ? "flex flex-col gap-3" : "flex flex-col gap-3 rounded-radio-l border border-linea bg-superficie p-4"}>
        <input ref={archivo} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void leer(e.target.files?.[0]); e.target.value = ""; }} />
        {foto ? (
          <>
            <div className="flex items-center gap-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-radio-m bg-superficie-hundida">
                <Foto src={foto} alt="Ficha técnica del producto" className="h-full w-full" sizes="80px" />
              </div>
              <p className="min-w-0 text-secundario text-texto-secundario">
                {borrador.tipo === "nueva" ? "Se sube cuando guardes el producto." : "Se ve en tu catálogo, junto a «Ver presentaciones»."}
              </p>
            </div>
            <div className="flex gap-2">
              <Boton jerarquia="secundario" onClick={elegir} cargando={leyendo}>Cambiar</Boton>
              {confirmando ? (
                <>
                  <Boton jerarquia="terciario" tono="peligro" onClick={quitar}>Sí, quitar</Boton>
                  <Boton jerarquia="terciario" onClick={() => setConfirmando(false)}>Mejor no</Boton>
                </>
              ) : (
                <Boton jerarquia="terciario" tono="peligro" onClick={quitar}>Quitar</Boton>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-secundario text-texto-secundario">Si tienes la foto de las especificaciones, súbela.</p>
            <Boton jerarquia="secundario" anchoCompleto onClick={elegir} cargando={leyendo}>Subir foto de la ficha</Boton>
          </>
        )}
      </div>
    </section>
  );
}
