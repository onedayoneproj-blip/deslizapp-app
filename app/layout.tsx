import type { Metadata, Viewport } from "next";
import { Caveat, Figtree, Fredoka } from "next/font/google";
import { AvisoVersion } from "@/components/pwa/aviso-version";
import { CapturaInstalacion } from "@/components/pwa/instalar-pwa";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  // Las rutas públicas usan la marca de la tienda; carga esta fuente solo si se usa.
  preload: false,
  axes: ["wdth"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  // Las rutas públicas usan la marca de la tienda; carga esta fuente solo si se usa.
  preload: false,
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  // Las rutas públicas usan la marca de la tienda; carga esta fuente solo si se usa.
  preload: false,
});

export const metadata: Metadata = {
  title: "deslizapp · Tu tienda",
  description: "Eso que te encanta, aparece.",
  applicationName: "deslizapp",
  appleWebApp: { capable: true, title: "deslizapp", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#FFF9EE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${fredoka.variable} ${figtree.variable} ${caveat.variable} h-full antialiased`}>
      <head>
        {/* Guarda `beforeinstallprompt` y `appinstalled` desde el primer momento; components/pwa/instalar-pwa.tsx los lee. */}
        <script dangerouslySetInnerHTML={{ __html: "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e;});window.addEventListener('appinstalled',function(){window.__bip=null;window.__apinst=true;});" }} />
      </head>
      <body className="min-h-full">
        {children}
        <AvisoVersion />
        <CapturaInstalacion />
      </body>
    </html>
  );
}
