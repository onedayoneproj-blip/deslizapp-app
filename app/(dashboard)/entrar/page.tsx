import type { Metadata } from "next";
import { IrAlPanel } from "./ir-al-panel";

// «Entrar» de la landing: la pantalla de entrada de siempre («Entrar con Google» / «Ver demo»). La pinta el layout del panel
// cuando no hay sesión; con sesión (o al elegir la demo) esta página solo lleva al panel.
export const metadata: Metadata = { title: "Entrar · deslizapp", robots: { index: false, follow: true } };

export default function EntrarPage() {
  return <IrAlPanel />;
}
