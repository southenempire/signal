/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Theme-aware page colours (globals.css): dark by default, light under html.light
        page: "var(--page)",
        card: "var(--card)",
        "card-hover": "var(--card-hover)",
        line: "var(--line)",
        code: "var(--code)",
        fg: "var(--fg)",
        soft: "var(--text-soft)",
        dim: "var(--text-dim)",
        mute: "var(--text-mute)",
        faint: "var(--text-faint)",
        accent: "var(--accent)",
      },
    },
  },
  plugins: [],
};
