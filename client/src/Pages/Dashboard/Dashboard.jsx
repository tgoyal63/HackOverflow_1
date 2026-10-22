import { useEffect } from "react";
import { Link } from "react-router-dom";
import NavbarComponent from "../../Components/Navbar/NavbarComponent";
import { Footer } from "../../Components/Footer/Footer";
import { PageHeader, ErrorState } from "../../Components/UI/Surface";
import { useAppContext } from "../../Context/appContext";
import Github from "../../Components/Github/Github";
import Hackerrank from "../../Components/Hackerrank/Hackerrank";
import CodeChef from "../../Components/CodeChef/CodeChef";
import "./Dashboard.scss";

export default function Dashboard() {
	const { getUser, resources, name, accountProfile } = useAppContext();
	useEffect(() => {
		getUser();
	}, [getUser]);
	const profileReady = !resources || resources.profile.status === "success";
	const ownName = resources ? accountProfile?.name : name;
	const title = profileReady && ownName ? ownName : "Dashboard";
	return (
		<div className="app-page dashboard-page">
			<NavbarComponent />
			<main id="main-content" className="workspace">
				<PageHeader
					title={title}
					action={
						<Link className="button button-secondary" to="/settings">
							Edit profiles
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
				<div className="dashboard-platforms">
					<Github username="" />
					<Hackerrank username="" />
					<CodeChef username="" />
				</div>
			</main>
			<Footer />
		</div>
	);
}
