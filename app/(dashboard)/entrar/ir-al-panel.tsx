"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Ya hay sesión (o eligió la demo): `/entrar` no tiene nada que mostrar, se va al Inicio del panel. */
export function IrAlPanel() {
  const router = useRouter();
  useEffect(() => router.replace("/"), [router]);
  return null;
}
