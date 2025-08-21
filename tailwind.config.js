/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./src/renderer/**/*.{html,js}",
	],
	darkMode: ['class'],
	theme: {
		extend: {
			colors: {
				brand: '#0098ff',
			}
		}
	},
	plugins: [],
};


