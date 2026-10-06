import type { Json, Objeto } from "./tipos";
const objeto = (v: unknown): v is Objeto =>
  !!v && typeof v === "object" && !Array.isArray(v);
const texto = (v: unknown, max: number) =>
  typeof v === "string" && [...v].length >= 1 && [...v].length <= max;
const hex = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
export function mezclarJson(a: Objeto, b: Objeto): Objeto {
  const r = structuredClone(a);
  for (const [k, v] of Object.entries(b)) {
    if (v === null) delete r[k];
    else
      r[k] =
        objeto(v) && objeto(r[k])
          ? mezclarJson(r[k] as Objeto, v)
          : structuredClone(v);
  }
  return r;
}
export function personalizacionValida(p: unknown): p is Objeto {
  if (!objeto(p)) return false;
  if ("tema" in p) {
    const v = p.tema;
    if (
      !objeto(v) ||
      Object.keys(v).some(
        (k) => !["colores", "fuentes", "cabecera", "tintes"].includes(k),
      )
    )
      return false;
    if (
      "colores" in v &&
      (!objeto(v.colores) ||
        Object.keys(v.colores).length > 30 ||
        Object.entries(v.colores).some(
          ([k, c]) => !/^[a-z0-9-]{1,30}$/.test(k) || !hex(c),
        ))
    )
      return false;
    if (
      "fuentes" in v &&
      (!objeto(v.fuentes) ||
        !v.fuentes.display ||
        !v.fuentes.body ||
        Object.entries(v.fuentes).some(
          ([k, f]) =>
            !["display", "body"].includes(k) ||
            typeof f !== "string" ||
            !/^[A-Za-z0-9 ]{1,60}$/.test(f),
        ))
    )
      return false;
    if ("cabecera" in v && !texto(v.cabecera, 60000)) return false;
    if (
      "tintes" in v &&
      (!objeto(v.tintes) ||
        Object.keys(v.tintes).length > 300 ||
        Object.entries(v.tintes).some(
          ([k, t]) =>
            !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k) ||
            k.length > 80 ||
            !objeto(t) ||
            Object.keys(t).some((k) => !["c", "dark"].includes(k)) ||
            !hex(t.c) ||
            typeof t.dark !== "boolean",
        ))
    )
      return false;
  }
  if (
    "mensajes" in p &&
    (!objeto(p.mensajes) ||
      Object.keys(p.mensajes).length > 30 ||
      Object.entries(p.mensajes).some(
        ([k, v]) =>
          !/^[a-z_]{1,40}$/.test(k) ||
          !(
            texto(v, 300) ||
            (Array.isArray(v) &&
              v.length >= 1 &&
              v.length <= 20 &&
              v.every((e) => texto(e, 200)))
          ),
      ))
  )
    return false;
  if (
    "secciones" in p &&
    (!objeto(p.secciones) ||
      Object.entries(p.secciones).some(
        ([k, v]) => !/^[a-z_]{1,40}$/.test(k) || typeof v !== "boolean",
      ))
  )
    return false;
  return true;
}
export function opinionesValidas(v: Json | unknown): boolean {
  const claves = [
    "usuario",
    "fuente",
    "url",
    "texto",
    "estrellas",
    "traducida",
  ];
  return (
    Array.isArray(v) &&
    v.length <= 20 &&
    v.every(
      (o) =>
        objeto(o) &&
        claves.every((k) => k in o) &&
        Object.keys(o).every((k) => claves.includes(k)) &&
        texto(o.usuario, 80) &&
        texto(o.fuente, 80) &&
        texto(o.texto, 600) &&
        texto(o.url, 2048) &&
        typeof o.url === "string" &&
        /^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(o.url) &&
        typeof o.traducida === "boolean" &&
        (o.estrellas === null ||
          (typeof o.estrellas === "number" &&
            Number.isInteger(o.estrellas) &&
            o.estrellas >= 1 &&
            o.estrellas <= 5)),
    )
  );
}
