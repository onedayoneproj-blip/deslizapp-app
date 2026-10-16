import { exigirDemoInterna } from "@/lib/demo/acceso-servidor";
import type { Metadata } from "next";
import { OnboardingDemo } from "@/components/unirse/onboarding-demo";

// El onboarding de una tienda nueva en la demo (docs/17): el recorrido completo, sin Supabase y sin crear nada.
export const metadata: Metadata = { title: "Tu invitación · Deslizapp", robots: { index: false, follow: false } };

export default async function UnirseDemoPage() {
  await exigirDemoInterna();
  return <OnboardingDemo />;
}
