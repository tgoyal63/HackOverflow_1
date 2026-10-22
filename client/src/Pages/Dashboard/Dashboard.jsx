import { useEffect } from "react";
import { Link } from "react-router-dom";
import NavbarComponent from "../../Components/Navbar/NavbarComponent";
import { Footer } from "../../Components/Footer/Footer";
import { Icon } from "../../Components/UI/Icon";
import { PageHeader, ErrorState } from "../../Components/UI/Surface";
import { useAppContext } from "../../Context/appContext";
import Github from "../../Components/Github/Github";
import Hackerrank from "../../Components/Hackerrank/Hackerrank";
import CodeChef from "../../Components/CodeChef/CodeChef";
import "./Dashboard.scss";

const format = (value) =>
	value === undefined || value === null
		? "—"
		: new Intl.NumberFormat().format(value);
function OverviewMetric({ icon, label, value, platform, resource }) {
	const current =
		!resource || (resource.status === "success" && resource.identity === "");
	return (
		<div className="overview-metric panel">
			<div className="overview-metric-top">
				<span>{label}</span>
				<Icon name={icon} size={17} />
			</div>
			<strong>{current ? format(value) : "—"}</strong>
			<p>
				{resource?.status === "error"
					? "Temporarily unavailable"
					: resource?.status === "loading"
						? "Loading your profile…"
						: platform}
			</p>
		</div>
	);
}

export default function Dashboard() {
	const {
		getUser,
		resources,
		name,
		accountProfile,
		public_repos,
		totalSubmissions,
		ratings,
	} = useAppContext();
	useEffect(() => {
		getUser();
	}, [getUser]);
	const profileReady = !resources || resources.profile.status === "success";
	const ownName = resources ? accountProfile?.name : name;
	const firstName =
		profileReady && ownName ? ownName.trim().split(/\s+/)[0] : "";
	return (
		<div className="app-page dashboard-page">
			<NavbarComponent />
			<main id="main-content" className="workspace">
				<PageHeader
					eyebrow="YOUR WORKSPACE"
					title={
						firstName ? `Welcome back, ${firstName}.` : "Your coding overview."
					}
					description="Your profiles, progress, and people. All in one place."
					action={
						<Link className="button button-secondary" to="/settings">
							<Icon name="link" size={16} />
							Manage profiles
						</Link>
					}
				/>
				{resources?.profile?.status === "error" && (
					<div className="panel dashboard-profile-error">
						<ErrorState
							title="We couldn’t load your account"
							message={resources.profile.message}
							onRetry={getUser}
						/>
					</div>
				)}
				<div className="overview-grid">
					<OverviewMetric
						icon="github"
						label="Public repositories"
						value={public_repos}
						platform="Across your GitHub profile"
						resource={resources?.github}
					/>
					<OverviewMetric
						icon="code"
						label="Practice submissions"
						value={totalSubmissions}
						platform="On HackerRank"
						resource={resources?.hackerrank}
					/>
					<OverviewMetric
						icon="trophy"
						label="Contest rating"
						value={ratings}
						platform="On CodeChef"
						resource={resources?.codechef}
					/>
				</div>
				<div className="dashboard-section-heading">
					<div>
						<h2 className="section-title">Your coding profiles</h2>
						<p className="section-subtitle">
							A closer look at the work behind each platform.
						</p>
					</div>
					<span className="dashboard-platform-count">3 platforms</span>
				</div>
				<nav
					className="platform-jump-links"
					aria-label="Jump to a coding platform"
				>
					<a href="#github">
						<Icon name="github" size={15} />
						GitHub
					</a>
					<a href="#hackerrank">
						<span className="small-platform-mark">H</span>HackerRank
					</a>
					<a href="#codechef">
						<Icon name="code" size={15} />
						CodeChef
					</a>
				</nav>
				<div className="dashboard-platforms">
					<Github username="" />
					<Hackerrank username="" />
					<CodeChef username="" />
				</div>
				<aside className="dashboard-community">
					<span className="community-prompt-icon">
						<Icon name="users" size={22} />
					</span>
					<div>
						<h2>Your next connection is a search away.</h2>
						<p>
							Find a developer by username, explore their work, and send a
							friend request.
						</p>
					</div>
					<Link className="button button-secondary" to="/friends">
						Your coding circle
						<Icon name="arrowRight" size={16} />
					</Link>
				</aside>
			</main>
			<Footer />
		</div>
	);
}
