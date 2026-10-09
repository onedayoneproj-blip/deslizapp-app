"use client";

import { IconoNumeral } from "../iconos";
import { useState } from "react";
import { CAMPOS_POR_RUBRO, errorDeDetalle, LARGO_DESCRIPCION, LARGO_ITEM_LISTA, LARGO_TEXTO, MAX_ITEMS_LISTA, nombreValor, type CampoDetalle, type Detalles, type Rubro } from "@/lib/rubros";
import { Hoja } from "../hoja";
import { Boton, Campo, CampoMultilinea, EditorEtiquetas, FilaLista, GrupoOpciones, ListaAgrupada } from "../ui";

/** Una fila de Detalles: un campo, o varios juntos (en perfumes, "Tamaño" = ml + concentración y "Notas" = salida, corazón y fondo). */
type FilaDetalle = { id: string; nombre: string; campos: CampoDetalle[] } | { id: "descripcion"; nombre: "Descripción"; campos: "descripcion" };

const NOTAS = ["notas_salida", "notas_corazon", "notas_fondo"];
const NOMBRE_NOTA: Record<string, string> = { notas_salida: "Salida", notas_corazon: "Corazón", notas_fondo: "Fondo" };

/** Las filas del rubro. La Descripción ya no va aquí: tiene su propio campo en la hoja (ficha-tecnica.tsx). */
function filasDe(rubro: Rubro): FilaDetalle[] {
  const campos = CAMPOS_POR_RUBRO[rubro];
  const filas: FilaDetalle[] = [];
  for (const c of campos) {
    if (rubro === "perfumes" && c.llave === "concentracion") continue;
    if (rubro === "perfumes" && (c.llave === "notas_corazon" || c.llave === "notas_fondo")) continue;
    if (rubro === "perfumes" && c.llave === "tamano_ml") {
      filas.push({ id: "tamano", nombre: "Tamaño", campos: campos.filter((x) => x.llave === "tamano_ml" || x.llave === "concentracion") });
    } else if (rubro === "perfumes" && c.llave === "notas_salida") {
      filas.push({ id: "notas", nombre: "Notas", campos: campos.filter((x) => NOTAS.includes(x.llave)) });
    } else filas.push({ id: c.llave, nombre: c.nombre, campos: [c] });
  }
  return filas;
}

/** El valor de una fila en una línea ("100 ml · EDP", "Día · Verano · Oficina"); null si está vacía. */
function resumen(fila: FilaDetalle, detalles: Detalles): string | null {
  if (fila.campos === "descripcion") return typeof detalles.descripcion === "string" ? detalles.descripcion : null;
  const partes = fila.campos.flatMap((c) => {
    const v = detalles[c.llave];
    if (v === undefined) return [];
    if (Array.isArray(v)) return v;
    if (c.llave === "tamano_ml") return [`${v} ml`];
    return [c.tipo === "elegir" ? nombreValor(String(v)) : String(v)];
  });
  return partes.length > 0 ? partes.join(" · ") : null;
}

/**
 * Detalles (tablero «Perfume»): título con "Opcionales" a la derecha y una fila por campo del rubro (lib/rubros.ts), con el
 * valor resumido o "Agregar" en `atencion-texto`. Cada fila abre su hoja según el tipo del campo.
 */
export function SeccionDetalles({
  rubro,
  detalles,
  alCambiar,
  sugerencias,
}: {
  rubro: Rubro;
  detalles: Detalles;
  alCambiar: (d: Detalles) => void;
  /** Lo que la tienda ya escribió en listas de otros productos, por llave (para las notas). */
  sugerencias: Record<string, string[]>;
}) {
  const filas = filasDe(rubro);
  const [abierta, setAbierta] = useState<FilaDetalle | null>(null);
  return (
    <section aria-labelledby="titulo-detalles" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="titulo-detalles" className="font-display text-titulo-seccion text-texto">Detalles</h3>
        <span className="text-secundario text-texto-secundario">Opcionales</span>
      </div>
      <ListaAgrupada etiqueta="Detalles del producto">
        {filas.map((f) => {
          const r = resumen(f, detalles);
          return (
            <FilaLista
              key={f.id}
              titulo={f.nombre}
              etiqueta={`${f.nombre}: ${r ?? "sin llenar"}`}
              // La descripción es larga: va debajo del nombre, en una línea. Lo demás, a la derecha.
              detalle={r && f.id === "descripcion" ? r : undefined}
              fin={
                r ? (
                  f.id === "descripcion" ? undefined : <span className="block max-w-44 truncate text-secundario font-normal text-texto-secundario">{r}</span>
                ) : (
                  <span className="text-secundario font-extrabold text-atencion-texto">Agregar</span>
                )
              }
              onClick={() => setAbierta(f)}
            />
          );
        })}
      </ListaAgrupada>
      <HojaDetalle
        fila={abierta}
        detalles={detalles}
        sugerencias={sugerencias}
        alCerrar={() => setAbierta(null)}
        alGuardar={(d) => {
          alCambiar(d);
          setAbierta(null);
        }}
      />
    </section>
  );
}

type Borrador = Record<string, string | string[]>;

/** Lo guardado como texto editable (los números se escriben). */
function aBorrador(fila: FilaDetalle, detalles: Detalles): Borrador {
  if (fila.campos === "descripcion") return { descripcion: typeof detalles.descripcion === "string" ? detalles.descripcion : "" };
  return Object.fromEntries(
    fila.campos.map((c) => {
      const v = detalles[c.llave];
      return [c.llave, Array.isArray(v) ? v : v === undefined ? (c.tipo === "lista" ? [] : "") : String(v)];
    }),
  );
}

/** El borrador como valor de `detalles` (vacío = sin la llave). */
function valorDe(c: CampoDetalle | "descripcion", v: string | string[]): string | number | string[] | undefined {
  if (Array.isArray(v)) return v.length > 0 ? v : undefined;
  const limpio = v.trim();
  if (!limpio) return undefined;
  if (c !== "descripcion" && c.tipo === "numero") return /^\d+$/.test(limpio) ? Number(limpio) : Number.NaN;
  return limpio;
}

function HojaDetalle({
  fila,
  detalles,
  sugerencias,
  alCerrar,
  alGuardar,
}: {
  fila: FilaDetalle | null;
  detalles: Detalles;
  sugerencias: Record<string, string[]>;
  alCerrar: () => void;
  alGuardar: (d: Detalles) => void;
}) {
  const [visto, setVisto] = useState(fila);
  const [borrador, setBorrador] = useState<Borrador>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  if (fila && fila !== visto) {
    setVisto(fila);
    setBorrador(aBorrador(fila, detalles));
    setErrores({});
  }
  const f = fila ?? visto;
  if (!f) return null;
  const campos: (CampoDetalle | "descripcion")[] = f.campos === "descripcion" ? ["descripcion"] : f.campos;
  const llave = (c: CampoDetalle | "descripcion") => (c === "descripcion" ? "descripcion" : c.llave);
  const poner = (k: string, v: string | string[]) => {
    setBorrador((b) => ({ ...b, [k]: v }));
    setErrores((e) => ({ ...e, [k]: "" }));
  };

  const listo = () => {
    const nuevos: Detalles = { ...detalles };
    const errs: Record<string, string> = {};
    for (const c of campos) {
      const k = llave(c);
      const v = valorDe(c, borrador[k] ?? "");
      const error = typeof v === "number" && Number.isNaN(v) ? "Escribe un número entero mayor que cero." : errorDeDetalle(c, v);
      if (error) errs[k] = error;
      else if (v === undefined) delete nuevos[k];
      else nuevos[k] = v;
    }
    if (Object.keys(errs).length > 0) setErrores(errs);
    else alGuardar(nuevos);
  };
  const hayAlgo = campos.some((c) => detalles[llave(c)] !== undefined);
  const quitar = () => {
    const nuevos = { ...detalles };
    for (const c of campos) delete nuevos[llave(c)];
    alGuardar(nuevos);
  };

  return (
    <Hoja abierta={fila !== null} alCerrar={alCerrar} titulo={f.nombre}>
      <div className="flex flex-col gap-5">
        {f.id === "notas" && <p className="-mt-2 text-secundario text-texto-secundario">Escribe y toca Enter. Las que más se sienten, primero.</p>}
        {campos.map((c) => {
          const k = llave(c);
          const valor = borrador[k] ?? "";
          const error = errores[k] || null;
          if (c === "descripcion") {
            const texto = String(valor);
            return (
              <CampoMultilinea
                key={k}
                etiqueta="Descripción"
                filas={5}
                maxLength={LARGO_DESCRIPCION}
                value={texto}
                onChange={(e) => poner(k, e.target.value)}
                placeholder="Cuéntalo como se lo dirías a una clienta."
                error={error}
                ayuda={`${texto.length} de ${LARGO_DESCRIPCION}`}
              />
            );
          }
          const rotulo = f.id === "notas" ? NOMBRE_NOTA[c.llave] ?? c.nombre : f.campos.length > 1 ? c.nombre : c.nombre;
          switch (c.tipo) {
            case "texto":
              return <Campo key={k} etiqueta={rotulo} maxLength={LARGO_TEXTO} value={String(valor)} onChange={(e) => poner(k, e.target.value)} error={error} />;
            case "numero":
              return (
                <Campo
                  key={k}
                  etiqueta={c.llave === "tamano_ml" ? "Mililitros" : rotulo}
                  icono={IconoNumeral}
                  inputMode="numeric"
                  value={String(valor)}
                  onChange={(e) => poner(k, e.target.value.replace(/\D/g, "").slice(0, 9))}
                  error={error}
                />
              );
            case "elegir":
              return (
                <div key={k} className="flex flex-col gap-1.5">
                  <GrupoOpciones titulo={rotulo} valor={String(valor) || null} alCambiar={(v) => poner(k, v)} opciones={c.valores.map((v) => ({ id: v, texto: nombreValor(v) }))} />
                  {error && <p className="text-secundario font-bold text-peligro">{error}</p>}
                </div>
              );
            case "lista":
              return (
                <EditorEtiquetas
                  key={k}
                  etiqueta={rotulo}
                  valores={Array.isArray(valor) ? valor : []}
                  alCambiar={(v) => poner(k, v)}
                  permitidos={c.valores}
                  sugerencias={c.valores ? undefined : f.id === "notas" ? sugerencias.notas ?? [] : sugerencias[k] ?? []}
                  maximo={MAX_ITEMS_LISTA}
                  largoMaximo={LARGO_ITEM_LISTA}
                  error={error}
                />
              );
          }
        })}
        <Boton tamano="grande" anchoCompleto onClick={listo}>
          Listo
        </Boton>
        {hayAlgo && (
          <Boton jerarquia="terciario" tono="peligro" anchoCompleto onClick={quitar}>
            Quitar {f.nombre.toLocaleLowerCase("es")}
          </Boton>
        )}
      </div>
    </Hoja>
  );
}

/** Lo que la tienda ya usó en las listas de sus productos (sin repetir), por llave; y "notas" con las tres juntas. */
export function sugerenciasDeDetalles(listas: Detalles[]): Record<string, string[]> {
  const por: Record<string, Set<string>> = {};
  for (const d of listas) {
    for (const [k, v] of Object.entries(d)) {
      if (!Array.isArray(v)) continue;
      for (const x of v) {
        (por[k] ??= new Set()).add(x);
        if (NOTAS.includes(k)) (por.notas ??= new Set()).add(x);
      }
    }
  }
  return Object.fromEntries(Object.entries(por).map(([k, s]) => [k, [...s].sort((a, b) => a.localeCompare(b, "es"))]));
}
