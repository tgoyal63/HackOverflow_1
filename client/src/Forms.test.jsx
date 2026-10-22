import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { toast } from "react-toastify"
import { useAppContext } from "./Context/appContext"
import { Login } from "./Components/Login/Login"
import { Signup } from "./Components/Signup/Signup"
import Landing from "./Pages/Landing/Landing"
import Setting from "./Pages/Settings/Setting"
import ChangePassword from "./Pages/ChangePassword/ChangePassword"

vi.mock("./Context/appContext", () => ({ useAppContext: vi.fn() }))
vi.mock("react-toastify", () => ({ toast: vi.fn() }))
vi.mock("./Components/Navbar/NavbarComponent", () => ({ default: () => <nav aria-label='Application' /> }))
vi.mock("./Components/Footer/Footer", () => ({ Footer: () => <footer /> }))

let context
beforeEach(() => {
  vi.clearAllMocks()
  context = {
    token: "test-session", username: "alice", name: "Alice", email: "alice@example.test",
    github: "alice-gh", hackerrank: "alice-hr", codechef: "alice-cc", upvotes: 0, downvotes: 0,
    accountProfile: { username: "alice", name: "Alice", email: "alice@example.test", github: "alice-gh", hackerrank: "alice-hr", codechef: "alice-cc", upvotes: 0, downvotes: 0 },
    resources: { profile: { status: "success", message: "", httpStatus: null } },
    getUser: vi.fn().mockResolvedValue(true), editSocials: vi.fn().mockResolvedValue(true),
    changePassword: vi.fn().mockResolvedValue(true), loginUser: vi.fn().mockResolvedValue(true),
    registerUser: vi.fn().mockResolvedValue(true),
  }
  useAppContext.mockImplementation(() => context)
})

function mount(element, path = "/settings") {
  return render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>)
}

function deferred() {
  let resolve
  const promise = new Promise((complete) => { resolve = complete })
  return { promise, resolve }
}

function fillSignup() {
  for (const [label, value] of [["Name", "Alice"], ["Username", "alice"], ["Email", "alice@example.test"], ["Password", "test-password"], ["GitHub username", "alice-gh"], ["HackerRank username", "alice-hr"], ["CodeChef username", "alice-cc"]]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } })
  }
}

function fillPasswords(confirmation = "new-test-password") {
  for (const [label, value] of [["Current Password", "old-test-password"], ["New Password", "new-test-password"], ["Confirm Password", confirmation]]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } })
  }
}

test("signup requires a valid email before sending the existing signup payload", () => {
  context.token = null
  mount(<Signup passRegisterChildData={vi.fn()} />, "/register")
  fillSignup()
  const email = screen.getByLabelText("Email", { exact: true })
  expect(email).toBeRequired()
  fireEvent.change(email, { target: { value: "" } })
  fireEvent.click(screen.getByRole("button", { name: "Create account" }))
  expect(context.registerUser).not.toHaveBeenCalled()
  fireEvent.change(email, { target: { value: "not-an-email" } })
  expect(email).toBeInvalid()
  fireEvent.click(screen.getByRole("button", { name: "Create account" }))
  expect(context.registerUser).not.toHaveBeenCalled()
})

test("signup preserves fields after rejection and prevents duplicate pending submissions", async () => {
  context.token = null
  const request = deferred()
  const onSuccess = vi.fn()
  context.registerUser.mockReturnValue(request.promise)
  mount(<Signup passRegisterChildData={onSuccess} />, "/register")
  fillSignup()
  const form = screen.getByRole("form", { name: "Create account" })
  fireEvent.click(within(form).getByRole("button", { name: "Create account" }))
  expect(within(form).getByRole("button", { name: "Creating your account…" })).toBeDisabled()
  fireEvent.submit(form)
  expect(context.registerUser).toHaveBeenCalledTimes(1)
  expect(context.registerUser).toHaveBeenCalledWith({ name: "Alice", username: "alice", email: "alice@example.test", password: "test-password", socials: { github: "alice-gh", hackerrank: "alice-hr", codechef: "alice-cc" } })
  await act(async () => request.resolve(false))
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to create your account")
  expect(screen.getByLabelText("Email", { exact: true })).toHaveValue("alice@example.test")
  expect(screen.getByLabelText("GitHub username")).toHaveValue("alice-gh")
  expect(onSuccess).not.toHaveBeenCalled()
  expect(within(form).getByRole("button", { name: "Create account" })).toBeEnabled()
})

test("login keeps a visible error and lets the user inspect the password without losing it", async () => {
  context.token = null
  context.loginUser.mockResolvedValue(false)
  const onSuccess = vi.fn()
  mount(<Login passLoginChildData={onSuccess} />, "/register?mode=login")
  fireEvent.change(screen.getByLabelText("Username", { exact: true }), { target: { value: "alice" } })
  const password = screen.getByLabelText("Password", { exact: true })
  fireEvent.change(password, { target: { value: "test-password" } })
  expect(password).toHaveAttribute("type", "password")
  fireEvent.click(screen.getByRole("button", { name: "Show password" }))
  expect(password).toHaveAttribute("type", "text")
  expect(password).toHaveValue("test-password")
  expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true")
  await act(async () => fireEvent.submit(screen.getByRole("form", { name: "Sign in" })))
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to sign in")
  expect(password).toHaveValue("test-password")
  expect(onSuccess).not.toHaveBeenCalled()
})

test("the public sign-in URL selects login and switching modes preserves the register route", () => {
  context.token = null
  mount(<Landing />, "/register?mode=login")
  expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument()
  expect(screen.getByRole("form", { name: "Sign in" })).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Sign up", exact: true }))
  expect(screen.getByRole("form", { name: "Create account" })).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument()
})

test("account settings distinguish a real zero and prefill all connected usernames", () => {
  mount(<Setting />)
  expect(within(screen.getByLabelText("Community votes")).getAllByText("0")).toHaveLength(2)
  fireEvent.click(screen.getByRole("button", { name: "Edit profiles" }))
  expect(screen.getByLabelText("GitHub username")).toHaveValue("alice-gh")
  expect(screen.getByLabelText("HackerRank username")).toHaveValue("alice-hr")
  expect(screen.getByLabelText("CodeChef username")).toHaveValue("alice-cc")
  expect(screen.getByRole("link", { name: "Change password" })).toHaveAttribute("href", "/changepassword")
})

test("settings preserve edits on failure and do not repeat or prematurely refresh a save", async () => {
  const request = deferred()
  context.editSocials.mockReturnValue(request.promise)
  mount(<Setting />)
  fireEvent.click(screen.getByRole("button", { name: "Edit profiles" }))
  fireEvent.change(screen.getByLabelText("GitHub username"), { target: { value: "alice-updated" } })
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
  expect(screen.getByRole("button", { name: "Saving changes…" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
  fireEvent.submit(screen.getByRole("form", { name: "Coding profiles" }))
  expect(context.editSocials).toHaveBeenCalledTimes(1)
  expect(context.getUser).toHaveBeenCalledTimes(1)
  await act(async () => request.resolve(false))
  expect(screen.getByRole("alert")).toHaveTextContent("Your changes are still here")
  expect(screen.getByLabelText("GitHub username")).toHaveValue("alice-updated")
  expect(context.getUser).toHaveBeenCalledTimes(1)
  expect(toast).not.toHaveBeenCalledWith("Coding profiles saved.")
})

test("a successful settings write with a failed refresh reports the saved result honestly", async () => {
  context.getUser.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
  mount(<Setting />)
  fireEvent.click(screen.getByRole("button", { name: "Edit profiles" }))
  fireEvent.change(screen.getByLabelText("GitHub username"), { target: { value: "alice-updated" } })
  await act(async () => fireEvent.submit(screen.getByRole("form", { name: "Coding profiles" })))
  expect(context.editSocials).toHaveBeenCalledWith({ socials: { github: "alice-updated", hackerrank: "alice-hr", codechef: "alice-cc" } })
  expect(screen.getByRole("status")).toHaveTextContent("Your changes were saved")
  expect(screen.getByRole("button", { name: "Edit profiles" })).toBeInTheDocument()
  expect(toast).toHaveBeenCalledWith("Coding profiles saved.")
})

test("settings show resource loading without inventing account details", () => {
  context.username = undefined
  context.accountProfile = null
  context.resources.profile.status = "loading"
  mount(<Setting />)
  expect(screen.getByText("Loading your account…")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Edit profiles" })).not.toBeInTheDocument()
})

test("settings use the owned account snapshot when shared profile fields belong to a searched user", () => {
  context.name = "Bob"
  context.upvotes = 99
  context.downvotes = 88
  context.resources.profile = { status: "error", message: "The network is unavailable.", httpStatus: null }
  mount(<Setting />)
  expect(screen.getByRole("heading", { name: "Alice", exact: true })).toBeInTheDocument()
  expect(screen.queryByRole("heading", { name: "Bob", exact: true })).not.toBeInTheDocument()
  expect(within(screen.getByLabelText("Community votes")).getAllByText("0")).toHaveLength(2)
  expect(screen.getByRole("alert")).toHaveTextContent("Your account could not refresh")
  fireEvent.click(screen.getByRole("button", { name: "Edit profiles" }))
  expect(screen.getByLabelText("GitHub username")).toHaveValue("alice-gh")
})

test("a failed first account request never presents shared search data as owned identity", () => {
  context.accountProfile = null
  context.name = "Bob"
  context.resources.profile = { status: "error", message: "The network is unavailable.", httpStatus: null }
  mount(<Setting />)
  expect(screen.getByRole("alert")).toHaveTextContent("The network is unavailable")
  expect(screen.queryByRole("heading", { name: "Alice", exact: true })).not.toBeInTheDocument()
  expect(screen.queryByRole("heading", { name: "Bob", exact: true })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Edit profiles" })).not.toBeInTheDocument()
})

test("editing and cancelling return keyboard focus to the relevant control", () => {
  mount(<Setting />)
  fireEvent.click(screen.getByRole("button", { name: "Edit profiles" }))
  expect(screen.getByLabelText("GitHub username")).toHaveFocus()
  fireEvent.change(screen.getByLabelText("GitHub username"), { target: { value: "discarded-change" } })
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
  expect(screen.getByRole("button", { name: "Edit profiles" })).toHaveFocus()
  fireEvent.click(screen.getByRole("button", { name: "Edit profiles" }))
  expect(screen.getByLabelText("GitHub username")).toHaveValue("alice-gh")
})

test("password confirmation errors stay visible and never send a mutation", () => {
  mount(<ChangePassword />, "/changepassword")
  fillPasswords("different-password")
  fireEvent.click(screen.getByRole("button", { name: "Update password" }))
  expect(screen.getByRole("alert")).toHaveTextContent("Your new passwords don’t match")
  expect(context.changePassword).not.toHaveBeenCalled()
  expect(screen.getByLabelText("New Password", { exact: true })).toHaveValue("new-test-password")
})

test.each([true, false])("password request result %s disables duplicate submission and shows the completed outcome", async (succeeded) => {
  const request = deferred()
  context.changePassword.mockReturnValue(request.promise)
  mount(<ChangePassword />, "/changepassword")
  fillPasswords()
  fireEvent.click(screen.getByRole("button", { name: "Show new password" }))
  fireEvent.click(screen.getByRole("button", { name: "Update password" }))
  expect(screen.getByRole("button", { name: "Updating password…" })).toBeDisabled()
  expect(screen.getByLabelText("New Password", { exact: true })).toBeDisabled()
  fireEvent.submit(screen.getByRole("form", { name: "Change password" }))
  expect(context.changePassword).toHaveBeenCalledTimes(1)
  expect(context.changePassword).toHaveBeenCalledWith({ currentPassword: "old-test-password", newPassword: "new-test-password" })
  await act(async () => request.resolve(succeeded))
  if (succeeded) {
    expect(screen.getByRole("status")).toHaveTextContent("Your password has been updated")
    expect(screen.getByLabelText("Current Password", { exact: true })).toHaveValue("")
    expect(screen.getByLabelText("New Password", { exact: true })).toHaveAttribute("type", "password")
    expect(toast).toHaveBeenCalledWith("Password updated.")
  } else {
    expect(screen.getByRole("alert")).toHaveTextContent("Check your current password")
    expect(screen.getByLabelText("Current Password", { exact: true })).toHaveValue("old-test-password")
    expect(toast).not.toHaveBeenCalledWith("Password updated.")
  }
})
