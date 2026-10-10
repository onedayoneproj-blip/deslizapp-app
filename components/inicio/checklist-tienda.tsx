"use client";

import { useEffect, useRef, useState } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { usePermisos } from "@/lib/data/permisos";
import { mensajeDeError } from "@/lib/data/errores";
import { avanceCapitulos, pasosChecklist, puedeVerChecklist, productosParaChecklist } from "@/lib/onboarding-checklist";
import type { ClaveOnboarding } from "@/lib/onboarding";
import { usePanelUI } from "../panel/ui";
import { Hoja, useAvisarAlSalir } from "../hoja";
import { Aviso, Boton, Campo, ListaAgrupada, FilaLista, CheckSeleccion } from "../ui";
import { productosPublicosDe, tiendaPublicaDe } from "@/lib/vista-previa-producto";
import { HojaComoSeVe } from "../catalogo/hoja-producto-filas";
import { HojaPublicarCatalogo } from "../catalogo/hoja-publicar-catalogo";
import { useRouter } from "next/navigation";
import { useToast } from "../toast";

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
  const { abrirMiMarca, abrirEquipo, hojaAbierta, capituloChecklist, seleccionarCapituloChecklist } = usePanelUI();
  const [seleccionInicial, setSeleccionInicial] = useState<number | null>(null);
  const router = useRouter(); const toast = useToast();
  const consulta = useConsulta(`checklist:${tiendaId}`, async () => {
    const [productos, equipo] = await Promise.all([datos.getProductos(tiendaId, true), datos.getEquipo(tiendaId)]);
    return { productos, equipo };
  }, true);
  const [instalada, setInstalada] = useState(false);
  const [hoja, setHoja] = useState<"perfil" | "instalar" | "publicar" | "cerrar" | "vista" | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claveFallida, setClaveFallida] = useState<ClaveOnboarding>("checklist_cerrado_en");
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
    else if (i === 5) setHoja("instalar");
    else abrirEquipo();
  };
  return <section data-checklist className="px-5 pt-4 pb-2">
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-display text-titulo-seccion font-bold">Deja tu tienda lista</h2>
      <span className="shrink-0 text-secundario">{hechos} de 7</span>
    </div>
    <div className="flex gap-2" role="group" aria-label="Capítulos de preparación">
      {capitulos.map((c, i) => <button key={c.numero} type="button" ref={el => { botonesCapitulo.current[i] = el; }}
        aria-label={`Capítulo ${c.numero} · ${c.nombre}, ${c.hechos} de ${c.total} pasos${c.completo ? ", completo" : ""}`}
        aria-pressed={seleccionado === i} aria-controls="checklist-capitulo"
        className={`tocable flex h-11 min-w-11 flex-1 items-center rounded-radio-s px-1 outline-none focus-visible:outline-3 focus-visible:outline-foco ${seleccionado === i ? "border-2 border-texto" : "border-2 border-transparent"}`}
        onClick={() => seleccionarCapituloChecklist(i)} onKeyDown={e => {
          const destino = e.key === "Home" ? 0 : e.key === "End" ? capitulos.length - 1 : e.key === "ArrowRight" ? (i + 1) % capitulos.length : e.key === "ArrowLeft" ? (i + capitulos.length - 1) % capitulos.length : null;
          if (destino === null) return;
          e.preventDefault(); seleccionarCapituloChecklist(destino); botonesCapitulo.current[destino]?.focus();
        }}>
        <span aria-hidden="true" className="relative h-1.5 w-full overflow-hidden rounded-full bg-superficie-hundida">
          <span className="checklist-relleno absolute inset-0 origin-left rounded-full bg-accion" style={{ transform: `scaleX(${c.proporcion})` }} />
        </span>
      </button>)}
    </div>
    <div id="checklist-capitulo" aria-labelledby="checklist-titulo">
      <p className="text-secundario text-texto-secundario">Capítulo {capitulo.numero} · {capitulo.hechos} de {capitulo.total} pasos</p>
      <h3 id="checklist-titulo" className="mt-1 mb-3 font-display text-titulo-seccion font-bold">{capitulo.nombre}</h3>
      {error && !hoja && <Aviso tono="peligro" accion={{ texto: "Reintentar", alTocar: () => void marcar(claveFallida) }}>{error}</Aviso>}
      <ListaAgrupada etiqueta={`Pasos de ${capitulo.nombre}`} className="[&_span.truncate]:whitespace-normal [&_span.truncate]:overflow-visible">
        {capitulo.pasos.map(i => <FilaLista key={i}
          titulo={TITULOS[i]} inicio={<CheckSeleccion marcado={pasos[i]} />}
          detalle={`${pasos[i] ? "Hecho" : "Pendiente"}${i === 2 ? ` · ${Math.min(cantidad, 5)} de 5 con foto` : ""}`}
          etiqueta={`${TITULOS[i]} · ${pasos[i] ? "Hecho, revisar" : "Pendiente"}`}
          onClick={() => i === 3 && pasos[i] ? setHoja("vista") : actuar(i)}
        />)}
      </ListaAgrupada>
      {seleccionado === 1 && <div className="mt-2 flex flex-wrap gap-2">
        <Boton jerarquia="secundario" tamano="compacto" onClick={() => setHoja("vista")}>Ver cómo queda</Boton>
        <p className="self-center text-secundario text-texto-secundario">Cinco productos para empezar. Publica cuando quieras.</p>
      </div>}
      {seleccionado === 2 && !pasos[6] && <Boton jerarquia="secundario" tamano="compacto" className="mt-2" cargando={guardando} onClick={() => void marcar("equipo_omitido_en")}>Lo hago sola</Boton>}
      {capitulo.completo && <div className="mt-3">
        <p role="status" className="text-secundario">Capítulo listo. Tu tienda sigue tomando forma.</p>
        {pendiente >= 0 && <Boton jerarquia="secundario" tamano="compacto" className="mt-2" onClick={() => { seleccionarCapituloChecklist(pendiente); botonesCapitulo.current[pendiente]?.focus(); }}>Continuar al capítulo {capitulos[pendiente].numero}</Boton>}
      </div>}
    </div>
    <Boton jerarquia="terciario" tamano="compacto" className="mt-2" onClick={() => setHoja("cerrar")}>Ocultar guía</Boton>
    {hoja === "perfil" && <Perfil alCerrar={() => setHoja(null)} />}
    <Hoja abierta={hoja === "instalar"} alCerrar={() => setHoja(null)} titulo="Tu tienda, a un toque" protegerAtras>
      {error && <Aviso tono="peligro">{error}</Aviso>}
      <h3 className="text-destacado">En iPhone</h3><p className="text-cuerpo">Abre Deslizapp en Safari. Toca Compartir y luego «Añadir a pantalla de inicio».</p>
      <h3 className="mt-4 text-destacado">En Android</h3><p className="text-cuerpo">Abre Deslizapp en Chrome. En el menú toca «Instalar aplicación» o «Añadir a pantalla de inicio».</p>
      <Boton className="mt-4" cargando={guardando} onClick={() => void marcar("pantalla_inicio_en")}>Ya lo hice</Boton>
    </Hoja>
    <Hoja abierta={hoja === "cerrar"} alCerrar={() => setHoja(null)} titulo="¿Ocultar la guía?" protegerAtras>{error && <Aviso tono="peligro">{error}</Aviso>}<p className="text-cuerpo">Puedes seguir preparando tu tienda desde Catálogo, Mi marca y Tu equipo. Esta guía no volverá a aparecer.</p><Boton className="mt-4" cargando={guardando} onClick={() => void marcar("checklist_cerrado_en")}>Ocultar guía</Boton><Boton jerarquia="terciario" onClick={() => setHoja(null)}>Cancelar</Boton></Hoja>
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
