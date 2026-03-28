import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--pa-bg)",
        surface: "var(--pa-surface)",
        ink: "var(--pa-text)",
        muted: "var(--pa-text-muted)",
        primary: "var(--pa-primary)",
        accent: "var(--pa-accent)",
        success: "var(--pa-success)",
        warning: "var(--pa-warning)",
        danger: "var(--pa-danger)"
      },
      boxShadow: {
        panel: "var(--pa-shadow-md)",
        hero: "var(--pa-shadow-lg)"
      },
      borderRadius: {
        xl: "var(--pa-radius-xl)",
        lg: "var(--pa-radius-lg)",
        md: "var(--pa-radius-md)",
        sm: "var(--pa-radius-sm)"
      },
      fontFamily: {
        display: ["var(--font-manrope)"],
        body: ["var(--font-plex-sans)"],
        mono: ["var(--font-plex-mono)"]
      }
    }
  },
  plugins: []
};

export default config;
