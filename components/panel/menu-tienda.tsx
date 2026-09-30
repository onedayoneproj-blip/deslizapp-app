"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { NOMBRE_PLAN } from "@/lib/config";
import { useConsulta } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { VERSION_ACTUAL } from "@/lib/novedades";
import { Hoja } from "../hoja";
import { IconoCheck, IconoMatraz, IconoPedidos, IconoReiniciar } from "../iconos";
import { useToast } from "../toast";
import { Logotipo } from "../marca";
import { LogoTienda } from "./logo-tienda";
import { usePanelUI } from "./ui";

const NOMBRE_ESTADO_CATALOGO = {
  sin: "sin catálogo",
  solicitado: "pedido recibido",
  generando: "armando",
  revisar: "listo para revisar",
  cambios: "aplicando cambios",
  publicado: "en línea",
} as const;

/**
 * Menú de la tienda (hace de Ajustes): Mi marca, novedades y cerrar sesión.
 * En la demo, además, el selector de tienda activa y las acciones de prueba.
 */
export function MenuTienda({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const { modo, tiendaActivaId, getTiendas, cambiarTiendaActiva, simularPedidoCatalogo, simularAvanceCatalogo, reiniciarDemo, salir } = useData();
  const demo = modo === "demo";
  const { data: tiendas } = useConsulta("tiendas", getTiendas);
  const toast = useToast();
  const { abrirNovedades, abrirMiMarca } = usePanelUI();
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);

  const cerrar = () => {
    setConfirmarReinicio(false);
    alCerrar();
  };

  const elegirTienda = (id: string) => {
    cambiarTiendaActiva(id);
    const nombre = tiendas?.find((t) => t.id === id)?.nombre;
    if (id !== tiendaActivaId && nombre) toast(`Ahora estás en ${nombre}.`);
    cerrar();
  };

  const simular = async () => {
    try {
      const { pedido, cliente } = await simularPedidoCatalogo(tiendaActivaId);
      toast(`Pedido #${pedido.numero} de ${cliente.nombre}. Alguien dijo aaah.`);
    } catch {
      toast("Sin productos visibles no hay pedido que simular.");
    }
    cerrar();
  };

  const avanzarCatalogo = async () => {
    try {
      const t = await simularAvanceCatalogo(tiendaActivaId);
      toast(t.catalogoEstado === "generando" ? `Catálogo: armando (paso ${t.catalogoPaso ?? 1} de 3).` : `Catálogo: ${NOMBRE_ESTADO_CATALOGO[t.catalogoEstado]}.`);
    } catch (e) {
      toast(mensajeDeError(e));
    }
  };

  const reiniciar = async () => {
    if (!confirmarReinicio) {
      setConfirmarReinicio(true);
      return;
    }
    await reiniciarDemo();
    toast("Datos de prueba como nuevos. Aquí no pasó nada.");
    cerrar();
  };

  return (
    <Hoja abierta={abierto} alCerrar={cerrar} titulo={demo ? "Tus tiendas" : "Tu tienda"} altura="auto">
      {demo && (
        <ul className="space-y-2">
          {tiendas?.map((t) => {
            const activa = t.id === tiendaActivaId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => elegirTienda(t.id)}
                  aria-pressed={activa}
                  className={`flex w-full items-center gap-3 rounded-[18px] border-[1.5px] px-3 py-2.5 text-left ${
                    activa ? "border-bosque bg-white" : "border-borde bg-white/60 hover:border-bosque/40"
                  }`}
                >
                  <LogoTienda tienda={t} tamano={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold">{t.nombre}</span>
                    <span className="block text-[13px] text-suave">
                      {NOMBRE_PLAN[t.plan]} · {t.creditosRetoque} créditos
                    </span>
                  </span>
                  {activa && <IconoCheck tamano={20} className="text-bosque" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => {
          cerrar();
          abrirMiMarca();
        }}
        className={`tocable flex w-full items-center gap-3 rounded-[18px] border-[1.5px] border-borde bg-white px-4 py-3 text-left ${demo ? "mt-3" : ""}`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rosa text-lg">✦</span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">Mi marca</span>
          <span className="block text-[13px] text-suave">Logo, colores y letra de tus cupones.</span>
        </span>
      </button>

      {demo && (
        <>
          <div className="mt-6 flex items-baseline gap-2">
            <h2 className="text-xs font-bold tracking-wider text-suave uppercase">Modo demo</h2>
            <span className="font-mano text-lg text-mandarina-texto">nadie se entera</span>
          </div>
          <div className="mt-2 divide-y divide-linea overflow-hidden rounded-3xl border border-linea bg-white">
            <AccionDemo
              icono={<IconoPedidos tamano={20} />}
              titulo="Simular pedido del catálogo"
              detalle="Entra un pedido nuevo con productos al azar."
              onClick={simular}
            />
            <AccionDemo
              icono={<IconoPedidos tamano={20} />}
              titulo="Simular avance del catálogo"
              detalle="Hace de equipo: pedido → armando → listo para revisar."
              onClick={avanzarCatalogo}
            />
            <AccionDemo
              icono={<IconoReiniciar tamano={20} />}
              titulo={confirmarReinicio ? "¿Seguro? Toca otra vez para reiniciar" : "Reiniciar datos de prueba"}
              detalle="Todo vuelve a como estaba. Como si nada."
              onClick={reiniciar}
              alerta={confirmarReinicio}
            />
            <Link href="/prueba" onClick={cerrar} className="flex items-center gap-3 px-4 py-3 text-left hover:bg-menta/40">
              <span className="text-bosque">
                <IconoMatraz tamano={20} />
              </span>
              <span>
                <span className="block text-sm font-extrabold">Laboratorio de datos</span>
                <span className="block text-xs text-suave">Para comprobar que cada tienda ve solo lo suyo.</span>
              </span>
            </Link>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => {
          cerrar();
          void salir();
        }}
        className="tocable mt-5 flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-borde bg-white px-5 text-[15px] font-extrabold text-bosque"
      >
        {demo ? "Salir de la demo" : "Cerrar sesión"}
      </button>

      <div className="mt-5 flex items-center justify-between gap-3 px-1 text-[13px] text-suave">
        <span>
          <Logotipo className="text-bosque" /> · versión {VERSION_ACTUAL}
        </span>
        <button
          type="button"
          onClick={() => {
            cerrar();
            abrirNovedades();
          }}
          className="tocable font-extrabold text-bosque"
        >
          Ver novedades
        </button>
      </div>
      <div className="mt-1 flex justify-center gap-5 text-[13px] text-suave">
        <Link href="/privacidad" onClick={cerrar} className="tocable flex items-center underline">
          Privacidad
        </Link>
        <Link href="/terminos" onClick={cerrar} className="tocable flex items-center underline">
          Términos
        </Link>
      </div>
    </Hoja>
  );
}

function AccionDemo({
  icono,
  titulo,
  detalle,
  onClick,
  alerta = false,
}: {
  icono: ReactNode;
  titulo: string;
  detalle: string;
  onClick: () => void;
  alerta?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${alerta ? "bg-mandarina/15" : "hover:bg-menta/40"}`}
    >
      <span className={alerta ? "text-mandarina" : "text-bosque"}>{icono}</span>
      <span>
        <span className="block text-sm font-extrabold">{titulo}</span>
        <span className="block text-xs text-suave">{detalle}</span>
      </span>
    </button>
  );
}
