import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { TEXTO_CLARO, TEXTO_OSCURO } from "../marca";
import { dinero } from "./carrito";
import { portadasPedido, TAMANO_IMAGEN_PEDIDO } from "./imagen-pedido";
import type { VistaSolicitud } from "../types";

// Paleta del documento exportado: Papel Cálido, Verde Bosque y Menta (docs/01); independiente del tema del panel.
const bosque = "#174b3a", menta = "#dcebe2";
const fallback = readFile(join(process.cwd(), "public/icons/icon-192.png"))
  .catch(() => readFile(join(process.cwd(), "public/icons/apple-touch-icon.png")))
  .then(b => `data:image/png;base64,${b.toString("base64")}`);

/** Proyección pública mínima: nunca admite nombre del comprador, teléfono ni nota. */
export async function renderImagenPedido(pedido: Pick<VistaSolicitud, "items" | "total" | "tienda"> | null, fotos: (string | null)[]) {
  const { portadas, adicionales } = portadasPedido(pedido?.items ?? []);
  const logo = await fallback;
  const n = Math.max(1, portadas.length), ancho = n === 1 ? 600 : 294;
  const alto = n <= 2 ? 472 : 230;
  const casillas = portadas.length ? portadas : [{ foto: null, variante: null }];
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: TEXTO_CLARO, color: TEXTO_OSCURO, alignItems: "center", justifyContent: "center" }}>
      {/* Toda la composición importante cabe en el recorte cuadrado central de 630 px. */}
      <div style={{ display: "flex", flexDirection: "column", width: 600, height: 600, position: "relative" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, height: 472, justifyContent: "center" }}>
          {casillas.map((item, i) => <div key={i} style={{ display: "flex", position: "relative", width: ancho, height: alto, borderRadius: 20, overflow: "hidden", background: menta, alignItems: "center", justifyContent: "center" }}>
            <img alt="" src={fotos[i] ?? logo} width={fotos[i] ? ancho : 120} height={fotos[i] ? alto : 120} style={{ objectFit: fotos[i] ? "cover" : "contain" }}/>
            {item.variante && <div style={{ display: "flex", position: "absolute", bottom: 12, left: 12, right: 12, borderRadius: 12, padding: "8px 12px", background: TEXTO_CLARO, color: bosque, fontSize: 20 }}>{item.variante.slice(0, 45)}</div>}
          </div>)}
        </div>
        {adicionales > 0 && <div style={{ display: "flex", position: "absolute", top: 12, right: 12, borderRadius: 18, padding: "12px 18px", background: bosque, color: TEXTO_CLARO, fontSize: 24 }}>+{adicionales} {adicionales === 1 ? "producto" : "productos"}</div>}
        <div style={{ display: "flex", flexDirection: "column", paddingTop: 16, gap: 6 }}>
          <div style={{ display: "flex", fontSize: 28, color: bosque }}>{pedido ? `Tu pedido con ${pedido.tienda.nombre.slice(0, 35)}` : "Tu pedido · Deslizapp"}</div>
          <div style={{ display: "flex", fontSize: 22 }}>{pedido ? `${pedido.items.length} ${pedido.items.length === 1 ? "producto" : "productos"} · ${dinero(pedido.total)}` : "Eso que te encanta, aparece."}</div>
        </div>
      </div>
    </div>,
    { ...TAMANO_IMAGEN_PEDIDO, headers: { "Cache-Control": "public, max-age=300, s-maxage=300", "X-Robots-Tag": "noindex, nofollow" } },
  );
}
