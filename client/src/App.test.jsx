import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { toast } from "react-toastify"
import { useAppContext } from "./Context/appContext"
import App from "./App"
import { Login } from "./Components/Login/Login"
import { Signup } from "./Components/Signup/Signup"

vi.mock("./Context/appContext", () => ({ useAppContext: vi.fn() }))
vi.mock("react-toastify", () => ({ ToastContainer: () => null, toast: vi.fn() }))

let context
const methods = [
  "loginUser", "registerUser", "logoutUser", "getUser", "getGithub",
  "getHackerrank", "getCodechef", "getGlobalLeaderboard", "getFriendsLeaderboard",
  "searchUser", "addFriend", "acceptReq", "getCancelReq", "getUpVote",
  "getDownVote", "removeVote", "getPendingReq", "getFriendsReq", "getRequestsReq",
  "editSocials", "changePassword",
]

beforeEach(() => {
  vi.clearAllMocks()
  context = {
    token: "test-session", loginUsername: "alice", username: "alice", name: "Alice",
    email: "alice@example.test", github: "alice-gh", hackerrank: "alice-hr",
    codechef: "alice-cc", socials: null, status: "Add Friend", voteStatus: null,
    pending: [], requests: [], friends: ["bob"], globaldata: [], friendsdata: [],
    badgeData: [], upvotes: 2, downvotes: 1,
  }
  for (const method of methods) context[method] = vi.fn().mockResolvedValue(true)
  useAppContext.mockImplementation(() => context)
  window.history.replaceState({}, "", "/")
})

function renderRoute(path) {
  window.history.replaceState({}, "", path)
  return render(<App />)
}

function getSubmit(label) {
  const forms = { SIGNUP: ["Create account", "Create account"], SIGNIN: ["Sign in", "Sign in"], Submit: ["Change password", "Update password"] }
  const [form, button] = forms[label]
  return within(screen.getByRole("form", { name: form })).getByRole("button", { name: button })
}

function deferred() {
  let resolve
  const promise = new Promise((complete) => { resolve = complete })
  return { promise, resolve }
}

test("public home links to registration, whose login toggle is keyboard-accessible", () => {
  context.token = null
  renderRoute("/")
  const register = screen.getByRole("link", { name: "Create your account" })
  expect(register).toHaveAttribute("href", "/register")
  fireEvent.click(register)
  expect(getSubmit("SIGNUP")).toBeInTheDocument()
  fireEvent.click(within(screen.getByRole("group", { name: "Account access" })).getByRole("button", { name: "Sign in" }))
  expect(getSubmit("SIGNIN")).toBeInTheDocument()
  expect(context.getUser).not.toHaveBeenCalled()
})

test("dashboard fetches each provider once and unmounts cleanly", () => {
  const { rerender, unmount } = renderRoute("/dashboard")
  for (const method of ["getUser", "getGithub", "getHackerrank", "getCodechef"]) {
    expect(context[method]).toHaveBeenCalledTimes(1)
  }
  rerender(<App />)
  expect(context.getUser).toHaveBeenCalledTimes(1)
  expect(context.getGithub).toHaveBeenCalledWith("")
  expect(screen.getByRole("heading", { name: "GitHub", level: 2 })).toBeInTheDocument()
  expect(screen.queryByAltText("GitHub activity graph")).not.toBeInTheDocument()
  expect(() => unmount()).not.toThrow()
})

test("protected navigation redirects signed-out visitors to the home page", async () => {
  context.token = null
  renderRoute("/friends")
  await waitFor(() => expect(window.location.pathname).toBe("/"))
  expect(screen.getByRole("link", { name: "Create your account" })).toBeInTheDocument()
})

test("search ignores blank usernames and safely encodes a nonblank route value", async () => {
  renderRoute("/dashboard")
  fireEvent.change(screen.getByRole("searchbox", { name: "Search username" }), { target: { value: "   " } })
  fireEvent.click(screen.getByRole("button", { name: "Search" }))
  expect(window.location.pathname).toBe("/dashboard")
  fireEvent.change(screen.getByRole("searchbox", { name: "Search username" }), { target: { value: " bob/name " } })
  fireEvent.click(screen.getByRole("button", { name: "Search" }))
  await waitFor(() => expect(context.searchUser).toHaveBeenCalledWith("bob/name"))
  expect(window.location.pathname).toBe("/search/bob%2Fname")
})

test("search tolerates absent stored username and waits for provider usernames", () => {
  context.loginUsername = null
  renderRoute("/search/bob")
  expect(context.searchUser).toHaveBeenCalledWith("bob")
  expect(context.getGithub).not.toHaveBeenCalled()
  expect(context.getHackerrank).not.toHaveBeenCalled()
  expect(context.getCodechef).not.toHaveBeenCalled()
})

test("profile mutations stay disabled until the searched user has loaded", () => {
  context.status = null
  renderRoute("/search/bob")
  expect(screen.getByRole("button", { name: "Upvote" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Downvote" })).toBeDisabled()
  const friendRequest = screen.getByRole("button", { name: "Friend request" })
  expect(friendRequest).toBeDisabled()
  fireEvent.click(friendRequest)
  expect(context.getCancelReq).not.toHaveBeenCalled()
})

test("failed friend mutation does not announce success or refresh the search", async () => {
  context.addFriend.mockResolvedValue(false)
  renderRoute("/search/bob")
  fireEvent.click(screen.getByRole("button", { name: "Add Friend" }))
  await waitFor(() => expect(context.addFriend).toHaveBeenCalledWith("bob"))
  expect(context.searchUser).toHaveBeenCalledTimes(1)
  expect(toast).not.toHaveBeenCalled()
})

test("successful vote refreshes only after the mutation completes", async () => {
  const vote = deferred()
  context.getUpVote.mockReturnValue(vote.promise)
  renderRoute("/search/bob")
  fireEvent.click(screen.getByRole("button", { name: "Upvote" }))
  expect(context.searchUser).toHaveBeenCalledTimes(1)
  await act(async () => vote.resolve(true))
  expect(context.searchUser).toHaveBeenCalledTimes(2)
})

test("a pending vote cannot reload the previous profile after navigating to another user", async () => {
  const vote = deferred()
  context.getUpVote.mockReturnValue(vote.promise)
  renderRoute("/search/bob")
  fireEvent.click(screen.getByRole("button", { name: "Upvote" }))
  fireEvent.change(screen.getByRole("searchbox", { name: "Search username" }), { target: { value: "carol" } })
  fireEvent.click(screen.getByRole("button", { name: "Search" }))
  await waitFor(() => expect(context.searchUser).toHaveBeenLastCalledWith("carol"))
  const callsAfterNavigation = context.searchUser.mock.calls.length
  await act(async () => vote.resolve(true))
  expect(context.searchUser).toHaveBeenCalledTimes(callsAfterNavigation)
  expect(context.searchUser).toHaveBeenLastCalledWith("carol")
})

test("friends refresh after deletion succeeds, never before", async () => {
  const deletion = deferred()
  context.getCancelReq.mockReturnValue(deletion.promise)
  renderRoute("/friends")
  expect(context.getFriendsReq).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: "Remove bob" }))
  expect(context.getCancelReq).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Confirm remove bob" }))
  expect(context.getFriendsReq).toHaveBeenCalledTimes(1)
  await act(async () => deletion.resolve(true))
  for (const method of ["getPendingReq", "getFriendsReq", "getRequestsReq"]) {
    expect(context[method]).toHaveBeenCalledTimes(2)
  }
})

test("settings prefill current socials and refresh only after a successful save", async () => {
  const save = deferred()
  context.editSocials.mockReturnValue(save.promise)
  renderRoute("/settings")
  fireEvent.click(screen.getByRole("button", { name: "Edit profiles" }))
  expect(screen.getByRole("textbox", { name: "GitHub username" })).toHaveValue("alice-gh")
  expect(screen.getByRole("textbox", { name: "HackerRank username" })).toHaveValue("alice-hr")
  fireEvent.change(screen.getByRole("textbox", { name: "GitHub username" }), { target: { value: "alice-updated" } })
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
  expect(context.editSocials).toHaveBeenCalledWith({ socials: { github: "alice-updated", hackerrank: "alice-hr", codechef: "alice-cc" } })
  expect(context.getUser).toHaveBeenCalledTimes(1)
  expect(toast).not.toHaveBeenCalled()
  await act(async () => save.resolve(true))
  expect(context.getUser).toHaveBeenCalledTimes(2)
  expect(screen.getByRole("button", { name: "Edit profiles" })).toBeInTheDocument()
  expect(toast).toHaveBeenCalledWith("Coding profiles saved.")
})

test("failed settings save preserves the edit form without a success toast", async () => {
  context.editSocials.mockResolvedValue(false)
  renderRoute("/settings")
  fireEvent.click(screen.getByRole("button", { name: "Edit profiles" }))
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
  await waitFor(() => expect(toast).toHaveBeenCalledWith("We couldn’t save your coding profiles."))
  expect(screen.getByRole("textbox", { name: "GitHub username" })).toHaveValue("alice-gh")
  expect(context.getUser).toHaveBeenCalledTimes(1)
})

test.each([
  ["login", Login, "SIGNIN", "loginUser", "passLoginChildData"],
  ["registration", Signup, "SIGNUP", "registerUser", "passRegisterChildData"],
])("%s notifies its parent only after confirmed success", async (_name, Component, label, method, callbackName) => {
  context.token = null
  context[method].mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  const success = vi.fn()
  render(<MemoryRouter><Component {...{ [callbackName]: success }} /></MemoryRouter>)
  fireEvent.change(screen.getByRole("textbox", { name: "Username", exact: true }), { target: { value: "alice" } })
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "test-password" } })
  if (method === "registerUser") {
    for (const [name, value] of [["Name", "Alice"], ["Email", "alice@example.test"], ["GitHub username", "alice-gh"], ["HackerRank username", "alice-hr"], ["CodeChef username", "alice-cc"]]) {
      fireEvent.change(screen.getByRole("textbox", { name, exact: true }), { target: { value } })
    }
  }
  const form = getSubmit(label).closest("form")
  await act(async () => fireEvent.submit(form))
  expect(success).not.toHaveBeenCalled()
  await act(async () => fireEvent.submit(form))
  expect(success).toHaveBeenCalledWith(true)
})

test.each([
  ["login", "loginUser", "SIGNIN", "Unable to sign in. Check your username and password, then try again."],
  ["signup", "registerUser", "SIGNUP", "Unable to create your account. Check your details and try again."],
])("rejected %s keeps the form and entered values, with an accessible persistent error", async (kind, method, label, message) => {
  context.token = null
  const request = deferred()
  context[method].mockReturnValue(request.promise)
  renderRoute("/register")
  if (kind === "login") {
    fireEvent.click(within(screen.getByRole("group", { name: "Account access" })).getByRole("button", { name: "Sign in" }))
  } else {
    for (const [name, value] of [["Name", "Alice"], ["Email", "alice@example.test"], ["GitHub username", "alice-gh"], ["HackerRank username", "alice-hr"], ["CodeChef username", "alice-cc"]]) {
      fireEvent.change(screen.getByRole("textbox", { name, exact: true }), { target: { value } })
    }
  }
  fireEvent.change(screen.getByRole("textbox", { name: "Username", exact: true }), { target: { value: "alice" } })
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "test-password" } })
  const submit = getSubmit(label)
  fireEvent.click(submit)
  expect(submit).toBeDisabled()
  fireEvent.submit(submit.closest("form"))
  expect(context[method]).toHaveBeenCalledTimes(1)
  await act(async () => request.resolve(false))
  expect(screen.getByRole("alert")).toHaveTextContent(message)
  expect(submit).toBeEnabled()
  expect(window.location.pathname).toBe("/register")
  expect(screen.getByRole("textbox", { name: "Username", exact: true })).toHaveValue("alice")
  expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("test-password")
  fireEvent.change(screen.getByRole("textbox", { name: "Username", exact: true }), { target: { value: "alice-retry" } })
  expect(screen.getByRole("alert")).toHaveTextContent(message)
  expect(toast).not.toHaveBeenCalled()
})

test("password results use the completed request rather than stale context error state", async () => {
  context.isError = true
  renderRoute("/changepassword")
  for (const label of ["Current Password", "New Password", "Confirm Password"]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value: "test-password" } })
  }
  fireEvent.click(getSubmit("Submit"))
  await waitFor(() => expect(toast).toHaveBeenCalledWith("Password updated."))
  expect(context.changePassword).toHaveBeenCalledWith({ currentPassword: "test-password", newPassword: "test-password" })
  expect(screen.getByLabelText("Current Password")).toHaveValue("")
})

test("failed password change keeps input and reports failure without claiming success", async () => {
  context.changePassword.mockResolvedValue(false)
  renderRoute("/changepassword")
  for (const label of ["Current Password", "New Password", "Confirm Password"]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value: "test-password" } })
  }
  fireEvent.click(getSubmit("Submit"))
  await waitFor(() => expect(toast).toHaveBeenCalledWith("We couldn’t update your password."))
  expect(toast).not.toHaveBeenCalledWith("Password updated.")
  expect(screen.getByLabelText("Current Password")).toHaveValue("test-password")
})

test("mismatched password confirmation does not call the API", () => {
  renderRoute("/changepassword")
  fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "new-password" } })
  fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "different-password" } })
  fireEvent.submit(getSubmit("Submit").closest("form"))
  expect(context.changePassword).not.toHaveBeenCalled()
  expect(toast).not.toHaveBeenCalledWith("Password updated.")
})

test("leaderboard renders valid linked rows and ranks for both views", () => {
  context.globaldata = [{ username: "bob", name: "Bob", rating: 1500 }]
  context.friendsdata = [{ username: "carol", name: "Carol", rating: 1800 }]
  renderRoute("/leaderboard")
  const table = screen.getByRole("table")
  expect(within(table).getByRole("link", { name: "Bob" }).closest("td").parentElement.tagName).toBe("TR")
  expect(within(table).getByRole("link", { name: "Bob" })).toHaveAttribute("href", "/search/bob")
  fireEvent.click(screen.getByRole("button", { name: "Friends" }))
  expect(context.getFriendsLeaderboard).toHaveBeenCalledTimes(1)
  expect(within(table).getByRole("link", { name: "Carol" })).toHaveAttribute("href", "/search/carol")
  expect(within(table).getByRole("cell", { name: "1" })).toBeInTheDocument()
})
