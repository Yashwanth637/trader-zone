/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--bg-app)",
        surface: "var(--bg-surface)",
        "surface-card": "var(--bg-card)",
        "surface-card-hover": "var(--bg-card-hover)",
        border: "var(--border-subtle)",
        "border-glow": "var(--border-glow)",
        foreground: "var(--text-primary)",
        muted: "var(--text-secondary)",
        primary: {
          DEFAULT: "#8b5cf6",
          hover: "#7c3aed",
          light: "#a78bfa",
          glow: "rgba(139, 92, 246, 0.25)"
        },
        success: {
          DEFAULT: "#10b981",
          light: "#34d399",
          glow: "rgba(16, 185, 129, 0.2)"
        },
        danger: {
          DEFAULT: "#f43f5e",
          light: "#fb7185",
          glow: "rgba(244, 63, 94, 0.2)"
        },
        warning: {
          DEFAULT: "#f59e0b",
          light: "#fbbf24",
          glow: "rgba(245, 158, 11, 0.2)"
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      boxShadow: {
        'glow-primary': '0 0 30px rgba(139, 92, 246, 0.35)',
        'glow-success': '0 0 25px rgba(16, 185, 129, 0.25)',
        'glow-danger': '0 0 25px rgba(244, 63, 94, 0.25)'
      }
    },
  },
  plugins: [],
}
