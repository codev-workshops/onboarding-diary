import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: "#FBF8FF",
          100: "#F5E6A3",
          200: "#EDD97D",
          300: "#E5CC57",
          400: "#D4A017",
          500: "#B8860B",
          600: "#6B4FA0",
          700: "#5A3D8A",
          800: "#402970",
          900: "#2A1B4E",
        },
        aura: {
          gold: "#D4A017",
          goldenLight: "#F5E6A3",
          purple: "#402970",
          emerald: "#402970",
          violet: "#6B4FA0",
          leaf: "#6B4FA0",
          halo: "#FFD700",
          bark: "#2A1B4E",
          cream: "#FBF8FF",
          dark: "#1A0F2E",
          darker: "#120A20",
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Sinhala", "system-ui", "sans-serif"],
        sinhala: ["Noto Sans Sinhala", "system-ui", "sans-serif"],
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "golden-shimmer": "goldenShimmer 3s ease-in-out infinite",
        "bounce-in": "bounceIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        breathing: "breathing 3s ease-in-out infinite",
        "dot-bounce": "dotBounce 1.4s ease-in-out infinite",
        "gradient-shift": "gradientShift 6s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        bounceIn: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
        slideUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        breathing: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        dotBounce: {
          "0%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-6px)" },
        },
        goldenShimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
