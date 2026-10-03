"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Hoja } from "../hoja";
import { IconoWhatsApp } from "../iconos";
import { MiniaturaProducto } from "../catalogo/miniatura-producto";
import {
  Aviso, Boton, Buscador, Campo, CampoMultilinea, Cantidad, CheckSeleccion, CuadriculaSeleccion, ElegirMensaje, FilaLista,
  GrupoOpciones, ListaAgrupada, Tarjeta, useToastUI, VistaPreviaWhatsApp,
} from "../ui";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { CodigoNoValido, ErrorClaro } from "@/lib/data/errores";
import { enlaceWhatsAppCliente } from "@/lib/credito";
import { diaMesCorto } from "@/lib/formato";
import { codigoPropuesto, limpiarCodigo } from "@/lib/jugada-codigo";
import { mensajeCodigo, mensajeProductos, reemplazarCodigo } from "@/lib/jugada-mensajes";
import { estadoPromo, razonNoUsable } from "@/lib/promos";
import { borradoresJugada, type IdJugada } from "@/lib/proxima-jugada";
import type { TipoEnvioJugada } from "@/lib/types";

const MODOS: { id: TipoEnvioJugada; texto: string }[] = [
  { id: "saludo", texto: "Un saludo" },
  { id: "codigo", texto: "Un código" },
  { id: "productos", texto: "Productos" },
];
const VENCE = [
  { id: "7", texto: "7 días" },
  { id: "14", texto: "14 días" },
  { id: "30", texto: "30 días" },
] as const;
type Vence = (typeof VENCE)[number]["id"];
/** "Su código" en la lista de códigos (la propuesta); el resto son ids de promos. */
const PROPIO = "propio";
const MAXIMO_PRODUCTOS = 3;

/**
 * "Escribirle a {nombre}" (Tu próxima jugada): con qué acercarse (un saludo, un código o productos), la vista previa del mensaje y
 * "Enviar por WhatsApp". El código personal se crea al enviar (no antes); lo enviado queda registrado para la lista de la jugada.
 */
export function HojaEscribirJugada({ jugada, cliente, tiendaId, vendedora, tienda, urlCatalogo, alCerrar }: {
  jugada: IdJugada;
  cliente: { id: string; nombre: string; telefono: string };
  tiendaId: string; vendedora: string; tienda: string; urlCatalogo: string | null;
  alCerrar: () => void;
}) {
  const { getPromos, getProductos, getPedidos, crearCodigoCliente, registrarEnvioJugada } = useData();
  const { mostrarToast } = useToastUI();
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: pedidos } = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  const primerNombre = cliente.nombre.trim().split(/\s+/)[0] || cliente.nombre;

  const [modo, setModo] = useState<TipoEnvioJugada>("saludo");
  // Saludo
  const saludos = useMemo(() => borradoresJugada(jugada, primerNombre, vendedora, tienda, urlCatalogo).map((b) => ({ id: b.tono, titulo: b.tono, texto: b.texto })), [jugada, primerNombre, vendedora, tienda, urlCatalogo]);
  const [tono, setTono] = useState(saludos[0].id);
  // Código: la propuesta (editable) o uno de los códigos de la tienda
  const [elegido, setElegido] = useState<string>(PROPIO);
  const [codigoEscrito, setCodigoEscrito] = useState<string | null>(null);
  const [porcentaje, setPorcentaje] = useState(10);
  const [vence, setVence] = useState<Vence>("14");
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  // Productos
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  // Texto editado a mano: vale mientras el mensaje de base sea el mismo
  const [editado, setEditado] = useState<{ base: string; texto: string } | null>(null);
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fueAWhatsApp = useRef(false);

  const enUso = useMemo(() => (promos ?? []).filter((p) => p.codigo && estadoPromo(p) !== "terminada").map((p) => p.codigo!), [promos]);
  const propuesto = codigoPropuesto(cliente.nombre, porcentaje, enUso);
  const codigo = codigoEscrito ?? propuesto;
  const usables = useMemo(
    () => (promos ?? []).filter((p) => p.tipo === "codigo" && p.codigo && razonNoUsable(p, { pedidos: pedidos ?? [], clienteId: cliente.id }) === null)
      .sort((a, b) => Number(Boolean(b.clienteId)) - Number(Boolean(a.clienteId))),
    [promos, pedidos, cliente.id],
  );
  const usado = elegido === PROPIO ? null : usables.find((p) => p.id === elegido) ?? null;
  const conStock = useMemo(() => (productos ?? []).filter((p) => p.activo && (p.stock === null || p.stock > 0)), [productos]);
  const filtrados = busqueda.trim() ? conStock.filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()) || elegidos.includes(p.id)) : conStock;
  const productosElegidos = elegidos.map((id) => conStock.find((p) => p.id === id)).filter((p) => p !== undefined);

  const datosMensaje = { cliente: primerNombre, vendedora, tienda, urlCatalogo };
  const base = modo === "saludo"
    ? (saludos.find((s) => s.id === tono) ?? saludos[0]).texto
    : modo === "codigo"
      ? usado
        ? mensajeCodigo({ ...datosMensaje, codigo: usado.codigo!, porcentaje: usado.valorPorcentaje ?? 0 })
        : mensajeCodigo({ ...datosMensaje, codigo, porcentaje, dias: Number(vence) })
      : productosElegidos.length ? mensajeProductos({ ...datosMensaje, productos: productosElegidos }) : "";
  const texto = editado && editado.base === base ? editado.texto : base;
  const codigoValido = modo !== "codigo" || usado !== null || /^[A-Z0-9]{3,15}$/.test(codigo);
  const listo = texto.trim().length > 0 && codigoValido && (modo !== "productos" || productosElegidos.length > 0);

  // Al volver de WhatsApp: se cierra la hoja y se avisa
  useEffect(() => {
    const alVolver = () => {
      if (!fueAWhatsApp.current || document.visibilityState !== "visible") return;
      fueAWhatsApp.current = false;
      alCerrar();
      mostrarToast("Listo. A ver qué dice.");
    };
    const alMostrar = (e: PageTransitionEvent) => { if (e.persisted) alVolver(); };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("pageshow", alMostrar);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("pageshow", alMostrar);
    };
  }, [alCerrar, mostrarToast]);

  const enviar = async () => {
    if (!listo || enviando) return;
    setEnviando(true);
    setError(null);
    let final = texto;
    let promoId: string | null = null;
    try {
      if (modo === "codigo") {
        if (usado) promoId = usado.id;
        else {
          let promo;
          try {
            promo = await crearCodigoCliente(tiendaId, cliente.id, porcentaje, Number(vence), codigoEscrito);
          } catch (e) {
            if (e instanceof CodigoNoValido) {
              setErrorCodigo(e.message);
              setEnviando(false);
              return;
            }
            throw e;
          }
          promoId = promo.id;
          // La base pudo elegir otros 2 dígitos: el mensaje lleva el que quedó guardado
          if (promo.codigo && promo.codigo !== codigo) {
            final = final === base
              ? mensajeCodigo({ ...datosMensaje, codigo: promo.codigo, porcentaje, dias: Number(vence) })
              : reemplazarCodigo(final, codigo, promo.codigo);
          }
        }
      }
      try {
        await registrarEnvioJugada(tiendaId, { clienteId: cliente.id, jugada, tipo: modo, promoId, productoIds: modo === "productos" ? elegidos : [] });
      } catch (e) {
        console.warn("No se pudo registrar el envío de la jugada.", e);
      }
      fueAWhatsApp.current = true;
      // Después de esperar, iPhone bloquea las ventanas nuevas: se abre en la misma
      window.location.assign(enlaceWhatsAppCliente(cliente.telefono, final));
      setEnviando(false);
    } catch (e) {
      setEnviando(false);
      setError(e instanceof ErrorClaro ? e.message : "No se pudo preparar el mensaje. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  return <Hoja abierta alCerrar={alCerrar} altura="grande" titulo={`Escribirle a ${primerNombre}`}>
    <div className="flex flex-col gap-5 pb-2">
      <GrupoOpciones compacta titulo="¿Con qué te acercas?" valor={modo} alCambiar={setModo} opciones={MODOS} />

      {modo === "codigo" && <>
        <section className="flex flex-col gap-3">
          <FilaListaSuelta marcada={elegido === PROPIO} alElegir={() => setElegido(PROPIO)} titulo="Su código" />
          <Tarjeta className="flex flex-col gap-4" etiqueta="Su código">
            <Campo etiqueta="Código" value={codigo} autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={15}
              error={errorCodigo ?? (codigo.length < 3 ? "Usa de 3 a 15 letras o números, sin espacios." : undefined)}
              onFocus={() => setElegido(PROPIO)}
              onChange={(e) => { setCodigoEscrito(limpiarCodigo(e.target.value)); setErrorCodigo(null); setElegido(PROPIO); }} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-secundario font-extrabold text-texto">Descuento</span>
              <div className="flex items-center gap-1">
                <Cantidad valor={porcentaje} min={5} max={50} paso={5} etiquetaQuitar="Bajar 5 %" etiquetaAgregar="Subir 5 %"
                  alCambiar={(v) => { setPorcentaje(v); setElegido(PROPIO); setErrorCodigo(null); }} />
                <span className="text-destacado font-extrabold text-texto" aria-hidden="true">%</span>
              </div>
            </div>
            <GrupoOpciones compacta titulo="Vence en" valor={vence} alCambiar={(v) => { setVence(v); setElegido(PROPIO); }} opciones={[...VENCE]} />
            <p className="text-secundario text-texto-secundario">Un solo uso. Solo vale en pedidos de {primerNombre}.</p>
          </Tarjeta>
        </section>
        {usables.length > 0 && <section className="flex flex-col gap-2">
          <h3 className="text-destacado font-bold text-texto">O usa uno de tus códigos</h3>
          <ListaAgrupada etiqueta="Tus códigos">
            {usables.map((p) => <FilaLista key={p.id} radio marcada={elegido === p.id} onClick={() => setElegido(p.id)}
              inicio={<CheckSeleccion marcado={elegido === p.id} />}
              titulo={`${p.codigo} · ${p.valorPorcentaje} %`}
              detalle={[p.clienteId ? `Solo para ${primerNombre}` : "Para todos", p.fechaFin ? `hasta el ${diaMesCorto(p.fechaFin)}` : "Sin fecha de fin"].filter(Boolean).join(" · ")} />)}
          </ListaAgrupada>
        </section>}
      </>}

      {modo === "productos" && <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-destacado font-bold text-texto">Elige hasta {MAXIMO_PRODUCTOS}</h3>
          <p className="text-secundario text-texto-secundario">Solo los que se ven en el catálogo y tienen existencias.</p>
        </div>
        {conStock.length > 9 && <Buscador etiqueta="Buscar producto" valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar producto" />}
        {productos === undefined
          ? <p className="text-secundario text-texto-secundario">Cargando productos…</p>
          : filtrados.length
            ? <CuadriculaSeleccion etiqueta="Productos para el mensaje" maximo={MAXIMO_PRODUCTOS} elegidos={elegidos} alCambiar={setElegidos}
              elementos={filtrados.map((p) => ({ id: p.id, titulo: p.nombre, detalle: `RD$${p.precio.toLocaleString("en-US")}`, imagen: <MiniaturaProducto producto={p} className="size-full" /> }))} />
            : <p className="text-secundario text-texto-secundario">{conStock.length ? "Ningún producto con ese nombre." : "No hay productos con existencias para mostrar."}</p>}
      </section>}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-secundario font-extrabold text-texto">Así le llega</h3>
          {modo === "saludo" && <ElegirMensaje etiqueta="Mensaje del saludo" opciones={saludos} elegido={tono} alElegir={setTono} />}
        </div>
        {texto
          ? <VistaPreviaWhatsApp texto={texto} nombre={cliente.nombre} />
          : <p className="rounded-radio-m bg-superficie p-4 text-secundario text-texto-secundario">Elige al menos un producto para armar el mensaje.</p>}
        {texto && (editando
          ? <CampoMultilinea etiqueta="Tu mensaje" id="jugada-mensaje" value={texto} filas={6} onChange={(e) => setEditado({ base, texto: e.target.value })} />
          : <Boton jerarquia="terciario" className="self-start" onClick={() => setEditando(true)}>Editar mensaje</Boton>)}
      </section>

      {error && <Aviso tono="peligro">{error}</Aviso>}
      <Boton tamano="grande" anchoCompleto icono={<IconoWhatsApp tamano={20} />} cargando={enviando} deshabilitado={!listo} onClick={enviar}>
        Enviar por WhatsApp
      </Boton>
      <p className="-mt-2 text-etiqueta text-texto-secundario">WhatsApp abre el texto para que lo revises. No se envía solo.</p>
    </div>
  </Hoja>;
}

/** "Su código" como opción de radio, a la par de "O usa uno de tus códigos" (vuelve a la propuesta). */
function FilaListaSuelta({ marcada, alElegir, titulo }: { marcada: boolean; alElegir: () => void; titulo: string }) {
  return <ListaAgrupada etiqueta="Código propuesto">
    <FilaLista radio marcada={marcada} onClick={alElegir} inicio={<CheckSeleccion marcado={marcada} />} titulo={titulo} detalle="Uno nuevo, hecho para esta persona" />
  </ListaAgrupada>;
}
