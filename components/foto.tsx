"use client";

import Image from "next/image";

/**
 * Foto de producto o logo. En la demo las fotos son SVG del seed o data URLs subidas en el
 * navegador, así que van sin optimizar.
 */
export function Foto({ src, alt, className = "", sizes = "96px" }: { src: string; alt: string; className?: string; sizes?: string }) {
  return (
    <span className={`relative block overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        className="object-cover"
      />
    </span>
  );
}
