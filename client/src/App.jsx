import "./App.scss";
import { useEffect } from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	useLocation,
	Link,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Landing from "./Pages/Landing/Landing";
import Leaderboard from "./Pages/Leaderboard/Leaderboard";
import Setting from "./Pages/Settings/Setting";
import ChangePassword from "./Pages/ChangePassword/ChangePassword";
import { Homepage } from "./Pages/Homepage/Homepage";
import Dashboard from "./Pages/Dashboard/Dashboard";
import SearchDashboard from "./Pages/SearchDashboard/SearchDashboard";
import Friends from "./Pages/Friends/Friends";
import NavbarComponent from "./Components/Navbar/NavbarComponent";
import { Footer } from "./Components/Footer/Footer";

const pageTitles = {
	"/": "Coding profiles and community",
	"/dashboard": "Dashboard",
	"/register": "Your account",
	"/friends": "Friends",
	"/leaderboard": "Leaderboard",
	"/settings": "Settings",
	"/changepassword": "Security",
};
function RouteEffects() {
	const { pathname } = useLocation();
	useEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: "instant" });
		document.title = `${pageTitles[pathname] || (pathname.startsWith("/search/") ? "Developer profile" : "Page not found")} · HackOverflow`;
		const main = document.getElementById("main-content");
		if (main) {
			main.setAttribute("tabindex", "-1");
			main.focus({ preventScroll: true });
		}
	}, [pathname]);
	return null;
}

function NotFound() {
	return (
		<div className="app-page">
			<NavbarComponent />
			<main id="main-content" className="workspace not-found">
				<p className="muted">404</p>
				<h1>Page not found</h1>
				<p>Check the address or return to your dashboard.</p>
				<Link className="button button-primary" to="/dashboard">
					Back to dashboard
				</Link>
			</main>
			<Footer />
		</div>
	);
}

function App() {
	return (
		<BrowserRouter>
			<RouteEffects />
			<Routes>
				<Route path="/dashboard" element={<Dashboard />}></Route>
				<Route path="/leaderboard" element={<Leaderboard />}></Route>
				<Route exact path="/" element={<Homepage />}></Route>
				<Route path="/settings" element={<Setting />}></Route>
				<Route path="/friends" element={<Friends />}></Route>
				<Route
					exact
					path="/changepassword"
					element={<ChangePassword />}
				></Route>
				<Route exact path="/register" element={<Landing />}></Route>
				{/* <Route exact path='/about' element={<About />}></Route> */}
				<Route
					exact
					path="/search/:username"
					element={<SearchDashboard />}
				></Route>
				<Route path="*" element={<NotFound />} />
			</Routes>
			<ToastContainer
				position="bottom-right"
				theme="dark"
				autoClose={4000}
				closeOnClick
				pauseOnFocusLoss={false}
			/>
		</BrowserRouter>
	);
}

export default App;
