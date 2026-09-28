"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { NOMBRE_PLAN } from "@/lib/config";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { IconoCerrar, IconoCheck, IconoMatraz, IconoPedidos, IconoReiniciar } from "../iconos";
import { useToast } from "../toast";
import { LogoTienda } from "./logo-tienda";

/**
 * Menú de la tienda (hoja inferior): selector de tienda activa + acciones de la demo.
 * Mientras no hay login real, aquí se "cambia de sesión".
 */
export function MenuTienda({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const { tiendaActivaId, getTiendas, cambiarTiendaActiva, simularPedidoCatalogo, reiniciarDemo } = useData();
  const { data: tiendas } = useConsulta("tiendas", getTiendas);
  const toast = useToast();
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto, alCerrar]);

  if (!abierto) return null;

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
      const piezas = pedido.items.reduce((suma, i) => suma + i.cantidad, 0);
      toast(`${cliente.nombre} acaba de pedir ${piezas} ${piezas === 1 ? "producto" : "productos"}. Aaah.`);
    } catch {
      toast("Sin productos activos no hay pedido que simular.");
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
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="menu-tienda-titulo">
      <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-bosque/40" onClick={cerrar} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[85dvh] max-w-[480px] overflow-y-auto rounded-t-3xl bg-papel px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-linea" />
        <div className="flex items-center justify-between">
          <h2 id="menu-tienda-titulo" className="font-display text-xl text-bosque">
            Tus tiendas
          </h2>
          <button type="button" onClick={cerrar} className="-mr-2 rounded-full p-2 text-bosque/60 hover:text-bosque" aria-label="Cerrar">
            <IconoCerrar tamano={20} />
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {tiendas?.map((t) => {
            const activa = t.id === tiendaActivaId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => elegirTienda(t.id)}
                  aria-pressed={activa}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                    activa ? "border-bosque bg-menta/60" : "border-linea bg-white/60 hover:border-bosque/40"
                  }`}
                >
                  <LogoTienda tienda={t} tamano={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{t.nombre}</span>
                    <span className="block text-sm text-suave">
                      {NOMBRE_PLAN[t.plan]} · {t.limiteProductos} productos
                    </span>
                  </span>
                  {activa && <IconoCheck tamano={20} className="text-bosque" />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex items-baseline gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-suave">Modo demo</h3>
          <span className="font-mano text-lg text-mandarina">nadie se entera</span>
        </div>
        <div className="mt-2 divide-y divide-linea rounded-2xl border border-linea bg-white/60">
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
          <Link
            href="/prueba"
            onClick={cerrar}
            className="flex items-center gap-3 px-3 py-3 text-left hover:bg-menta/40 first:rounded-t-2xl last:rounded-b-2xl"
          >
            <span className="text-bosque">
              <IconoMatraz tamano={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold">Laboratorio de datos</span>
              <span className="block text-xs text-suave">Para comprobar que cada tienda ve solo lo suyo.</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
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
      className={`flex w-full items-center gap-3 px-3 py-3 text-left first:rounded-t-2xl last:rounded-b-2xl ${
        alerta ? "bg-mandarina/15" : "hover:bg-menta/40"
      }`}
    >
      <span className={alerta ? "text-mandarina" : "text-bosque"}>{icono}</span>
      <span>
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block text-xs text-suave">{detalle}</span>
      </span>
    </button>
  );
}
