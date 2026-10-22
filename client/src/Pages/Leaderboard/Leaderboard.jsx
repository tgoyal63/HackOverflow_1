import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { Footer } from "../../Components/Footer/Footer.jsx"
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader } from "../../Components/UI/Surface"
import { Icon } from "../../Components/UI/Icon"
import { useAppContext } from "../../Context/appContext"
import "./Leaderboard.scss"

const Leaderboard = () => {
  const { getGlobalLeaderboard, globaldata, getFriendsLeaderboard, friendsdata, resources } = useAppContext()
  const [view, setView] = useState("global")
  const isGlobal = view === "global"
  const getRankings = isGlobal ? getGlobalLeaderboard : getFriendsLeaderboard
  const data = isGlobal ? globaldata : friendsdata
  const rows = data || []
  const resource = isGlobal ? resources?.globalLeaderboard : resources?.friendsLeaderboard
  const status = resource?.status ?? (Array.isArray(data) ? "success" : "loading")
  const loading = status === "loading" || status === "idle"

  useEffect(() => {
    getRankings()
  }, [getRankings])

  return (
    <div className="app-page">
      <NavbarComponent />
      <main id="main-content" className="workspace leaderboard-workspace">
        <PageHeader eyebrow="Community" title="Leaderboard" description="Discover developers and see how the community ranks their profiles." action={<button type="button" className="button button-secondary" onClick={getRankings} disabled={loading} aria-label="Refresh leaderboard"><Icon name="refresh" size={17} />Refresh</button>} />
        <section className="panel ranking-panel" aria-labelledby="rankings-heading">
          <div className="ranking-panel-heading">
            <div><h2 id="rankings-heading" className="section-title">Community rankings</h2><p className="section-subtitle">Ranked by community rating</p></div>
            <fieldset className="ranking-filters">
              <legend className="visually-hidden">Leaderboard scope</legend>
              <button type="button" aria-pressed={isGlobal} onClick={() => setView("global")}><Icon name="trophy" size={16} />Global</button>
              <button type="button" aria-pressed={!isGlobal} onClick={() => setView("friends")}><Icon name="users" size={16} />Friends</button>
            </fieldset>
          </div>
          {loading && <LoadingState label={`Loading ${isGlobal ? "global" : "friends"} rankings…`} />}
          {status === "error" && <ErrorState title="Unable to load rankings" message={resource?.message || "The leaderboard could not be loaded. Please try again."} onRetry={getRankings} />}
          {!loading && status !== "error" && rows.length === 0 && <EmptyState icon="trophy" title={isGlobal ? "The leaderboard is waiting" : "Your circle starts here"} description={isGlobal ? "Community profiles will appear here as developers join." : "Connect with developers to see your friends’ community ratings together."} action={!isGlobal ? <Link className="button button-primary" to="/friends">Manage friends<Icon name="arrowRight" size={17} /></Link> : undefined} />}
          {!loading && rows.length > 0 && <>
            {status === "error" && <p className="ranking-stale-note muted">Showing the last loaded rankings.</p>}
            <div className="ranking-table-scroll">
              <table className="ranking-table">
                <caption className="visually-hidden">{isGlobal ? "Global" : "Friends"} leaderboard, ordered by community rating</caption>
                <thead><tr><th scope="col" className="ranking-rank-column">Rank</th><th scope="col">Developer</th><th scope="col" className="ranking-rating-column">Rating</th></tr></thead>
                <tbody>{rows.map((developer, index) => <tr key={developer.username}>
                  <td className="ranking-rank-column"><span className={`ranking-number${index === 0 ? " ranking-number-first" : ""}`}>{index + 1}</span></td>
                  <td><div className="ranking-developer"><span className="ranking-avatar" aria-hidden="true"><Avatar name={developer.name || developer.username} /></span><Link to={`/search/${encodeURIComponent(developer.username)}`} className="ranking-profile" aria-label={developer.name || developer.username}><strong>{developer.name || developer.username}</strong><span>@{developer.username}</span></Link></div></td>
                  <td className="ranking-rating-column"><span className="ranking-rating">{developer.rating ?? "—"}</span></td>
                </tr>)}</tbody>
              </table>
            </div>
            <div className="ranking-panel-footer"><span>{rows.length} {rows.length === 1 ? "developer" : "developers"}</span><span>Ratings reflect community votes.</span></div>
          </>}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Leaderboard
