import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // BoyFanz Dark Underground Theme
        primary: "#ff0000", // Blood red
        secondary: "#d4af37", // Gold
        accent: "#ffffff", // White
        background: "#0a0a0a", // Deep black
        surface: "#1a1a1a", // Dark charcoal
        text: "#ffffff", // White text
        "text-secondary": "#cccccc", // Light gray
        border: "#333333", // Dark border
        success: "#00ff00", // Neon green
        warning: "#ffaa00", // Orange
        error: "#ff0000", // Red
        info: "#00aaff", // Blue
      },
      fontFamily: {
        heading: ['"Bebas Neue"', '"Arial Black"', 'sans-serif'],
        body: ['"Inter"', '"Helvetica"', 'sans-serif'],
      },
      boxShadow: {
        'red-glow': '0 0 10px rgba(255, 0, 0, 0.5)',
        'red-glow-lg': '0 0 20px rgba(255, 0, 0, 0.7)',
      },
      animation: {
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255, 0, 0, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(255, 0, 0, 0.8)' },
        },
        glow: {
          from: { textShadow: '0 0 5px rgba(255, 0, 0, 0.5)' },
          to: { textShadow: '0 0 10px rgba(255, 0, 0, 0.8), 0 0 15px rgba(255, 0, 0, 0.6)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;