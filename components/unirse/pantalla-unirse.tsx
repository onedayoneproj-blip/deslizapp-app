"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { HAY_SUPABASE } from "@/lib/supabase/config";
import { RUTA_UNIRSE } from "@/lib/auth/canje";
import { entrarConGoogle } from "@/lib/data/sesion";
import { esErrorDeRed, mensajeDeError } from "@/lib/data/errores";
import {
  crearMiTienda,
  EnlaceNoValido,
  guardarCodigo,
  haySesion,
  leerCodigo,
  misSolicitudes,
  olvidarCodigo,
  reclamarEnlace,
  solicitudPrincipal,
  type MiSolicitud,
  type Reclamo,
} from "@/lib/data/unirse";
import { RUBROS, type Rubro } from "@/lib/rubros";
import { Isotipo, Logotipo } from "../marca";
import { Boton, Campo, GrupoOpciones } from "../ui";

const NOMBRE_RUBRO: Record<Rubro, string> = {
  perfumes: "Perfumes", ropa: "Ropa", accesorios: "Accesorios", belleza: "Belleza", comida: "Comida", hogar: "Hogar", general: "Otro",
};
/** Recarga completa al panel: la sesión se vuelve a leer y ya trae la tienda (nada de lo anterior queda en memoria). */
const irAlPanel = () => window.location.assign(new URL("/", window.location.origin).href);
const NO_SIRVE = "Este enlace ya no sirve. Pídele uno nuevo a quien te invitó.";
const CADA_MS = 15_000;

type Fase =
  | { tipo: "cargando" }
  | { tipo: "sin-sesion"; aviso: string | null }
  | { tipo: "esperando"; tienda: string | null }
  | { tipo: "aprobado"; tienda: string | null }
  | { tipo: "rechazado"; tienda: string | null }
  | { tipo: "crear"; enlaceId: string }
  | { tipo: "no-sirve" }
  | { tipo: "error"; mensaje: string };

function faseDe(s: Reclamo | MiSolicitud | null): Fase {
  if (!s) return { tipo: "no-sirve" };
  if (s.tipo === "tienda_nueva") {
    if (s.estado === "aprobado" && !("tiendaCreada" in s && s.tiendaCreada)) return { tipo: "crear", enlaceId: s.id };
    if (s.estado === "usado" || ("tiendaCreada" in s && s.tiendaCreada)) return { tipo: "aprobado", tienda: s.tiendaNombre };
    return { tipo: "no-sirve" };
  }
  if (s.estado === "esperando") return { tipo: "esperando", tienda: s.tiendaNombre };
  if (s.estado === "aprobado") return { tipo: "aprobado", tienda: s.tiendaNombre };
  if (s.estado === "rechazado") return { tipo: "rechazado", tienda: s.tiendaNombre };
  return { tipo: "no-sirve" };
}

/**
 * `/unirse/<código>`: abrir un enlace de invitación. El código se guarda en este navegador y se quita de la barra al instante
 * (nunca viaja en el retorno de Google); al reclamarlo se borra. Estados: entrar con Google, esperando la aprobación, ya eres
 * parte, crear tu tienda (enlace de Deslizapp), «ya no sirve» y sin conexión.
 */
export function PantallaUnirse({ codigo }: { codigo?: string }) {
  const [fase, setFase] = useState<Fase>({ tipo: "cargando" });
  const avisoLogin = useRef<string | null>(null);

  const resolver = useCallback(async () => {
    setFase({ tipo: "cargando" });
    if (!HAY_SUPABASE) {
      setFase({ tipo: "no-sirve" });
      return;
    }
    try {
      if (!(await haySesion())) {
        setFase({ tipo: "sin-sesion", aviso: avisoLogin.current });
        return;
      }
      const guardado = leerCodigo();
      if (guardado) {
        try {
          const r = await reclamarEnlace(guardado);
          olvidarCodigo();
          setFase(faseDe(r));
          return;
        } catch (e) {
          if (e instanceof EnlaceNoValido) {
            olvidarCodigo();
            // Si esta cuenta ya lo había abierto antes, su estado sigue en «mis solicitudes».
            const propia = solicitudPrincipal(await misSolicitudes());
            setFase(propia ? faseDe(propia) : { tipo: "no-sirve" });
            return;
          }
          throw e;
        }
      }
      setFase(faseDe(solicitudPrincipal(await misSolicitudes())));
    } catch (e) {
      setFase({ tipo: "error", mensaje: esErrorDeRed(e) ? "No hay conexión. Revisa tu internet e inténtalo otra vez." : mensajeDeError(e) });
    }
  }, []);

  useEffect(() => {
    if (codigo) guardarCodigo(codigo);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("error_login")) avisoLogin.current = "No se pudo entrar con Google. Inténtalo otra vez.";
      // El código sale de la barra de direcciones (y del historial) apenas se guarda.
      if (url.pathname !== RUTA_UNIRSE || url.search) window.history.replaceState(null, "", RUTA_UNIRSE);
    } catch {
      // Sin historial no pasa nada: la ruta sigue funcionando.
    }
    const t = window.setTimeout(() => void resolver(), 0);
    return () => window.clearTimeout(t);
  }, [codigo, resolver]);

  // Esperando la aprobación: se vuelve a mirar cada 15 s y al volver a la app; cuando la aprueban, pasa sola.
  const esperando = fase.tipo === "esperando";
  useEffect(() => {
    if (!esperando) return;
    const mirar = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const nueva = faseDe(solicitudPrincipal(await misSolicitudes()));
        if (nueva.tipo !== "esperando") setFase(nueva);
      } catch {
        // Sin conexión: se vuelve a intentar en la próxima vuelta.
      }
    };
    const id = window.setInterval(() => void mirar(), CADA_MS);
    document.addEventListener("visibilitychange", mirar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", mirar);
    };
  }, [esperando]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-papel px-6 pt-[calc(28px+env(safe-area-inset-top))] pb-[calc(28px+env(safe-area-inset-bottom))]" data-unirse={fase.tipo}>
      <div className="flex items-center gap-2 text-bosque">
        <Isotipo tamano={30} />
        <Logotipo className="text-[26px]" />
      </div>
      <div className="flex flex-1 flex-col justify-center py-8">
        <Contenido fase={fase} reintentar={() => void resolver()} />
      </div>
    </main>
  );
}

function Contenido({ fase, reintentar }: { fase: Fase; reintentar: () => void }) {
  const [entrando, setEntrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  if (fase.tipo === "cargando") return <p role="status" className="text-center text-suave">Un momento…</p>;

  if (fase.tipo === "sin-sesion") {
    const conGoogle = async () => {
      setEntrando(true);
      setAviso(null);
      const problema = await entrarConGoogle(RUTA_UNIRSE);
      if (problema) {
        setAviso(problema);
        setEntrando(false);
      }
    };
    return (
      <>
        <Image src="/ilustraciones/inicio.webp" alt="" width={180} height={161} unoptimized priority className="mb-6 self-center select-none" draggable={false} />
        <h1 className="font-display text-[28px] leading-tight text-bosque">Te invitaron a Deslizapp</h1>
        <p className="mt-2 text-[15.5px] leading-snug text-suave">Entra con tu cuenta de Google para aceptar la invitación.</p>
        {(aviso ?? fase.aviso) && (
          <p role="alert" className="mt-4 rounded-[18px] bg-mandarina/15 px-4 py-3 text-[14.5px] leading-snug font-bold text-tinta">{aviso ?? fase.aviso}</p>
        )}
        <Boton tamano="grande" anchoCompleto className="mt-6" deshabilitado={entrando} onClick={conGoogle}>
          {entrando ? "Abriendo Google…" : "Entrar con Google"}
        </Boton>
      </>
    );
  }

  if (fase.tipo === "esperando")
    return (
      <>
        <h1 className="font-display text-[28px] leading-tight text-bosque">Esperando que te aprueben</h1>
        <p className="mt-2 text-[15.5px] leading-snug text-suave">
          {fase.tienda ? `${fase.tienda} tiene que darte el visto bueno.` : "Quien te invitó tiene que darte el visto bueno."} Cuando lo haga, entras directo desde aquí.
        </p>
        <p className="mt-4 text-[13.5px] text-suave">Puedes cerrar esta pantalla: al volver, te decimos cómo va.</p>
      </>
    );

  if (fase.tipo === "aprobado")
    return (
      <>
        <h1 className="font-display text-[28px] leading-tight text-bosque">{fase.tienda ? `Ya eres parte de ${fase.tienda}` : "Ya estás dentro"}</h1>
        <p className="mt-2 text-[15.5px] leading-snug text-suave">Ya puedes entrar al panel.</p>
        <Boton tamano="grande" anchoCompleto className="mt-6" onClick={() => irAlPanel()}>
          Entrar a la tienda
        </Boton>
      </>
    );

  if (fase.tipo === "rechazado")
    return (
      <>
        <h1 className="font-display text-[28px] leading-tight text-bosque">Esta vez no se pudo</h1>
        <p className="mt-2 text-[15.5px] leading-snug text-suave">
          {fase.tienda ? `${fase.tienda} no aprobó la entrada.` : "No aprobaron la entrada."} Si crees que es un error, escríbele a quien te invitó.
        </p>
      </>
    );

  if (fase.tipo === "crear") return <CrearTienda enlaceId={fase.enlaceId} />;

  if (fase.tipo === "error")
    return (
      <>
        <h1 className="font-display text-[28px] leading-tight text-bosque">No pudimos abrir tu invitación</h1>
        <p role="alert" className="mt-2 text-[15.5px] leading-snug text-suave">{fase.mensaje}</p>
        <Boton tamano="grande" anchoCompleto className="mt-6" onClick={reintentar}>Reintentar</Boton>
      </>
    );

  return (
    <>
      <h1 className="font-display text-[28px] leading-tight text-bosque">Este enlace ya no sirve</h1>
      <p className="mt-2 text-[15.5px] leading-snug text-suave">{NO_SIRVE}</p>
    </>
  );
}

/** «Crea tu tienda»: los mismos campos de crear_tienda (nombre y rubro). Sin animaciones mientras se escribe (HANDOFF: teclado). */
function CrearTienda({ enlaceId }: { enlaceId: string }) {
  const [nombre, setNombre] = useState("");
  const [rubro, setRubro] = useState<Rubro>("general");
  const [tocado, setTocado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const malo = nombre.trim().length < 1 || nombre.trim().length > 80;
  const crear = async () => {
    setTocado(true);
    setError(null);
    if (malo) return;
    try {
      await crearMiTienda(enlaceId, nombre, rubro);
      irAlPanel();
    } catch (e) {
      setError(e instanceof EnlaceNoValido ? NO_SIRVE : esErrorDeRed(e) ? "No hay conexión. Revisa tu internet e inténtalo otra vez." : mensajeDeError(e));
    }
  };
  return (
    <>
      <h1 className="font-display text-[28px] leading-tight text-bosque">Crea tu tienda</h1>
      <p className="mt-2 text-[15.5px] leading-snug text-suave">Ponle nombre y dinos qué vendes. Lo demás lo armas después, con calma.</p>
      <div className="mt-5 flex flex-col gap-4">
        <Campo
          etiqueta="Nombre de tu tienda"
          value={nombre}
          maxLength={80}
          autoComplete="organization"
          enterKeyHint="done"
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => setTocado(true)}
          error={tocado && malo ? "Escribe el nombre de tu tienda." : undefined}
        />
        <GrupoOpciones titulo="¿Qué vendes?" etiqueta="Qué vendes" opciones={RUBROS.map((r) => ({ id: r, texto: NOMBRE_RUBRO[r] }))} valor={rubro} alCambiar={setRubro} />
        {error && <p role="alert" className="rounded-[18px] bg-mandarina/15 px-4 py-3 text-[14.5px] font-bold text-tinta">{error}</p>}
        <Boton tamano="grande" anchoCompleto onClick={crear}>Crear mi tienda</Boton>
      </div>
    </>
  );
}
