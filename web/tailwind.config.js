import formsPlugin from '@tailwindcss/forms';
import containerQueriesPlugin from '@tailwindcss/container-queries';

export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "on-tertiary-container": "#4f3e00",
                "inverse-on-surface": "#eff1f4",
                "tertiary-fixed": "#ffe088",
                "surface-container-lowest": "#ffffff",
                "tertiary": "#735c00",
                "on-background": "#191c1e",
                "on-primary-container": "#799dd6",
                "error-container": "#ffdad6",
                "on-primary": "#ffffff",
                "on-primary-fixed": "#001b3c",
                "on-error-container": "#93000a",
                "secondary-container": "#fdc34d",
                "surface-tint": "#3a5f94",
                "surface-container": "#eceef1",
                "primary-container": "#003366",
                "primary-fixed": "#d5e3ff",
                "primary": "#001e40",
                "secondary": "#7b5800",
                "on-surface-variant": "#43474f",
                "background": "#f7f9fc",
                "tertiary-fixed-dim": "#e9c349",
                "inverse-surface": "#2d3133",
                "surface-dim": "#d8dadd",
                "secondary-fixed-dim": "#f7bd48",
                "outline-variant": "#c3c6d1",
                "on-secondary-fixed-variant": "#5d4200",
                "on-primary-fixed-variant": "#1f477b",
                "tertiary-container": "#cca830",
                "surface-container-high": "#e6e8eb",
                "on-secondary-container": "#715000",
                "on-secondary": "#ffffff",
                "error": "#ba1a1a",
                "secondary-fixed": "#ffdea6",
                "on-tertiary": "#ffffff",
                "surface-container-highest": "#e0e3e6",
                "on-tertiary-fixed": "#241a00",
                "surface-container-low": "#f2f4f7",
                "on-surface": "#191c1e",
                "on-error": "#ffffff",
                "outline": "#737780",
                "on-tertiary-fixed-variant": "#574500",
                "surface-variant": "#e0e3e6",
                "on-secondary-fixed": "#271900",
                "surface": "#f7f9fc",
                "primary-fixed-dim": "#a7c8ff",
                "surface-bright": "#f7f9fc",
                "inverse-primary": "#a7c8ff",
                success: "#2e7d32"
            },
            borderRadius: {
                DEFAULT: "0.125rem",
                lg: "0.25rem",
                xl: "0.5rem",
                full: "0.75rem"
            },
            fontFamily: {
                headline: ["Inter", "sans-serif"],
                display: ["Inter", "sans-serif"],
                body: ["Inter", "sans-serif"],
                label: ["Inter", "sans-serif"]
            }
        }
    },
    plugins: [
        formsPlugin,
        containerQueriesPlugin
    ]
};
