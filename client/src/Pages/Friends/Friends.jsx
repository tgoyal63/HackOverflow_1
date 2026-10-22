import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { Footer } from "../../Components/Footer/Footer.jsx"
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader } from "../../Components/UI/Surface"
import { Icon } from "../../Components/UI/Icon"
import { useAppContext } from "../../Context/appContext"
import "./Friends.scss"

const filters = [
  { key: "friends", label: "Friends", title: "Your friends", description: "Your connections in the developer community." },
  { key: "pending", label: "Pending", title: "Sent requests", description: "Invitations you have sent that are waiting for a response." },
  { key: "requests", label: "Requests", title: "Incoming requests", description: "Developers who would like to connect with you." },
]

const emptyCopy = {
  friends: { title: "Build your developer circle", description: "Find developers on the leaderboard, visit their profiles, and send a friend request." },
  pending: { title: "No requests waiting", description: "Friend requests you send will appear here until they are accepted." },
  requests: { title: "You’re all caught up", description: "New friend requests will appear here. You can accept or decline each invitation." },
}

function resourceStatus(resource, data) {
  return resource?.status ?? (Array.isArray(data) ? "success" : "loading")
}

const Friends = () => {
  const { getPendingReq, pending, requests, friends, getCancelReq, getFriendsReq, getRequestsReq, acceptReq, resources } = useAppContext()
  const [activeFilter, setActiveFilter] = useState("friends")
  const [busyRows, setBusyRows] = useState({})
  const [confirmRemoval, setConfirmRemoval] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const pendingRows = useRef(new Set())
  const mounted = useRef(false)

  const refreshFriends = useCallback(() => Promise.all([
    getPendingReq(), getFriendsReq(), getRequestsReq(),
  ]), [getPendingReq, getFriendsReq, getRequestsReq])

  useEffect(() => {
    mounted.current = true
    refreshFriends()
    return () => { mounted.current = false }
  }, [refreshFriends])

  const lists = { friends, pending, requests }
  const currentFilter = filters.find((filter) => filter.key === activeFilter)
  const rows = lists[activeFilter] || []
  const status = resourceStatus(resources?.[activeFilter], lists[activeFilter])
  const loading = status === "idle" || status === "loading"
  const refreshing = filters.some(({ key }) => ["idle", "loading"].includes(resourceStatus(resources?.[key], lists[key])))

  async function handleAction(username, action) {
    if (pendingRows.current.has(username)) return
    pendingRows.current.add(username)
    setBusyRows((previous) => ({ ...previous, [username]: true }))
    setFeedback(null)
    setConfirmRemoval(null)
    try {
      const success = await (action === "accept" ? acceptReq(username) : getCancelReq(username))
      if (!mounted.current) return
      if (!success) {
        setFeedback({ type: "error", message: `Could not ${action === "accept" ? "accept this request" : action === "remove" ? "remove this friend" : action === "reject" ? "decline this request" : "cancel this request"}. Please try again.` })
        return
      }
      const refreshed = await refreshFriends()
      if (!mounted.current) return
      if (refreshed.some((result) => result === false)) {
        setFeedback({ type: "error", message: "Your change was saved, but some lists could not refresh. Refresh the lists to see the latest connections." })
        return
      }
      const messages = { accept: `You and @${username} are now friends.`, remove: `@${username} was removed from your friends.`, reject: `Request from @${username} declined.`, cancel: `Request to @${username} cancelled.` }
      setFeedback({ type: "success", message: messages[action] })
    } catch {
      if (mounted.current) setFeedback({ type: "error", message: "This change could not be confirmed. Refresh the lists before trying again." })
    } finally {
      pendingRows.current.delete(username)
      if (mounted.current) setBusyRows((previous) => ({ ...previous, [username]: false }))
    }
  }

  return (
    <div className="app-page">
      <NavbarComponent />
      <main id="main-content" className="workspace friends-workspace">
        <PageHeader eyebrow="Community" title="Friends" description="A place for your developer circle. Manage connections and invitations." action={<Link className="button button-secondary" to="/leaderboard"><Icon name="users" size={17} />Discover developers</Link>} />
        <fieldset className="friends-filters">
          <legend className="visually-hidden">Filter connections</legend>
          {filters.map(({ key, label }) => {
            const listStatus = resourceStatus(resources?.[key], lists[key])
            const knownCount = ["success", "error"].includes(listStatus) && Array.isArray(lists[key])
            return <button type="button" className="friends-filter" aria-pressed={activeFilter === key} key={key} onClick={() => { setActiveFilter(key); setConfirmRemoval(null) }}>
              {label}<span className="friends-filter-count" aria-hidden="true">{knownCount ? lists[key].length : "—"}</span>
            </button>
          })}
        </fieldset>
        {feedback && <p className={feedback.type === "error" ? "form-error friends-feedback" : "form-success friends-feedback"} role={feedback.type === "error" ? "alert" : "status"}>{feedback.message}</p>}
        <section className="panel friends-panel" aria-labelledby="connections-heading">
          <div className="friends-panel-heading">
            <div><h2 id="connections-heading" className="section-title">{currentFilter.title}</h2><p className="section-subtitle">{currentFilter.description}</p></div>
            <button type="button" className="button button-quiet friends-refresh" disabled={refreshing} onClick={refreshFriends} aria-label="Refresh connections"><Icon name="refresh" size={17} /><span>Refresh</span></button>
          </div>
          {loading && <LoadingState label={`Loading ${currentFilter.label.toLowerCase()}…`} />}
          {status === "error" && <ErrorState title="Unable to load connections" message={resources?.[activeFilter]?.message || "Your connections could not be loaded. Please try again."} onRetry={refreshFriends} />}
          {!loading && status !== "error" && rows.length === 0 && <EmptyState icon={activeFilter === "pending" ? "clock" : "users"} {...emptyCopy[activeFilter]} action={activeFilter === "friends" ? <Link className="button button-primary" to="/leaderboard">Explore the leaderboard<Icon name="arrowRight" size={17} /></Link> : undefined} />}
          {!loading && rows.length > 0 && <>
            {status === "error" && <p className="friends-stale-note muted">Showing your last loaded connections.</p>}
            <ul className="friends-list" aria-label={currentFilter.title}>
              {rows.map((username) => <li className="friend-row" key={username}>
                <div className="friend-row-main">
                  <Link className="friend-identity" to={`/search/${encodeURIComponent(username)}`} aria-label={`View ${username}’s profile`}><span aria-hidden="true"><Avatar name={username} /></span><span className="friend-identity-copy"><strong>{username}</strong><span>View profile<Icon name="arrowRight" size={13} /></span></span></Link>
                  <div className="friend-actions">
                    {activeFilter === "requests" && <button type="button" className="button button-primary" disabled={busyRows[username]} aria-label={`Accept request from ${username}`} onClick={() => handleAction(username, "accept")}><Icon name="check" size={16} />{busyRows[username] ? "Saving…" : "Accept"}</button>}
                    <button type="button" className={`button ${activeFilter === "friends" ? "button-quiet" : "button-secondary"}`} disabled={busyRows[username]} aria-expanded={activeFilter === "friends" ? confirmRemoval === username : undefined} aria-controls={activeFilter === "friends" && confirmRemoval === username ? `friend-removal-${encodeURIComponent(username)}` : undefined} aria-label={activeFilter === "friends" ? `Remove ${username}` : activeFilter === "pending" ? `Cancel request to ${username}` : `Reject request from ${username}`} onClick={() => activeFilter === "friends" ? setConfirmRemoval(username) : handleAction(username, activeFilter === "pending" ? "cancel" : "reject")}>
                      {busyRows[username] ? "Saving…" : activeFilter === "friends" ? "Remove" : activeFilter === "pending" ? "Cancel request" : "Decline"}
                    </button>
                  </div>
                </div>
                {confirmRemoval === username && <div id={`friend-removal-${encodeURIComponent(username)}`} className="friend-removal-confirm"><p>Remove <strong>@{username}</strong> from your friends?</p><div className="inline-actions"><button type="button" className="button button-danger" onClick={() => handleAction(username, "remove")} aria-label={`Confirm remove ${username}`}>Remove friend</button><button type="button" className="button button-secondary" onClick={() => setConfirmRemoval(null)}>Keep friend</button></div></div>}
              </li>)}
            </ul>
          </>}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Friends
