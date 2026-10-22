import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../../Context/appContext";
import NavbarComponent from "../../Components/Navbar/NavbarComponent";
import { Footer } from "../../Components/Footer/Footer";
import {
	Avatar,
	PageHeader,
	LoadingState,
	ErrorState,
} from "../../Components/UI/Surface";
import { Icon } from "../../Components/UI/Icon";
import Github from "../../Components/Github/Github";
import Hackerrank from "../../Components/Hackerrank/Hackerrank";
import CodeChef from "../../Components/CodeChef/CodeChef";
import { toast } from "react-toastify";
import "../Dashboard/Dashboard.scss";
import "./SearchDashboard.scss";

const linkedHandle = (value) =>
	typeof value === "string" && value.trim() ? value : undefined;

export default function SearchDashboard() {
	const {
		name,
		socials,
		upvotes,
		downvotes,
		voteStatus,
		status,
		searchUser,
		addFriend,
		acceptReq,
		getCancelReq,
		getUpVote,
		getDownVote,
		removeVote,
		loginUsername,
		resources,
	} = useAppContext();
	const { username } = useParams();
	const navigate = useNavigate();
	const currentUsername = useRef(username);
	const pendingRef = useRef(false);
	const [pending, setPending] = useState(false);
	const [mutationError, setMutationError] = useState("");
	const [confirmRemove, setConfirmRemove] = useState(false);
	useEffect(() => {
		currentUsername.current = username;
		pendingRef.current = false;
		setPending(false);
		setMutationError("");
		setConfirmRemove(false);
		if (username === loginUsername) {
			navigate("/dashboard", { replace: true });
			return undefined;
		}
		if (username) searchUser(username);
		return () => {
			currentUsername.current = undefined;
		};
	}, [username, loginUsername, navigate, searchUser]);

	const resource = resources?.search;
	const current = !resource || resource.identity === username;
	const ready =
		Boolean(status) && current && (!resource || resource.status === "success");
	const loading =
		resource &&
		(!current || resource.status === "idle" || resource.status === "loading");
	const failed = current && resource?.status === "error";
	const runMutation = async (operation, successMessage) => {
		if (!ready || pendingRef.current) return;
		const target = username;
		pendingRef.current = true;
		setPending(true);
		setMutationError("");
		setConfirmRemove(false);
		const succeeded = await operation(target);
		if (currentUsername.current !== target) return;
		if (succeeded) {
			if (successMessage) toast(successMessage);
			const refreshed = await searchUser(target);
			if (currentUsername.current === target && !refreshed)
				setMutationError(
					"Your change was saved, but this profile could not refresh. Please try again.",
				);
		} else
			setMutationError(
				"That action couldn’t be confirmed. Refresh this profile to check its current state before retrying.",
			);
		if (currentUsername.current === target) {
			pendingRef.current = false;
			setPending(false);
		}
	};
	const handleFriend = () => {
		if (status === "Remove Friend" && !confirmRemove) {
			setConfirmRemove(true);
			return;
		}
		const operation =
			status === "Add Friend"
				? addFriend
				: status === "Accept Request"
					? acceptReq
					: getCancelReq;
		const message =
			status === "Add Friend"
				? "Friend request sent!"
				: status === "Accept Request"
					? "You are now friends!"
					: status === "Remove Friend"
						? "Friend Removed"
						: "Friend Request Removed!";
		runMutation(operation, message);
	};
	return (
		<div className="app-page profile-page">
			<NavbarComponent />
			<main id="main-content" className="workspace">
				<Link className="profile-back-link" to="/leaderboard">
					<Icon name="arrowRight" size={14} />
					Explore the community
				</Link>
				<PageHeader
					eyebrow="DEVELOPER PROFILE"
					title="A closer look."
					description="Explore their coding profiles and make a connection."
				/>
				<section
					className="panel developer-profile"
					aria-label="Developer profile"
				>
					{loading ? (
						<LoadingState label="Finding this developer…" />
					) : failed ? (
						<ErrorState
							title={
								resource.httpStatus === 404
									? "Developer not found"
									: "This profile is unavailable"
							}
							message={
								resource.httpStatus === 404
									? `We couldn’t find “${username}”. Check the username in search and try again.`
									: resource.message
							}
							onRetry={() => searchUser(username)}
						/>
					) : (
						<>
							<div className="developer-identity">
								<Avatar name={ready ? name || username : username} size="lg" />
								<div>
									<span className="eyebrow">HACKOVERFLOW COMMUNITY</span>
									<h2>{ready ? name || username : username}</h2>
									<p>@{username}</p>
								</div>
								<div className="developer-connection">
									{ready && (
										<span
											className={`badge${status === "Remove Friend" ? " badge-success" : ""}`}
										>
											{status === "Remove Friend"
												? "Friends"
												: status === "Cancel Request"
													? "Request sent"
													: status === "Accept Request"
														? "Wants to connect"
														: "Developer"}
										</span>
									)}
								</div>
							</div>
							<div className="developer-profile-actions">
								<fieldset className="vote-controls">
									<legend className="visually-hidden">Community votes</legend>
									<button
										type="button"
										className={`vote-button${voteStatus === "upvoted" ? " is-selected" : ""}`}
										aria-label="Upvote"
										aria-pressed={voteStatus === "upvoted"}
										disabled={!ready || pending}
										onClick={() =>
											runMutation(
												voteStatus === "upvoted" ? removeVote : getUpVote,
											)
										}
									>
										<Icon name="arrowUp" size={16} />
										<span>{ready ? (upvotes ?? "—") : "—"}</span>
										<span>Upvotes</span>
									</button>
									<button
										type="button"
										className={`vote-button${voteStatus === "downvoted" ? " is-selected" : ""}`}
										aria-label="Downvote"
										aria-pressed={voteStatus === "downvoted"}
										disabled={!ready || pending}
										onClick={() =>
											runMutation(
												voteStatus === "downvoted" ? removeVote : getDownVote,
											)
										}
									>
										<Icon name="arrowDown" size={16} />
										<span>{ready ? (downvotes ?? "—") : "—"}</span>
										<span>Downvotes</span>
									</button>
								</fieldset>
								<div className="connection-actions">
									<button
										type="button"
										className={`button ${status === "Remove Friend" ? "button-secondary" : "button-primary"}`}
										aria-label={
											confirmRemove
												? `Confirm remove ${username}`
												: status || "Friend request"
										}
										disabled={!ready || pending}
										onClick={handleFriend}
									>
										<Icon
											name={
												status === "Add Friend" || status === "Accept Request"
													? "users"
													: "close"
											}
											size={16}
										/>
										{pending
											? "Updating…"
											: confirmRemove
												? "Confirm removal"
												: status || "Loading profile…"}
									</button>
									{confirmRemove && (
										<button
											type="button"
											className="button button-quiet"
											onClick={() => setConfirmRemove(false)}
										>
											Keep friend
										</button>
									)}
								</div>
							</div>
							{confirmRemove && (
								<p className="profile-confirmation">
									Remove @{username} from your friends? You can send a new
									request later.
								</p>
							)}
						</>
					)}
					{mutationError && (
						<div className="form-error profile-mutation-error" role="alert">
							<p>{mutationError}</p>
							<button
								type="button"
								className="button button-secondary"
								disabled={pending}
								onClick={() => {
									setMutationError("");
									searchUser(username);
								}}
							>
								Refresh profile
							</button>
						</div>
					)}
				</section>
				{ready && (
					<>
						<div className="profile-platform-heading">
							<h2 className="section-title">Coding profiles</h2>
							<span className="muted">Their work, across platforms.</span>
						</div>
						<div className="dashboard-platforms">
							<Github username={linkedHandle(socials?.github)} />
							<Hackerrank username={linkedHandle(socials?.hackerrank)} />
							<CodeChef username={linkedHandle(socials?.codechef)} />
						</div>
					</>
				)}
			</main>
			<Footer />
		</div>
	);
}
