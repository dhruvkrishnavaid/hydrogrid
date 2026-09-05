import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

function serverInitPlugin() {
  return {
    name: "hydrogrid-server-init",
    configureServer() {
      import("./src/server/init").then((m) => m.ensureServerInitialized());
    },
  };
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  oxc: {
    jsx: {
      development: false,
    },
  },
  plugins: [
    serverInitPlugin(),
    babel({ presets: [reactCompilerPreset()] }),
    devtools({
      injectSource: { enabled: false },
    }),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
