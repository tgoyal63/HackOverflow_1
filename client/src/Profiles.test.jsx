import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useAppContext } from "./Context/appContext"
import Github from "./Components/Github/Github"
import Hackerrank from "./Components/Hackerrank/Hackerrank"
import CodeChef from "./Components/CodeChef/CodeChef"

vi.mock("./Context/appContext", () => ({ useAppContext: vi.fn() }))

let context
beforeEach(() => {
  vi.clearAllMocks()
  context = { getGithub: vi.fn().mockResolvedValue(true), getHackerrank: vi.fn().mockResolvedValue(true),
    getCodechef: vi.fn().mockResolvedValue(true), resources: {} }
  useAppContext.mockImplementation(() => context)
})

const resource = (status, identity = "alice") => ({ status, identity, message: "", httpStatus: null })
const githubData = () => Object.assign(context, { githubUsername: "alice", public_repos: 0, public_gists: 0,
  followers: 0, following: 0, organizations: 0, github_created_at: "Jan 2020" })
const metric = (label) => screen.getByText(label, { selector: "dt" }).nextElementSibling

test("GitHub loads the own-account endpoint and hides cached metrics during loading", () => {
  githubData()
  context.resources.github = resource("loading", "")
  render(<Github username="" />)
  expect(context.getGithub).toHaveBeenCalledWith("")
  expect(screen.getByRole("status")).toHaveTextContent("Loading GitHub profile")
  expect(screen.queryByText("Public repositories")).not.toBeInTheDocument()
  expect(screen.queryByText("@alice")).not.toBeInTheDocument()
})

test("provider failure has an actionable retry and never displays old metrics as current", () => {
  githubData()
  context.resources.github = { ...resource("error"), message: "The service is temporarily unavailable.", httpStatus: 503 }
  render(<Github username="alice" />)
  expect(screen.getByRole("alert")).toHaveTextContent("The service is temporarily unavailable.")
  expect(screen.queryByText("Public repositories")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  expect(context.getGithub).toHaveBeenCalledTimes(2)
  expect(context.getGithub).toHaveBeenLastCalledWith("alice")
})

test("absent usernames do not start a request and present an honest empty state", () => {
  render(<Github />)
  expect(context.getGithub).not.toHaveBeenCalled()
  expect(screen.getByText("No public username has been linked to this profile.")).toBeInTheDocument()
  expect(screen.queryByRole("button")).not.toBeInTheDocument()
  expect(screen.queryByText("Public repositories")).not.toBeInTheDocument()
})

test("successful GitHub data preserves real zeros while unknown fields remain unknown", () => {
  githubData()
  context.organizations = undefined
  context.resources.github = resource("success")
  render(<Github username="alice" />)
  for (const label of ["Public repositories", "Public gists", "Followers", "Following"]) expect(metric(label)).toHaveTextContent("0")
  expect(metric("Organizations")).toHaveTextContent("Not available")
  expect(screen.getByRole("link", { name: "View GitHub profile" })).toHaveAttribute("href", "https://github.com/alice")
})

test("a successful profile without metrics is empty rather than a fabricated zero dashboard", () => {
  context.githubUsername = "a/b ?"
  context.resources.github = resource("success", "a/b ?")
  render(<Github username="a/b ?" />)
  expect(screen.getByText("No statistics available")).toBeInTheDocument()
  expect(screen.queryByText("Public repositories")).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: "View GitHub profile" })).toHaveAttribute("href", "https://github.com/a%2Fb%20%3F")
})

test("a previous searched profile is hidden immediately when rendering the own dashboard", () => {
  githubData()
  context.resources.github = resource("success", "alice")
  render(<Github username="" />)
  expect(screen.getByText("GitHub profile not loaded")).toBeInTheDocument()
  expect(screen.queryByText("Public repositories")).not.toBeInTheDocument()
  expect(screen.queryByText("@alice")).not.toBeInTheDocument()
})

test("HackerRank preserves zero submissions and distinguishes no badges from unavailable details", () => {
  Object.assign(context, { hackerrankUsername: "alice", totalSubmissions: 0, totalBadges: 0,
    followers_count: 0, level: 0, badgeData: [] })
  context.resources.hackerrank = resource("success")
  render(<Hackerrank username="alice" />)
  expect(metric("Submissions")).toHaveTextContent("0")
  expect(metric("Badges")).toHaveTextContent("0")
  expect(metric("Level")).toHaveTextContent("0")
  expect(screen.getByText("No badges reported yet.")).toBeInTheDocument()
  expect(metric("Joined HackerRank")).toHaveTextContent("Not available")
})

test("CodeChef keeps zero ratings and submission counts without inventing missing ranks", () => {
  Object.assign(context, { codechefUsername: "alice", ratings: 0, div: 4,
    submissionStats: { solvedProblems: 0, acceptedSubmissions: 0 } })
  context.resources.codechef = resource("success")
  render(<CodeChef username="alice" />)
  expect(metric("Contest rating")).toHaveTextContent("0")
  expect(metric("Solved problems")).toHaveTextContent("0")
  expect(metric("Accepted submissions")).toHaveTextContent("0")
  expect(metric("Global rank")).toHaveTextContent("Not available")
  expect(screen.getByRole("link", { name: "View CodeChef profile" })).toHaveAttribute("href", "https://www.codechef.com/users/alice")
})

test("external charts load only when expanded and failed images produce a useful fallback", async () => {
  githubData()
  context.resources.github = resource("success")
  context.graph = "https://charts.example.test/alice.svg"
  render(<Github username="alice" />)
  expect(screen.queryByRole("img")).not.toBeInTheDocument()
  const details = screen.getByText("Explore external charts").closest("details")
  details.open = true
  fireEvent(details, new Event("toggle"))
  const chart = await screen.findByRole("img", { name: "GitHub activity graph" })
  fireEvent.error(chart)
  expect(screen.queryByRole("img")).not.toBeInTheDocument()
  expect(screen.getByText(/This external chart is unavailable/)).toBeInTheDocument()
  expect(metric("Public repositories")).toHaveTextContent("0")
  details.open = false
  fireEvent(details, new Event("toggle"))
  await waitFor(() => expect(screen.queryByText(/This external chart is unavailable/)).not.toBeInTheDocument())
})

test("invalid chart URLs are never mounted or offered as external charts", () => {
  githubData()
  context.resources.github = resource("success")
  context.graph = "javascript:alert('example')"
  context.stats = "data:image/svg+xml,example"
  render(<Github username="alice" />)
  expect(screen.queryByText("Explore external charts")).not.toBeInTheDocument()
  expect(screen.queryByRole("img")).not.toBeInTheDocument()
})

test("mock compatibility can show existing successful fields when resources were not supplied", () => {
  githubData()
  delete context.resources
  render(<Github username="alice" />)
  expect(metric("Public repositories")).toHaveTextContent("0")
})
