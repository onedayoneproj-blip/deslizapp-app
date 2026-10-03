"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { NOVEDADES, VERSION_ACTUAL, novedadesDesde, type Novedad } from "@/lib/novedades";
import { HojaInventario, type VistaInventario } from "../catalogo/hoja-inventario";
import { HojaMiMarca } from "../marca-tienda/hoja-mi-marca";
import { HojaPlan } from "./hoja-plan";
import { PantallaNovedades } from "./pantalla-novedades";

/** `enlace`: Mi marca abre mostrando el campo del enlace del catálogo. */
type CampoMarca = "enlace";
/** Filtros de la lista del Catálogo que se pueden pedir desde fuera (la leyenda de "Tu inventario"). */
export type FiltroCatalogo = "visibles" | "por_agotarse" | "agotados";
type PanelUI = {
  abrirPlan: () => void;
  /** Abre "Tu inventario"; con "espacio" entra directo a "Hacer espacio". */
  abrirInventario: (vista?: Extract<VistaInventario, "espacio">) => void;
  /** Pide la lista del Catálogo con ese filtro (y lleva a ella si no se está ahí). `n` cambia en cada pedido. */
  filtrarCatalogo: (filtro: FiltroCatalogo) => void;
  filtroPedido: { filtro: FiltroCatalogo; n: number } | null;
  abrirNovedades: () => void; abrirMiMarca: (campo?: CampoMarca) => void };

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
  const router = useRouter();
  const ruta = usePathname();
  const [planAbierto, setPlanAbierto] = useState(false);
  const [inventarioAbierto, setInventarioAbierto] = useState(false);
  const [vistaInventario, setVistaInventario] = useState<VistaInventario>("resumen");
  const [inventarioAbiertoEn, setInventarioAbiertoEn] = useState(0);
  const [filtroPedido, setFiltroPedido] = useState<PanelUI["filtroPedido"]>(null);
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
  const filtrarCatalogo = useCallback(
    (filtro: FiltroCatalogo) => {
      setFiltroPedido((anterior) => ({ filtro, n: (anterior?.n ?? 0) + 1 }));
      if (ruta !== "/catalogo") router.push("/catalogo", { scroll: false });
    },
    [ruta, router],
  );
  const abrirNovedades = useCallback(() => setNovedades(NOVEDADES.slice(0, 1)), []);
  const cerrarNovedades = useCallback(() => setNovedades([]), []);
  const abrirMiMarca = useCallback((campo?: CampoMarca) => {
    setCampoMarca(campo);
    setMarcaAbierta(true);
  }, []);
  const cerrarMiMarca = useCallback(() => setMarcaAbierta(false), []);
  const valor = useMemo(() => ({ abrirPlan, abrirInventario, filtrarCatalogo, filtroPedido, abrirNovedades, abrirMiMarca }),
    [abrirPlan, abrirInventario, filtrarCatalogo, filtroPedido, abrirNovedades, abrirMiMarca],);

  return (
    <Contexto.Provider value={valor}>
      {children}
      <HojaInventario abierta={inventarioAbierto} alCerrar={cerrarInventario} vistaAlAbrir={vistaInventario} ahora={inventarioAbiertoEn} />
      <HojaPlan abierta={planAbierto} alCerrar={cerrarPlan} />
      <HojaMiMarca abierta={marcaAbierta} alCerrar={cerrarMiMarca} campo={campoMarca} />
      {novedades.length > 0 && <PantallaNovedades novedades={novedades} alCerrar={cerrarNovedades} />}
    </Contexto.Provider>
  );
}

export function usePanelUI(): PanelUI {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("usePanelUI() debe usarse dentro de <PanelUIProvider>.");
  return valor;
}
