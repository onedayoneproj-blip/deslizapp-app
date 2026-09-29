"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { NOMBRE_PLAN } from "@/lib/config";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { VERSION_ACTUAL } from "@/lib/novedades";
import { Hoja } from "../hoja";
import { IconoCheck, IconoMatraz, IconoPedidos, IconoReiniciar } from "../iconos";
import { useToast } from "../toast";
import { Logotipo } from "../marca";
import { LogoTienda } from "./logo-tienda";
import { usePanelUI } from "./ui";

/**
 * Menú de la tienda: selector de tienda activa + acciones de la demo.
 * Mientras no hay login real, aquí se "cambia de sesión".
 */
export function MenuTienda({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const { tiendaActivaId, getTiendas, cambiarTiendaActiva, simularPedidoCatalogo, reiniciarDemo } = useData();
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
    <Hoja abierta={abierto} alCerrar={cerrar} titulo="Tus tiendas" altura="auto">
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

      <button
        type="button"
        onClick={() => {
          cerrar();
          abrirMiMarca();
        }}
        className="tocable mt-3 flex w-full items-center gap-3 rounded-[18px] border-[1.5px] border-borde bg-white px-4 py-3 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rosa text-lg">✦</span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">Mi marca</span>
          <span className="block text-[13px] text-suave">Logo, colores y letra de tus cupones.</span>
        </span>
      </button>

      <div className="mt-6 flex items-baseline gap-2">
        <h2 className="text-xs font-bold tracking-wider text-suave uppercase">Modo demo</h2>
        <span className="font-mano text-lg text-mandarina">nadie se entera</span>
      </div>
      <div className="mt-2 divide-y divide-linea overflow-hidden rounded-3xl border border-linea bg-white">
        <AccionDemo
          icono={<IconoPedidos tamano={20} />}
          titulo="Simular pedido del catálogo"
          detalle="Entra un pedido nuevo con productos al azar."
          onClick={simular}
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
          className="font-extrabold text-bosque underline"
        >
          Ver novedades
        </button>
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
