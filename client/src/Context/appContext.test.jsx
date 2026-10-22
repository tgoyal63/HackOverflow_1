import { StrictMode, useEffect } from "react"
import { act, cleanup, render } from "@testing-library/react"
import axios from "axios"
import { AppProvider, useAppContext } from "./appContext"

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ request: requestMock })),
    isCancel: (error) => error?.code === "ERR_CANCELED",
  },
}))

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

const ContextConsumer = ({ capture, loadProfile }) => {
  const context = useAppContext()
  const { getUser } = context
  capture(context)
  useEffect(() => {
    if (loadProfile) getUser()
  }, [getUser, loadProfile])
  return null
}

const mountProvider = (onProfile, strict = false) => {
  let context
  const capture = (value) => { context = value }
  const tree = <AppProvider><ContextConsumer capture={capture} loadProfile={onProfile} /></AppProvider>
  return { ...render(strict ? <StrictMode>{tree}</StrictMode> : tree), read: () => context }
}

const run = async (callback) => {
  let result
  await act(async () => { result = await callback() })
  return result
}

const profile = (username) => ({
  data: { data: {
    email: `${username}@example.test`, username, name: username,
    socials: { github: username, hackerrank: username, codechef: username },
    upvotes: 3, downvotes: 1,
  } },
})

test("own account snapshot survives another developer search and failed own refresh", async () => {
  const app = mountProvider()
  requestMock.mockResolvedValueOnce(profile("alice"))
  expect(await run(() => app.read().getUser())).toBe(true)
  const searched = profile("bob")
  searched.data.data.upvotes = 999
  requestMock.mockResolvedValueOnce(searched)
  expect(await run(() => app.read().searchUser("bob"))).toBe(true)
  requestMock.mockRejectedValueOnce({ response: { status: 503 } })
  expect(await run(() => app.read().getUser())).toBe(false)
  expect(app.read().name).toBe("bob")
  expect(app.read().accountProfile).toMatchObject({ name: "alice", username: "alice", upvotes: 3, downvotes: 1 })
  act(() => app.read().logoutUser())
  expect(app.read().accountProfile).toBeNull()
})

beforeEach(() => {
  vi.clearAllMocks()
  requestMock.mockReset()
  localStorage.clear()
  localStorage.setItem("token", "original-token")
  localStorage.setItem("loginUsername", "original-user")
})

afterEach(cleanup)

test("a provider reads current storage on mount and profile effects do not loop on state updates", async () => {
  requestMock.mockResolvedValue(profile("current-user"))
  localStorage.setItem("token", "current-token")
  const app = mountProvider(true)
  await act(async () => {})

  expect(app.read().token).toBe("current-token")
  expect(app.read().loginUsername).toBe("current-user")
  expect(requestMock).toHaveBeenCalledTimes(1)
  expect(axios.create).toHaveBeenCalledTimes(1)
  const callbacks = Object.fromEntries(Object.entries(app.read()).filter(([, value]) => typeof value === "function"))

  requestMock.mockResolvedValue({ data: { data: [] } })
  expect(await run(() => app.read().getGlobalLeaderboard())).toBe(true)
  for (const [name, callback] of Object.entries(callbacks)) {
    expect(app.read()[name]).toBe(callback)
  }
  expect(requestMock).toHaveBeenCalledTimes(2)
})

test("StrictMode cancels the first effect setup and the second setup still loads the profile", async () => {
  requestMock.mockResolvedValue(profile("strict-user"))
  const app = mountProvider(true, true)
  await act(async () => {})

  expect(requestMock).toHaveBeenCalledTimes(2)
  expect(requestMock.mock.calls[0][0].signal.aborted).toBe(true)
  expect(requestMock.mock.calls[1][0].signal.aborted).toBe(false)
  expect(app.read().name).toBe("strict-user")
  expect(localStorage.getItem("loginUsername")).toBe("strict-user")
})

test("network errors return failure without dropping authentication or unrelated profile state", async () => {
  const app = mountProvider()
  requestMock.mockResolvedValueOnce(profile("original-user"))
  expect(await run(() => app.read().getUser())).toBe(true)
  requestMock.mockRejectedValue(new Error("Network Error"))

  expect(await run(() => app.read().loginUser({ username: "bad", password: "invalid" }))).toBe(false)
  expect(app.read().token).toBe("original-token")
  expect(app.read().name).toBe("original-user")
  expect(await run(() => app.read().getUser())).toBe(false)
  expect(app.read().token).toBe("original-token")
})

test("an authenticated 401 logs out and removes only application-owned storage", async () => {
  localStorage.setItem("unrelated-setting", "retained")
  const app = mountProvider()
  requestMock.mockRejectedValue({ response: { status: 401 }, message: "Unauthorized" })

  expect(await run(() => app.read().getUser())).toBe(false)
  expect(app.read().token).toBeNull()
  expect(app.read().loginUsername).toBeNull()
  expect(localStorage.getItem("token")).toBeNull()
  expect(localStorage.getItem("loginUsername")).toBeNull()
  expect(localStorage.getItem("unrelated-setting")).toBe("retained")
})

test("a late profile response cannot restore user data or storage after logout", async () => {
  const pending = deferred()
  requestMock.mockReturnValue(pending.promise)
  const app = mountProvider()
  let result
  act(() => { result = app.read().getUser() })
  const signal = requestMock.mock.calls[0][0].signal
  act(() => app.read().logoutUser())
  expect(signal.aborted).toBe(true)

  pending.resolve(profile("old-user"))
  expect(await run(() => result)).toBe(false)
  expect(app.read().token).toBeNull()
  expect(app.read().name).toBeUndefined()
  expect(app.read().loginUsername).toBeNull()
  expect(localStorage.getItem("loginUsername")).toBeNull()
})

test("an old session's 401 cannot log out a newly authenticated session", async () => {
  const oldProfile = deferred()
  requestMock.mockReturnValueOnce(oldProfile.promise)
  const app = mountProvider()
  let oldRequest
  act(() => { oldRequest = app.read().getUser() })
  requestMock.mockResolvedValueOnce({ data: { data: { token: "new-token" } } })

  expect(await run(() => app.read().loginUser({ username: "new-user", password: "secret" }))).toBe(true)
  oldProfile.reject({ response: { status: 401 }, message: "Old token rejected" })
  expect(await run(() => oldRequest)).toBe(false)
  expect(app.read().token).toBe("new-token")
  expect(localStorage.getItem("token")).toBe("new-token")

  requestMock.mockResolvedValueOnce(profile("new-user"))
  await run(() => app.read().getUser())
  expect(requestMock.mock.lastCall[0].headers).toEqual({ Authorization: "Bearer new-token" })
})

test.each([["loginUser", "/login"], ["registerUser", "/signup"]])(
  "%s retains its public request contract and clears the previous account's data on success",
  async (method, url) => {
    const app = mountProvider()
    requestMock.mockResolvedValueOnce(profile("original-user"))
    await run(() => app.read().getUser())
    const input = { username: "next-user", password: "secret" }
    requestMock.mockResolvedValueOnce({ data: { data: { token: "next-token" } } })

    expect(await run(() => app.read()[method](input))).toBe(true)
    expect(requestMock.mock.lastCall[0]).toMatchObject({ method: "post", url, data: input })
    expect(requestMock.mock.lastCall[0].headers).toBeUndefined()
    expect(app.read().token).toBe("next-token")
    expect(app.read().name).toBeUndefined()
    expect(app.read().loginUsername).toBeNull()
    expect(localStorage.getItem("loginUsername")).toBeNull()
  },
)

test("a login response arriving after logout cannot sign the user back in", async () => {
  const pending = deferred()
  requestMock.mockReturnValueOnce(pending.promise)
  const app = mountProvider()
  let result
  act(() => { result = app.read().loginUser({ username: "user", password: "secret" }) })
  act(() => app.read().logoutUser())

  pending.resolve({ data: { data: { token: "late-token" } } })
  expect(await run(() => result)).toBe(false)
  expect(app.read().token).toBeNull()
  expect(localStorage.getItem("token")).toBeNull()
})

test("wrong current passwords retain the session and successful retries clear the error and rotate the token", async () => {
  const app = mountProvider()
  const details = { currentPassword: "incorrect", newPassword: "replacement" }
  requestMock.mockRejectedValueOnce({ response: { status: 401 }, message: "Invalid Password!" })

  expect(await run(() => app.read().changePassword(details))).toBe(false)
  expect(app.read().token).toBe("original-token")
  expect(app.read().isError).toBe(true)
  expect(requestMock.mock.lastCall[0]).toMatchObject({ method: "patch", url: "/password", data: details })

  requestMock.mockResolvedValueOnce({ data: { data: { token: "rotated-token" } } })
  expect(await run(() => app.read().changePassword({ ...details, currentPassword: "correct" }))).toBe(true)
  expect(app.read().token).toBe("rotated-token")
  expect(app.read().isError).toBe(false)
  expect(localStorage.getItem("token")).toBe("rotated-token")
})

test("only the latest searched profile is shown when responses arrive out of order", async () => {
  const oldProfile = deferred()
  const newProfile = deferred()
  requestMock.mockReturnValueOnce(oldProfile.promise).mockReturnValueOnce(newProfile.promise)
  const app = mountProvider()
  let oldRequest
  let newRequest
  act(() => {
    oldRequest = app.read().searchUser("old-user")
    newRequest = app.read().searchUser("new-user")
  })
  expect(app.read().resources.search).toMatchObject({ status: "loading", identity: "new-user" })
  expect(requestMock.mock.calls[0][0].signal.aborted).toBe(true)
  newProfile.resolve({ data: { data: { name: "new-user", status: "friends" } } })
  expect(await run(() => newRequest)).toBe(true)
  oldProfile.resolve({ data: { data: { name: "old-user", status: "pending" } } })
  expect(await run(() => oldRequest)).toBe(false)
  expect(app.read().name).toBe("new-user")
  expect(app.read().status).toBe("Remove Friend")
  expect(app.read().resources.search).toMatchObject({ status: "success", identity: "new-user" })
})

test("platform errors reset on retry and older requests cannot overwrite the latest handle", async () => {
  const app = mountProvider()
  requestMock.mockRejectedValueOnce(new Error("Network Error"))
  expect(await run(() => app.read().getGithub("first-user"))).toBe(false)
  expect(app.read().isGithubError).toBe(true)

  const older = deferred()
  const newer = deferred()
  requestMock.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
  let oldRequest
  let newRequest
  act(() => {
    oldRequest = app.read().getGithub("older-user")
    newRequest = app.read().getGithub("newer-user")
  })
  expect(app.read().isGithubError).toBe(false)
  newer.resolve({ data: { data: { githubUsername: "newer-user" } } })
  expect(await run(() => newRequest)).toBe(true)
  older.resolve({ data: { data: { githubUsername: "older-user" } } })
  expect(await run(() => oldRequest)).toBe(false)
  expect(app.read().githubUsername).toBe("newer-user")
})

test("starting a profile search clears and cancels the previous user's platform data", async () => {
  const app = mountProvider()
  requestMock.mockResolvedValueOnce({ data: { data: { githubUsername: "previous-user" } } })
  await run(() => app.read().getGithub("previous-user"))
  const previousPlatform = deferred()
  const nextProfile = deferred()
  requestMock.mockReturnValueOnce(previousPlatform.promise).mockReturnValueOnce(nextProfile.promise)
  let platformRequest
  let profileRequest
  act(() => {
    platformRequest = app.read().getGithub("previous-user")
    profileRequest = app.read().searchUser("next-user")
  })

  expect(requestMock.mock.calls[1][0].signal.aborted).toBe(true)
  expect(app.read().githubUsername).toBeUndefined()
  previousPlatform.resolve({ data: { data: { githubUsername: "previous-user" } } })
  expect(await run(() => platformRequest)).toBe(false)
  expect(app.read().githubUsername).toBeUndefined()
  nextProfile.resolve({ data: { data: { name: "next-user", status: "friends" } } })
  expect(await run(() => profileRequest)).toBe(true)
})

test("unmount aborts in-flight work and prevents late storage updates", async () => {
  const pending = deferred()
  requestMock.mockReturnValueOnce(pending.promise)
  const app = mountProvider()
  let result
  act(() => { result = app.read().getUser() })
  const signal = requestMock.mock.lastCall[0].signal
  app.unmount()
  expect(signal.aborted).toBe(true)
  pending.resolve(profile("late-user"))
  expect(await run(() => result)).toBe(false)
  expect(localStorage.getItem("loginUsername")).toBe("original-user")
})

test.each([
  ["editSocials", { socials: { github: "handle", hackerrank: "handle", codechef: "handle" } }, "patch", "/edit"],
  ["addFriend", "friend", "get", "/addfriend/friend"],
  ["getCancelReq", "friend", "delete", "/delete/friend"],
  ["acceptReq", "friend", "get", "/acceptfriend/friend"],
  ["getUpVote", "friend", "get", "/upvote/friend"],
  ["getDownVote", "friend", "get", "/downvote/friend"],
  ["removeVote", "friend", "delete", "/removevote/friend"],
])("%s preserves its request contract and reports a failed request as false", async (method, input, httpMethod, url) => {
  const app = mountProvider()
  requestMock.mockRejectedValueOnce(new Error("Network Error"))
  expect(await run(() => app.read()[method](input))).toBe(false)
  expect(requestMock.mock.lastCall[0]).toMatchObject({
    method: httpMethod, url, headers: { Authorization: "Bearer original-token" },
    ...(method === "editSocials" && { data: input }),
  })

  requestMock.mockResolvedValueOnce({ status: 204 })
  expect(await run(() => app.read()[method](input))).toBe(true)
})

test.each([
  ["profile", "getUser", undefined, profile("zero-user")],
  ["search", "searchUser", "zero-user", { data: { data: { name: "Zero", status: "add", upvotes: 0, downvotes: 0 } } }],
  ["github", "getGithub", "zero-user", { data: { data: { githubUsername: "zero-user", public_repos: 0 } } }],
  ["hackerrank", "getHackerrank", "zero-user", { data: { data: { hackerrankUsername: "zero-user", totalBadges: 0 } } }],
  ["codechef", "getCodechef", "zero-user", { data: { data: { codechefUsername: "zero-user", ratings: 0, rankings: { global: 0, country: 0 } } } }],
  ["friends", "getFriendsReq", undefined, { data: { data: { friends: [] } } }],
  ["pending", "getPendingReq", undefined, { data: { data: { friends: [] } } }],
  ["requests", "getRequestsReq", undefined, { data: { data: { friends: [] } } }],
  ["globalLeaderboard", "getGlobalLeaderboard", undefined, { data: { data: [] } }],
  ["friendsLeaderboard", "getFriendsLeaderboard", undefined, { data: { data: [] } }],
])("%s distinguishes idle, loading, success, and a failed retry without exposing server details", async (key, method, input, response) => {
  const app = mountProvider()
  expect(app.read().resources[key]).toEqual({ status: "idle", message: "", httpStatus: null })
  const pending = deferred()
  requestMock.mockReturnValueOnce(pending.promise)
  let result
  act(() => { result = app.read()[method](input) })
  expect(app.read().resources[key].status).toBe("loading")
  pending.resolve(response)
  expect(await run(() => result)).toBe(true)
  expect(app.read().resources[key]).toMatchObject({ status: "success", message: "", httpStatus: null })

  requestMock.mockRejectedValueOnce({ response: { status: 503, data: { message: "secret credential data" } }, message: "secret credential data" })
  expect(await run(() => app.read()[method](input))).toBe(false)
  expect(app.read().resources[key]).toMatchObject({ status: "error", httpStatus: 503 })
  expect(app.read().resources[key].message).toContain("temporarily unavailable")
  expect(JSON.stringify(app.read().resources)).not.toContain("secret credential data")
  expect(app.read().resources[key].message.length).toBeLessThan(180)
})

test("a cancelled profile cannot publish success or an error over a search resource", async () => {
  const app = mountProvider()
  const original = deferred()
  const search = deferred()
  requestMock.mockReturnValueOnce(original.promise).mockReturnValueOnce(search.promise)
  let profileRequest
  let searchRequest
  act(() => {
    profileRequest = app.read().getUser()
    searchRequest = app.read().searchUser("next-user")
  })
  expect(app.read().resources.profile.status).toBe("idle")
  expect(app.read().resources.search.status).toBe("loading")
  original.reject({ response: { status: 500 } })
  expect(await run(() => profileRequest)).toBe(false)
  expect(app.read().resources.profile.status).toBe("idle")
  expect(app.read().resources.search.status).toBe("loading")
  search.resolve({ data: { data: { name: "Next", status: "add" } } })
  expect(await run(() => searchRequest)).toBe(true)
  expect(app.read().resources.search.status).toBe("success")
  act(() => app.read().logoutUser())
  expect(Object.values(app.read().resources).every((resource) => resource.status === "idle")).toBe(true)
})

test("a stale platform failure cannot replace the latest resource identity or status", async () => {
  const app = mountProvider()
  const older = deferred()
  const newer = deferred()
  requestMock.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
  let oldRequest
  let newRequest
  act(() => {
    oldRequest = app.read().getGithub("old-user")
    newRequest = app.read().getGithub("")
  })
  expect(app.read().resources.github).toMatchObject({ status: "loading", identity: "" })
  older.reject({ response: { status: 404 } })
  expect(await run(() => oldRequest)).toBe(false)
  expect(app.read().resources.github).toMatchObject({ status: "loading", identity: "" })
  newer.resolve({ data: { data: { githubUsername: "own-user", public_repos: 0 } } })
  expect(await run(() => newRequest)).toBe(true)
  expect(app.read().resources.github).toMatchObject({ status: "success", identity: "" })
  expect(app.read().public_repos).toBe(0)
})
