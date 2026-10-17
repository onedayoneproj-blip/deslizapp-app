import { descuentoVigente, DESCUENTO_CIRCULO, textoDescuento, textoDesde } from "@/lib/circulo";
import type { Tienda } from "@/lib/types";
import { IconoCheck } from "../iconos";
import { LogoTienda } from "./logo-tienda";

const BENEFICIOS = ["Pruebas las funciones nuevas antes que nadie", "Créditos de bienvenida y regalos de merch", "Hablas directo con Lewis y votas lo próximo"];

/** La tarjeta verde del Círculo Deslizapp en el menú de la tienda (referencias/circulo/panel-con-aro.dc.html). Solo si la tienda es del Círculo. */
export function TarjetaCirculo({ tienda, hoy }: { tienda: Tienda; hoy: string }) {
  const c = tienda.circulo;
  if (!c) return null;
  const vigente = descuentoVigente(c, hoy);
  return (
    <section aria-label="Círculo Deslizapp" data-tarjeta-circulo="" className="mt-3 flex flex-col gap-3 rounded-[24px] bg-marca-bosque p-4 text-marca-papel">
      <div className="flex items-center gap-3.5">
        {/* Las ondas salen hasta ~1,45 veces: el aro lleva aire alrededor (p-4 de la tarjeta) y se pausan fuera de pantalla. */}
        <LogoTienda tienda={tienda} tamano={68} animacion="ondas" />
        <div className="flex min-w-0 flex-col">
          <span className="font-mano text-[22px] leading-none text-marca-rosa-fija">eres del</span>
          <span className="font-display text-[24px] font-bold leading-none">Círculo Deslizapp</span>
          <span className="mt-1 text-[13px] text-menta">{textoDesde(c)}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2 text-[14.5px] font-semibold leading-snug">
        <li className="flex gap-2.5">
          {vigente ? (
            <>
              <span className="shrink-0 font-extrabold whitespace-nowrap text-marca-mandarina">{DESCUENTO_CIRCULO} %</span>
              {textoDescuento(c, hoy)}
            </>
          ) : (
            <span>{textoDescuento(c, hoy)}</span>
          )}
        </li>
        {BENEFICIOS.map((b) => (
          <li key={b} className="flex gap-2.5">
            <IconoCheck tamano={18} className="mt-0.5 shrink-0 text-marca-mandarina" />
            {b}
          </li>
        ))}
      </ul>
      <span className="text-[12.5px] text-menta">El aro es tuyo para siempre.</span>
    </section>
  );
}
