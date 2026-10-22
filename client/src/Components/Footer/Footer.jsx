import { Link, useLocation } from "react-router-dom";
import { Icon } from "../UI/Icon";
import "./Footer.scss";

export function Footer() {
	const { pathname } = useLocation();
	const publicPage = pathname === "/" || pathname === "/register";
	return (
		<footer className={publicPage ? "site-footer" : "workspace-footer"}>
			<span>
				© {new Date().getFullYear()} HackOverflow
				<span className="footer-separator">/</span>
				<span className="footer-tagline">Made for your next chapter.</span>
			</span>
			<nav aria-label="Footer navigation">
				<Link to="/leaderboard">Leaderboard</Link>
				<a
					href="https://github.com/tgoyal63/HackOverflow_1"
					target="_blank"
					rel="noreferrer"
				>
					<Icon name="github" size={14} />
					Source code
					<Icon name="external" size={12} />
				</a>
			</nav>
		</footer>
	);
}
