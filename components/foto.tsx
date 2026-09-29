"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Foto de producto o logo. En la demo las fotos son SVG del seed o data URLs subidas en el
 * navegador, así que van sin optimizar. Aparece con un fundido al cargar (sobre un fondo neutro).
 */
export function Foto({ src, alt, className = "", sizes = "96px" }: { src: string; alt: string; className?: string; sizes?: string }) {
  // Si cambia la foto, vuelve a fundirse al cargar.
  const [cargada, setCargada] = useState<string | null>(null);
  return (
    <span className={`relative block overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        onLoad={() => setCargada(src)}
        className={`object-cover transition-opacity duration-(--mov-normal) ease-(--curva-salida) ${cargada === src ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  );
}
