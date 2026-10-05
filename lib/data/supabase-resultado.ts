import { traducirErrorSupabase } from "./errores";
/** Lo que devuelve cualquier consulta de supabase-js. */
export type Respuesta<T> = { data: T | null; error: unknown };

/** Da la fila (o null) o lanza el error ya traducido para el dueño. */
export async function dato<T>(consulta: PromiseLike<Respuesta<T>>): Promise<T | null> {
  let r: Respuesta<T>;
  try {
    r = await consulta;
  } catch (e) {
    throw traducirErrorSupabase(e);
  }
  if (r.error) throw traducirErrorSupabase(r.error);
  return r.data;
}

export async function requerido<T>(consulta: PromiseLike<Respuesta<T>>, siFalta: () => Error): Promise<T> {
  const d = await dato(consulta);
  if (d === null) throw siFalta();
  return d;
}

