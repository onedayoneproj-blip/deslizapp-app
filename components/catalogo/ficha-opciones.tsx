"use client";

import { useState } from "react";
import { colorPorNombre, esEjeColor } from "@/lib/colores";
import { MOTIVOS_INVENTARIO } from "@/lib/data/inventario";
import { OPCIONES_TIPICAS, type Rubro } from "@/lib/rubros";
import type { MotivoAjusteInventario, OpcionProducto, Producto, Variante } from "@/lib/types";
import { Hoja } from "../hoja";
import { Alerta, Boton, Campo, CampoMultilinea, EditorEtiquetas, FilaAgregar, FilaLista, FilaVariante, GrupoOpciones, ListaAgrupada } from "../ui";

export const MAX_EJES = 2;
const MAX_VALORES = 12;
const LARGO_VALOR = 20;
/** Cuántas combinaciones se ven antes de "Ver las N". */
const VISIBLES = 5;

/** La llave de una combinación: igual sin importar el orden de los ejes en el objeto. */
export const claveVariante = (valores: Record<string, string>) =>
  Object.keys(valores)
    .sort()
    .map((k) => `${k}=${valores[k]}`)
    .join("|");

/** Todas las combinaciones de los ejes, en el orden de los ejes y de sus valores ("S · Arena", "S · Negro", "M · Arena"…). */
export function combinaciones(opciones: OpcionProducto[]): Record<string, string>[] {
  if (opciones.length === 0) return [];
  return opciones.reduce<Record<string, string>[]>((acc, eje) => acc.flatMap((c) => eje.valores.map((v) => ({ ...c, [eje.nombre]: v }))), [{}]);
}

export const textoCombinacion = (opciones: OpcionProducto[], valores: Record<string, string>) =>
  opciones.map((o) => valores[o.nombre]).filter(Boolean).join(" · ");

/** Las variantes activas del producto, por llave. */
export function variantesBase(producto: Producto | null): Map<string, Variante> {
  return new Map((producto?.variantes ?? []).filter((v) => v.activa).map((v) => [claveVariante(v.valores), v]));
}

/** El color de una combinación si algún eje es Color y el nombre se conoce. */
function colorDe(opciones: OpcionProducto[], valores: Record<string, string>) {
  const eje = opciones.find((o) => esEjeColor(o.nombre));
  return eje ? colorPorNombre(valores[eje.nombre] ?? "") : null;
}

/**
 * Opciones (tablero «Ropa»): sin opciones, solo la fila "Agregar opción"; con opciones, una fila por eje con sus valores y al
 * final "Agregar opción" (máximo 2 ejes). Debajo, si hay opciones, el Stock por combinación.
 */
export function SeccionOpciones({
  rubro,
  opciones,
  alCambiarOpciones,
  stock,
  alCambiarStock,
  deshabilitado,
}: {
  rubro: Rubro;
  opciones: OpcionProducto[];
  alCambiarOpciones: (o: OpcionProducto[]) => void;
  /** Stock por llave de combinación. */
  stock: Record<string, number>;
  alCambiarStock: (clave: string, valor: number) => void;
  deshabilitado?: boolean;
}) {
  const [editando, setEditando] = useState<number | "nueva" | null>(null);
  const [todas, setTodas] = useState(false);
  const combos = combinaciones(opciones);
  const total = combos.reduce((s, c) => s + (stock[claveVariante(c)] ?? 0), 0);
  const visibles = todas ? combos : combos.slice(0, VISIBLES);

  return (
    <>
      <section aria-labelledby="titulo-opciones" className="flex flex-col gap-2">
        <h3 id="titulo-opciones" className="font-display text-titulo-seccion text-texto">Opciones</h3>
        <ListaAgrupada etiqueta="Opciones del producto">
          {opciones.map((o, i) => (
            <FilaLista
              key={o.nombre}
              titulo={o.nombre}
              fin={<span className="block max-w-44 truncate text-secundario font-normal text-texto-secundario">{o.valores.join(" · ")}</span>}
              onClick={() => setEditando(i)}
            />
          ))}
          {opciones.length < MAX_EJES && (
            <li className="border-t border-linea px-4 first:border-t-0">
              <FilaAgregar texto="Agregar opción" alTocar={() => setEditando("nueva")} deshabilitado={deshabilitado} className="min-h-15" />
            </li>
          )}
        </ListaAgrupada>
      </section>

      {opciones.length > 0 && (
        <section aria-labelledby="titulo-stock" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="titulo-stock" className="font-display text-titulo-seccion text-texto">Stock</h3>
            <span className="text-secundario text-texto-secundario">{total} en total</span>
          </div>
          <ListaAgrupada etiqueta="Stock por opción">
            {visibles.map((c) => {
              const clave = claveVariante(c);
              return (
                <FilaVariante
                  key={clave}
                  texto={textoCombinacion(opciones, c)}
                  color={colorDe(opciones, c)}
                  stock={stock[clave] ?? 0}
                  alCambiar={(v) => alCambiarStock(clave, v)}
                  deshabilitado={deshabilitado}
                />
              );
            })}
            {!todas && combos.length > VISIBLES && (
              <li className="border-t border-linea">
                <button type="button" onClick={() => setTodas(true)} className="tocable flex min-h-13 w-full items-center justify-center text-destacado text-accion">
                  Ver las {combos.length}
                </button>
              </li>
            )}
          </ListaAgrupada>
        </section>
      )}

      <HojaOpcion
        abierta={editando !== null}
        rubro={rubro}
        eje={typeof editando === "number" ? opciones[editando] ?? null : null}
        otros={opciones.filter((_, i) => i !== editando)}
        alCerrar={() => setEditando(null)}
        alGuardar={(eje) => {
          alCambiarOpciones(typeof editando === "number" ? opciones.map((o, i) => (i === editando ? eje : o)) : [...opciones, eje]);
          setEditando(null);
        }}
        alQuitar={() => {
          alCambiarOpciones(opciones.filter((_, i) => i !== editando));
          setEditando(null);
        }}
      />
    </>
  );
}

const OTRA = "\u0000otra";

/** Atajos de valores para un eje que se llama Talla (ninguno para los demás). */
function atajosDe(nombre: string): { texto: string; valores: string[] }[] {
  if (!/^talla/i.test(nombre.trim())) return [];
  return [
    { texto: "XS a XL", valores: ["XS", "S", "M", "L", "XL"] },
    { texto: "36 a 42", valores: ["36", "37", "38", "39", "40", "41", "42"] },
    { texto: "Única", valores: ["Única"] },
  ];
}

/** Hoja "Agregar opción" (tablero «AgregarOpcion»): qué elige el cliente, sus valores, atajos y cuántas combinaciones salen. */
function HojaOpcion({
  abierta,
  rubro,
  eje,
  otros,
  alCerrar,
  alGuardar,
  alQuitar,
}: {
  abierta: boolean;
  rubro: Rubro;
  /** El eje que se edita; null = uno nuevo. */
  eje: OpcionProducto | null;
  otros: OpcionProducto[];
  alCerrar: () => void;
  alGuardar: (eje: OpcionProducto) => void;
  alQuitar: () => void;
}) {
  const tipicas = OPCIONES_TIPICAS[rubro].filter((t) => !otros.some((o) => o.nombre.toLocaleLowerCase("es") === t.toLocaleLowerCase("es")));
  const inicial = () => {
    const nombre = eje?.nombre ?? tipicas[0] ?? "";
    const tipica = tipicas.find((t) => t === nombre);
    return { elegida: tipica ?? (eje || tipicas.length === 0 ? OTRA : tipicas[0]!), nombre: tipica ? "" : nombre, valores: eje?.valores ?? [] };
  };
  const [estado, setEstado] = useState(inicial);
  const [abiertaAntes, setAbiertaAntes] = useState(abierta);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  if (abierta !== abiertaAntes) {
    setAbiertaAntes(abierta);
    if (abierta) setEstado(inicial());
  }
  const nombre = (estado.elegida === OTRA ? estado.nombre : estado.elegida).trim();
  const repetido = otros.some((o) => o.nombre.toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"));
  const errorNombre = repetido ? "Ya tienes una opción con ese nombre." : nombre.length > LARGO_VALOR ? `Hasta ${LARGO_VALOR} caracteres.` : null;
  const listo = nombre.length > 0 && !errorNombre && estado.valores.length > 0;
  const n = estado.valores.length * otros.reduce((p, o) => p * o.valores.length, 1);
  const otro = otros[0];

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={eje ? eje.nombre : "Agregar opción"}>
      <div className="flex flex-col gap-5">
        <GrupoOpciones
          titulo="¿Qué elige el cliente?"
          valor={estado.elegida}
          alCambiar={(id) => setEstado((e) => ({ ...e, elegida: id }))}
          opciones={[...tipicas.map((t) => ({ id: t, texto: t })), { id: OTRA, texto: "Otra" }]}
        />
        {estado.elegida === OTRA && (
          <Campo
            etiqueta="Nombre"
            placeholder="Ej: Sabor"
            maxLength={LARGO_VALOR}
            value={estado.nombre}
            onChange={(e) => setEstado((s) => ({ ...s, nombre: e.target.value }))}
            error={errorNombre}
          />
        )}
        <div className="flex flex-col gap-2">
          <EditorEtiquetas
            etiqueta="Valores"
            valores={estado.valores}
            alCambiar={(valores) => setEstado((e) => ({ ...e, valores }))}
            maximo={MAX_VALORES}
            largoMaximo={LARGO_VALOR}
          />
          {atajosDe(nombre).length > 0 && (
            <div className="flex flex-wrap items-center gap-x-1 text-secundario text-texto-secundario">
              Rápido:
              {atajosDe(nombre).map((a) => (
                <Boton key={a.texto} jerarquia="terciario" tamano="compacto" onClick={() => setEstado((e) => ({ ...e, valores: a.valores }))}>
                  {a.texto}
                </Boton>
              ))}
            </div>
          )}
        </div>
        {estado.valores.length > 0 && (
          <p className="rounded-radio-m bg-superficie-hundida px-4 py-3 text-secundario text-texto">
            {otro ? `Con ${otro.nombre} (${otro.valores.length}) ` : ""}
            {n === 1 ? "queda " : "quedan "}
            <b>{n === 1 ? "1 combinación" : `${n} combinaciones`}</b>, cada una con su stock.
          </p>
        )}
        <Boton tamano="grande" anchoCompleto deshabilitado={!listo} onClick={() => alGuardar({ nombre, valores: estado.valores })}>
          {eje ? "Guardar" : "Agregar"}
        </Boton>
        {eje && (
          <Boton jerarquia="terciario" tono="peligro" anchoCompleto onClick={() => setConfirmarQuitar(true)}>
            Quitar opción
          </Boton>
        )}
      </div>
      <Alerta
        abierta={confirmarQuitar}
        titulo={`¿Quitar ${eje?.nombre ?? "esta opción"}?`}
        descripcion="Se van sus combinaciones y su stock al guardar."
        alCancelar={() => setConfirmarQuitar(false)}
        accion={{
          texto: "Quitar opción",
          tono: "peligro",
          alConfirmar: () => {
            setConfirmarQuitar(false);
            alQuitar();
          },
        }}
      />
    </Hoja>
  );
}

/**
 * Por qué baja el stock de unas variantes (como el ajuste del producto): daño, pérdida, corrección u otro (con nota). Las subidas
 * van como reposición sin preguntar.
 */
export function HojaMotivoVariantes({
  abierta,
  unidades,
  guardando,
  alCerrar,
  alConfirmar,
}: {
  abierta: boolean;
  unidades: number;
  guardando: boolean;
  alCerrar: () => void;
  alConfirmar: (motivo: MotivoAjusteInventario, nota: string | null) => void;
}) {
  const [motivo, setMotivo] = useState<MotivoAjusteInventario | null>(null);
  const [nota, setNota] = useState("");
  const listo = motivo !== null && (motivo !== "otro" || nota.trim().length > 0);
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="¿Por qué baja el stock?">
      <div className="flex flex-col gap-4">
        <p className="text-secundario text-texto-secundario">
          Retirarás {unidades} {unidades === 1 ? "unidad" : "unidades"}. Se guarda como ajuste, no como venta.
        </p>
        <GrupoOpciones
          etiqueta="Motivo del ajuste"
          valor={motivo}
          alCambiar={setMotivo}
          opciones={(["dano", "perdida", "correccion_inventario", "otro"] as const).map((m) => ({ id: m, texto: MOTIVOS_INVENTARIO[m] }))}
        />
        {motivo === "otro" && <CampoMultilinea etiqueta="Cuéntanos el motivo" maxLength={200} filas={3} value={nota} onChange={(e) => setNota(e.target.value)} />}
        <Boton tamano="grande" anchoCompleto cargando={guardando} deshabilitado={!listo} onClick={() => motivo && alConfirmar(motivo, motivo === "otro" ? nota.trim() : null)}>
          Guardar ajuste
        </Boton>
      </div>
    </Hoja>
  );
}
