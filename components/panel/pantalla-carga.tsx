import { Esqueleto } from "../esqueleto";

/**
 * Lo que se ve el instante en que el navegador lee los datos de la demo: la forma de la app en
 * esqueletos (sin pantalla en blanco ni saltos cuando llega el contenido).
 */
export function PantallaCarga() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-papel" aria-busy="true" aria-label="Cargando tu tienda">
      <div className="flex items-center justify-between gap-3 px-5 pt-[calc(22px+env(safe-area-inset-top))] pb-1.5">
        <div className="flex items-center gap-2.5">
          <Esqueleto className="h-[42px] w-[42px] rounded-full" />
          <div className="space-y-1.5">
            <Esqueleto className="h-4 w-32 rounded-full" />
            <Esqueleto className="h-3 w-24 rounded-full" />
          </div>
        </div>
        <Esqueleto className="h-10 w-[118px] rounded-full" />
      </div>
      <div className="space-y-3 px-5 pt-5">
        <Esqueleto className="h-8 w-3/4 rounded-full" />
        <Esqueleto className="h-4 w-1/2 rounded-full" />
        <Esqueleto className="mt-4 h-[92px] rounded-[22px]" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Esqueleto className="aspect-[4/5] rounded-[20px]" />
          <Esqueleto className="aspect-[4/5] rounded-[20px]" />
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] px-3 pb-(--nav-margen)">
        <Esqueleto className="h-(--nav-alto) rounded-full" />
      </div>
    </div>
  );
}
