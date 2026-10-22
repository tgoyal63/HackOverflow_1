import React, { useCallback, useContext, useLayoutEffect, useMemo, useReducer, useRef } from "react"
import * as actions from "./action"
import axios from "axios"
import reducer from "./reducer"
import { initialState, readInitialState } from "./initialState"

const baseURL = import.meta.env.VITE_API_BASE_URL || "https://hackoverflow-backend.vercel.app"
const AppContext = React.createContext()

class CancelledRequest extends Error {}
class SessionRequired extends Error {}

const readableError = (error) => {
  const responseStatus = error instanceof SessionRequired ? 401 : error?.response?.status
  const httpStatus = Number.isInteger(responseStatus) && responseStatus >= 100 && responseStatus <= 599 ? responseStatus : null
  let message = "Unable to load this data. Please try again."
  if (httpStatus === null) message = "Connection unavailable. Check your connection and try again."
  else if (httpStatus === 401) message = "Sign in to continue."
  else if (httpStatus === 403) message = "Access to this data is restricted."
  else if (httpStatus === 404) message = "This profile or resource was not found. Check the username and try again."
  else if (httpStatus === 429) message = "The provider's request limit was reached. Please try again shortly."
  else if (httpStatus >= 500) message = "The service is temporarily unavailable. Please try again shortly."
  return { message, httpStatus }
}

const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, undefined, readInitialState)
  const authFetch = useMemo(() => axios.create({ baseURL }), [])
  const tokenRef = useRef(state.token)
  const sessionRef = useRef(0)
  const mountedRef = useRef(true)
  const inFlightRef = useRef(new Set())
  const latestRequestsRef = useRef(new Map())

  const invalidateRequests = useCallback(() => {
    sessionRef.current += 1
    inFlightRef.current.forEach((controller) => { controller.abort() })
    inFlightRef.current.clear()
    latestRequestsRef.current.clear()
  }, [])

  // Restore the mount guard before consumer fetch effects during StrictMode replay.
  useLayoutEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      invalidateRequests()
    }
  }, [invalidateRequests])

  const logoutUser = useCallback(() => {
    invalidateRequests()
    tokenRef.current = null
    localStorage.removeItem("token")
    localStorage.removeItem("loginUsername")
    dispatch({ type: actions.LOGOUT_USER })
  }, [invalidateRequests])

  const saveToken = useCallback((token) => {
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("The server did not return an authentication token")
    }
    localStorage.setItem("token", token)
    invalidateRequests()
    tokenRef.current = token
  }, [invalidateRequests])

  // Read the current token at request time. Stable callbacks can then be used in
  // consumer effects without reinstalling interceptors or refetching on render.
  const request = useCallback(async (method, url, {
    data,
    authenticated = true,
    logoutOnUnauthorized = true,
    key,
    resource = key === "authentication" ? undefined : key,
  } = {}) => {
    const session = sessionRef.current
    if (!mountedRef.current) throw new CancelledRequest()
    if (authenticated && !tokenRef.current) throw new SessionRequired()

    const controller = new AbortController()
    if (key) {
      const previous = latestRequestsRef.current.get(key)
      previous?.controller.abort()
      if (previous?.resource && previous.resource !== resource) {
        dispatch({ type: actions.RESET_RESOURCE, payload: { key: previous.resource } })
      }
      latestRequestsRef.current.set(key, { controller, resource })
    }
    inFlightRef.current.add(controller)
    const isCurrent = () => mountedRef.current && sessionRef.current === session &&
      !controller.signal.aborted && (!key || latestRequestsRef.current.get(key)?.controller === controller)

    try {
      const response = await authFetch.request({
        method,
        url,
        data,
        signal: controller.signal,
        ...(authenticated && {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
        }),
      })
      if (!isCurrent()) throw new CancelledRequest()
      return response
    } catch (error) {
      if (!isCurrent()) throw new CancelledRequest()
      if (authenticated && logoutOnUnauthorized && error.response?.status === 401) {
        logoutUser()
        throw new CancelledRequest()
      }
      throw error
    } finally {
      inFlightRef.current.delete(controller)
      if (key && latestRequestsRef.current.get(key)?.controller === controller) {
        latestRequestsRef.current.delete(key)
      }
    }
  }, [authFetch, logoutUser])

  const dispatchError = useCallback((type, error) => {
    if (!(error instanceof CancelledRequest) && !axios.isCancel(error)) {
      dispatch({ type, payload: readableError(error) })
    }
  }, [])

  const registerUser = useCallback(async (currentUser) => {
    dispatch({ type: actions.REGISTER_USER_BEGIN })
    try {
      const { data } = await request("post", "/signup", {
        data: currentUser, authenticated: false, key: "authentication",
      })
      saveToken(data.data.token)
      localStorage.removeItem("loginUsername")
      dispatch({ type: actions.REGISTER_USER_SUCCESS, payload: { token: data.data.token } })
      return true
    } catch (error) {
      dispatchError(actions.REGISTER_USER_ERROR, error)
      return false
    }
  }, [request, saveToken, dispatchError])

  const loginUser = useCallback(async (currentUser) => {
    dispatch({ type: actions.LOGIN_USER_BEGIN })
    try {
      const { data } = await request("post", "/login", {
        data: currentUser, authenticated: false, key: "authentication",
      })
      saveToken(data.data.token)
      localStorage.removeItem("loginUsername")
      dispatch({ type: actions.LOGIN_USER_SUCCESS, payload: { token: data.data.token } })
      return true
    } catch (error) {
      dispatchError(actions.LOGIN_USER_ERROR, error)
      return false
    }
  }, [request, saveToken, dispatchError])

  const getUser = useCallback(async () => {
    dispatch({ type: actions.GET_USER_BEGIN })
    try {
      const { data } = await request("get", "/profile", { key: "profile" })
      const { email, username, name, socials, upvotes, downvotes } = data.data
      const { github, hackerrank, codechef } = socials
      localStorage.setItem("loginUsername", username)
      dispatch({
        type: actions.GET_USER_SUCCESS,
        payload: { email, username, name, github, hackerrank, codechef,
          upvotes, downvotes, loginUsername: username },
      })
      return true
    } catch (error) {
      dispatchError(actions.GET_USER_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  const editSocials = useCallback(async (socials) => {
    dispatch({ type: actions.EDIT_SOCIALS_BEGIN })
    try {
      await request("patch", "/edit", { data: socials })
      dispatch({ type: actions.EDIT_SOCIALS_SUCCESS })
      return true
    } catch (error) {
      dispatchError(actions.EDIT_SOCIALS_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  const changePassword = useCallback(async (pwdetails) => {
    dispatch({ type: actions.CHANGE_PW_BEGIN })
    try {
      // This endpoint also uses 401 for an incorrect current password. Keep the
      // session so the user can correct it, as the previous password flow did.
      const { data } = await request("patch", "/password", {
        data: pwdetails, logoutOnUnauthorized: false,
      })
      saveToken(data.data.token)
      dispatch({ type: actions.CHANGE_PW_SUCCESS, payload: { token: data.data.token } })
      return true
    } catch (error) {
      dispatchError(actions.CHANGE_PW_ERROR, error)
      return false
    }
  }, [request, saveToken, dispatchError])

  const checkUsername = useCallback(() => {}, [])

  const getGithub = useCallback(async (username) => {
    if (typeof username !== "string") return false
    dispatch({ type: actions.GET_GITHUBDATA_BEGIN, payload: { identity: username } })
    try {
      const { data } = await request("get", username ? `/github/${encodeURIComponent(username)}` : "/github", { key: "github" })
      dispatch({ type: actions.GET_GITHUBDATA_SUCCESS, payload: data.data })
      return true
    } catch (error) {
      dispatchError(actions.GET_GITHUBDATA_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  const getHackerrank = useCallback(async (username) => {
    if (typeof username !== "string") return false
    dispatch({ type: actions.GET_HACKERRANKDATA_BEGIN, payload: { identity: username } })
    try {
      const { data } = await request("get", username ? `/hackerrank/${encodeURIComponent(username)}` : "/hackerrank", { key: "hackerrank" })
      dispatch({ type: actions.GET_HACKERRANKDATA_SUCCESS, payload: data.data })
      return true
    } catch (error) {
      dispatchError(actions.GET_HACKERRANKDATA_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  const getCodechef = useCallback(async (username) => {
    if (typeof username !== "string") return false
    dispatch({ type: actions.GET_CODECHEFDATA_BEGIN, payload: { identity: username } })
    try {
      const { data } = await request("get", username ? `/codechef/${encodeURIComponent(username)}` : "/codechef", { key: "codechef" })
      const { rankings, ...profile } = data.data
      dispatch({ type: actions.GET_CODECHEFDATA_SUCCESS, payload: { ...profile, ...rankings } })
      return true
    } catch (error) {
      dispatchError(actions.GET_CODECHEFDATA_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  const searchUser = useCallback(async (username) => {
    for (const key of ["github", "hackerrank", "codechef"]) {
      latestRequestsRef.current.get(key)?.controller.abort()
      latestRequestsRef.current.delete(key)
    }
    dispatch({ type: actions.SEARCH_USER_BEGIN, payload: { identity: username } })
    try {
      const { data } = await request("post", "/search", { data: { username }, key: "profile", resource: "search" })
      const statuses = { friends: "Remove Friend", requested: "Cancel Request", pending: "Accept Request" }
      dispatch({ type: actions.SEARCH_USER_SUCCESS, payload: {
        ...data.data, status: statuses[data.data.status] || "Add Friend",
      } })
      return true
    } catch (error) {
      dispatchError(actions.SEARCH_USER_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  const addFriend = useCallback(async (username) => {
    dispatch({ type: actions.ADD_FRIEND_BEGIN })
    try {
      await request("get", `/addfriend/${encodeURIComponent(username)}`)
      dispatch({ type: actions.ADD_FRIEND_SUCCESS })
      return true
    } catch (error) {
      dispatchError(actions.ADD_FRIEND_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  const getPendingReq = useCallback(async () => {
    dispatch({ type: actions.GET_PENDING_REQ_BEGIN })
    try {
      const { data } = await request("get", "/friends/pending", { key: "pending" })
      dispatch({ type: actions.GET_PENDING_REQ_SUCCESS, payload: { pending: data.data.friends } })
      return true
    } catch (error) {
      dispatchError(actions.GET_PENDING_REQ_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  const getCancelReq = useCallback(async (username) => {
    dispatch({ type: actions.GET_CANCEL_REQ_BEGIN })
    try {
      await request("delete", `/delete/${encodeURIComponent(username)}`)
      dispatch({ type: actions.GET_CANCEL_REQ_SUCCESS })
      return true
    } catch {
      return false
    }
  }, [request])

  const acceptReq = useCallback(async (username) => {
    dispatch({ type: actions.GET_ACCEPT_REQ_BEGIN })
    try {
      await request("get", `/acceptfriend/${encodeURIComponent(username)}`)
      dispatch({ type: actions.GET_ACCEPT_REQ_SUCCESS })
      return true
    } catch {
      return false
    }
  }, [request])

  const getFriendsReq = useCallback(async () => {
    dispatch({ type: actions.GET_FRIENDS_REQ_BEGIN })
    try {
      const { data } = await request("get", "/friends/all", { key: "friends" })
      dispatch({ type: actions.GET_FRIENDS_REQ_SUCCESS, payload: { friends: data.data.friends } })
      return true
    } catch (error) {
      dispatchError(actions.GET_FRIENDS_REQ_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  const getRequestsReq = useCallback(async () => {
    dispatch({ type: actions.GET_REQUESTS_REQ_BEGIN })
    try {
      const { data } = await request("get", "/friends/requests", { key: "requests" })
      dispatch({ type: actions.GET_REQUESTS_REQ_SUCCESS, payload: { requests: data.data.friends } })
      return true
    } catch (error) {
      dispatchError(actions.GET_REQUESTS_REQ_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  const getUpVote = useCallback(async (username) => {
    dispatch({ type: actions.GET_UPVOTE_BEGIN })
    try {
      await request("get", `/upvote/${encodeURIComponent(username)}`)
      dispatch({ type: actions.GET_UPVOTE_SUCCESS })
      return true
    } catch {
      return false
    }
  }, [request])

  const getDownVote = useCallback(async (username) => {
    dispatch({ type: actions.GET_DOWNVOTE_BEGIN })
    try {
      await request("get", `/downvote/${encodeURIComponent(username)}`)
      dispatch({ type: actions.GET_DOWNVOTE_SUCCESS })
      return true
    } catch {
      return false
    }
  }, [request])

  const removeVote = useCallback(async (username) => {
    dispatch({ type: actions.REMOVE_VOTE_BEGIN })
    try {
      await request("delete", `/removevote/${encodeURIComponent(username)}`)
      dispatch({ type: actions.REMOVE_VOTE_SUCCESS })
      return true
    } catch {
      return false
    }
  }, [request])

  const getGlobalLeaderboard = useCallback(async () => {
    dispatch({ type: actions.GET_GLOBAL_LEADERBOARD_BEGIN })
    try {
      const { data } = await request("get", "/leaderboard/global", { authenticated: false, key: "globalLeaderboard" })
      dispatch({ type: actions.GET_GLOBAL_LEADERBOARD_SUCCESS, payload: { globaldata: data.data } })
      return true
    } catch (error) {
      dispatchError(actions.GET_GLOBAL_LEADERBOARD_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  const getFriendsLeaderboard = useCallback(async () => {
    dispatch({ type: actions.GET_FRIEND_LEADERBOARD_BEGIN })
    try {
      const { data } = await request("get", "/leaderboard/friends", { key: "friendsLeaderboard" })
      dispatch({ type: actions.GET_FRIEND_LEADERBOARD_SUCCESS, payload: { friendsdata: data.data } })
      return true
    } catch (error) {
      dispatchError(actions.GET_FRIEND_LEADERBOARD_ERROR, error)
      return false
    }
  }, [request, dispatchError])

  return (
    <AppContext.Provider value={{
      ...state, registerUser, loginUser, logoutUser, getUser, editSocials,
      changePassword, checkUsername, getGithub, getHackerrank, getCodechef,
      searchUser, addFriend, getPendingReq, getCancelReq, getFriendsReq,
      getRequestsReq, acceptReq, getUpVote, getDownVote, removeVote,
      getGlobalLeaderboard, getFriendsLeaderboard,
    }}>
      {children}
    </AppContext.Provider>
  )
}

const useAppContext = () => useContext(AppContext)

export { AppProvider, initialState, useAppContext }
