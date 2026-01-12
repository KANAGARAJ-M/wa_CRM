/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                whatsapp: {
                    green: '#25D366',
                    darkGreen: '#128C7E',
                    teal: '#075E54',
                    lightGreen: '#DCF8C6',
                }
            }
        },
    },
    plugins: [],
}
