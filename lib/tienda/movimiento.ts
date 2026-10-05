/** Geometría de la referencia: solo decorativa; jamás transforma un formulario enfocado. */
export function transformarPedido() {
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const boton = document.querySelector("#bagDock button"),
    hoja = document.querySelector("#orBg .wa");
  if (!boton || !hoja) return;
  const a = boton.getBoundingClientRect(),
    b = hoja.getBoundingClientRect();
  const dx = a.left + a.width / 2 - b.left - b.width / 2,
    dy = a.top + a.height / 2 - b.top - b.height / 2;
  hoja.animate(
    [
      {
        transform: `translate(${dx}px,${dy}px) scale(${a.width / b.width},${a.height / b.height})`,
        opacity: 0.35,
        borderRadius: "50%",
      },
      { transform: "none", opacity: 1, borderRadius: "28px 28px 0 0" },
    ],
    { duration: 480, easing: "cubic-bezier(.2,.8,.3,1)" },
  );
}
export async function volarPedido() {
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const target = document.querySelector("#bagDock button"),
    bar = document.querySelector("#cartbar");
  if (!target || !bar) return;
  const t = target.getBoundingClientRect();
  await Promise.all(
    [...bar.children].map((el) => {
      const r = el.getBoundingClientRect();
      return el
        .animate(
          [
            { transform: "none", opacity: 1 },
            { opacity: 1, offset: 0.55 },
            {
              transform: `translate(${t.left + t.width / 2 - r.left - r.width / 2}px,${t.top + t.height / 2 - r.top - r.height / 2}px) scale(.08)`,
              opacity: 0,
            },
          ],
          { duration: 560, easing: "cubic-bezier(.55,0,.3,1)" },
        )
        .finished.catch(() => {});
    }),
  );
  target.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.15)" },
      { transform: "scale(1)" },
    ],
    { duration: 260 },
  );
}
