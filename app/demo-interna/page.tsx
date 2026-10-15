import { exigirDemoInterna } from "@/lib/demo/acceso-servidor";
import { EntrarDemoInterna } from "./entrada";
export default async function Pagina() {
  await exigirDemoInterna();
  return <EntrarDemoInterna />;
}
