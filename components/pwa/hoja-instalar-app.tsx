"use client";

import { useEffect, useRef, useState } from "react";
import { useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { usePermisos } from "@/lib/data/permisos";
import { mensajeDeError } from "@/lib/data/errores";
import { Hoja } from "../hoja";
import { Aviso, Boton } from "../ui";
import { Segmentos } from "../controles";
import { useToast } from "../toast";
import { AnimacionInstalarIos } from "./animacion-instalar-ios";
import { useAppInstalada, useInstalarPwa } from "./instalar-pwa";

/** Marca el paso «Pantalla de inicio» (solo quien administra la tienda; en Ver como no se guarda nada). */
export function useMarcarInstalada() {
  const { tiendaId } = useTiendaActiva(); const datos = useData(); const { esDuena } = usePermisos();
  const puede = esDuena && !datos.soloMirar;
  return puede ? () => datos.marcarOnboarding(tiendaId, "pantalla_inicio_en") : null;
}

/** Hoja «Tu tienda, a un toque»: animación en iPhone, botón en Android. La usan la guía de Inicio y el menú de la tienda. */
export function HojaInstalarApp({ abierta, alCerrar, plataformaInicial }: { abierta: boolean; alCerrar: () => void; plataformaInicial: "ios" | "android" }) {
  const toast = useToast();
  const marcarInstalada = useMarcarInstalada();
  const instalacion = useInstalarPwa();
  const instalada = useAppInstalada();
  const [plataforma, setPlataforma] = useState(plataformaInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bloqueo = useRef(false);
  const marcada = useRef(false);
  const [vista, setVista] = useState(abierta);
  // Al abrirse, la pestaña vuelve a la que le toca al teléfono.
  if (abierta !== vista) { setVista(abierta); if (abierta) { setPlataforma(plataformaInicial); setError(null); } }

  // Idempotente: una sola marca por apertura, aunque lleguen a la vez el resultado de instalar() y `appinstalled`.
  const marcar = async () => {
    if (bloqueo.current || marcada.current) return;
    bloqueo.current = true; setGuardando(true); setError(null);
    try { await marcarInstalada?.(); marcada.current = true; alCerrar(); }
    catch (e) { setError(mensajeDeError(e, "No pudimos guardar este paso. Reintenta.")); }
    finally { bloqueo.current = false; setGuardando(false); }
  };
  // Solo cuenta un `appinstalled` que llega con la hoja abierta (no uno viejo de antes de abrirla).
  const instaladaAlAbrir = useRef(instalacion.instalada);
  useEffect(() => { if (abierta) { instaladaAlAbrir.current = instalacion.instalada; marcada.current = false; } }, [abierta]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (abierta && instalacion.instalada && !instaladaAlAbrir.current) void Promise.resolve().then(marcar);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, instalacion.instalada]);
  const instalarAndroid = async () => {
    const r = await instalacion.instalar();
    if (r !== "accepted") return;
    toast("Deslizapp ya está en tu pantalla de inicio."); // el aviso depende solo del resultado de instalar()
    await marcar();
  };
  // Navegadores integrados y otros navegadores de iPhone: la guía es la de Safari.
  const integrado = typeof navigator !== "undefined" && /Instagram|FBAN|FBAV|WhatsApp|CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);

  return <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Tu tienda, a un toque" protegerAtras>
    {error && <Aviso tono="peligro">{error}</Aviso>}
    <Segmentos etiqueta="Tu teléfono" opciones={[{ id: "ios", texto: "iPhone" }, { id: "android", texto: "Android" }]} valor={plataforma} alCambiar={setPlataforma} />
    {plataforma === "ios" ? <>
      <AnimacionInstalarIos activa={abierta} />
      {integrado && <p className="mt-2 text-secundario text-texto-secundario">Ábrela en Safari.</p>}
      <Boton className="mt-4" cargando={guardando} onClick={() => void marcar()}>Ya lo hice</Boton>
    </> : instalada ? <p className="mt-4 text-cuerpo">Ya está instalada.</p> : instalacion.puedeInstalar ? <>
      <p className="mt-4 text-cuerpo">Un toque, y Chrome te pide confirmar.</p>
      <Boton className="mt-4" cargando={guardando} onClick={() => void instalarAndroid()}>Instalar Deslizapp</Boton>
    </> : <>
      <p className="mt-4 text-cuerpo">Abre Deslizapp en Chrome. Toca ⋮ y luego Instalar aplicación (o Añadir a pantalla de inicio).</p>
      <Boton className="mt-4" cargando={guardando} onClick={() => void marcar()}>Ya lo hice</Boton>
    </>}
  </Hoja>;
}
