"use client";

import { CREDITOS_POR_RETOQUE, CREDITOS_RETOQUE_MENSUALES, NOMBRE_PLAN, WHATSAPP_DESLIZAPP } from "@/lib/config";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { enlaceWhatsApp } from "@/lib/formato";
import { Hoja } from "../hoja";
import { IconoCreditos, IconoWhatsApp } from "../iconos";

/**
 * Plan y créditos: solo muestra el plan actual y el saldo. Nada de compras ni cobros en esta
 * entrega; para cambiar de plan o pedir más créditos, se le escribe a Deslizapp por WhatsApp.
 */
export function HojaPlan({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  const { getProductos } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));

  if (!tienda) return null;
  const usados = productos?.length ?? 0;
  const limite = tienda.limiteProductos;
  const lleno = usados >= limite;
  const porcentaje = Math.min(100, Math.round((usados / limite) * 100));
  const fotos = Math.floor(tienda.creditosRetoque / CREDITOS_POR_RETOQUE);
  const nombrePlan = NOMBRE_PLAN[tienda.plan];
  const mensaje = `Hola, Deslizapp. Te escribo de ${tienda.nombre} (${nombrePlan}). Quiero cambiar de plan o pedir más créditos de retoque.`;

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Tu plan">
      <div className="flex flex-col gap-3.5">
        <section className="rounded-[26px] bg-bosque p-[18px] text-papel">
          <p className="font-display text-[30px] leading-tight">{nombrePlan}</p>
          <p className="mt-2.5 text-sm font-bold">
            {usados} de {limite} productos
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-papel/20">
            <div className="h-2.5 rounded-full bg-rosa" style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="mt-2 text-[13px] text-[#d9e6df]">
            {lleno
              ? "Catálogo lleno. De éxito, pero lleno: escríbenos para subir de plan."
              : `Te quedan ${limite - usados} espacios. Los cambios de precio, stock y textos son ilimitados.`}
          </p>
        </section>

        <section className="rounded-3xl border border-linea bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-2xl bg-mandarina text-bosque-oscuro">
              <IconoCreditos tamano={26} />
            </span>
            <div>
              <p className="font-display text-[28px] leading-none">{tienda.creditosRetoque} créditos</p>
              <p className="mt-1 text-[13.5px] font-semibold text-suave">
                {fotos === 0 ? "No te alcanza para retocar fotos este mes" : `Te alcanzan para ${fotos} ${fotos === 1 ? "foto retocada" : "fotos retocadas"}`}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[13.5px] text-suave">
            Cada foto retocada usa {CREDITOS_POR_RETOQUE} créditos. El día 1 de cada mes vuelves a tener{" "}
            {CREDITOS_RETOQUE_MENSUALES}; los que no uses no se acumulan.
          </p>
        </section>

        <section className="rounded-3xl bg-rosa p-4">
          <p className="font-display text-[21px]">¿Se te quedó chiquito?</p>
          <p className="mt-1 text-sm font-semibold">Escríbenos y te cambiamos de plan o te damos más créditos. Sin formularios.</p>
          <a
            href={enlaceWhatsApp(WHATSAPP_DESLIZAPP, mensaje)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-bosque text-base font-extrabold text-papel"
          >
            <IconoWhatsApp tamano={20} className="text-[#25D366]" />
            Escribirle a Deslizapp
          </a>
        </section>
      </div>
    </Hoja>
  );
}
