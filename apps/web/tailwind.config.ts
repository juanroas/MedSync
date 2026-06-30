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
        mist: "#f3f7f5",
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
        coral: "#ff7b63"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(18, 66, 58, 0.10)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    },
  },
  plugins: [],
};

export default config;

