// Ejecuta el guard y el endpoint reales con Auth/cookies simulados; no crea cuentas.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const modulo = s => `data:text/javascript;base64,${Buffer.from(s).toString("base64")}`;
const fixture = modulo(`
 export const HAY_SUPABASE = true;
 export const cache = fn => fn;
 export function notFound() { throw new Error("404-fixture"); }
 export async function createClient() { return { auth: { getUser: async () => {
   globalThis.__demoAuth.lecturas++;
   return { data: { user: globalThis.__demoAuth.usuario }, error: globalThis.__demoAuth.error };
 } } }; }
 export function esLewisDemo(usuario, id) { return !!id && usuario?.id === id && usuario.identities?.some(i => i.provider === "google") === true; }
 export async function cookies() { return { set: (...a) => globalThis.__demoAuth.cookies.push(["set",...a]), delete: (...a) => globalThis.__demoAuth.cookies.push(["delete",...a]) }; }
`);
const compilar = (archivo, sustituir) => ts.transpileModule(sustituir(readFileSync(new URL(archivo, import.meta.url), "utf8")), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const guardUrl = modulo(compilar("../lib/demo/acceso-servidor.ts", s => s.replace('import "server-only";', "").replace(/from "[^"]+"/g, `from ${JSON.stringify(fixture)}`)));
const { puedeUsarDemoInterna, exigirDemoInterna } = await import(guardUrl);
const api = await import(modulo(compilar("../app/api/demo-interna/route.ts", s => s.replace('"next/headers"', JSON.stringify(fixture)).replace('"@/lib/demo/acceso-servidor"', JSON.stringify(guardUrl)))));
const google = { id: "lewis-fixture", identities: [{ provider: "google" }] };
const preparar = usuario => globalThis.__demoAuth = { usuario, cookies: [], lecturas: 0, error: null };

test("guard real: visitante, otra cuenta, metadata falsificada, error Auth y configuración ausente quedan cerrados", async () => {
 const previo = process.env.DEMO_INTERNAL_AUTH_USER_ID;
 try {
  process.env.DEMO_INTERNAL_AUTH_USER_ID = "lewis-fixture";
  for (const usuario of [null, { ...google, id: "otra" }, { id: google.id, user_metadata: { provider: "google", admin: true } }]) {
    preparar(usuario); assert.equal(await puedeUsarDemoInterna(), false); await assert.rejects(exigirDemoInterna, /404-fixture/);
  }
  preparar(google); globalThis.__demoAuth.error = new Error("Auth no disponible"); assert.equal(await puedeUsarDemoInterna(), false);
  preparar(google); delete process.env.DEMO_INTERNAL_AUTH_USER_ID; assert.equal(await puedeUsarDemoInterna(), false); assert.equal(globalThis.__demoAuth.lecturas, 0);
  process.env.DEMO_INTERNAL_AUTH_USER_ID = "lewis-fixture"; preparar(google); await exigirDemoInterna(); assert.ok(globalThis.__demoAuth.lecturas > 0);
 } finally { if (previo === undefined) delete process.env.DEMO_INTERNAL_AUTH_USER_ID; else process.env.DEMO_INTERNAL_AUTH_USER_ID = previo; }
});

test("API interna: solo Lewis verificado y mismo origen activan; salir solo borra cookie sin cerrar Google", async () => {
 const previo = process.env.DEMO_INTERNAL_AUTH_USER_ID;
 try {
  process.env.DEMO_INTERNAL_AUTH_USER_ID = "lewis-fixture";
  const peticion = (method, origin = "https://demo.test") => new Request("https://demo.test/api/demo-interna", { method, headers: { origin } });
  for (const usuario of [null, { ...google, id: "otra" }]) { preparar(usuario); assert.equal((await api.POST(peticion("POST"))).status, 403); assert.equal(globalThis.__demoAuth.cookies.length, 0); }
  preparar(google); assert.equal((await api.POST(peticion("POST", "https://otro.test"))).status, 403);
  assert.equal((await api.POST(peticion("POST"))).status, 204); assert.equal(globalThis.__demoAuth.cookies[0][3].httpOnly, true);
  preparar(null); assert.equal((await api.DELETE(peticion("DELETE"))).status, 204); assert.equal(globalThis.__demoAuth.lecturas, 0); assert.deepEqual(globalThis.__demoAuth.cookies, [["delete", "deslizapp-demo-interna"]]);
 } finally { if (previo === undefined) delete process.env.DEMO_INTERNAL_AUTH_USER_ID; else process.env.DEMO_INTERNAL_AUTH_USER_ID = previo; delete globalThis.__demoAuth; }
});
