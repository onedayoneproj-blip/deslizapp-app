import { getImageProps } from "next/image";

const hostStorage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://euihaeyfdlpvmbtfzvnt.supabase.co").hostname;
/** Solo las imágenes públicas conocidas pasan por el optimizador de Next, sin tocar originales. */
export function optimizable(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return /^\/(tienda|seed|catalogos)\//.test(url);
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.search && (
      (u.hostname === hostStorage && u.pathname.startsWith("/storage/v1/object/public/productos/")) ||
      (u.hostname === "deslizapp-app.vercel.app" && u.pathname.startsWith("/catalogos/esencias-michel/fotos/"))
    );
  } catch { return false; }
}
export function imagenCatalogo(url: string, sizes = "(max-width: 608px) 100vw, 608px") {
  if (!optimizable(url)) return { src: url };
  const { props } = getImageProps({ src: url, alt: "", fill: true, sizes, quality: 85 });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}
/** La extracción de borde sigue siendo 24×24; ahora recibe una imagen pequeña pública. */
export function imagenParaColor(url: string): string {
  return imagenFija(url, 32);
}
export function imagenFija(url: string, ancho: 32 | 96 | 640 | 1080): string {
  return optimizable(url) ? "/_next/image?url=" + encodeURIComponent(url) + "&w=" + ancho + "&q=85" : url;
}
