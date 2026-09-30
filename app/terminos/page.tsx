import type { Metadata } from "next";
import { CORREO_CONTACTO, PaginaLegal, type SeccionLegal } from "@/components/legal/pagina-legal";

export const metadata: Metadata = {
  title: "Términos de servicio · deslizapp",
  description: "Las condiciones para usar Deslizapp: tu cuenta, tu contenido, uso permitido, planes, disponibilidad y ley aplicable.",
};

const secciones: SeccionLegal[] = [
  {
    titulo: "Qué es Deslizapp",
    parrafos: [`Una aplicación para que tiendas administren su catálogo, pedidos, clientes y promociones. Contacto: ${CORREO_CONTACTO}`],
  },
  {
    titulo: "Tu cuenta",
    parrafos: [
      "Entras con tu cuenta de Google. Cada cuenta se asocia a una tienda. Eres responsable de lo que se haga desde tu cuenta; no la compartas con quien no deba tener acceso.",
    ],
  },
  {
    titulo: "Tu contenido",
    parrafos: [
      "La información, fotos y datos que cargas son tuyos. Nos das permiso para almacenarlos y mostrarlos solo para prestar el servicio. Te comprometes a subir solo contenido que puedas usar legalmente y a tener permiso para guardar los datos de tus clientes.",
    ],
  },
  {
    titulo: "Uso permitido",
    parrafos: ["No uses la app para actividades ilegales, para engañar a otras personas, ni para intentar acceder a datos de otras tiendas o dañar el servicio."],
  },
  {
    titulo: "Planes y pagos",
    parrafos: [
      "Los planes, límites y precios se acuerdan con Deslizapp. Los pagos y créditos se gestionan directamente con nosotros y pueden cambiar avisando con antelación.",
    ],
  },
  {
    titulo: "Disponibilidad",
    parrafos: [
      "Hacemos lo posible por mantener el servicio disponible, pero puede haber interrupciones por mantenimiento o causas ajenas. El servicio se ofrece “tal cual”, y no somos responsables de pérdidas indirectas derivadas de su uso, en la medida que la ley lo permita.",
    ],
  },
  {
    titulo: "Cierre de cuenta",
    parrafos: ["Puedes dejar de usar Deslizapp y pedir la eliminación de tus datos cuando quieras. Podemos suspender cuentas que incumplan estos términos."],
  },
  {
    titulo: "Cambios",
    parrafos: ["Podemos actualizar estos términos; los cambios importantes se avisarán en la app. Seguir usándola implica aceptarlos."],
  },
  { titulo: "Ley aplicable", parrafos: ["Estos términos se rigen por las leyes de la República Dominicana."] },
];

export default function Terminos() {
  return <PaginaLegal titulo="Términos de servicio" actualizada="29 de septiembre de 2026" secciones={secciones} />;
}
