/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./global.css", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./features/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        surface: '#12121A',
        surface2: '#1C1C28',
        border: '#2A2A3A',
        green: '#00C896',
        red: '#FF4757',
        amber: '#FFB800',
        cyan: '#00D4FF',
        purple: '#9C6FFF',
        text: '#FFFFFF',
        textSecondary: '#8888A8',
        textMuted: '#555577',
      },
      fontFamily: {
        inter: ['Inter_400Regular'],
        interMedium: ['Inter_500Medium'],
        interSemiBold: ['Inter_600SemiBold'],
        interBold: ['Inter_700Bold'],
      }
    },
  },
  plugins: [],
}
