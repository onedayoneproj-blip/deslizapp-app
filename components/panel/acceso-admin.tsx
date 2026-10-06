"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useData } from "@/lib/data/provider";
import { createClient } from "@/lib/supabase/client";
import { IconoChispa } from "../iconos";

/**
 * ¿Mostrar «Administrar Deslizapp»? Solo a un admin activo (RPC soy_admin), nunca durante Ver como y nunca si la consulta
 * falla. El enlace no autoriza nada: /admin vuelve a comprobarlo en el servidor y cada RPC también.
 * En la demo, el enlace lleva al admin de la demo (/admin-demo), que solo usa datos de este navegador.
 */
function usePuedeAdministrar(): "real" | "demo" | null {
  const { modo, soloMirar } = useData();
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (modo !== "real" || soloMirar) return;
    let vigente = true;
    createClient()
      .rpc("soy_admin")
      .then(
        ({ data, error }) => vigente && setAdmin(!error && data === true),
        () => vigente && setAdmin(false),
      );
    return () => {
      vigente = false;
    };
  }, [modo, soloMirar]);
  if (soloMirar) return null;
  if (modo === "demo") return "demo";
  return modo === "real" && admin ? "real" : null;
}

export function AccesoAdmin({ alAbrir }: { alAbrir: () => void }) {
  const tipo = usePuedeAdministrar();
  if (!tipo) return null;
  return (
    <Link
      href={tipo === "demo" ? "/admin-demo" : "/admin"}
      onClick={alAbrir}
      className="tocable mt-3 flex w-full items-center gap-3 rounded-[18px] border-[1.5px] border-borde bg-white px-4 py-3 text-left"
    >
      <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center text-bosque"><IconoChispa tamano={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold">{tipo === "demo" ? "Admin de la demo" : "Administrar Deslizapp"}</span>
        <span className="block text-[13px] text-suave">{tipo === "demo" ? "Entrega o devuelve las fotos de esta demo." : "Hoy, tiendas, trabajo y cobros."}</span>
      </span>
    </Link>
  );
}
