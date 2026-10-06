"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar, Buscador, Etiqueta } from "@/components/ui";
import { Segmentos } from "@/components/controles";
import type { FiltroTiendas, ListaTiendasAdmin } from "@/lib/admin/tipos";
import { useAdmin, useAdminDemo } from "@/lib/data/admin/provider";
import { EstadoAdmin } from "./estado";

const filtros: { id: FiltroTiendas; texto: string }[] = [
  { id: "todas", texto: "Todas" }, { id: "activas", texto: "Activas" },
  { id: "en_prueba", texto: "En prueba" }, { id: "atrasadas", texto: "Atrasadas" },
  { id: "pausadas", texto: "Pausadas" },
];
const salud: Record<string, { texto: string; punto: string }> = {
  viva: { texto: "Viva", punto: "bg-exito" }, te_necesita: { texto: "Te necesita", punto: "bg-resalte" },
  esperando_equipo: { texto: "Esperando al equipo", punto: "bg-borde-pastilla" },
  se_enfria: { texto: "Se enfría", punto: "bg-mandarina" }, quieta: { texto: "Nueva", punto: "bg-borde-pastilla" },
};

export function PantallaTiendas() {
  const fuente = useAdmin();
  const raiz = useAdminDemo() ? "/admin-demo" : "/admin";
  const [filtro, setFiltro] = useState<FiltroTiendas>("todas");
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [lista, setLista] = useState<ListaTiendasAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { const id = window.setTimeout(() => setBusqueda(texto), 250); return () => window.clearTimeout(id); }, [texto]);
  const leer = useCallback(async () => {
    setCargando(true); setError(null);
    try { setLista(await fuente.tiendas(filtro, busqueda)); }
    catch { setError("No pudimos cargar las tiendas."); }
    finally { setCargando(false); }
  }, [fuente, filtro, busqueda]);
  useEffect(() => { const id = window.setTimeout(() => void leer(), 0); return () => window.clearTimeout(id); }, [leer]);

  const opciones = filtros.filter(f => f.id === filtro || f.id === "todas" || (lista?.conteos[f.id] ?? 0) > 0).map(f => ({ id: f.id, texto: f.texto, cantidad: lista?.conteos[f.id] }));
  return <>
    <h1 className="font-display text-titulo-pantalla font-bold text-bosque">Tiendas</h1>
    <div className="mt-4"><Buscador etiqueta="Buscar tiendas" valor={texto} alCambiar={setTexto} placeholder="Nombre, WhatsApp o correo" /></div>
    <div className="mt-3"><Segmentos opciones={opciones} valor={filtro} alCambiar={setFiltro} etiqueta="Filtrar tiendas" /></div>
    <p className="mt-3 text-secundario font-bold text-texto-secundario">Primero las que te necesitan</p>
    <div className="mt-2"><EstadoAdmin cargando={cargando && !lista} error={error} reintentar={() => void leer()} /></div>
    {lista && !cargando && lista.tiendas.length === 0 && <p className="rounded-radio-l border border-linea bg-superficie p-5 text-texto-secundario">No encontramos tiendas con esos filtros.</p>}
    {lista && lista.tiendas.length > 0 && <ul className="mt-2 overflow-hidden rounded-radio-l border border-linea bg-superficie divide-y divide-linea">
      {lista.tiendas.map(t => {
        const s = salud[t.salud] ?? salud.quieta;
        const estado = t.estadoCobro === "en_prueba" ? ["En prueba", "neutro"] : t.estado === "pausada" ? ["Pausada", "atencion"] : t.estado === "activa" ? ["Activa", "exito"] : ["Inactiva", "neutro"];
        return <li key={t.id}><Link href={`${raiz}/tiendas/${t.id}`} className="flex min-h-[72px] items-center gap-3 px-3.5 py-3 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accion">
          <Avatar nombre={t.nombre} tipo="tienda" foto={t.logoUrl ?? t.fotoPerfilUrl} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5"><span className="font-bold text-destacado leading-tight">{t.nombre}</span><Etiqueta tono={estado[1] as "neutro"|"atencion"|"exito"}>{estado[0]}</Etiqueta></span>
            <span className="mt-1 flex items-center gap-1.5 text-secundario text-texto-secundario"><span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${s.punto}`} />{s.texto} · {t.motivo ? t.motivo.regla.replaceAll("_", " ") : "Sin asuntos pendientes"}</span>
          </span><span aria-hidden="true" className="text-2xl text-texto-secundario">›</span>
        </Link></li>;
      })}
    </ul>}
    {lista && <p className="mt-3 text-[12px] text-texto-secundario">● Viva　● Te necesita　● Se enfría　● Esperando al equipo</p>}
  </>;
}
