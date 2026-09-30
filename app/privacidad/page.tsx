import type { Metadata } from "next";
import { CORREO_CONTACTO, PaginaLegal, type SeccionLegal } from "@/components/legal/pagina-legal";

export const metadata: Metadata = {
  title: "Política de privacidad · deslizapp",
  description: "Qué datos recopila Deslizapp, para qué los usa, dónde se guardan y cómo pedir su acceso, corrección o eliminación.",
};

const secciones: SeccionLegal[] = [
  {
    titulo: "Quiénes somos",
    parrafos: [`Deslizapp es una aplicación para que tiendas administren su catálogo, pedidos y clientes. Contacto: ${CORREO_CONTACTO}`],
  },
  {
    titulo: "Qué datos recopilamos",
    lista: [
      "De la persona que entra con Google: nombre, correo electrónico y foto de perfil. No accedemos a tus contactos, correos, archivos ni a ningún otro dato de tu cuenta de Google.",
      "Lo que la tienda carga en la app: productos, precios, fotos, promociones, pedidos y datos de sus clientes (nombre, teléfono y notas).",
    ],
  },
  {
    titulo: "Para qué los usamos",
    parrafos: [
      "Únicamente para iniciar tu sesión, identificar a qué tienda perteneces y mostrarte y guardar la información de tu tienda. No vendemos datos ni los usamos para publicidad.",
    ],
  },
  {
    titulo: "Datos de los clientes de una tienda",
    parrafos: [
      "Cada tienda es responsable de los datos de sus propios clientes y de contar con su permiso para guardarlos. Deslizapp solo los almacena y procesa por cuenta de la tienda.",
    ],
  },
  {
    titulo: "Dónde se guardan y quién los ve",
    parrafos: [
      "Los datos se almacenan en servidores de Supabase. Cada tienda solo puede ver y modificar su propia información; otras tiendas no tienen acceso. El personal de Deslizapp solo accede cuando es necesario para dar soporte o mantener el servicio.",
    ],
  },
  {
    titulo: "Con quién compartimos",
    parrafos: [
      "Solo con los proveedores que hacen funcionar la app (alojamiento y base de datos) y cuando la ley lo exija. Si más adelante usamos un servicio para retocar fotos, se avisará y solo se enviará la foto que la tienda elija retocar.",
    ],
  },
  {
    titulo: "Tus derechos",
    parrafos: [
      `Puedes pedir acceso, corrección o eliminación de tus datos, o cerrar tu cuenta, escribiendo a ${CORREO_CONTACTO}. Responderemos en un plazo razonable.`,
    ],
  },
  {
    titulo: "Conservación",
    parrafos: ["Guardamos los datos mientras la cuenta esté activa. Al cerrarla, los eliminamos, salvo lo que debamos conservar por ley."],
  },
  { titulo: "Cambios", parrafos: ["Si cambiamos esta política, actualizaremos la fecha de arriba."] },
];

export default function Privacidad() {
  return <PaginaLegal titulo="Política de privacidad" actualizada="29 de septiembre de 2026" secciones={secciones} />;
}
