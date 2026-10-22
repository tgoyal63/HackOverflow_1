import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { useAppContext } from "./Context/appContext"
import Friends from "./Pages/Friends/Friends"
import Leaderboard from "./Pages/Leaderboard/Leaderboard"

vi.mock("./Context/appContext", () => ({ useAppContext: vi.fn() }))
vi.mock("./Components/Navbar/NavbarComponent", () => ({ default: () => null }))
vi.mock("./Components/Footer/Footer.jsx", () => ({ Footer: () => null }))

let context
const resourceKeys = ["friends", "pending", "requests", "globalLeaderboard", "friendsLeaderboard"]

beforeEach(() => {
  vi.clearAllMocks()
  context = {
    friends: ["bob"], pending: ["carol"], requests: ["dana"],
    globaldata: [{ username: "bob", name: "Bob", rating: 10 }], friendsdata: [],
    resources: Object.fromEntries(resourceKeys.map((key) => [key, { status: "success", message: "" }])),
  }
  for (const method of ["getPendingReq", "getFriendsReq", "getRequestsReq", "getCancelReq", "acceptReq", "getGlobalLeaderboard", "getFriendsLeaderboard"]) {
    context[method] = vi.fn().mockResolvedValue(true)
  }
  useAppContext.mockImplementation(() => context)
})

function renderPage(Component) {
  return render(<MemoryRouter><Component /></MemoryRouter>)
}

function deferred() {
  let resolve
  const promise = new Promise((complete) => { resolve = complete })
  return { promise, resolve }
}

test("connections filters expose their selection, counts, profile links and incoming actions", () => {
  renderPage(Friends)
  const friends = screen.getByRole("button", { name: "Friends", exact: true })
  expect(friends).toHaveAttribute("aria-pressed", "true")
  expect(within(friends).getByText("1")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "View bob’s profile" })).toHaveAttribute("href", "/search/bob")
  fireEvent.click(screen.getByRole("button", { name: "Requests", exact: true }))
  expect(screen.getByRole("button", { name: "Requests", exact: true })).toHaveAttribute("aria-pressed", "true")
  expect(friends).toHaveAttribute("aria-pressed", "false")
  expect(screen.getByRole("heading", { name: "Incoming requests" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Accept request from dana" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Reject request from dana" })).toHaveTextContent("Decline")
})

test("connections distinguish unloaded, error and successfully empty data and offer retry", () => {
  context.friends = undefined
  context.resources.friends = { status: "loading" }
  const { rerender } = renderPage(Friends)
  expect(screen.getByRole("status")).toHaveTextContent("Loading friends")
  expect(screen.queryByText("Build your developer circle")).not.toBeInTheDocument()
  expect(within(screen.getByRole("button", { name: "Friends", exact: true })).getByText("—")).toBeInTheDocument()
  context.resources.friends = { status: "error", message: "Connection unavailable. Please try again." }
  rerender(<MemoryRouter><Friends /></MemoryRouter>)
  expect(screen.getByRole("alert")).toHaveTextContent("Connection unavailable")
  expect(screen.queryByText("Build your developer circle")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  expect(context.getFriendsReq).toHaveBeenCalledTimes(2)
  context.friends = []
  context.resources.friends = { status: "success" }
  rerender(<MemoryRouter><Friends /></MemoryRouter>)
  expect(screen.getByText("Build your developer circle")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Explore the leaderboard" })).toHaveAttribute("href", "/leaderboard")
  expect(within(screen.getByRole("button", { name: "Friends", exact: true })).getByText("0")).toBeInTheDocument()
})

test("accepted friend removal needs confirmation and refreshes only after success", async () => {
  const removal = deferred()
  context.getCancelReq.mockReturnValue(removal.promise)
  renderPage(Friends)
  fireEvent.click(screen.getByRole("button", { name: "Remove bob" }))
  expect(context.getCancelReq).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Keep friend" }))
  expect(screen.queryByRole("button", { name: "Confirm remove bob" })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Remove bob" }))
  fireEvent.click(screen.getByRole("button", { name: "Confirm remove bob" }))
  expect(context.getCancelReq).toHaveBeenCalledWith("bob")
  expect(screen.getByRole("button", { name: "Remove bob" })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: "Remove bob" }))
  expect(context.getCancelReq).toHaveBeenCalledTimes(1)
  expect(context.getFriendsReq).toHaveBeenCalledTimes(1)
  await act(async () => removal.resolve(true))
  expect(context.getFriendsReq).toHaveBeenCalledTimes(2)
  expect(context.getPendingReq).toHaveBeenCalledTimes(2)
  expect(context.getRequestsReq).toHaveBeenCalledTimes(2)
  expect(screen.getByRole("status")).toHaveTextContent("@bob was removed")
})

test("failed connection changes remain visible and never claim success or refresh", async () => {
  context.getCancelReq.mockResolvedValue(false)
  renderPage(Friends)
  fireEvent.click(screen.getByRole("button", { name: "Pending", exact: true }))
  fireEvent.click(screen.getByRole("button", { name: "Cancel request to carol" }))
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not cancel this request"))
  expect(context.getPendingReq).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("link", { name: "View carol’s profile" })).toBeInTheDocument()
  expect(screen.queryByRole("status")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Friends", exact: true }))
  expect(screen.getByRole("alert")).toHaveTextContent("Could not cancel this request")
})

test("pending acceptance disables both row actions and duplicate submissions", async () => {
  const acceptance = deferred()
  context.acceptReq.mockReturnValue(acceptance.promise)
  renderPage(Friends)
  fireEvent.click(screen.getByRole("button", { name: "Requests", exact: true }))
  fireEvent.click(screen.getByRole("button", { name: "Accept request from dana" }))
  expect(screen.getByRole("button", { name: "Accept request from dana" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Reject request from dana" })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: "Accept request from dana" }))
  fireEvent.click(screen.getByRole("button", { name: "Reject request from dana" }))
  expect(context.acceptReq).toHaveBeenCalledTimes(1)
  expect(context.getCancelReq).not.toHaveBeenCalled()
  expect(context.getFriendsReq).toHaveBeenCalledTimes(1)
  await act(async () => acceptance.resolve(true))
  expect(context.getFriendsReq).toHaveBeenCalledTimes(2)
  expect(screen.getByRole("status")).toHaveTextContent("You and @dana are now friends")
})

test("a saved mutation followed by a failed refresh describes the partial result", async () => {
  context.getFriendsReq.mockResolvedValueOnce(true).mockResolvedValue(false)
  renderPage(Friends)
  fireEvent.click(screen.getByRole("button", { name: "Requests", exact: true }))
  fireEvent.click(screen.getByRole("button", { name: "Accept request from dana" }))
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Your change was saved, but some lists could not refresh"))
  expect(screen.queryByRole("status")).not.toBeInTheDocument()
})

test("a completed mutation does not start more requests after the page unmounts", async () => {
  const acceptance = deferred()
  context.acceptReq.mockReturnValue(acceptance.promise)
  const { unmount } = renderPage(Friends)
  fireEvent.click(screen.getByRole("button", { name: "Requests", exact: true }))
  fireEvent.click(screen.getByRole("button", { name: "Accept request from dana" }))
  unmount()
  await act(async () => acceptance.resolve(true))
  expect(context.getFriendsReq).toHaveBeenCalledTimes(1)
})

test("leaderboard preserves returned order, zero ratings and encoded profile destinations", () => {
  context.globaldata = [
    { username: "first/name", name: "First Developer", rating: 0 },
    { username: "second", name: "Second Developer", rating: null },
  ]
  renderPage(Leaderboard)
  expect(context.getGlobalLeaderboard).toHaveBeenCalledTimes(1)
  const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1)
  expect(within(rows[0]).getByRole("cell", { name: "1" })).toBeInTheDocument()
  expect(within(rows[0]).getByRole("cell", { name: "0" })).toBeInTheDocument()
  expect(within(rows[0]).getByRole("link", { name: "First Developer" })).toHaveAttribute("href", "/search/first%2Fname")
  expect(within(rows[1]).getByRole("cell", { name: "—" })).toBeInTheDocument()
})

test("leaderboard scope buttons load each dataset and present an actionable friends empty state", () => {
  renderPage(Leaderboard)
  expect(screen.getByRole("button", { name: "Global", exact: true })).toHaveAttribute("aria-pressed", "true")
  fireEvent.click(screen.getByRole("button", { name: "Friends", exact: true }))
  expect(context.getFriendsLeaderboard).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("button", { name: "Friends", exact: true })).toHaveAttribute("aria-pressed", "true")
  expect(screen.getByText("Your circle starts here")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Manage friends" })).toHaveAttribute("href", "/friends")
  fireEvent.click(screen.getByRole("button", { name: "Global", exact: true }))
  expect(context.getGlobalLeaderboard).toHaveBeenCalledTimes(2)
  expect(screen.getByRole("link", { name: "Bob" })).toBeInTheDocument()
})

test("rankings show loading, keep prior data explicitly stale on failure, and retry the selected scope", () => {
  context.resources.globalLeaderboard = { status: "loading" }
  const { rerender } = renderPage(Leaderboard)
  expect(screen.getByRole("status")).toHaveTextContent("Loading global rankings")
  expect(screen.getByRole("button", { name: "Refresh leaderboard" })).toBeDisabled()
  expect(screen.queryByRole("table")).not.toBeInTheDocument()
  context.resources.globalLeaderboard = { status: "error", message: "Rankings are temporarily unavailable." }
  rerender(<MemoryRouter><Leaderboard /></MemoryRouter>)
  expect(screen.getByRole("alert")).toHaveTextContent("Rankings are temporarily unavailable")
  expect(screen.getByText("Showing the last loaded rankings.")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Bob" })).toBeInTheDocument()
  expect(screen.queryByText("The leaderboard is waiting")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  expect(context.getGlobalLeaderboard).toHaveBeenCalledTimes(2)
})
