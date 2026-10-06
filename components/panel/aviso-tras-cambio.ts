"use client";

import { useEffect } from "react";
import { KEY_AVISO_TRAS_CAMBIO } from "@/lib/cuenta";
import { useToast } from "../toast";

/** Tras cambiar de tienda la página se recarga: aquí sale, una sola vez, el «Ahora estás en X.» que quedó guardado. */
export function useAvisoTrasCambio() {
  const toast = useToast();
  useEffect(() => {
    try {
      const aviso = sessionStorage.getItem(KEY_AVISO_TRAS_CAMBIO);
      if (!aviso) return;
      sessionStorage.removeItem(KEY_AVISO_TRAS_CAMBIO);
      toast(aviso);
    } catch {
      // Sin sessionStorage: no hay aviso, nada más.
    }
  }, [toast]);
}
