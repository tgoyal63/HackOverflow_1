import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../../Context/appContext";
import { Icon } from "../UI/Icon";
import { Avatar } from "../UI/Surface";
import "./NavbarComponent.scss";

export function Brand({ to = "/", onClick }) {
	return (
		<Link className="brand" to={to} onClick={onClick}>
			<span className="brand-mark">
				<Icon name="code" size={20} />
			</span>
			<span>
				Hack<span className="brand-accent">Overflow</span>
				<span className="brand-dot">.</span>
			</span>
		</Link>
	);
}
const navigation = [
	{ to: "/dashboard", icon: "grid", label: "Dashboard" },
	{ to: "/leaderboard", icon: "trophy", label: "Leaderboard" },
	{ to: "/friends", icon: "users", label: "Friends" },
];

export default function NavbarComponent() {
	const {
		token,
		logoutUser,
		loginUsername,
		username: accountUsername,
	} = useAppContext();
	const [search, setSearch] = useState("");
	const [menuOpen, setMenuOpen] = useState(false);
	const sidebarRef = useRef(null);
	const menuButtonRef = useRef(null);
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const publicPage = pathname === "/" || pathname === "/register";
	const account = loginUsername || accountUsername || "Your account";
	useEffect(() => {
		if (!publicPage && !token) navigate("/", { replace: true });
	}, [publicPage, token, navigate]);
	useEffect(() => {
		if (!menuOpen) return undefined;
		if (window.innerWidth > 800) {
			setMenuOpen(false);
			return undefined;
		}
		const previousOverflow = document.body.style.overflow;
		const outside = [
			...document.querySelectorAll(
				".workspace, .workspace-footer, .workspace-topbar",
			),
		];
		const previousInert = outside.map((element) => element.inert);
		outside.forEach((element) => {
			element.inert = true;
		});
		document.body.style.overflow = "hidden";
		sidebarRef.current?.querySelector(".sidebar-close")?.focus();
		const closeOrContain = (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				setMenuOpen(false);
			}
			if (event.key !== "Tab") return;
			const items = [
				...(sidebarRef.current?.querySelectorAll(
					"a[href],button:not(:disabled)",
				) || []),
			].filter((element) => element.getClientRects().length > 0);
			const first = items[0],
				last = items.at(-1);
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			}
			if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first?.focus();
			}
		};
		const closeOnDesktop = () => {
			if (window.innerWidth > 800) setMenuOpen(false);
		};
		document.addEventListener("keydown", closeOrContain);
		window.addEventListener("resize", closeOnDesktop);
		return () => {
			outside.forEach((element, index) => {
				element.inert = previousInert[index];
			});
			document.body.style.overflow = previousOverflow;
			document.removeEventListener("keydown", closeOrContain);
			window.removeEventListener("resize", closeOnDesktop);
			menuButtonRef.current?.focus();
		};
	}, [menuOpen]);
	const closeMenu = () => setMenuOpen(false);
	const handleSearch = (event) => {
		event.preventDefault();
		const value = search.trim();
		if (!value) return;
		closeMenu();
		navigate(
			value === loginUsername
				? "/dashboard"
				: `/search/${encodeURIComponent(value)}`,
		);
	};
	if (publicPage)
		return (
			<header className="site-header">
				<a className="skip-link" href="#main-content">
					Skip to content
				</a>
				<div className="site-header-inner">
					<Brand />
					<nav aria-label="Main navigation">
						<a
							className="site-source-link"
							href="https://github.com/tgoyal63/HackOverflow_1"
							target="_blank"
							rel="noreferrer"
						>
							<Icon name="github" size={18} />
							<span>Open source</span>
						</a>
						{token ? (
							<Link className="button button-primary" to="/dashboard">
								Open dashboard
								<Icon name="arrowRight" size={16} />
							</Link>
						) : (
							<Link
								className="button button-secondary"
								to="/register?mode=login"
							>
								Sign in
								<Icon name="arrowRight" size={16} />
							</Link>
						)}
					</nav>
				</div>
			</header>
		);
	return (
		<>
			<a className="skip-link" href="#main-content">
				Skip to content
			</a>
			{menuOpen && (
				<button
					type="button"
					className="sidebar-overlay"
					aria-label="Close navigation backdrop"
					onClick={closeMenu}
				/>
			)}
			<aside
				ref={sidebarRef}
				id="workspace-navigation"
				aria-label="Workspace navigation panel"
				className={`workspace-sidebar${menuOpen ? " is-open" : ""}`}
			>
				<div className="sidebar-brand">
					<Brand to="/dashboard" onClick={closeMenu} />
					<button
						type="button"
						className="icon-button sidebar-close"
						aria-label="Close navigation"
						onClick={closeMenu}
					>
						<Icon name="close" />
					</button>
				</div>
				<p className="nav-section-label">Workspace</p>
				<nav className="sidebar-nav" aria-label="Workspace navigation">
					{navigation.map(({ to, icon, label }) => (
						<NavLink
							key={to}
							to={to}
							onClick={closeMenu}
							className={({ isActive }) =>
								`sidebar-link${isActive ? " is-active" : ""}`
							}
						>
							<Icon name={icon} />
							<span>{label}</span>
						</NavLink>
					))}
				</nav>
				<p className="nav-section-label account-nav-label">Account</p>
				<nav className="sidebar-nav" aria-label="Account navigation">
					<NavLink
						to="/settings"
						onClick={closeMenu}
						className={({ isActive }) =>
							`sidebar-link${isActive ? " is-active" : ""}`
						}
					>
						<Icon name="settings" />
						<span>Settings</span>
					</NavLink>
					<NavLink
						to="/changepassword"
						onClick={closeMenu}
						className={({ isActive }) =>
							`sidebar-link${isActive ? " is-active" : ""}`
						}
					>
						<Icon name="shield" />
						<span>Security</span>
					</NavLink>
				</nav>
				<div className="sidebar-bottom">
					<div className="sidebar-note">
						<span className="sidebar-note-icon">
							<Icon name="code" />
						</span>
						<p>
							Better together.<span>Keep coding. Keep connecting.</span>
						</p>
					</div>
					<button
						type="button"
						className="sidebar-link logout-link"
						onClick={() => {
							closeMenu();
							logoutUser();
						}}
					>
						<Icon name="logout" />
						<span>Sign out</span>
					</button>
				</div>
			</aside>
			<header className="workspace-topbar">
				<button
					ref={menuButtonRef}
					className="icon-button mobile-menu"
					type="button"
					aria-label="Open navigation"
					aria-expanded={menuOpen}
					aria-controls="workspace-navigation"
					onClick={() => setMenuOpen((open) => !open)}
				>
					<Icon name="menu" />
				</button>
				<form
					className="workspace-search search-landmark"
					aria-label="Find a developer"
					onSubmit={handleSearch}
				>
					<Icon name="search" size={18} />
					<input
						type="search"
						aria-label="Search username"
						placeholder="Find a developer by username"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
					<button type="submit" className="search-submit" aria-label="Search">
						<Icon name="arrowRight" size={18} />
					</button>
				</form>
				<Link
					to="/settings"
					className="account-shortcut"
					aria-label={`Account settings for ${account}`}
				>
					<span className="account-shortcut-name">{account}</span>
					<Avatar name={account} size="sm" />
				</Link>
			</header>
		</>
	);
}
