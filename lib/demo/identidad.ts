/** Solo recibe un usuario previamente comprobado por Auth.getUser(), nunca claims del navegador. */
export function esLewisDemo(usuario: { id: string; identities?: { provider: string }[] } | null, idAutorizado: string | undefined): boolean {
  return !!idAutorizado && usuario?.id === idAutorizado && usuario.identities?.some(i => i.provider === "google") === true;
}
