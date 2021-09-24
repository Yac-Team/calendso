module.exports = {
  mode: "jit",
  purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  // darkMode: "none",
  theme: {
    extend: {
      colors: {
        black: "#F3C93C",
        white: "#141414",
        gray: {
          50: "#121212",
          100: "#1C1C1C",
          200: "#252525",
          300: "#2D2D2D",
          400: "#2D2D2D",
          500: "#9b9b9b",
          600: "#adadad",
          700: "#c1c1c1",
          800: "#d7d7d7",
          900: "#EFEFEF",
        },
        neutral: {
          50: "#121212",
          100: "#1C1C1C",
          200: "#252525",
          300: "#2D2D2D",
          400: "#2D2D2D",
          500: "#9b9b9b",
          600: "#adadad",
          700: "#c1c1c1",
          800: "#d7d7d7",
          900: "#EFEFEF",
          // 50: "#F7F8F9",
          // 100: "#F4F5F6",
          // 200: "#EAEEF2",
          // 300: "#C6CCD5",
          // 400: "#9BA6B6",
          // 500: "#708097",
          // 600: "#657388",
          // 700: "#373F4A",
          // 800: "#1F2937",
          // 900: "#1A1A1A",
        },
        primary: {
          50: "#F4F4F4",
          100: "#E8E8E8",
          200: "#C6C6C6",
          300: "#A3A3A3",
          400: "#5F5F5F",
          500: "#EFEFEF",
          600: "#171717",
          700: "#141414",
          800: "#101010",
          900: "#0D0D0D",
        },
        secondary: {
          50: "#F5F8F7",
          100: "#EBF0F0",
          200: "#CDDAD9",
          300: "#AEC4C2",
          400: "#729894",
          500: "#356C66",
          600: "#30615C",
          700: "#28514D",
          800: "#20413D",
          900: "#223B41",
        },
        red: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },
        orange: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
        green: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        kollektif: ["Kollektif", "sans-serif"],
      },
      maxHeight: (theme) => ({
        0: "0",
        97: "25rem",
        ...theme("spacing"),
        full: "100%",
        screen: "100vh",
      }),
      minHeight: (theme) => ({
        0: "0",
        ...theme("spacing"),
        full: "100%",
        screen: "100vh",
      }),
      minWidth: (theme) => ({
        0: "0",
        ...theme("spacing"),
        full: "100%",
        screen: "100vw",
      }),
      maxWidth: (theme, { breakpoints }) => ({
        0: "0",
        ...theme("spacing"),
        ...breakpoints(theme("screens")),
        full: "100%",
        screen: "100vw",
      }),
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require("@tailwindcss/forms")],
};
