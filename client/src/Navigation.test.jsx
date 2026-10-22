import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { useAppContext } from "./Context/appContext";
import App from "./App";

vi.mock("./Context/appContext", () => ({ useAppContext: vi.fn() }));
vi.mock("react-toastify", () => ({
	ToastContainer: () => null,
	toast: vi.fn(),
}));
let context;
const methods = [
	"getUser",
	"getGithub",
	"getHackerrank",
	"getCodechef",
	"searchUser",
	"logoutUser",
	"getFriendsReq",
	"getPendingReq",
	"getRequestsReq",
	"getGlobalLeaderboard",
	"getFriendsLeaderboard",
	"getUpVote",
	"getDownVote",
	"removeVote",
	"addFriend",
	"acceptReq",
	"getCancelReq",
];
beforeEach(() => {
	vi.clearAllMocks();
	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		value: 1280,
	});
	context = {
		token: "fixture",
		loginUsername: "alice",
		username: "alice",
		name: "Alice",
		status: "Add Friend",
		friends: [],
		pending: [],
		requests: [],
		globaldata: [],
		friendsdata: [],
	};
	methods.forEach((method) => {
		context[method] = vi.fn().mockResolvedValue(true);
	});
	useAppContext.mockImplementation(() => context);
});
afterEach(() => {
	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		value: 1280,
	});
});
function route(path) {
	window.history.replaceState({}, "", path);
	return render(<App />);
}

test("workspace navigation marks the current page and gives each route a title and main focus", () => {
	route("/friends");
	const nav = screen.getByRole("navigation", { name: "Workspace navigation" });
	expect(within(nav).getByRole("link", { name: "Friends" })).toHaveAttribute(
		"aria-current",
		"page",
	);
	expect(document.title).toBe("Friends · HackOverflow");
	expect(screen.getByRole("main")).toHaveFocus();
});

test("mobile menu contains focus, makes background inert, and Escape restores its trigger", () => {
	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		value: 390,
	});
	route("/dashboard");
	const trigger = screen.getByRole("button", { name: "Open navigation" });
	trigger.focus();
	fireEvent.click(trigger);
	expect(trigger).toHaveAttribute("aria-expanded", "true");
	expect(
		screen.getByRole("button", { name: "Close navigation" }),
	).toHaveFocus();
	expect(document.getElementById("main-content").inert).toBe(true);
	expect(document.body.style.overflow).toBe("hidden");
	fireEvent.keyDown(document, { key: "Escape" });
	expect(trigger).toHaveAttribute("aria-expanded", "false");
	expect(document.getElementById("main-content").inert).toBeFalsy();
	expect(document.body.style.overflow).toBe("");
	expect(trigger).toHaveFocus();
});

test("selecting a mobile destination closes the menu and releases the page", async () => {
	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		value: 390,
	});
	route("/dashboard");
	fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
	fireEvent.click(
		within(
			screen.getByRole("navigation", { name: "Workspace navigation" }),
		).getByRole("link", { name: "Friends" }),
	);
	await waitFor(() => expect(window.location.pathname).toBe("/friends"));
	expect(
		screen.getByRole("button", { name: "Open navigation" }),
	).toHaveAttribute("aria-expanded", "false");
	expect(document.getElementById("main-content").inert).toBeFalsy();
	expect(document.body.style.overflow).toBe("");
});

test("unknown routes provide a recovery action instead of a blank screen", () => {
	route("/this-page-does-not-exist");
	expect(
		screen.getByRole("heading", { name: "This page took a wrong turn." }),
	).toBeInTheDocument();
	expect(
		screen.getByRole("link", { name: "Back to dashboard" }),
	).toHaveAttribute("href", "/dashboard");
	expect(document.title).toBe("Page not found · HackOverflow");
});

test("a missing searched user shows recovery and never loads unrelated provider metrics", async () => {
	context.status = undefined;
	context.resources = {
		search: {
			status: "error",
			identity: "missing",
			httpStatus: 404,
			message: "",
		},
	};
	route("/search/missing");
	expect(screen.getByRole("alert")).toHaveTextContent("Developer not found");
	expect(context.getGithub).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Try again" }));
	await waitFor(() => expect(context.searchUser).toHaveBeenCalledTimes(2));
});

test("profile votes cannot be submitted twice while the first request is pending", async () => {
	let resolve;
	context.getUpVote.mockReturnValue(
		new Promise((complete) => {
			resolve = complete;
		}),
	);
	route("/search/bob");
	const upvote = screen.getByRole("button", { name: "Upvote" });
	fireEvent.click(upvote);
	fireEvent.click(upvote);
	expect(context.getUpVote).toHaveBeenCalledTimes(1);
	expect(upvote).toBeDisabled();
	expect(screen.getByRole("button", { name: "Downvote" })).toBeDisabled();
	await act(async () => resolve(false));
	expect(screen.getByRole("alert")).toHaveTextContent("couldn’t be confirmed");
	expect(upvote).toBeEnabled();
});

test("dashboard greets the signed-in account rather than the last searched developer", () => {
	context.name = "Bob";
	context.accountProfile = { name: "Alice", username: "alice" };
	context.resources = { profile: { status: "success" } };
	route("/dashboard");
	expect(
		screen.getByRole("heading", { name: "Welcome back, Alice." }),
	).toBeInTheDocument();
	expect(
		screen.queryByRole("heading", { name: "Welcome back, Bob." }),
	).not.toBeInTheDocument();
});

test("blank searched handles never fall back to the viewer's own platform endpoints", () => {
	context.socials = { github: "", hackerrank: "   ", codechef: null };
	route("/search/bob");
	expect(context.searchUser).toHaveBeenCalledWith("bob");
	expect(context.getGithub).not.toHaveBeenCalled();
	expect(context.getHackerrank).not.toHaveBeenCalled();
	expect(context.getCodechef).not.toHaveBeenCalled();
});

test("route changes reset the viewport rather than opening halfway down the next page", () => {
	route("/dashboard");
	window.scrollTo.mockClear();
	fireEvent.click(
		within(
			screen.getByRole("navigation", { name: "Account navigation" }),
		).getByRole("link", { name: "Settings" }),
	);
	expect(window.scrollTo).toHaveBeenCalledWith({
		top: 0,
		left: 0,
		behavior: "instant",
	});
});
