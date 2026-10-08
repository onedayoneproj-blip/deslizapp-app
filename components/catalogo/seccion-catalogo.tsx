"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ESTADOS_QUE_SE_REFRESCAN, vistaCatalogo, type EstadoCatalogo } from "@/lib/catalogo-estado";
import { consumirRevisionDelCatalogo } from "@/lib/destello";
import { mensajeDeError } from "@/lib/data/errores";
import { useConsulta } from "@/lib/data/consulta";
import { usePermisos } from "@/lib/data/permisos";
import { useData } from "@/lib/data/provider";
import { enlaceCatalogo } from "@/lib/enlace-catalogo";
import { enlaceAlPublicar, faltanParaPublicar } from "@/lib/publicar-catalogo";
import type { Tienda } from "@/lib/types";
import { copiarTexto } from "@/lib/portapapeles";
import { usePanelUI } from "../panel/ui";
import { useToast } from "../toast";
import { HojaCatalogoEnLinea } from "./hoja-catalogo-en-linea";
import { HojaDejarDeMostrar } from "./hoja-dejar-de-mostrar";
import { HojaPublicarCatalogo } from "./hoja-publicar-catalogo";
import { HojaRevisarCatalogo } from "./hoja-revisar-catalogo";
import { TarjetaCatalogo } from "./tarjeta-catalogo";

const clave = (tiendaId: string) => `deslizapp-catalogo-visto-${tiendaId}`;

/** ¿Ya vio la celebración de "recién publicado" en este dispositivo? (localStorage, sin romper si no hay). */
function yaLoVio(tiendaId: string): boolean {
  try {
    return localStorage.getItem(clave(tiendaId)) === "1";
  } catch {
    return false;
  }
}
function guardarVisto(tiendaId: string) {
  try {
    localStorage.setItem(clave(tiendaId), "1");
  } catch {
    // Sin almacenamiento, en el peor caso se repite la celebración.
  }
}

/** Cuánto se ve la celebración antes de pasar a "En línea". */
const CELEBRACION_MS = 6000;
/** Cada cuánto se vuelve a leer la tienda mientras el equipo trabaja en el catálogo. */
const REFRESCO_MS = 60_000;

/**
 * La tarjeta del catálogo en línea con todo lo que la rodea: las hojas (pedir, revisar, ver/compartir el enlace), las llamadas a
 * las RPC, la celebración de "recién publicado" y la actualización en vivo (el equipo cambia el estado desde fuera de la app).
 */
export function SeccionCatalogo({ tienda }: { tienda: Tienda }) {
  const { pedirCambiosCatalogo, publicarCatalogo, publicarMiCatalogo, despublicarMiCatalogo, getProductos, releerTienda } = useData();
  const router = useRouter();
  const { abrirMiMarca, abrirPlan } = usePanelUI();
  const toast = useToast();
  // Pedir, revisar y publicar el catálogo son del grupo «catalogo» (Editor en adelante). La base lo exige igual.
  // Publicarse al público y dejar de mostrarlo son solo de la dueña (grupo «equipo»): un colaborador ve el estado, no el botón.
  const { puede, porque, esDuena } = usePermisos();
  const sinCatalogo = !puede("catalogo");
  const soloDuena = !esDuena;
  // Mismo cache que la lista de productos: al crear uno, «te faltan…» se actualiza solo.
  const { data: productos } = useConsulta(`productos:${tienda.id}`, () => getProductos(tienda.id));
  const faltan = productos ? faltanParaPublicar(productos) : 0;

  const [enLinea, setEnLinea] = useState(false);
  const [publicar, setPublicar] = useState(false);
  const [dejar, setDejar] = useState(false);
  const [revisar, setRevisar] = useState(false);
  const [marcados, setMarcados] = useState<string[]>([]);

  const enlaceValido = enlaceCatalogo(tienda.urlCatalogo) !== null;
  const visto = marcados.includes(tienda.id) || yaLoVio(tienda.id);
  const vista = vistaCatalogo({
    tiendaEstado: tienda.estado,
    catalogoEstado: tienda.catalogoEstado,
    publicadoEn: tienda.catalogoPublicadoEn,
    enlaceValido,
    visto,
  });

  const marcarVisto = useCallback((tiendaId: string) => {
    guardarVisto(tiendaId);
    setMarcados((m) => (m.includes(tiendaId) ? m : [...m, tiendaId]));
  }, []);

  // La celebración se ve un rato y pasa a "En línea".
  useEffect(() => {
    if (vista !== "recien") return;
    const t = setTimeout(() => marcarVisto(tienda.id), CELEBRACION_MS);
    return () => clearTimeout(t);
  }, [vista, tienda.id, marcarVisto]);

  // Actualización en vivo: al volver a la pestaña y, mientras el equipo trabaja, cada minuto.
  const estado = tienda.catalogoEstado;
  useEffect(() => {
    const leer = () => {
      if (document.visibilityState === "visible") void releerTienda(tienda.id);
    };
    document.addEventListener("visibilitychange", leer);
    const cada = ESTADOS_QUE_SE_REFRESCAN.includes(estado) ? setInterval(leer, REFRESCO_MS) : undefined;
    return () => {
      document.removeEventListener("visibilitychange", leer);
      if (cada) clearInterval(cada);
    };
  }, [estado, tienda.id, releerTienda]);

  // Llegó a "listo para revisar" con la pantalla abierta: se avisa.
  const anterior = useRef<{ id: string; estado: EstadoCatalogo } | null>(null);
  useEffect(() => {
    const previo = anterior.current;
    anterior.current = { id: tienda.id, estado };
    if (previo && previo.id === tienda.id && previo.estado !== "revisar" && estado === "revisar") toast("¡Tu catálogo está listo para revisar!");
  }, [estado, tienda.id, toast]);

  // Viene de Inicio con "Revisar": abre la hoja de revisión.
  useEffect(() => {
    if (!consumirRevisionDelCatalogo()) return;
    const t = setTimeout(() => setRevisar(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Las llamadas a las RPC muestran el error en español y no lo relanzan (las hojas solo cambian su estado de "enviando").
  const intentar = async (accion: () => Promise<unknown>, exito: string, alTerminar: () => void) => {
    try {
      await accion();
      alTerminar();
      toast(exito);
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo. Inténtalo otra vez."));
    }
  };

  // Compartir desde la tarjeta "En línea": hoja nativa con el enlace; si no existe, lo copia. Sin `await` antes de copiar (iPhone).
  const compartir = () => {
    const enlace = enlaceCatalogo(tienda.urlCatalogo);
    if (!enlace) return;
    if (typeof navigator.share === "function") {
      navigator.share({ title: tienda.nombre, url: enlace.href }).catch(() => {
        // Cerrar la hoja de compartir sin elegir nada no es un error.
      });
      return;
    }
    void copiarTexto(enlace.href).then((ok) => toast(ok ? "Enlace copiado" : "No se pudo copiar. Ábrelo y copia el enlace desde ahí."));
  };

  // Copiar el enlace desde la tarjeta «En línea». Sin `await` antes de copiar (iPhone).
  const copiar = () => {
    const enlace = enlaceCatalogo(tienda.urlCatalogo);
    if (!enlace) return;
    void copiarTexto(enlace.href).then((ok) => toast(ok ? "Enlace copiado" : "No se pudo copiar. Ábrelo y copia el enlace desde ahí."));
  };

  return (
    <>
      <TarjetaCatalogo
        vista={vista}
        tienda={tienda}
        faltan={faltan}
        acciones={{
          alPublicar: () => setPublicar(true),
          alCrearProducto: sinCatalogo ? () => toast(porque) : () => router.push("/catalogo/nuevo"),
          alCopiar: copiar,
          alDejarDeMostrar: () => setDejar(true),
          soloDuena: soloDuena ? () => toast(porque) : undefined,
          alPedir: () => undefined,
          alRevisar: () => setRevisar(true),
          alCompartir: compartir,
          alCompartirReciente: () => {
            marcarVisto(tienda.id);
            setEnLinea(true);
          },
          alConectar: () => abrirMiMarca("enlace"),
          alVerPlan: abrirPlan,
          sinPermiso: sinCatalogo ? () => toast(porque) : undefined,
        }}
      />
      <HojaPublicarCatalogo
        abierta={publicar}
        alCerrar={() => setPublicar(false)}
        enlace={enlaceAlPublicar(tienda.slug)}
        alConfirmar={() => intentar(() => publicarMiCatalogo(tienda.id), "¡Tu catálogo ya está en línea!", () => setPublicar(false))}
      />
      <HojaDejarDeMostrar
        abierta={dejar}
        alCerrar={() => setDejar(false)}
        alConfirmar={() => intentar(() => despublicarMiCatalogo(tienda.id), "Listo. Tu catálogo ya no se muestra.", () => setDejar(false))}
      />
      <HojaRevisarCatalogo
        abierta={revisar}
        alCerrar={() => setRevisar(false)}
        tienda={tienda}
        alPublicar={() => intentar(() => publicarCatalogo(tienda.id), "¡Tu catálogo ya está en línea!", () => setRevisar(false))}
        alPedirCambios={(notas) => intentar(() => pedirCambiosCatalogo(tienda.id, notas), "Cambios enviados. Te lo devolvemos para revisar muy pronto.", () => setRevisar(false))}
      />
      <HojaCatalogoEnLinea
        abierta={enLinea && enlaceValido}
        alCerrar={() => setEnLinea(false)}
        tienda={tienda}
        alCambiarEnlace={() => {
          setEnLinea(false);
          abrirMiMarca("enlace");
        }}
      />
    </>
  );
}
