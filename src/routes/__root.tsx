import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import type React from "react";

import Footer from "../components/Footer";
import Header from "../components/Header";
import { SimulatorDrawer } from "../components/SimulatorDrawer";
import { AuthProvider } from "../lib/auth-context";

import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "HydroGrid | Industrial Water Quality & Purification SCADA",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col bg-[var(--bg-app)] font-sans text-[var(--text-primary)] antialiased">
        <AuthProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <SimulatorDrawer />
          <Footer />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
