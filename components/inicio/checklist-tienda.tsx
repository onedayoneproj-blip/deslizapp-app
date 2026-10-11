"use client";

import { flushSync } from "react-dom";
import { IconoCheck, IconoChevronAbajo, IconoChevronArriba, IconoChevronDerecha } from "../iconos";
import { useEffect, useRef, useState } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { usePermisos } from "@/lib/data/permisos";
import { mensajeDeError } from "@/lib/data/errores";
import { avanceCapitulos, pasosChecklist, puedeVerChecklist, productosParaChecklist } from "@/lib/onboarding-checklist";
import type { ClaveOnboarding } from "@/lib/onboarding";
import { usePanelUI } from "../panel/ui";
import { Hoja, useAvisarAlSalir } from "../hoja";
import { Aviso, Boton, Campo } from "../ui";
import { productosPublicosDe, tiendaPublicaDe } from "@/lib/vista-previa-producto";
import { HojaComoSeVe } from "../catalogo/hoja-producto-filas";
import { HojaPublicarCatalogo } from "../catalogo/hoja-publicar-catalogo";
import { useRouter } from "next/navigation";
import { useToast } from "../toast";
import { HojaInstalarApp } from "../pwa/hoja-instalar-app";

const FOCO_GUIA = "outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco";

// Raya tipo historia: pista hundida; el relleno crece con los pasos hechos (completo = accion, en curso = resalte).
function Raya({ c, className }: { c: { hechos: number; total: number; completo: boolean }; className: string }) {
  return <span aria-hidden="true" className={`block overflow-hidden rounded-full bg-superficie-hundida ${className}`}>
    {c.hechos > 0 && <span className={`block h-full rounded-full ${c.completo ? "bg-accion" : "bg-resalte"}`} style={{ width: `${(c.hechos / c.total) * 100}%` }} />}
  </span>;
}

const TITULOS = ["Sube tu logo", "Elige tus colores", "Agrega 5 productos", "Publica tu catálogo", "Cuéntales quién eres", "Pantalla de inicio", "Invita a tu equipo"];

export function ChecklistTienda() {
  const { tiendaId, tienda } = useTiendaActiva();
  const { esDuena } = usePermisos();
  const { soloMirar } = useData();
  // No consultar equipo (ni montar acciones) mientras no esté autorizado.
  if (!puedeVerChecklist(tienda, esDuena, soloMirar)) return null;
  return <Checklist key={tiendaId} />;
}

function Checklist() {
  const { tiendaId, tienda } = useTiendaActiva();
  const datos = useData();
  const { abrirMiMarca, abrirEquipo, hojaAbierta, capituloChecklist, seleccionarCapituloChecklist, checklistMinimizada, minimizarChecklist } = usePanelUI();
  const [seleccionInicial, setSeleccionInicial] = useState<number | null>(null);
  const router = useRouter(); const toast = useToast();
  const consulta = useConsulta(`checklist:${tiendaId}`, async () => {
    const [productos, equipo] = await Promise.all([datos.getProductos(tiendaId, true), datos.getEquipo(tiendaId)]);
    return { productos, equipo };
  }, true);
  const [instalada, setInstalada] = useState(false);
  const [hoja, setHoja] = useState<"perfil" | "instalar" | "publicar" | "vista" | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claveFallida, setClaveFallida] = useState<ClaveOnboarding>("checklist_cerrado_en");
  const [plataforma, setPlataforma] = useState<"ios" | "android">("ios");
  const bloqueo = useRef(false); const cierreIntentado = useRef(false);
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const actualizar = () => setInstalada(media.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    actualizar(); media.addEventListener("change", actualizar); window.addEventListener("focus", actualizar);
    return () => { media.removeEventListener("change", actualizar); window.removeEventListener("focus", actualizar); };
  }, []);
  const pasos = tienda && consulta.data ? pasosChecklist(tienda, consulta.data.productos, consulta.data.equipo, instalada) : [];
  const hechos = pasos.filter(Boolean).length;
  const capitulos = avanceCapitulos(pasos);
  if (seleccionInicial === null && consulta.data && !consulta.cargando && !consulta.error) {
    setSeleccionInicial(capitulos.findIndex(c => !c.completo) === -1 ? 0 : capitulos.findIndex(c => !c.completo));
  }
  const seleccionado = capituloChecklist ?? seleccionInicial ?? 0;
  const capitulo = capitulos[seleccionado];
  const siguiente = capitulos.findIndex((c, i) => i > seleccionado && !c.completo);
  const pendiente = siguiente >= 0 ? siguiente : capitulos.findIndex(c => !c.completo);
  const botonMinimizar = useRef<HTMLButtonElement | null>(null);
  const pildora = useRef<HTMLButtonElement | null>(null);
  const cambiarMinimizacion = (minimizada: boolean) => {
    flushSync(() => minimizarChecklist(minimizada, seleccionado));
    (minimizada ? pildora.current : botonMinimizar.current)?.focus({ preventScroll: true });
  };
  const botonesCapitulo = useRef<(HTMLButtonElement | null)[]>([]);
  // Solo una tentativa automática por montaje; el error ofrece reintento explícito.
  useEffect(() => {
    if (hoja || hojaAbierta || guardando || hechos !== 7 || consulta.error || consulta.cargando || cierreIntentado.current || bloqueo.current) return;
    cierreIntentado.current = true; bloqueo.current = true;
    setClaveFallida("checklist_cerrado_en"); setError(null);
    void datos.marcarOnboarding(tiendaId, "checklist_cerrado_en").then(() => {
      toast("Tu tienda está lista. Lo que sigue lo escriben tus clientes.");
    }).catch(e => setError(mensajeDeError(e, "No pudimos guardar el cierre. Reintenta."))).finally(() => { bloqueo.current = false; });
  }, [hechos, consulta.error, consulta.cargando, datos, tiendaId, toast, hoja, hojaAbierta, guardando]);
  const marcar = async (clave: ClaveOnboarding) => {
    if (bloqueo.current) return;
    bloqueo.current = true; setGuardando(true); setError(null); setClaveFallida(clave);
    try { await datos.marcarOnboarding(tiendaId, clave); setHoja(null); if (clave === "checklist_cerrado_en" && hechos === 7) toast("Tu tienda está lista. Lo que sigue lo escriben tus clientes."); }
    catch(e) { setError(mensajeDeError(e, "No pudimos guardar este paso. Reintenta.")); }
    finally { bloqueo.current = false; setGuardando(false); }
  };
  if (!tienda || !consulta.data || consulta.error) return null; // Inicio permanece disponible ante error.
  const cantidad = productosParaChecklist(consulta.data.productos, tiendaId);
  const enlace = `/tienda/${tienda.slug}${datos.modo === "demo" ? "?demo" : ""}`;
  const actuar = (i: number) => {
    seleccionarCapituloChecklist(seleccionado);
    setError(null);
    if (i === 0) abrirMiMarca("logo");
    else if (i === 1) abrirMiMarca("colores");
    else if (i === 2) router.push("/catalogo/nuevo");
    else if (i === 3) setHoja("publicar");
    else if (i === 4) setHoja("perfil");
    else if (i === 5) { setPlataforma(/android/i.test(navigator.userAgent) ? "android" : "ios"); setHoja("instalar"); } // iPhone por defecto (también en escritorio)
    else abrirEquipo();
  };
  const hayAcciones = seleccionado === 1 || (seleccionado === 2 && !pasos[6]) || (capitulo.completo && pendiente >= 0);
  return <section id="checklist-guia" data-checklist className="px-5 pt-5 pb-2">
    {checklistMinimizada ? <>
      <button ref={pildora} type="button" aria-expanded={false} aria-controls="checklist-guia" aria-label={`Desplegar Deja tu tienda lista, ${hechos} de 7 pasos`}
        className={`tocable flex h-14 w-full items-center gap-3 rounded-full border border-linea bg-superficie px-5 text-left ${FOCO_GUIA}`} onClick={() => cambiarMinimizacion(false)}>
        <span className="min-w-0 flex-1 truncate text-destacado text-texto">Deja tu tienda lista</span>
        <span aria-hidden="true" className="flex shrink-0 gap-1">{capitulos.map(c => <Raya key={c.numero} c={c} className="h-1 w-[18px]" />)}</span>
        <span aria-hidden="true" className="shrink-0 whitespace-nowrap text-secundario text-texto-secundario">{hechos} de 7</span>
        <IconoChevronAbajo tamano={18} className="shrink-0 text-texto-secundario" />
      </button>
      {error && <Aviso tono="peligro" accion={{ texto: "Reintentar", alTocar: () => void marcar(claveFallida) }}>{error}</Aviso>}
    </> : <div id="checklist-expandida">
    <div className="overflow-hidden rounded-radio-l border border-linea bg-superficie">
      <div className="flex items-center justify-between gap-2 pt-1 pr-1 pl-4">
        <h2 id="checklist-titulo" className="min-w-0 py-2 font-display text-titulo-seccion font-bold">Capítulo {capitulo.numero} · {capitulo.nombre}</h2>
        <button ref={botonMinimizar} type="button" aria-label="Minimizar la guía" aria-expanded={true} aria-controls="checklist-guia" onClick={() => cambiarMinimizacion(true)}
          className={`tocable grid size-11 shrink-0 place-items-center rounded-full text-texto ${FOCO_GUIA}`}><IconoChevronArriba tamano={20} strokeWidth={2.2} /></button>
      </div>
      <div className="flex gap-1.5 px-4" role="group" aria-label="Capítulos de preparación">
        {capitulos.map((c, i) => <button key={c.numero} type="button" ref={el => { botonesCapitulo.current[i] = el; }}
          aria-label={`Capítulo ${c.numero} · ${c.nombre}, ${c.estado}, ${c.hechos} de ${c.total} pasos`}
          data-estado={c.estado}
          aria-pressed={seleccionado === i} aria-controls="checklist-capitulo"
          className={`tocable relative flex h-11 min-w-0 flex-1 items-center rounded-radio-s ${FOCO_GUIA}`}
          onClick={() => seleccionarCapituloChecklist(i)} onKeyDown={e => {
            const destino = e.key === "Home" ? 0 : e.key === "End" ? capitulos.length - 1 : e.key === "ArrowRight" ? (i + 1) % capitulos.length : e.key === "ArrowLeft" ? (i + capitulos.length - 1) % capitulos.length : null;
            if (destino === null) return;
            e.preventDefault(); seleccionarCapituloChecklist(destino); botonesCapitulo.current[destino]?.focus();
          }}>
          <Raya c={c} className="h-1.5 w-full" />
          {seleccionado === i && <span aria-hidden="true" data-punta className="pointer-events-none absolute bottom-0 left-1/2 z-10 size-3.5 -translate-x-1/2 translate-y-1/2 rotate-45 rounded-tl-[3px] border-t border-l border-linea bg-superficie" />}
        </button>)}
      </div>
      <div id="checklist-capitulo" aria-labelledby="checklist-titulo" className="border-t border-linea">
        <ul aria-label={`Pasos de ${capitulo.nombre}`}>
          {capitulo.pasos.map(i => <li key={i} className="border-t border-linea first:border-t-0">
            <button type="button" className={`tocable flex min-h-14 w-full items-center gap-3 px-4 text-left ${FOCO_GUIA} focus-visible:-outline-offset-3`}
              onClick={() => i === 3 && pasos[i] ? setHoja("vista") : actuar(i)}>
              <span aria-hidden="true" className={`grid size-[26px] shrink-0 place-items-center rounded-full ${pasos[i] ? "bg-accion text-sobre-accion" : "border-[1.5px] border-borde-campo"}`}>{pasos[i] && <IconoCheck tamano={15} strokeWidth={3} />}</span>
              <span className="min-w-0 flex-1 py-2 text-destacado text-texto">{TITULOS[i]}<span className="sr-only"> · {pasos[i] ? "Hecho, revisar" : "Pendiente"}{i === 2 ? `, ${Math.min(cantidad, 5)} de 5 con foto` : ""}</span></span>
              <IconoChevronDerecha tamano={20} strokeWidth={2.2} className="-mr-1 shrink-0 text-texto-secundario" />
            </button>
          </li>)}
        </ul>
        {hayAcciones && <div className="flex flex-wrap gap-2 border-t border-linea p-4">
          {seleccionado === 1 && <Boton jerarquia="secundario" tamano="compacto" onClick={() => setHoja("vista")}>Ver cómo queda</Boton>}
          {seleccionado === 2 && !pasos[6] && <Boton jerarquia="secundario" tamano="compacto" cargando={guardando} onClick={() => void marcar("equipo_omitido_en")}>Por ahora sin equipo</Boton>}
          {capitulo.completo && pendiente >= 0 && <Boton jerarquia="secundario" tamano="compacto" onClick={() => { seleccionarCapituloChecklist(pendiente); botonesCapitulo.current[pendiente]?.focus(); }}>Continuar al capítulo {capitulos[pendiente].numero}</Boton>}
        </div>}
      </div>
    </div>
    {error && !hoja && <Aviso tono="peligro" accion={{ texto: "Reintentar", alTocar: () => void marcar(claveFallida) }}>{error}</Aviso>}
    </div>}
    {hoja === "perfil" && <Perfil alCerrar={() => setHoja(null)} />}
    <HojaInstalarApp abierta={hoja === "instalar"} alCerrar={() => setHoja(null)} plataformaInicial={plataforma} />
    <HojaComoSeVe abierta={hoja === "vista"} alCerrar={() => setHoja(null)} visible datos={() => ({ tienda: tiendaPublicaDe(tienda), productos: productosPublicosDe(consulta.data?.productos ?? [], tienda.rubro) })} />
    <HojaPublicarCatalogo abierta={hoja === "publicar"} alCerrar={() => setHoja(null)} enlace={`${typeof window === "undefined" ? "https://deslizapp-app.vercel.app" : window.location.origin}${enlace}`} productos={cantidad} alAgregarMas={() => { setHoja(null); router.push("/catalogo/nuevo"); }} alConfirmar={async () => {
      try { await datos.publicarMiCatalogo(tiendaId); setHoja(null); toast("Tu catálogo ya está en línea."); }
      catch(e) { toast(mensajeDeError(e, "No pudimos publicar. Inténtalo otra vez.")); }
    }} />
  </section>;
}
function Perfil({ alCerrar }: { alCerrar: () => void }) {
  const { tiendaId, tienda } = useTiendaActiva(); const datos = useData();
  const [descripcion, setDescripcion] = useState(tienda?.descripcion ?? ""); const [instagram, setInstagram] = useState(tienda?.instagram ?? "");
  const [guardando, setGuardando] = useState(false); const [error, setError] = useState<string | null>(null); const bloqueo = useRef(false);
  const cambio = descripcion !== (tienda?.descripcion ?? "") || instagram !== (tienda?.instagram ?? "");
  return <Hoja abierta alCerrar={alCerrar} titulo="Cuéntales quién eres" altura="grande" protegerAtras>
    <ProteccionBorrador cambios={cambio && !guardando} />
    <Campo etiqueta="Tu tienda en una línea" value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={160} />
    <Campo etiqueta="Instagram" value={instagram} onChange={e => setInstagram(e.target.value)} maxLength={31} autoCapitalize="none" autoCorrect="off" />
    {error && <Aviso tono="peligro">{error}</Aviso>}
    <Boton className="mt-4" cargando={guardando} onClick={async () => {
      if (bloqueo.current) return; bloqueo.current = true; setGuardando(true); setError(null);
      try { await datos.guardarPerfilCatalogo(tiendaId, descripcion, instagram); alCerrar(); }
      catch(e) { setError(mensajeDeError(e, "No pudimos guardar. Reintenta.")); }
      finally { bloqueo.current = false; setGuardando(false); }
    }}>Guardar</Boton>
  </Hoja>;
}

function ProteccionBorrador({ cambios }: { cambios: boolean }) {
  useAvisarAlSalir(cambios);
  return null;
}
