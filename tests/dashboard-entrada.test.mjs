// Ejecuta el layout real con Auth y las lecturas del servidor simuladas; no usa cuentas ni datos reales.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const modulo = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const fixture = modulo(`
  export const CABECERA_RUTA = "x-dz-ruta", HAY_SUPABASE = true;
  export const COOKIE_RECUPERAR_VER_COMO = "recuperacion", COOKIE_VER_COMO = "ver-como", COOKIE_TIENDA_VER_COMO = "tienda";
  export async function cookies() { return { get: () => undefined }; }
  export async function headers() { return new Headers({ "x-dz-ruta": globalThis.__entrada.ruta }); }
  export async function createClient() { return {
    auth: { getClaims: async () => ({ data: globalThis.__entrada.autenticada ? { claims: { sub: "usuario-fixture" } } : null }) },
    rpc: async () => ({ data: false, error: null }),
  }; }
  export async function fotosInicio() { globalThis.__entrada.lecturas++; return { fotos: [{ src: "/foto-fixture.webp" }] }; }
  ${["AvisoRed", "Encabezado", "NavInferior", "PantallaCarga", "PantallaEntrada", "PanelUIProvider", "InicioPublico", "PaginaPrincipal", "RecuperarVerComo", "DataProvider", "ProveedorSoloMirar", "ToastProvider", "ProveedorToast"].map((name) => `export function ${name}() { return null; }`).join("\n")}
`);
const source = readFileSync(new URL("../app/(dashboard)/layout.tsx", import.meta.url), "utf8")
  .replace(/from "(?:@\/[^\"]+|next\/headers)"/g, `from ${JSON.stringify(fixture)}`);
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
  .replace('"react/jsx-runtime"', JSON.stringify(new URL(require.resolve("react/jsx-runtime"), "file:").href));
const { default: Layout } = await import(modulo(compiled));

test("el layout prepara la misma entrada pública con y sin sesión del servidor, incluso para SIGNED_OUT posterior", async () => {
  for (const autenticada of [false, true]) {
    for (const ruta of ["/", "/entrar", "/pedidos"]) {
      globalThis.__entrada = { autenticada, ruta, lecturas: 0 };
      let tree = Layout({ children: "panel-fixture" });
      while (tree.type.name !== "DataProvider") tree = await tree.type(tree.props);
      const entrada = tree.props.entrada;
      assert.equal(entrada.type.name, "InicioPublico", `${ruta}, autenticada=${autenticada}`);
      const publica = ruta === "/" || ruta === "/entrar";
      assert.equal(globalThis.__entrada.lecturas, publica ? 1 : 0, "solo las rutas públicas leen fotos");
      if (publica) {
        assert.equal(entrada.props.principal.type.name, "PaginaPrincipal");
        assert.deepEqual(entrada.props.principal.props.fotos, [{ src: "/foto-fixture.webp" }]);
      } else assert.equal(entrada.props.principal, null);
      if (autenticada) assert.equal(tree.props.cargando.type.name, "PantallaCarga");
      else assert.equal(tree.props.cargando, entrada);
    }
  }
  delete globalThis.__entrada;
});
