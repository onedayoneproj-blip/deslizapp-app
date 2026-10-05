// Ejecuta el Route Handler real con el transporte de Auth sustituido localmente; no OAuth real.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import "./cargar-ts.mjs";
const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const moduleURL = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const auth = moduleURL(`export async function createClient(){ return {auth:{exchangeCodeForSession:async()=>({error:globalThis.__authCallbackError?new Error("cancelado"):null}),getUser:async()=>({data:{user:globalThis.__authCallbackSession?{id:"fixture"}:null},error:null})}};}`);
let source = readFileSync(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8")
  .replace('"next/server"', JSON.stringify(new URL(require.resolve("next/server"), "file:").href))
  .replace('"@/lib/auth/canje"', JSON.stringify(new URL("../lib/auth/canje.ts", import.meta.url).href))
  .replace('"@/lib/supabase/config"', JSON.stringify(moduleURL('export const HAY_SUPABASE=true;')))
  .replace('"@/lib/supabase/server"', JSON.stringify(auth));
const { GET } = await import(moduleURL(ts.transpileModule(source, { compilerOptions: { target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext } }).outputText));
for (const origin of ["https://preview-onedayone.vercel.app", "https://deslizapp-app.vercel.app"]) {
  test(`handler conserva destino elegido, error y login del panel: ${origin}`, async () => {
    globalThis.__authCallbackError = false; globalThis.__authCallbackSession = true;
    for(const codigo of ["PRUEBAAA23","PRUEBAB234"]){
      const req = new NextRequest(`${origin}/auth/callback?code=fixture&volver=${encodeURIComponent(`/pedido/${codigo}`)}`, { headers:{cookie:`dz_volver=%2Fpedido%2F${codigo==="PRUEBAAA23"?"PRUEBAB234":"PRUEBAAA23"}`} });
      const r = await GET(req);
      assert.equal(r.headers.get("location"),`${origin}/pedido/${codigo}?registrar=1`);
      assert.match(r.headers.get("set-cookie"),/dz_volver=;/);
    }
    globalThis.__authCallbackError = true; globalThis.__authCallbackSession = false;
    const r=await GET(new NextRequest(`${origin}/auth/callback?code=fixture&volver=%2Fpedido%2FPRUEBAB234`));
    assert.equal(r.headers.get("location"),`${origin}/pedido/PRUEBAB234?registrar=1&error_login=1`);
    const cancelada=await GET(new NextRequest(`${origin}/auth/callback?error=access_denied&volver=%2Fpedido%2FPRUEBAAA23`));
    assert.equal(cancelada.headers.get("location"),`${origin}/pedido/PRUEBAAA23?registrar=1&error_login=1`);
    globalThis.__authCallbackError = false;
    assert.equal((await GET(new NextRequest(`${origin}/auth/callback?code=fixture`))).headers.get("location"),`${origin}/`);
    assert.equal((await GET(new NextRequest(`${origin}/auth/callback?code=fixture&volver=https%3A%2F%2Fevil.com`))).headers.get("location"),`${origin}/`);
    const viejo=await GET(new NextRequest(`${origin}/auth/callback?code=fixture`,{headers:{cookie:"dz_volver=%2Fpedido%2FPRUEBAAA23"}}));
    assert.equal(viejo.headers.get("location"),`${origin}/pedido/PRUEBAAA23?registrar=1`);
  });
}
