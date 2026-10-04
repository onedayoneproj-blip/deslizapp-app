"use client";

// La vista de la tienda sobre el link del pedido (/pedido/CODIGO), docs/prompts/pedido-catalogo-panel.md §1.
// El comprador nunca carga esto: pedido-comprador.tsx lo trae solo con cookie de sesión o si tocan «¿Eres la tienda?».
// La tienda se reconoce en el servidor: la sesión (getClaims), su fila en `usuarios` y la solicitud leída con su sesión
// (RLS de solicitudes_pedido: solo miembros de esa tienda). Otra cuenta no recibe nada de la solicitud ni puede registrar.

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { HAY_SUPABASE } from "@/lib/supabase/config";
import { aUsuario, type FilaUsuario } from "@/lib/data/filas";
import { cambiarTiendaActivaDemo, tiendaDeSolicitudDemo } from "@/lib/data/demo";
import { esErrorDeRed } from "@/lib/data/errores";
import { ProveedorDemo, ProveedorReal, useData } from "@/lib/data/provider";
import { fuentePublica } from "@/lib/data/publica";
import { entrarConGoogle, verDemo } from "@/lib/data/sesion";
import type { Usuario, VistaSolicitud } from "@/lib/types";
import { Hoja } from "../hoja";
import { ToastProvider } from "../toast";
import { Aviso, Boton, ProveedorToast } from "../ui";
import { HojaRegistrarSolicitud } from "./registrar-solicitud";

type Fase =
  | { tipo: "comprobando" }
  | { tipo: "entrar"; aviso: string | null }
  | { tipo: "otra" }
  | { tipo: "error" }
  | { tipo: "tienda"; usuario: Usuario }
  | { tipo: "demo" };

const AVISO_LOGIN = "No se pudo entrar con Google. Tu pedido sigue aquí: inténtalo otra vez.";

/** Si Google volvió con error (`?error_login=1`), se avisa una vez y se limpia la dirección. */
function tomarErrorLogin(): boolean {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has("error_login")) return false;
    url.searchParams.delete("error_login");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    return true;
  } catch {
    return false;
  }
}

type Sesion = { tipo: "sin-sesion" } | { tipo: "sin-tienda" } | { tipo: "usuario"; usuario: Usuario };

async function leerSesionDeLaTienda(): Promise<Sesion> {
  if (!HAY_SUPABASE) return { tipo: "sin-sesion" };
  const supabase = createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error && esErrorDeRed(error)) throw error;
  const sub = data?.claims?.sub;
  if (!sub) return { tipo: "sin-sesion" };
  const r = await supabase.from("usuarios").select("*").eq("id", sub).maybeSingle();
  if (r.error) throw r.error;
  return r.data ? { tipo: "usuario", usuario: aUsuario(r.data as FilaUsuario) } : { tipo: "sin-tienda" };
}

export function TiendaEnPedido({
  codigo,
  demo,
  pedirEntrar,
  alCerrar,
  alCambiarEstado,
}: {
  codigo: string;
  demo: boolean;
  /** Lo pidió con «¿Eres la tienda?»: sin sesión se ofrece entrar. Si no, se comprueba en silencio y solo aparece si es la tienda. */
  pedirEntrar: boolean;
  alCerrar: () => void;
  /** El estado público cambió (registrado o descartado). */
  alCambiarEstado: (nueva: VistaSolicitud) => void;
}) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>({ tipo: "comprobando" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    const errorLogin = !demo && tomarErrorLogin();
    const visible = pedirEntrar || errorLogin;
    if (demo) {
      queueMicrotask(() => vivo && setFase({ tipo: "entrar", aviso: null }));
      return () => {
        vivo = false;
      };
    }
    leerSesionDeLaTienda().then(
      (s) => {
        if (!vivo) return;
        if (s.tipo === "usuario") setFase({ tipo: "tienda", usuario: s.usuario });
        else if (!visible) alCerrar();
        else if (s.tipo === "sin-tienda") setFase({ tipo: "otra" });
        else setFase({ tipo: "entrar", aviso: errorLogin ? AVISO_LOGIN : null });
      },
      () => {
        if (!vivo) return;
        if (visible) setFase({ tipo: "error" });
        else alCerrar();
      },
    );
    return () => {
      vivo = false;
    };
    // alCerrar cambia en cada render del padre; la comprobación es una por intento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, intento]);

  const releerPublico = () => {
    fuentePublica(demo)
      .then((f) => f.verSolicitud(codigo))
      .then((v) => v && alCambiarEstado(v))
      .catch(() => {});
  };
  const verPedido = (pedidoId: string) => {
    // El panel abre en el modo de esta vista: la demo (si se vio como la tienda demo) o la cuenta real.
    if (demo) verDemo();
    router.push(`/pedidos/${pedidoId}`);
  };

  if (fase.tipo === "comprobando") {
    return pedirEntrar ? (
      <HojaCompacta alCerrar={alCerrar}>
        <p role="status" className="py-6 text-center text-texto-secundario">
          Revisando tu sesión…
        </p>
      </HojaCompacta>
    ) : null;
  }
  if (fase.tipo === "error") {
    return (
      <HojaCompacta alCerrar={alCerrar}>
        <Aviso tono="peligro" accion={{ texto: "Reintentar", alTocar: () => (setFase({ tipo: "comprobando" }), setIntento((n) => n + 1)) }}>
          No pudimos revisar tu sesión. Revisa tu conexión.
        </Aviso>
      </HojaCompacta>
    );
  }
  if (fase.tipo === "entrar") {
    return (
      <EresLaTienda
        codigo={codigo}
        demo={demo}
        aviso={fase.aviso}
        alCerrar={alCerrar}
        alVerComoTiendaDemo={() => {
          const tiendaId = tiendaDeSolicitudDemo(codigo);
          if (!tiendaId) {
            setFase({ tipo: "entrar", aviso: "Este pedido de prueba no está guardado en este navegador. Ábrelo donde lo armaste." });
            return;
          }
          cambiarTiendaActivaDemo(tiendaId);
          setFase({ tipo: "demo" });
        }}
      />
    );
  }
  if (fase.tipo === "otra") {
    return (
      <HojaCompacta alCerrar={alCerrar}>
        <div className="flex flex-col gap-3 pb-2">
          <p className="font-display text-titulo-seccion">Esta cuenta no es de esa tienda.</p>
          <p className="text-texto-secundario">Solo la tienda que recibió el pedido puede registrarlo. Si tienes otra cuenta de Deslizapp, entra con ella.</p>
          <BotonGoogle codigo={codigo} texto="Entrar con otra cuenta" cambiarCuenta />
          <Boton jerarquia="terciario" anchoCompleto onClick={alCerrar}>
            Cerrar
          </Boton>
        </div>
      </HojaCompacta>
    );
  }

  const hoja = (
    <ComprobarMiembro codigo={codigo} pedirEntrar={pedirEntrar} alNoEs={() => (pedirEntrar ? setFase({ tipo: "otra" }) : alCerrar())}>
      <HojaRegistrarSolicitud codigo={codigo} abierta alCerrar={alCerrar} alVerPedido={verPedido} alCambio={releerPublico} />
    </ComprobarMiembro>
  );
  return (
    <ToastProvider>
      <ProveedorToast>
        {fase.tipo === "demo" ? (
          <ProveedorDemo cargando={null}>{hoja}</ProveedorDemo>
        ) : (
          <ProveedorReal usuario={fase.usuario}>{hoja}</ProveedorReal>
        )}
      </ProveedorToast>
    </ToastProvider>
  );
}

/**
 * Antes de mostrar nada de la tienda: ¿esta solicitud es de una de sus tiendas? La lectura va con su sesión (RLS); si no
 * es suya llega null y no se monta la hoja.
 */
function ComprobarMiembro({ codigo, pedirEntrar, alNoEs, children }: { codigo: string; pedirEntrar: boolean; alNoEs: () => void; children: ReactNode }) {
  const { solicitudPorCodigo } = useData();
  const [es, setEs] = useState<boolean | null>(null);
  useEffect(() => {
    let vivo = true;
    solicitudPorCodigo(codigo).then(
      (s) => {
        if (!vivo) return;
        if (s) setEs(true);
        else alNoEs();
      },
      // Sin conexión: la hoja misma muestra Reintentar (no se decide "no es tuya" por un error).
      () => vivo && setEs(true),
    );
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, solicitudPorCodigo]);
  if (es) return children;
  return pedirEntrar ? (
    <HojaCompacta alCerrar={() => {}}>
      <p role="status" className="py-6 text-center text-texto-secundario">
        Revisando tu tienda…
      </p>
    </HojaCompacta>
  ) : null;
}

function HojaCompacta({ alCerrar, children }: { alCerrar: () => void; children: ReactNode }) {
  return (
    <Hoja abierta alCerrar={alCerrar} titulo="¿Eres la tienda?">
      {children}
    </Hoja>
  );
}

const sinSuscripcion = () => () => {};
/** iPhone en Safari (no la app instalada): el link de WhatsApp abre aquí y la sesión de la app instalada no se comparte. */
function enSafariDeIphone(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const instalada = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !instalada;
}

/** EresLaTienda (tablero): hoja compacta para entrar con Google y volver a este mismo pedido. */
function EresLaTienda({
  codigo,
  demo,
  aviso,
  alCerrar,
  alVerComoTiendaDemo,
}: {
  codigo: string;
  demo: boolean;
  aviso: string | null;
  alCerrar: () => void;
  alVerComoTiendaDemo: () => void;
}) {
  const iphone = useSyncExternalStore(sinSuscripcion, enSafariDeIphone, () => false);
  return (
    <HojaCompacta alCerrar={alCerrar}>
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-cuerpo">Entra con tu cuenta de Deslizapp y registra este pedido desde aquí.</p>
        {aviso && <Aviso tono="peligro">{aviso}</Aviso>}
        {demo ? (
          <>
            <Boton anchoCompleto onClick={alVerComoTiendaDemo}>
              Ver como la tienda (demo)
            </Boton>
            <p className="text-secundario text-texto-secundario">
              Es la demo: el pedido de prueba vive solo en este navegador y no toca ninguna tienda real.
            </p>
          </>
        ) : (
          <>
            <BotonGoogle codigo={codigo} texto="Entrar con Google" />
            <p className="text-secundario text-texto-secundario">
              La primera vez en este teléfono te pide elegir tu cuenta de Google. Después vuelves directo a este pedido.
            </p>
            {iphone && (
              <p className="text-secundario text-texto-secundario">
                En iPhone este link se abrió en Safari, y Safari no comparte la sesión de la app instalada: por eso te pide entrar aquí.
              </p>
            )}
          </>
        )}
      </div>
    </HojaCompacta>
  );
}

function BotonGoogle({ codigo, texto, cambiarCuenta = false }: { codigo: string; texto: string; cambiarCuenta?: boolean }) {
  const [problema, setProblema] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const entrar = async () => {
    setSaliendo(true);
    setProblema(null);
    if (cambiarCuenta) {
      try {
        await createClient().auth.signOut();
      } catch {
        // Sin conexión: igual lo intenta.
      }
    }
    const p = await entrarConGoogle(`/pedido/${codigo}`);
    // Sin problema el navegador ya se va a Google; se queda "cargando" hasta salir.
    if (p) {
      setProblema(p);
      setSaliendo(false);
    }
  };
  return (
    <>
      <Boton anchoCompleto cargando={saliendo} onClick={() => void entrar()}>
        {texto}
      </Boton>
      {problema && <Aviso tono="peligro">{problema}</Aviso>}
    </>
  );
}
