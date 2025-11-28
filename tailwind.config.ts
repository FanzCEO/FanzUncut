import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        display: ["var(--font-display)"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        shimmer: {
          "0%": {
            "background-position": "-200% 0",
          },
          "100%": {
            "background-position": "200% 0",
          },
        },
        pulse: {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.7",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-in-right": {
          "0%": {
            transform: "translateX(100%)",
          },
          "100%": {
            transform: "translateX(0)",
          },
        },
        "glow": {
          "0%, 100%": {
            "box-shadow": "0 0 8px rgba(255, 0, 0, 0.2)",
          },
          "50%": {
            "box-shadow": "0 0 12px rgba(255, 0, 0, 0.3)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.5s infinite",
        pulse: "pulse 2s infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        glow: "glow 2s ease-in-out infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glow: "0 0 8px rgba(255, 0, 0, 0.2)",
        "glow-lg": "0 0 12px rgba(255, 0, 0, 0.3)",
        "golden-glow": "0 0 8px rgba(255, 215, 0, 0.3)",
        neon: "0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor",
      },
      textShadow: {
        neon: "0 0 10px currentColor",
        "neon-strong": "0 0 10px currentColor, 0 0 20px currentColor",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    function({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        '.text-shadow-neon': {
          textShadow: '0 0 10px currentColor',
        },
        '.text-shadow-neon-strong': {
          textShadow: '0 0 10px currentColor, 0 0 20px currentColor',
        },
        '.text-shadow-golden': {
          textShadow: '0 0 8px rgba(255, 215, 0, 0.7)',
        },
        '.bg-gradient-neon': {
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 50%, var(--accent) 100%)',
        },
        '.bg-gradient-red-golden': {
          background: 'linear-gradient(135deg, hsl(0, 100%, 50%) 0%, hsl(45, 80%, 60%) 100%)',
        },
        '.border-gradient-neon': {
          border: '1px solid transparent',
          backgroundImage: 'linear-gradient(var(--background), var(--background)), linear-gradient(135deg, var(--primary), var(--secondary), var(--accent))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'content-box, border-box',
        },
        '.border-golden-glow': {
          border: '1px solid hsl(45, 80%, 60%)',
          boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config;
