"use client";

import { useState } from "react";
import { Foto } from "@/components/foto";
import { IconoCorazon } from "@/components/iconos";
import { TituloPantalla } from "@/components/panel/titulo-pantalla";
import { useToast } from "@/components/toast";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";

const NOMBRES_PRUEBA = ["Brisa de Prueba", "Aaah Experimental", "Ensayo Rosado", "Muestra Mandarina", "Lote Cero"];

/**
 * Laboratorio de datos (herramienta de la demo, se abre desde el menú de la tienda).
 * Sirve para comprobar la capa de datos: aislamiento por tienda, persistencia y reinicio.
 */
export default function PruebaPage() {
  const { getProductos, getPedidos, getClientes, getPromos, getEventosAaah, crearProducto } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const toast = useToast();
  const [creando, setCreando] = useState(false);

  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: conteos } = useConsulta(`conteos:${tiendaId}`, async () => {
    const [pedidos, clientes, promos, eventos] = await Promise.all([
      getPedidos(tiendaId),
      getClientes(tiendaId),
      getPromos(tiendaId),
      getEventosAaah(tiendaId),
    ]);
    return { pedidos: pedidos.length, clientes: clientes.length, promos: promos.length, aaahs: eventos.length };
  });

  const crearDePrueba = async () => {
    setCreando(true);
    const n = (productos?.length ?? 0) + 1;
    const producto = await crearProducto(tiendaId, {
      nombre: `${NOMBRES_PRUEBA[n % NOMBRES_PRUEBA.length]} ${n}`,
      precio: 1000 + (n % 7) * 250,
      fotos: [],
      fotoRetocada: false,
      categoria: null,
      activo: true,
      destacado: false,
      stock: 3,
      likes: 0,
    });
    setCreando(false);
    toast(`Listo: “${producto.nombre}” ya vive en ${tienda?.nombre ?? "tu tienda"}.`);
  };

  return (
    <>
      <TituloPantalla
        titulo="Laboratorio de datos"
        subtitulo={tienda ? `Solo lo de ${tienda.nombre}. Si aparece algo de otra tienda, algo anda mal.` : undefined}
      />

      <dl className="mt-4 grid grid-cols-5 gap-2 px-4">
        {(
          [
            ["Productos", productos?.length],
            ["Pedidos", conteos?.pedidos],
            ["Clientes", conteos?.clientes],
            ["Promos", conteos?.promos],
            ["Aaahs", conteos?.aaahs],
          ] as const
        ).map(([nombre, valor]) => (
          <div key={nombre} className="flex flex-col-reverse rounded-2xl bg-white/70 px-1 py-2.5 text-center ring-1 ring-linea">
            <dt className="text-[11px] text-suave">{nombre}</dt>
            <dd className="text-lg font-bold tabular-nums">{valor ?? "–"}</dd>
          </div>
        ))}
      </dl>

      <div className="px-4 pt-5">
        <button
          type="button"
          onClick={crearDePrueba}
          disabled={creando}
          className="w-full rounded-full bg-mandarina px-5 py-3.5 font-semibold text-bosque-oscuro shadow-sm tocable disabled:opacity-60"
        >
          + Crear producto de prueba
        </button>
        <p className="mt-2 text-center text-xs text-suave">
          Recarga la página: sigue aquí. “Reiniciar datos de prueba” (menú de la tienda) lo borra.
        </p>
      </div>

      <ul className="mt-5 space-y-2 px-4">
        {productos?.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/70 p-2 ring-1 ring-linea">
            {p.fotos[0] ? (
              <Foto src={p.fotos[0]} alt={p.nombre} className="h-14 w-12 shrink-0 rounded-xl" sizes="48px" />
            ) : (
              <span className="flex h-14 w-12 shrink-0 items-center justify-center rounded-xl bg-rosa/60 font-display text-bosque">
                {p.nombre[0]}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.nombre}</p>
              <p className="text-sm text-suave">
                {formatearPesos(p.precio)} · {p.stock === null ? "sin control de stock" : `stock ${p.stock}`}
                {!p.activo && " · inactivo"}
              </p>
            </div>
            <span className="flex items-center gap-1 pr-2 text-sm text-suave">
              <IconoCorazon tamano={16} className="text-mandarina" />
              {p.likes}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
