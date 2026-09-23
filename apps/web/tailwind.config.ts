import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17201f",
        mist: "#f5f8f6",
        paper: "#fffdf9",
        midnight: "#102a28",
        teal: {
          50: "#edfdf8",
          100: "#d3f8ec",
          200: "#a9efdc",
          300: "#70dfc7",
          400: "#38c5ad",
          500: "#1da892",
          600: "#118775",
          700: "#106c60",
          800: "#11564e",
          900: "#104740"
        },
        coral: {
          50: "#fff1ed",
          100: "#ffe0d8",
          400: "#ff967f",
          500: "#ff7b63",
          600: "#e85f48",
          700: "#b9382f",
          800: "#9f2f2a"
        },
        sky: {
          50: "#eef6ff",
          100: "#d9ecff",
          500: "#2f80ed",
          700: "#1d5fbf"
        },
        sage: {
          50: "#f2f6ef",
          100: "#e2eadb",
          500: "#769382",
          700: "#526f5f"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(18, 66, 58, 0.10)",
        brand: "0 24px 70px rgba(17, 86, 78, 0.16)",
        card: "0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)",
        popover: "0 4px 10px rgba(15, 23, 42, 0.08), 0 16px 40px rgba(15, 23, 42, 0.10)",
        modal: "0 12px 24px rgba(15, 23, 42, 0.12), 0 32px 64px rgba(15, 23, 42, 0.16)"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      fontSize: {
        display: ["48px", { lineHeight: "52px", letterSpacing: "-0.02em" }],
        headline: ["40px", { lineHeight: "44px", letterSpacing: "-0.015em" }],
        h1: ["32px", { lineHeight: "38px", letterSpacing: "-0.01em" }],
        h2: ["24px", { lineHeight: "30px" }],
        h3: ["20px", { lineHeight: "26px" }],
        label: ["14px", { lineHeight: "20px" }],
        caption: ["13px", { lineHeight: "18px" }],
        micro: ["12px", { lineHeight: "16px" }]
      }
    },
  },
  plugins: [],
};

export default config;
