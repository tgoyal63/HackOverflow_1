import { Link } from "react-router-dom";
import NavbarComponent from "../../Components/Navbar/NavbarComponent";
import { Footer } from "../../Components/Footer/Footer";
import { Icon } from "../../Components/UI/Icon";
import "./Homepage.scss";

const features = [
	{
		icon: "grid",
		number: "01",
		title: "A little less tab switching.",
		text: "Your repositories, problem solving, and contest statistics in one clear view.",
	},
	{
		icon: "users",
		number: "02",
		title: "Find your coding circle.",
		text: "Look up developers, explore their profiles, and stay connected with friends.",
	},
	{
		icon: "trophy",
		number: "03",
		title: "A little friendly competition.",
		text: "Explore community ratings on the global leaderboard or compare with your friends.",
	},
];
export function Homepage() {
	return (
		<div className="homepage">
			<NavbarComponent />
			<main id="main-content">
				<section className="home-hero">
					<div className="hero-copy">
						<p className="hero-eyebrow">
							<span />
							THE SOCIAL SIDE OF CODING
						</p>
						<h1>
							Your coding life.
							<br />
							<span>In one place.</span>
						</h1>
						<p className="hero-description">
							Bring your profiles together. Discover developers like you. Make
							your next connection count.
						</p>
						<div className="hero-actions">
							<Link className="button button-primary" to="/register">
								Create your account
								<Icon name="arrowRight" size={18} />
							</Link>
							<a className="button button-quiet" href="#how-it-works">
								Take a look
								<Icon name="arrowDown" size={16} />
							</a>
						</div>
						<div className="hero-platforms">
							<span>ONE WORKSPACE FOR</span>
							<div>
								<Icon name="github" size={16} />
								GitHub
								<span className="platform-dot" />
								HackerRank
								<span className="platform-dot" />
								CodeChef
							</div>
						</div>
					</div>
					<section
						className="hero-preview"
						aria-label="A preview of the platforms in your workspace"
					>
						<div className="preview-chrome">
							<span />
							<span />
							<span />
							<p>YOUR WORKSPACE</p>
							<Icon name="grid" size={13} />
						</div>
						<div className="preview-content">
							<p className="eyebrow">LESS FRICTION. MORE CODING.</p>
							<h2>
								All the pieces.
								<br />
								One bigger picture.
							</h2>
							<div className="preview-platform">
								<span className="preview-platform-icon">
									<Icon name="github" size={21} />
								</span>
								<div>
									<h3>GitHub</h3>
									<p>Build, contribute, collaborate.</p>
								</div>
								<Icon name="arrowRight" size={16} />
							</div>
							<div className="preview-platform">
								<span className="preview-platform-icon rank-icon">H</span>
								<div>
									<h3>HackerRank</h3>
									<p>Practice that becomes progress.</p>
								</div>
								<Icon name="arrowRight" size={16} />
							</div>
							<div className="preview-platform">
								<span className="preview-platform-icon chef-icon">
									<Icon name="code" size={21} />
								</span>
								<div>
									<h3>CodeChef</h3>
									<p>Your competitive coding profile.</p>
								</div>
								<Icon name="arrowRight" size={16} />
							</div>
							<div className="preview-bottom">
								<span>
									<Icon name="users" size={15} />
									Your people. Your progress.
								</span>
								<span className="preview-badge">Together</span>
							</div>
						</div>
						<span className="preview-corner" aria-hidden="true">
							↗
						</span>
					</section>
				</section>
				<section className="home-features" id="how-it-works">
					<div className="home-section-heading">
						<p className="eyebrow">BUILD YOUR OWN MOMENTUM</p>
						<h2>
							Good things happen
							<br />
							when developers connect.
						</h2>
						<p>
							A home for the work you do across platforms,
							<br className="desktop-break" /> and the people you meet along the
							way.
						</p>
					</div>
					<div className="feature-grid">
						{features.map(({ icon, number, title, text }) => (
							<article key={number} className="feature-card">
								<div className="feature-card-top">
									<Icon name={icon} size={24} />
									<span>{number}</span>
								</div>
								<h3>{title}</h3>
								<p>{text}</p>
							</article>
						))}
					</div>
				</section>
				<section className="home-open-source">
					<div>
						<p className="eyebrow">BUILT IN THE OPEN</p>
						<h2>
							For developers.
							<br />
							By developers.
						</h2>
						<p>
							HackOverflow is open source. Explore the code, share an idea, or
							help make it better.
						</p>
					</div>
					<a
						className="button button-secondary"
						href="https://github.com/tgoyal63/HackOverflow_1"
						target="_blank"
						rel="noreferrer"
					>
						<Icon name="github" size={18} />
						Explore the repository
						<Icon name="external" size={15} />
					</a>
				</section>
			</main>
			<Footer />
		</div>
	);
}
