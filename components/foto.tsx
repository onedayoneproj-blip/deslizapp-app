"use client";

import Image from "next/image";

/**
 * Foto de producto o logo. En la demo las fotos son SVG del seed o data URLs subidas en el
 * navegador, así que van sin optimizar.
 */
export function Foto({ src, alt, className = "", sizes = "96px", prioridad = false }: { src: string; alt: string; className?: string; sizes?: string; prioridad?: boolean }) {
  // En avatares la foto ocupa su caja mediante `absolute inset-0`; no añadas también `relative`
  // al mismo elemento porque anula `absolute` y deja a Image(fill) sin altura.
  const posicion = /(^|\s)absolute(\s|$)/.test(className) ? "absolute" : "relative";
  return (
    <span className={`${posicion} block overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        priority={prioridad}
        className="object-cover"
      />
    </span>
  );
}
