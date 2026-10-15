import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "../supabase/server";
import { HAY_SUPABASE } from "../supabase/config";
import { esLewisDemo } from "./identidad";

export const COOKIE_DEMO_INTERNA = "deslizapp-demo-interna";
/** Sin configuración o ante cualquier fallo, cerrado. No depende de soy_admin ni user_metadata. */
export const puedeUsarDemoInterna = cache(async (): Promise<boolean> => {
  if (!HAY_SUPABASE || !process.env.DEMO_INTERNAL_AUTH_USER_ID) return false;
  try {
    const { data, error } = await (await createClient()).auth.getUser();
    return !error && esLewisDemo(data.user, process.env.DEMO_INTERNAL_AUTH_USER_ID);
  } catch { return false; }
});
export async function exigirDemoInterna() {
  if (!await puedeUsarDemoInterna()) notFound();
}
