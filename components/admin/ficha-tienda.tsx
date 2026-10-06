"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alerta, Avatar, Boton, Campo, Etiqueta, Tarjeta } from "@/components/ui";
import { Hoja } from "@/components/hoja";
import { useAdmin, useAdminDemo } from "@/lib/data/admin/provider";
import type { FichaTiendaAdmin } from "@/lib/admin/tipos";
import { EstadoAdmin } from "./estado";
import { IconoChevronDerecha, IconoPersona, IconoWhatsApp, IconoEnlaceExterno } from "@/components/iconos";

type Accion = "creditos" | "transferir" | "pausar" | "reactivar" | null;
const fecha = (v: string | null) => v ? new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", day: "numeric", month: "short", year: "numeric" }).format(new Date(v)) : "—";
const monto = (v: number | null) => v === null ? "Acordado" : new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(v);

export function FichaTienda({ tiendaId }: { tiendaId: string }) {
  const admin = useAdmin();
  const demo = useAdminDemo();
  const raiz = demo ? "/admin-demo" : "/admin";
  const [ficha, setFicha] = useState<FichaTiendaAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accion, setAccion] = useState<Accion>(null);
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [correo, setCorreo] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const leer = useCallback(async () => {
    setCargando(true); setError(null);
    try { setFicha(await admin.tienda(tiendaId)); }
    catch { setError("No pudimos abrir esta tienda."); }
    finally { setCargando(false); }
  }, [admin, tiendaId]);
  useEffect(() => { const id = window.setTimeout(() => void leer(), 0); return () => window.clearTimeout(id); }, [leer]);

  const ejecutar = async () => {
    if (!ficha || !accion) return;
    setOcupado(true); setAviso(null);
    try {
      if (accion === "creditos") {
        const n = Number(cantidad);
        if (!Number.isInteger(n) || n === 0 || !motivo.trim()) throw new Error("Escribe una cantidad distinta de cero y un motivo.");
        await admin.ajustarCreditos(tiendaId, n, motivo.trim());
      } else if (accion === "transferir") {
        if (!correo.includes("@")) throw new Error("Revisa el correo del nuevo dueño.");
        await admin.transferirTienda(tiendaId, correo.trim());
      } else {
        await admin.cambiarEstadoTienda(tiendaId, accion);
      }
      setConfirmar(false); setAccion(null); setCantidad("1"); setMotivo(""); setCorreo("");
      await leer();
    } catch (e) {
      setConfirmar(false);
      setAviso(e instanceof Error ? e.message : "No se pudo guardar. Inténtalo otra vez.");
    } finally { setOcupado(false); }
  };

  const abrirVerComo = async () => {
    if (demo) { setAviso("Ver como requiere una sesión admin real. Demo no consulta tiendas reales."); return; }
    setOcupado(true); setAviso(null);
    try {
      const r = await fetch("/api/admin/ver-como/iniciar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tiendaId }) });
      if (!r.ok) throw new Error("No pudimos abrir Ver como.");
      window.location.assign("/");
    } catch (e) { setAviso(e instanceof Error ? e.message : "No pudimos abrir Ver como."); }
    finally { setOcupado(false); }
  };

  const t = ficha?.tienda;
  const nombreAccion = accion === "creditos" ? "Ajustar créditos" : accion === "transferir" ? "Pasar la tienda a otro dueño" : accion === "pausar" ? "Pausar tienda" : "Reactivar tienda";
  const descripcionAccion = accion === "creditos" ? `Se registrará un ajuste de ${cantidad} créditos con el motivo indicado.` : accion === "transferir" ? `La propiedad pasará a la cuenta ${correo || "indicada"}.` : accion === "pausar" ? "La tienda quedará pausada y el cambio aparecerá en el registro." : "La tienda volverá a estar activa y el cambio aparecerá en el registro.";

  return <>
    <EstadoAdmin cargando={cargando && !ficha} error={error} reintentar={() => void leer()} />
    {t && <>
      <div className="flex items-center gap-3">
        <Link href={`${raiz}/tiendas`} aria-label="Volver a Tiendas" className="grid size-11 shrink-0 place-items-center rounded-full bg-superficie-hundida text-bosque"><IconoChevronDerecha tamano={20} className="rotate-180" /></Link>
        <div className="ml-auto rounded-full bg-bosque px-3 py-1 text-secundario font-bold text-papel">admin</div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Avatar nombre={t.nombre} tipo="tienda" foto={t.logoUrl ?? t.fotoPerfilUrl} tamano="grande" />
        <div className="min-w-0"><h1 className="font-display text-titulo-pantalla font-bold leading-tight text-bosque">{t.nombre}</h1><p className="text-secundario text-texto-secundario">{t.rubro} · {t.vendedora ?? "Vendedora"} · desde {fecha(t.creadoEn)}</p><div className="mt-1 flex gap-1.5"><Etiqueta tono={t.estado === "activa" ? "exito" : "atencion"}>{t.estado === "activa" ? "Activa" : t.estado === "en_prueba" ? "En prueba" : t.estado}</Etiqueta><Etiqueta tono="neutro">{ficha.cuenta.planNombre}</Etiqueta></div></div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <button type="button" onClick={() => void abrirVerComo()} disabled={ocupado} className="min-h-[76px] rounded-radio-l bg-superficie p-2 text-bosque focus-visible:outline-2 focus-visible:outline-accion"><span className="mb-1 flex justify-center"><IconoPersona tamano={21} /></span><span className="text-[12px] font-bold">Ver como ella</span></button>
        {t.whatsapp ? <a href={`https://wa.me/${t.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="min-h-[76px] rounded-radio-l bg-superficie p-2 text-bosque focus-visible:outline-2 focus-visible:outline-accion"><span className="mb-1 flex justify-center"><IconoWhatsApp tamano={21} /></span><span className="text-[12px] font-bold">Escribirle</span></a> : <span className="min-h-[76px] rounded-radio-l bg-superficie p-2 text-texto-secundario"><span className="mb-1 flex justify-center"><IconoWhatsApp tamano={21} /></span><span className="text-[12px] font-bold">Sin WhatsApp</span></span>}
        <a href={t.urlCatalogo ?? `/tienda/${t.slug}`} target="_blank" rel="noreferrer" className="min-h-[76px] rounded-radio-l bg-superficie p-2 text-bosque focus-visible:outline-2 focus-visible:outline-accion"><span className="mb-1 flex justify-center"><IconoEnlaceExterno tamano={21} /></span><span className="text-[12px] font-bold">Su catálogo</span></a>
      </div>
      {aviso && <p className="mt-3 rounded-radio-m bg-atencion-suave p-3 text-secundario text-atencion-texto" role="alert">{aviso}</p>}

      <Tarjeta className="mt-4">
        <div className="flex items-start justify-between gap-2"><h2 className="font-display text-titulo-hoja font-bold">Cuenta</h2><Etiqueta tono={ficha.cuenta.estadoCobro === "al_dia" ? "exito" : "atencion"}>{ficha.cuenta.estadoCobro.replaceAll("_", " ")}</Etiqueta></div>
        <p className="mt-2"><strong className="font-display text-titulo-pantalla">{monto(ficha.cuenta.precioMensual)}</strong><span className="ml-2 text-secundario text-texto-secundario">al mes · {ficha.cuenta.planNombre}</span></p>
        <p className="mt-1 text-secundario text-texto-secundario">Último pago: {ficha.cuenta.ultimoPago ? fecha(ficha.cuenta.ultimoPago.creadoEn) : "sin registrar"}{ficha.cuenta.pagadoHasta ? ` · pagado hasta ${fecha(ficha.cuenta.pagadoHasta)}` : ""}.</p>
        <div className="mt-3 flex flex-wrap gap-2"><Boton deshabilitado>Registrar pago · Muy pronto</Boton><Boton jerarquia="secundario" deshabilitado>Cambiar plan · Muy pronto</Boton></div>
      </Tarjeta>

      <Tarjeta className="mt-3">
        <div className="flex items-center justify-between"><h2 className="font-display text-titulo-hoja font-bold">Cómo le va</h2><span className="text-secundario text-texto-secundario">últimos 30 días</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[[`${ficha.treintaDias.productosVisibles} / ${ficha.treintaDias.limiteProductos}`,"Productos visibles"],[ficha.treintaDias.aaahs,"Aaahs"],[ficha.treintaDias.pedidos,"Pedidos"],[ficha.treintaDias.solicitudesSinRegistrar,"Sin registrar"],[ficha.treintaDias.creditos,"Créditos"],[`${(ficha.treintaDias.almacenamientoBytes / 1024 / 1024).toFixed(1)} MB`,"Fotos y videos"]].map(([n, label])=><div key={String(label)} className="rounded-radio-m bg-fondo p-3"><p className="font-display text-destacado font-bold">{n}</p><p className="text-secundario font-bold">{label}</p></div>)}
        </div>
      </Tarjeta>

      <Tarjeta className="mt-3">
        <div className="flex justify-between"><h2 className="font-display text-titulo-hoja font-bold">Catálogo</h2><Etiqueta tono={ficha.catalogo.estado === "publicado" ? "exito" : "neutro"}>{ficha.catalogo.estado}</Etiqueta></div>
        <p className="mt-2 text-secundario text-texto-secundario">Desde {fecha(ficha.catalogo.solicitadoEn)} · {t.urlCatalogo ?? `/tienda/${t.slug}`}</p>
        <div className="mt-3 flex gap-2"><Boton jerarquia="secundario" deshabilitado>Personalizar · Muy pronto</Boton><Boton href={t.urlCatalogo ?? `/tienda/${t.slug}`} jerarquia="secundario">Abrir</Boton></div>
      </Tarjeta>

      <Tarjeta className="mt-3"><h2 className="font-display text-titulo-hoja font-bold">Equipo</h2><ul className="mt-2 divide-y divide-linea">{ficha.equipo.map(m=><li key={m.usuarioId} className="flex min-h-12 items-center justify-between gap-2 py-2"><span className="truncate font-bold">{m.nombre || m.email} · {m.rol}</span><span className="shrink-0 text-[12px] text-texto-secundario">{m.ultimaEntradaEn ? fecha(m.ultimaEntradaEn) : "Sin actividad"}</span></li>)}</ul></Tarjeta>

      <Tarjeta className="mt-3"><h2 className="font-display text-titulo-hoja font-bold">Lo último</h2>{ficha.eventos.length ? <ul className="mt-2 space-y-2">{ficha.eventos.map((e,i)=><li key={`${e.tipo}-${e.en}-${i}`} className="flex gap-2 text-secundario"><span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-bosque" /><span>{e.tipo === "pedido" ? `Pedido #${e.datos.numero} · ${e.datos.estado}` : e.tipo === "pago" ? `Pago · ${monto(Number(e.datos.monto ?? 0))}` : e.tipo === "admin" ? `Admin · ${String(e.datos.accion ?? "cambio")}` : `Retoque · ${e.datos.estado}`} · {fecha(e.en)}</span></li>)}</ul> : <p className="mt-2 text-secundario text-texto-secundario">Todavía no hay actividad registrada.</p>}</Tarjeta>

      <section className="mt-4 overflow-hidden rounded-radio-l border border-linea bg-superficie divide-y divide-linea" aria-label="Acciones de tienda">
        <button onClick={() => setAccion("creditos")} className="flex min-h-14 w-full items-center justify-between px-4 text-left font-bold focus-visible:outline-2 focus-visible:outline-accion">Ajustar créditos <span>›</span></button>
        <button onClick={() => setAccion("transferir")} className="flex min-h-14 w-full items-center justify-between px-4 text-left font-bold focus-visible:outline-2 focus-visible:outline-accion">Pasar la tienda a otro dueño <span>›</span></button>
        <button onClick={() => { setAccion(t.estado === "pausada" ? "reactivar" : "pausar"); setConfirmar(true); }} className="flex min-h-14 w-full items-center justify-between px-4 text-left font-bold text-peligro focus-visible:outline-2 focus-visible:outline-accion">{t.estado === "pausada" ? "Reactivar tienda" : "Pausar tienda"}<span>›</span></button>
      </section>
      <Hoja abierta={accion === "creditos" || accion === "transferir"} alCerrar={() => setAccion(null)} titulo={nombreAccion}>
        <div className="space-y-4 px-5 pb-8">
          {accion === "creditos" && <><p className="text-texto-secundario">Saldo actual: <strong>{ficha.treintaDias.creditos} créditos</strong>.</p><Campo etiqueta="Cantidad (usa negativo para retirar)" type="number" value={cantidad} onChange={e=>setCantidad(e.target.value)} /><Campo etiqueta="Motivo" value={motivo} onChange={e=>setMotivo(e.target.value)} maxLength={200} /></>}
          {accion === "transferir" && <><p className="text-texto-secundario">La persona nueva recibirá la titularidad y la actual quedará como miembro.</p><Campo etiqueta="Correo del nuevo dueño" type="email" value={correo} onChange={e=>setCorreo(e.target.value)} autoComplete="email" /></>}
          <div className="flex justify-end gap-2"><Boton jerarquia="secundario" onClick={()=>setAccion(null)}>Cancelar</Boton><Boton onClick={()=>setConfirmar(true)}>Continuar</Boton></div>
        </div>
      </Hoja>
      <Alerta abierta={confirmar} titulo={`¿${nombreAccion}?`} descripcion={descripcionAccion} textoCancelar="Volver" accion={{ texto: ocupado ? "Guardando…" : "Confirmar", tono: accion === "pausar" ? "peligro" : "accion", alConfirmar: ejecutar }} alCancelar={()=>setConfirmar(false)} />
    </>}
  </>;
}
