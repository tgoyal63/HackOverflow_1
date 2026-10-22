const paths = {
	code: ["m8 7-5 5 5 5", "m16 7 5 5-5 5", "m14 4-4 16"],
	grid: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h7v7h-7z"],
	trophy: [
		"M8 3h8v5a4 4 0 0 1-8 0Z",
		"M8 5H4v2a4 4 0 0 0 4 4",
		"M16 5h4v2a4 4 0 0 1-4 4",
		"M12 12v6",
		"M8 21v-3h8v3",
		"M6 21h12",
	],
	users: [
		"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
		"M15 3a4 4 0 0 1 0 8",
		"M22 21v-2a4 4 0 0 0-3-3.87",
	],
	settings: [
		"M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
		"m9 3-1 3-3 1-2 4 2 2-1 3 3 3 3-1 2 3 4-1 1-3 3-1 1-4-2-2 1-3-3-3-3 1-2-2Z",
	],
	shield: ["m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z", "m8 12 3 3 5-6"],
	search: ["M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z", "m16 16 5 5"],
	arrow: ["M5 12h14", "m13 6 6 6-6 6"],
	arrowRight: ["M5 12h14", "m13 6 6 6-6 6"],
	arrowUp: ["M12 20V4", "m5 11 7-7 7 7"],
	arrowDown: ["M12 4v16", "m5 13 7 7 7-7"],
	external: [
		"M14 3h7v7",
		"m21 3-11 11",
		"M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",
	],
	github: [
		"M9 19c-4 1-4-2-6-2",
		"M9 22v-4c-5-1-6-7-3-9-.5-1-.5-3 0-4 2 0 3 1 4 1h4c1 0 2-1 4-1 .5 1 .5 3 0 4 3 2 2 8-3 9v4",
	],
	check: ["m5 12 4 4L19 6"],
	close: ["m6 6 12 12", "M18 6 6 18"],
	menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
	logout: [
		"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
		"M9 12h12",
		"m17 8 4 4-4 4",
	],
	refresh: [
		"M20 7v5h-5",
		"M4 17v-5h5",
		"M6 6a8 8 0 0 1 14 6",
		"M4 12a8 8 0 0 0 14 6",
	],
	alert: ["m12 3 10 18H2Z", "M12 9v4", "M12 17h.01"],
	link: [
		"M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2",
		"M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
	],
	mail: ["M3 5h18v14H3Z", "m3 5 9 8 9-8"],
	eye: [
		"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z",
		"M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
	],
	eyeOff: [
		"M3 3 21 21",
		"M10 5c7-1 12 7 12 7a22 22 0 0 1-3 4",
		"M6 6a21 21 0 0 0-4 6s4 7 10 7a11 11 0 0 0 5-1",
	],
	chevron: ["m6 9 6 6 6-6"],
	clock: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M12 7v5l3 2"],
	star: ["m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"],
	bolt: ["m13 2-9 12h7l-1 8 10-13h-8Z"],
};
export function Icon({ name, size = 20, ...props }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
			{...props}
		>
			{(paths[name] || paths.code).map((d) => (
				<path key={d} d={d} />
			))}
			{name === "users" && <circle cx="9" cy="7" r="4" />}
		</svg>
	);
}
