"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { PromoInvalida } from "@/lib/data/promos";
import { useData } from "@/lib/data/provider";
import { formatearPesos, rangoFechas } from "@/lib/formato";
import {
  diaAIso,
  estadoPromo,
  hoyLocal,
  isoADia,
  limpiarCodigo,
  MAX_CODIGO,
  MAX_PORCENTAJE,
  pedidosConCodigo,
  validarPromo,
  type DatosPromo,
  type ErroresPromo,
} from "@/lib/promos";
import type { PedidoConItems, Producto, Promo, TipoPromo } from "@/lib/types";
import { Chip } from "../controles";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { useToast } from "../toast";
import { TarjetaPromo } from "./tarjeta-promo";
import { useElegirPestanaPromos, useOfrecerCompartir } from "./vista-promos";
import { SelectorColeccionPromo, SelectorProductoPromo } from "./selectores";

const campo =
  "h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] border-borde bg-white px-3.5 text-base text-bosque outline-none focus:border-bosque";

const TIPOS: { id: TipoPromo; titulo: string; detalle: string }[] = [
  { id: "producto", titulo: "En productos", detalle: "Precio tachado en uno" },
  { id: "codigo", titulo: "Código", detalle: "Lo escriben al pedir" },
  { id: "coleccion", titulo: "Por colección", detalle: "Toda una colección" },
];

const ETIQUETA_TIPO = { codigo: "Código", coleccion: "Por colección", producto: "Por producto" } as const;

/**
 * Nueva promo, editar una que no ha terminado, o ver una terminada (con "Duplicar como nueva").
 * Al cerrar vuelve a /promos sin perder la pestaña (la guarda el layout).
 */
export function HojaPromo({ promoId, copiarDe }: { promoId?: string; copiarDe?: string }) {
  const router = useRouter();
  const { getPromos, getProductos, getPedidos } = useData();
  const { tiendaId } = useTiendaActiva();
  const cerrar = useCallback(() => router.push("/promos", { scroll: false }), [router]);

  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: pedidos } = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  if (!promos || !productos || !pedidos) return null;

  const promo = promoId ? promos.find((p) => p.id === promoId) : undefined;
  if (promoId && !promo) {
    return (
      <Hoja abierta alCerrar={cerrar} titulo="Promo">
        <div className="py-6 text-center">
          <p className="font-display text-xl">Esta promo no vive aquí.</p>
          <p className="mt-1 text-suave">Quizá es de otra tienda. Las promos no se mezclan.</p>
          <button type="button" onClick={cerrar} className="mt-5 h-12 w-full rounded-full bg-bosque font-extrabold text-papel">
            Volver a promos
          </button>
        </div>
      </Hoja>
    );
  }
  if (promo && estadoPromo(promo) === "terminada") {
    return (
      <Hoja abierta alCerrar={cerrar} titulo="Promo terminada" altura="grande">
        <DetalleTerminada promo={promo} productos={productos} pedidos={pedidos} />
      </Hoja>
    );
  }

  const base = promo ?? (copiarDe ? promos.find((p) => p.id === copiarDe) : undefined);
  return (
    // "grande": tiene campos de texto y la hoja no cambia de tamaño con el teclado (HANDOFF.md)
    <Hoja abierta alCerrar={cerrar} titulo={promo ? "Editar promo" : "Nueva promo"} altura="grande">
      <Formulario key={promo?.id ?? copiarDe ?? "nueva"} promo={promo} base={base} promos={promos} productos={productos} pedidos={pedidos} alTerminar={cerrar} />
    </Hoja>
  );
}

const PORCENTAJES_RAPIDOS = [10, 15, 20, 30];

function Formulario({
  promo,
  base,
  promos,
  productos,
  pedidos,
  alTerminar,
}: {
  promo?: Promo;
  /** Promo de la que se parte (la que se edita, o la que se duplica). */
  base?: Promo;
  promos: Promo[];
  productos: Producto[];
  pedidos: PedidoConItems[];
  alTerminar: () => void;
}) {
  const { crearPromo, actualizarPromo, terminarPromo } = useData();
  const { tiendaId } = useTiendaActiva();
  const elegirPestana = useElegirPestanaPromos();
  const ofrecerCompartir = useOfrecerCompartir();
  const router = useRouter();
  const toast = useToast();
  const editando = Boolean(promo);

  const [datos, setDatos] = useState<DatosPromo>(() => ({
    tipo: base?.tipo ?? "coleccion",
    nombre: base?.nombre ?? "",
    porcentaje: base?.valorPorcentaje ? String(base.valorPorcentaje) : "",
    codigo: base?.codigo ?? "",
    coleccion: base?.coleccion ?? null,
    productoId: base?.productoId ?? null,
    // Duplicar: empieza hoy y sin fecha de fin. Editar: las fechas que ya tiene.
    inicio: promo ? isoADia(promo.fechaInicio) : hoyLocal(),
    fin: promo?.fechaFin ? isoADia(promo.fechaFin) : "",
  }));
  const [vista, setVista] = useState<"promo" | "producto" | "coleccion">("promo");
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [intento, setIntento] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const buscador = useRef<HTMLInputElement>(null);

  const cambiar = <K extends keyof DatosPromo>(k: K, v: DatosPromo[K]) => setDatos((d) => ({ ...d, [k]: v }));
  const tocar = (k: string) => setTocados((t) => new Set(t).add(k));
  const errores: ErroresPromo = useMemo(() => validarPromo(datos, promos, tiendaId, promo?.id), [datos, promos, tiendaId, promo?.id]);
  const error = (k: keyof ErroresPromo) => (intento || tocados.has(k) ? errores[k] : undefined);
  const hayErrores = Object.keys(errores).length > 0;

  const productoElegido = datos.productoId ? productos.find((p) => p.id === datos.productoId) : undefined;
  const productosDeLaColeccion = datos.coleccion ? productos.filter((p) => p.categoria === datos.coleccion) : [];

  // Foco en el buscador en el MISMO toque que abre el selector (teclado de iPhone)
  const abrir = (destino: "producto" | "coleccion") => {
    flushSync(() => setVista(destino));
    buscador.current?.focus({ preventScroll: true });
  };

  if (vista === "producto") {
    return (
      <SelectorProductoPromo
        productos={productos}
        pedidos={pedidos}
        elegido={datos.productoId}
        entrada={buscador}
        alElegir={(p) => {
          cambiar("productoId", p.id);
          setVista("promo");
        }}
        alVolver={() => setVista("promo")}
      />
    );
  }
  if (vista === "coleccion") {
    return (
      <SelectorColeccionPromo
        productos={productos}
        elegida={datos.coleccion}
        entrada={buscador}
        alElegir={(c) => {
          cambiar("coleccion", c);
          setVista("promo");
        }}
        alVolver={() => setVista("promo")}
      />
    );
  }

  const guardar = async () => {
    setIntento(true);
    if (hayErrores || guardando) return;
    setGuardando(true);
    try {
      const guardada = promo ? await actualizarPromo(tiendaId, promo.id, datos) : await crearPromo(tiendaId, datos);
      const estado = estadoPromo(guardada);
      elegirPestana(estado);
      if (promo) toast("Cambios guardados.");
      else if (estado !== "terminada") ofrecerCompartir({ id: guardada.id, programada: estado === "programada" }); // "¡Lista! ¿La compartes ahora?"
      else toast("Promo guardada. Como ya venció, quedó en Terminadas.");
      alTerminar();
    } catch (e) {
      toast(e instanceof PromoInvalida ? e.message : mensajeDeError(e, "No se pudo guardar. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  const terminar = async () => {
    if (!promo || guardando) return;
    setGuardando(true);
    try {
      await terminarPromo(tiendaId, promo.id);
      elegirPestana("terminada");
      toast("Promo terminada. Los precios vuelven a la normalidad.");
      alTerminar();
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo terminar. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  const pct = Number(datos.porcentaje);
  const pctValido = Number.isInteger(pct) && pct >= 1 && pct <= MAX_PORCENTAJE;

  return (
    <div className="flex flex-col gap-4">
      {/* Tipo (no cambia al editar) */}
      <div role="group" aria-label="Tipo de promo" className="grid grid-cols-3 gap-2">
        {TIPOS.map((t) => {
          const elegido = datos.tipo === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={elegido}
              disabled={editando && !elegido}
              onClick={() => cambiar("tipo", t.id)}
              className={`tocable flex min-h-[84px] flex-col justify-between rounded-[18px] border-[1.5px] px-2.5 py-3 text-left disabled:opacity-40 ${
                elegido ? "border-bosque bg-bosque text-papel" : "border-borde bg-white text-bosque"
              }`}
            >
              <span className="text-[14px] leading-tight font-extrabold">{t.titulo}</span>
              <span className={`text-[12px] leading-tight font-semibold ${elegido ? "text-papel/80" : "text-suave"}`}>{t.detalle}</span>
            </button>
          );
        })}
      </div>

      <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
        Nombre
        <input
          type="text"
          value={datos.nombre}
          onChange={(e) => cambiar("nombre", e.target.value.slice(0, 40))}
          onBlur={() => tocar("nombre")}
          placeholder="Ej: Semana del aaah"
          autoComplete="off"
          aria-invalid={Boolean(error("nombre")) || undefined}
          className={`${campo} ${error("nombre") ? "border-[#b4432a]" : ""}`}
        />
        <Mensaje texto={error("nombre")} />
      </label>

      {/* Descuento, solo en % */}
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
          Descuento
          <span className={`flex h-[52px] items-center gap-1.5 rounded-2xl border-[1.5px] bg-white px-3.5 focus-within:border-bosque ${error("porcentaje") ? "border-[#b4432a]" : "border-borde"}`}>
            <input
              type="text"
              inputMode="numeric"
              value={datos.porcentaje}
              onChange={(e) => cambiar("porcentaje", e.target.value.replace(/\D/g, "").slice(0, 3))}
              onBlur={() => tocar("porcentaje")}
              placeholder="15"
              aria-label="Descuento en porcentaje"
              aria-invalid={Boolean(error("porcentaje")) || undefined}
              className="min-w-0 flex-1 bg-transparent font-display text-[22px] text-bosque outline-none placeholder:text-suave/50"
            />
            <span className="font-extrabold text-suave">%</span>
          </span>
        </label>
        <div className="flex flex-wrap gap-x-2 gap-y-3">
          {PORCENTAJES_RAPIDOS.map((n) => (
            <Chip
              key={n}
              elegido={datos.porcentaje === String(n)}
              onClick={() => {
                cambiar("porcentaje", String(n));
                tocar("porcentaje");
              }}
            >
              {n}%
            </Chip>
          ))}
        </div>
        <Mensaje texto={error("porcentaje")} />
      </div>

      {/* Según el tipo */}
      {datos.tipo === "codigo" && (
        <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
          Código
          <input
            type="text"
            value={datos.codigo}
            onChange={(e) => cambiar("codigo", limpiarCodigo(e.target.value))}
            onBlur={() => tocar("codigo")}
            placeholder="Ej: AAAH10"
            autoCapitalize="characters"
            autoComplete="off"
            aria-invalid={Boolean(error("codigo")) || undefined}
            className={`${campo} font-display tracking-wider ${error("codigo") ? "border-[#b4432a]" : ""}`}
          />
          <span className="text-[12.5px] font-semibold text-suave">
            Solo letras y números, sin espacios, hasta {MAX_CODIGO}. Lo escribe el cliente al pedir.
          </span>
          <Mensaje texto={error("codigo")} />
        </label>
      )}
      {datos.tipo === "coleccion" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[13.5px] font-bold">¿A qué colección?</p>
          {datos.coleccion ? (
            <TarjetaElegida titulo={datos.coleccion} detalle={`${productosDeLaColeccion.length} ${productosDeLaColeccion.length === 1 ? "producto" : "productos"}`} alCambiar={() => abrir("coleccion")} />
          ) : (
            <BotonElegir texto="Busca una colección" etiqueta="Elegir colección" onClick={() => abrir("coleccion")} />
          )}
          <Mensaje texto={error("coleccion")} />
        </div>
      )}
      {datos.tipo === "producto" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[13.5px] font-bold">¿A qué producto?</p>
          {productoElegido ? (
            <TarjetaElegida
              titulo={productoElegido.nombre}
              detalle={formatearPesos(productoElegido.precio)}
              foto={productoElegido.fotos[0]}
              alCambiar={() => abrir("producto")}
            />
          ) : (
            <BotonElegir texto="Busca un producto" etiqueta="Elegir producto" onClick={() => abrir("producto")} />
          )}
          <Mensaje texto={error("productoId")} />
        </div>
      )}

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1.5 text-[13.5px] font-bold">
          Empieza
          <input
            type="date"
            value={datos.inicio}
            onChange={(e) => cambiar("inicio", e.target.value)}
            onBlur={() => tocar("inicio")}
            aria-invalid={Boolean(error("inicio")) || undefined}
            className={`${campo} appearance-none ${error("inicio") ? "border-[#b4432a]" : ""}`}
          />
          <Mensaje texto={error("inicio")} />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-[13.5px] font-bold">
          <span>
            Vence <span className="font-semibold text-suave">(opcional)</span>
          </span>
          <input
            type="date"
            value={datos.fin}
            min={datos.inicio || undefined}
            onChange={(e) => cambiar("fin", e.target.value)}
            onBlur={() => tocar("fin")}
            aria-invalid={Boolean(error("fin")) || undefined}
            className={`${campo} appearance-none ${error("fin") ? "border-[#b4432a]" : ""}`}
          />
          <Mensaje texto={error("fin")} />
        </label>
      </div>
      {datos.fin && (
        <button type="button" onClick={() => cambiar("fin", "")} className="tocable -mt-2 flex min-h-11 items-center self-start px-1 text-[13px] font-extrabold text-suave">
          Quitar la fecha de fin
        </button>
      )}

      <VistaPrevia datos={datos} pctValido={pctValido} producto={productoElegido} deLaColeccion={productosDeLaColeccion} />

      {/* Cómo se verá la tarjeta en la lista de Promos */}
      {datos.inicio && (
        <div>
          <p className="mb-2 text-[13.5px] font-bold">Así se verá en tu lista:</p>
          <TarjetaPromo
            promo={{
              id: "vista-previa",
              tiendaId,
              tipo: datos.tipo,
              nombre: datos.nombre.trim(),
              valorPorcentaje: pctValido ? pct : null,
              codigo: datos.codigo || null,
              coleccion: datos.coleccion,
              productoId: datos.productoId,
              fechaInicio: diaAIso(datos.inicio, "inicio"),
              fechaFin: datos.fin ? diaAIso(datos.fin, "fin") : null,
              estado: "activa",
            }}
            producto={productoElegido}
            productosDeColeccion={productosDeLaColeccion.length}
            usos={0}
          />
        </div>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-50"
      >
        {editando ? "Guardar cambios" : "Crear promo"}
      </button>
      {intento && hayErrores && <p className="-mt-2 text-center text-[13px] font-semibold text-suave">Revisa los campos marcados.</p>}

      {editando && promo && (
        <button
          type="button"
          onClick={() => router.push(`/promos/${promo.id}/compartir`, { scroll: false })}
          className="tocable flex h-12 items-center justify-center rounded-full border-[1.5px] border-bosque bg-white text-[15px] font-extrabold text-bosque"
        >
          Compartir esta promo
        </button>
      )}

      {editando && !confirmando && (
        <button type="button" onClick={() => setConfirmando(true)} className="h-11 text-[14.5px] font-extrabold text-[#b4432a]">
          Terminar promo
        </button>
      )}
      {editando && confirmando && (
        <div role="alertdialog" aria-label="Confirmar" className="flex flex-col gap-2 rounded-[18px] bg-mandarina/20 p-4">
          <p className="text-sm">
            <b>¿Terminar «{promo?.nombre}»?</b> Los precios vuelven a la normalidad y no se puede reactivar (solo duplicarla como nueva).
          </p>
          <button type="button" onClick={terminar} disabled={guardando} className="tocable h-11 rounded-full bg-[#b4432a] font-extrabold text-white disabled:opacity-60">
            Sí, terminar
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className="h-11 font-extrabold text-bosque">
            Mejor no
          </button>
        </div>
      )}
    </div>
  );
}

function Mensaje({ texto }: { texto?: string }) {
  return texto ? <span className="text-[12.5px] font-semibold text-[#b4432a]">{texto}</span> : null;
}

function BotonElegir({ texto, etiqueta, onClick }: { texto: string; etiqueta: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={etiqueta} className={`${campo} tocable flex items-center justify-between text-left text-suave`}>
      {texto}
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

function TarjetaElegida({ titulo, detalle, foto, alCambiar }: { titulo: string; detalle: string; foto?: string; alCambiar: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-linea bg-white p-3">
      {foto !== undefined && (
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-arena">{foto ? <Foto src={foto} alt="" className="h-full w-full" sizes="48px" /> : null}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-extrabold">{titulo}</p>
        <p className="truncate text-[13px] text-suave">{detalle}</p>
      </div>
      <button type="button" onClick={alCambiar} className="tocable h-11 shrink-0 rounded-full border-[1.5px] border-bosque px-4 text-sm font-extrabold">
        Cambiar
      </button>
    </div>
  );
}

/** "Así se ve": un producto con su precio tachado (producto / colección) o un total con el código. */
function VistaPrevia({ datos, pctValido, producto, deLaColeccion }: { datos: DatosPromo; pctValido: boolean; producto?: Producto; deLaColeccion: Producto[] }) {
  const pct = pctValido ? Number(datos.porcentaje) : 0;
  const rebaja = (precio: number) => precio - Math.round((precio * pct) / 100);
  if (datos.tipo === "codigo") {
    const total = 2000;
    const descuento = total - rebaja(total);
    return (
      <div className="rounded-[20px] bg-menta/60 p-4">
        <p className="mb-2 text-[13.5px] font-bold">Así se aplica al pedir:</p>
        <div className="flex justify-between text-sm text-suave">
          <span>Pedido de ejemplo</span>
          <span>{formatearPesos(total)}</span>
        </div>
        <div className="flex justify-between py-0.5 text-sm font-bold">
          <span>Código {datos.codigo || "TUCODIGO"}</span>
          <span>{pctValido ? `−${formatearPesos(descuento)}` : "—"}</span>
        </div>
        <div className="flex justify-between pt-1 font-display text-[22px]">
          <span>Total</span>
          <span>{formatearPesos(pctValido ? rebaja(total) : total)}</span>
        </div>
      </div>
    );
  }
  // Producto de ejemplo: el elegido, o el más caro de la colección, o uno genérico
  const ejemplo = producto ?? [...deLaColeccion].sort((a, b) => b.precio - a.precio)[0];
  const nombre = ejemplo?.nombre ?? "Tu producto";
  const precio = ejemplo?.precio ?? 1000;
  return (
    <div className="rounded-[20px] bg-menta/60 p-4">
      <p className="mb-2 text-[13.5px] font-bold">Así se ve en tu catálogo:</p>
      <div className="flex items-center gap-3">
        <span className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-arena">
          {ejemplo?.fotos[0] ? <Foto src={ejemplo.fotos[0]} alt="" className="h-full w-full" sizes="72px" /> : null}
          {pctValido && <span className="absolute top-1 left-1 rounded-full bg-mandarina px-2 py-px text-[11px] font-extrabold text-bosque-oscuro">−{pct}%</span>}
        </span>
        <div className="min-w-0">
          <p className="truncate font-extrabold">{nombre}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold">{formatearPesos(pctValido ? rebaja(precio) : precio)}</span>
            {pctValido && <s className="text-sm text-suave">{formatearPesos(precio)}</s>}
          </p>
          {!pctValido && <p className="text-[12.5px] text-suave">Pon un descuento para ver el cambio.</p>}
        </div>
      </div>
    </div>
  );
}

/** Una promo que ya terminó: no se reactiva, se puede duplicar como nueva. */
function DetalleTerminada({ promo, productos, pedidos }: { promo: Promo; productos: Producto[]; pedidos: PedidoConItems[] }) {
  const router = useRouter();
  const producto = promo.productoId ? productos.find((p) => p.id === promo.productoId) : undefined;
  const usos = pedidosConCodigo(pedidos, promo);
  return (
    <div className="flex flex-col gap-3.5">
      <div className="rounded-[20px] border border-linea bg-white p-4">
        <p className="text-[11.5px] font-extrabold tracking-wide text-suave uppercase">{ETIQUETA_TIPO[promo.tipo]}</p>
        <p className="font-display text-2xl leading-tight">{promo.nombre}</p>
        <p className="mt-1 text-sm text-suave">
          {promo.valorPorcentaje}% menos
          {promo.tipo === "coleccion" ? ` · Colección ${promo.coleccion}` : ""}
          {promo.tipo === "producto" && producto ? ` · ${producto.nombre}` : ""}
          {promo.tipo === "codigo" ? ` · Código ${promo.codigo}` : ""}
        </p>
        <p className="mt-1 text-sm text-suave">{rangoFechas(promo.fechaInicio, promo.fechaFin)}</p>
        {promo.tipo === "codigo" && (
          <p className="mt-2 font-bold">
            Usada en {usos} {usos === 1 ? "pedido" : "pedidos"}
          </p>
        )}
      </div>
      <p className="rounded-[18px] bg-arena p-3.5 text-center font-semibold text-suave">Esta promo ya terminó y no se reactiva. Pero puedes duplicarla.</p>
      <button
        type="button"
        onClick={() => router.push(`/promos/nueva?copiar=${promo.id}`, { scroll: false })}
        className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel"
      >
        Duplicar como nueva
      </button>
    </div>
  );
}
