"use client";
import { useData } from "@/lib/data/provider";
import { useToast } from "../toast";
/** Un enlace de mensajería en cualquier hoja de la demo sigue siendo una simulación. */
export function LimiteDemo({ children }: { children: React.ReactNode }) {
  const { modo } = useData();
  const toast = useToast();
  return <div className="contents" onClickCapture={e => {
    if (modo !== "demo") return;
    const enlace = (e.target as Element).closest?.("a[href]");
    if (enlace && /^(https?:\/\/(?:wa\.me|api\.whatsapp\.com)|whatsapp:|mailto:|tel:)/i.test(enlace.getAttribute("href") ?? "")) {
      e.preventDefault(); e.stopPropagation(); toast("Mensaje simulado. En la demo nadie lo recibe.");
    }
  }}>{children}</div>;
}
