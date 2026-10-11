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
  const [vista, setVista] = useState(abierta);
  // Al abrirse, la pestaña vuelve a la que le toca al teléfono.
  if (abierta !== vista) { setVista(abierta); if (abierta) { setPlataforma(plataformaInicial); setError(null); } }

  const marcar = async () => {
    if (bloqueo.current) return;
    bloqueo.current = true; setGuardando(true); setError(null);
    try { await marcarInstalada?.(); alCerrar(); return true; }
    catch (e) { setError(mensajeDeError(e, "No pudimos guardar este paso. Reintenta.")); return false; }
    finally { bloqueo.current = false; setGuardando(false); }
  };
  // Instalada desde el menú de Chrome con la hoja abierta (appinstalled): también cuenta.
  useEffect(() => {
    if (abierta && instalacion.instalada) void Promise.resolve().then(marcar);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, instalacion.instalada]);
  const instalarAndroid = async () => {
    if (await instalacion.instalar() === "accepted") { if (await marcar()) toast("Deslizapp ya está en tu pantalla de inicio."); }
  };
  const integrado = typeof navigator !== "undefined" && /Instagram|FBAN|FBAV|WhatsApp/i.test(navigator.userAgent);

  return <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Tu tienda, a un toque" protegerAtras>
    {error && <Aviso tono="peligro">{error}</Aviso>}
    <Segmentos etiqueta="Tu teléfono" opciones={[{ id: "ios", texto: "iPhone" }, { id: "android", texto: "Android" }]} valor={plataforma} alCambiar={setPlataforma} tono="opcion" />
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
