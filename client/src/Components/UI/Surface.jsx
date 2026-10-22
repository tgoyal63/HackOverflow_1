import { Icon } from "./Icon";
export function PageHeader({ title, description, action }) {
	return (
		<header className="page-heading">
			<div>
				<h1>{title}</h1>
				{description && <p className="page-description">{description}</p>}
			</div>
			{action && <div className="page-heading-action">{action}</div>}
		</header>
	);
}
export function Avatar({ name, size = "md" }) {
	const initials = (name || "?")
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase();
	return (
		<span className={`avatar avatar-${size}`} aria-hidden="true">
			{initials}
		</span>
	);
}
export function EmptyState({ icon = "users", title, description, action }) {
	return (
		<div className="empty-state">
			<span className="state-icon">
				<Icon name={icon} size={24} />
			</span>
			<h3>{title}</h3>
			{description && <p>{description}</p>}
			{action && <div>{action}</div>}
		</div>
	);
}
export function LoadingState({ label = "Loading…" }) {
	return (
		<div className="loading-state" role="status">
			<span className="loading-spinner" aria-hidden="true" />
			<span>{label}</span>
		</div>
	);
}
export function ErrorState({
	title = "Something went wrong",
	message,
	onRetry,
}) {
	return (
		<div className="error-state" role="alert">
			<span className="state-icon">
				<Icon name="alert" size={22} />
			</span>
			<div>
				<h3>{title}</h3>
				<p>
					{message || "We couldn’t load this information. Please try again."}
				</p>
			</div>
			{onRetry && (
				<button
					type="button"
					className="button button-secondary"
					onClick={onRetry}
				>
					<Icon name="refresh" size={16} />
					Try again
				</button>
			)}
		</div>
	);
}
