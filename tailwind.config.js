/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0C",
        paper: "#F3EFE6",
        paperDim: "#E9E3D6",
        court: {
          red: "#8B1E1E",
          bright: "#A82C2C",
        },
        stone: "#6B675F",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        widest2: "0.22em",
      },
      keyframes: {
        stamp: {
          "0%": { transform: "scale(2.4) rotate(-14deg)", opacity: "0" },
          "60%": { transform: "scale(0.94) rotate(-14deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-14deg)", opacity: "1" },
        },
        rise: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.15" },
        },
      },
      animation: {
        stamp: "stamp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        rise: "rise 0.4s ease-out forwards",
        blink: "blink 1.1s steps(1) infinite",
      },
    },
  },
  plugins: [],
};
