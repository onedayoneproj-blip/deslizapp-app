"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { NOVEDADES, VERSION_ACTUAL, novedadesDesde, type Novedad } from "@/lib/novedades";
import { HojaInventario, type VistaInventario } from "../catalogo/hoja-inventario";
import { HojaMiMarca } from "../marca-tienda/hoja-mi-marca";
import { HojaEquipo } from "../equipo/hoja-equipo";
import { HojaPlan } from "./hoja-plan";
import { PantallaNovedades } from "./pantalla-novedades";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { resumenEspera } from "@/lib/avisos";
import type { AvisoLlegada, Producto } from "@/lib/types";
import { HojaEspera } from "../catalogo/hoja-espera";

/** `enlace`: Mi marca abre mostrando el campo del enlace del catálogo. */
type CampoMarca = "enlace" | "logo" | "colores";
type PanelUI = {
  hojaAbierta: boolean;
  capituloChecklist: number | undefined;
  seleccionarCapituloChecklist: (capitulo: number) => void;
  espera: ReturnType<typeof useConsulta<AvisoLlegada[]>> & { resumen: ReturnType<typeof resumenEspera> | undefined };
  abrirEspera: (producto?: Producto) => void;
  abrirPlan: () => void;
  /** Abre "Tu inventario"; con "espacio" entra directo a "Hacer espacio". */
  abrirInventario: (vista?: Extract<VistaInventario, "espacio">) => void;
  abrirNovedades: () => void; abrirMiMarca: (campo?: CampoMarca) => void;
  /** «Tu equipo» (solo la dueña). */
  abrirEquipo: () => void };

const Contexto = createContext<PanelUI | null>(null);

/** Última versión cuyas novedades ya vio esta persona (en este navegador). */
const KEY_VERSION_VISTA = "deslizapp-version-vista";

/**
 * Qué novedades mostrar al abrir la app:
 * - misma versión que la última vista → nada;
 * - nunca vio ninguna y no había usado la app → nada (es su primera vez);
 * - nunca vio ninguna pero ya usaba la app antes de que existieran las novedades → todo lo posterior a 0.1.0;
 * - vio una versión anterior → lo posterior a esa.
 */
function novedadesPendientes(): Novedad[] {
  try {
    const vista = localStorage.getItem(KEY_VERSION_VISTA);
    if (vista === VERSION_ACTUAL) return [];
    if (vista === null) {
      const yaLaUsaba = Object.keys(localStorage).some((k) => k.startsWith("deslizapp-demo-") || k.startsWith("deslizapp-sesion-"));
      return yaLaUsaba ? novedadesDesde(NOVEDADES[NOVEDADES.length - 1]!.version) : [];
    }
    return novedadesDesde(vista);
  } catch {
    return [];
  }
}

/** Estado de interfaz compartido por todo el panel: Plan y créditos, Mi marca y la pantalla de novedades. */
export function PanelUIProvider({ children }: { children: ReactNode }) {
  const { avisosPendientes } = useData();
  const { tiendaId } = useTiendaActiva();
  const { modo } = useData();
  const [capitulosChecklist, setCapitulosChecklist] = useState<Record<string, number>>({});
  const claveChecklist = `${modo}:${tiendaId}`;
  const seleccionarCapituloChecklist = (capitulo: number) => setCapitulosChecklist(v => ({ ...v, [claveChecklist]: capitulo }));
  const consultaEspera = useConsulta(`avisos:${tiendaId}`, () => avisosPendientes(tiendaId), true);
  const resumen = useMemo(() => consultaEspera.data === undefined ? undefined : resumenEspera(consultaEspera.data, tiendaId), [consultaEspera.data, tiendaId]);
  const [vistaEspera, setVistaEspera] = useState<{ tiendaId: string; abierta: boolean; producto?: Producto }>({ tiendaId, abierta: false });
  if (vistaEspera.tiendaId !== tiendaId) setVistaEspera({ tiendaId, abierta: false });
  const abrirEspera = useCallback((producto?: Producto) => setVistaEspera({ tiendaId, abierta: true, producto }), [tiendaId]);
  const [planAbierto, setPlanAbierto] = useState(false);
  const [inventarioAbierto, setInventarioAbierto] = useState(false);
  const [vistaInventario, setVistaInventario] = useState<VistaInventario>("resumen");
  const [inventarioAbiertoEn, setInventarioAbiertoEn] = useState(0);
  const [marcaAbierta, setMarcaAbierta] = useState(false);
  const [campoMarca, setCampoMarca] = useState<CampoMarca | undefined>(undefined);
  // Este proveedor solo se monta en el navegador (dentro de DataProvider), así que puede leer localStorage.
  const [novedades, setNovedades] = useState<Novedad[]>(novedadesPendientes);

  useEffect(() => {
    // Se marca como vista al mostrarla (o al entrar por primera vez): sale una sola vez.
    try {
      localStorage.setItem(KEY_VERSION_VISTA, VERSION_ACTUAL);
    } catch {
      // Sin almacenamiento, en el peor caso se vuelve a ver.
    }
  }, []);

  const abrirPlan = useCallback(() => setPlanAbierto(true), []);
  const cerrarPlan = useCallback(() => setPlanAbierto(false), []);
  const abrirInventario = useCallback((vista?: Extract<VistaInventario, "espacio">) => {
    setVistaInventario(vista ?? "resumen");
    setInventarioAbiertoEn(Date.now());
    setInventarioAbierto(true);
  }, []);
  const cerrarInventario = useCallback(() => setInventarioAbierto(false), []);
  const abrirNovedades = useCallback(() => setNovedades(NOVEDADES.slice(0, 1)), []);
  const cerrarNovedades = useCallback(() => setNovedades([]), []);
  const abrirMiMarca = useCallback((campo?: CampoMarca) => {
    setCampoMarca(campo);
    setMarcaAbierta(true);
  }, []);
  const cerrarMiMarca = useCallback(() => setMarcaAbierta(false), []);
  const [equipoAbierto, setEquipoAbierto] = useState(false);
  const abrirEquipo = useCallback(() => setEquipoAbierto(true), []);
  const cerrarEquipo = useCallback(() => setEquipoAbierto(false), []);
  const valor = { hojaAbierta: marcaAbierta || equipoAbierto || planAbierto || inventarioAbierto || vistaEspera.abierta || novedades.length > 0, capituloChecklist: capitulosChecklist[claveChecklist], seleccionarCapituloChecklist, abrirPlan, abrirInventario, abrirNovedades, abrirMiMarca, abrirEquipo, abrirEspera, espera: { ...consultaEspera, resumen } };

  return (
    <Contexto.Provider value={valor}>
      {children}
      {vistaEspera.tiendaId === tiendaId && vistaEspera.abierta && <HojaEspera key={tiendaId} productoInicial={vistaEspera.producto} alSalir={() => setVistaEspera(v => ({ ...v, abierta: false }))} />}
      <HojaInventario abierta={inventarioAbierto} alCerrar={cerrarInventario} vistaAlAbrir={vistaInventario} ahora={inventarioAbiertoEn} />
      <HojaPlan abierta={planAbierto} alCerrar={cerrarPlan} />
      <HojaMiMarca abierta={marcaAbierta} alCerrar={cerrarMiMarca} campo={campoMarca} />
      <HojaEquipo abierta={equipoAbierto} alCerrar={cerrarEquipo} />
      {novedades.length > 0 && <PantallaNovedades novedades={novedades} alCerrar={cerrarNovedades} />}
    </Contexto.Provider>
  );
}

export function usePanelUI(): PanelUI {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("usePanelUI() debe usarse dentro de <PanelUIProvider>.");
  return valor;
}
