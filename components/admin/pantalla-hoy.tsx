"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdmin, useAdminDemo } from "@/lib/data/admin/provider";
import type { AsuntoAdmin, ResumenMesAdmin } from "@/lib/admin/tipos";
import { enlaceWhatsAppAdmin, mensajeWhatsApp, textoAsunto } from "@/lib/admin/mensajes";
import { Boton, Tarjeta } from "@/components/ui";
import { IconoMoneda, IconoClientes, IconoChispa } from "@/components/iconos";
import { EstadoAdmin } from "./estado";

const dinero = (n: number) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n);
const saludoRD = () => {
  const h = Number(new Intl.DateTimeFormat("en", { timeZone: "America/Santo_Domingo", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return h < 5 || h >= 19 ? "noches" : h < 12 ? "días" : "tardes";
};

function Asunto({ asunto, refrescar }: { asunto: AsuntoAdmin; refrescar: () => void }) {
  const fuente = useAdmin();
  const raiz = useAdminDemo() ? "/admin-demo" : "/admin";
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const contenido = textoAsunto(asunto);
  const IconoAsunto = asunto.categoria === "plata" ? IconoMoneda : asunto.categoria === "clientes" ? IconoClientes : IconoChispa;
  const link = enlaceWhatsAppAdmin(asunto.tiendaWhatsapp, mensajeWhatsApp(asunto));
  const manana = async () => {
    setOcupado(true); setAviso(null);
    try { await fuente.posponer(asunto.clave); refrescar(); }
    catch { setAviso("No pudimos posponerlo. Inténtalo otra vez."); }
    finally { setOcupado(false); }
  };
  const soloLink = ["empezar", "seguir", "ver salud", "retocar", "ver cambios"].includes(contenido.accion.toLowerCase());
  const hrefAccion = contenido.accion === "Ver salud" ? `${raiz}/mas` : `${raiz}/trabajo`;
  const hrefTienda = asunto.tiendaId ? `${raiz}/tiendas/${asunto.tiendaId}` : `${raiz}/tiendas`;
  return <Tarjeta className="mb-3 p-4">
    <div className="flex gap-3">
      <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-atencion-suave text-bosque"><IconoAsunto tamano={20} /></span>
      <div className="min-w-0 flex-1">
        <Link href={hrefTienda} className="block rounded-md focus-visible:outline-2 focus-visible:outline-accion"><h2 className="font-bold leading-snug">{contenido.titulo}</h2><p className="mt-1 text-secundario text-texto-secundario">{contenido.motivo}</p></Link>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {soloLink ? <Boton href={hrefAccion}>{contenido.accion}</Boton> : link ? <Boton href={link} whatsapp>{contenido.accion}</Boton> : <Boton href={hrefTienda}>{contenido.accion}</Boton>}
          {asunto.regla === "pago_vencido" ? <Boton jerarquia="terciario" tamano="compacto" href={hrefTienda}>Ya pagó</Boton> : <Boton jerarquia="terciario" tamano="compacto" cargando={ocupado} onClick={manana}>Mañana</Boton>}
        </div>
        {aviso && <p role="alert" className="mt-2 text-secundario text-peligro">{aviso}</p>}
      </div>
    </div>
  </Tarjeta>;
}

export function PantallaHoy() {
  const fuente = useAdmin();
  const [resumen, setResumen] = useState<ResumenMesAdmin | null>(null);
  const [asuntos, setAsuntos] = useState<AsuntoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const leer = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const [r, h] = await Promise.all([fuente.resumenMes(), fuente.hoy()]);
      setResumen(r); setAsuntos(h);
    } catch { setError("No se pudo cargar Hoy."); }
    finally { setCargando(false); }
  }, [fuente]);
  useEffect(() => { const id = window.setTimeout(() => void leer(), 0); return () => window.clearTimeout(id); }, [leer]);
  useEffect(() => {
    const actualizar = () => { if (document.visibilityState === "visible") void leer(); };
    window.addEventListener("focus", actualizar); document.addEventListener("visibilitychange", actualizar);
    return () => { window.removeEventListener("focus", actualizar); document.removeEventListener("visibilitychange", actualizar); };
  }, [leer]);
  const plata = asuntos.filter(a => a.categoria === "plata").length;
  const fecha = new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return <>
    <p className="text-secundario capitalize text-texto-secundario">{fecha}</p>
    <h1 className="mt-2 font-display text-titulo-pantalla font-bold text-bosque">Buenas {saludoRD()}, Lewis.</h1>
    <p className="mt-1 text-texto-secundario">{asuntos.length} {asuntos.length === 1 ? "cosa te espera" : "cosas te esperan"}. {plata} {plata === 1 ? "es" : "son"} de plata.</p>
    <EstadoAdmin cargando={cargando && !resumen} error={error} reintentar={() => void leer()} />
    {resumen && <div className="mt-5 grid grid-cols-2 gap-2.5">
      {[[resumen.tiendasActivas,"Tiendas activas"],[resumen.enPrueba,"En prueba"],[dinero(resumen.cobradoMes),"Cobrado en el mes"],[dinero(resumen.porCobrar),`Por cobrar · ${resumen.porCobrarTiendas} tiendas`]].map(([n,t],i)=><div key={t} className={`rounded-radio-l border border-linea p-3 ${i===3 && resumen.porCobrar ? "bg-atencion-suave text-atencion-texto" : "bg-superficie"}`}><p className="font-display text-destacado font-bold">{n}</p><p className="text-secundario font-bold">{t}</p></div>)}
    </div>}
    <h2 className="mt-7 mb-3 font-display text-titulo-hoja font-bold text-bosque">Lo que pide tu mano</h2>
    {!cargando && !error && asuntos.length === 0 && <Tarjeta className="p-5"><p className="font-display text-destacado font-bold text-bosque">Todo al día. Disfruta el silencio. Dura poco.</p></Tarjeta>}
    {asuntos.map(a => <Asunto key={a.clave} asunto={a} refrescar={() => void leer()} />)}
  </>;
}
