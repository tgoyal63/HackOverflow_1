import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { Footer } from "../../Components/Footer/Footer.jsx"
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../../Components/UI/Surface"
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
        <PageHeader title="Leaderboard" />
        <section className="ranking-panel" aria-label="Community rankings">
          <div className="ranking-toolbar">
            <fieldset className="ranking-filters">
              <legend className="visually-hidden">Leaderboard scope</legend>
              <button type="button" aria-pressed={isGlobal} onClick={() => setView("global")}>Global</button>
              <button type="button" aria-pressed={!isGlobal} onClick={() => setView("friends")}>Friends</button>
            </fieldset>
            <button type="button" className="button button-quiet ranking-refresh" onClick={getRankings} disabled={loading} aria-label="Refresh leaderboard"><Icon name="refresh" size={16} />Refresh</button>
          </div>
          {loading && <LoadingState label={`Loading ${isGlobal ? "global" : "friends"} rankings…`} />}
          {status === "error" && <ErrorState title="Unable to load rankings" message={resource?.message || "The leaderboard could not be loaded. Please try again."} onRetry={getRankings} />}
          {!loading && status !== "error" && rows.length === 0 && <EmptyState icon="trophy" title="No rankings yet" description={isGlobal ? "There are no developer profiles to rank." : "Add friends to see their ratings here."} action={!isGlobal ? <Link className="button button-secondary" to="/friends">Manage friends</Link> : undefined} />}
          {!loading && rows.length > 0 && <>
            {status === "error" && <p className="ranking-stale-note muted">Showing the last loaded rankings.</p>}
            <div className="ranking-table-scroll">
              <table className="ranking-table">
                <caption className="visually-hidden">{isGlobal ? "Global" : "Friends"} leaderboard, ordered by community rating</caption>
                <thead><tr><th scope="col" className="ranking-rank-column">Rank</th><th scope="col">Developer</th><th scope="col" className="ranking-rating-column">Rating</th></tr></thead>
                <tbody>{rows.map((developer, index) => <tr key={developer.username}>
                  <td className="ranking-rank-column"><span className="ranking-number">{index + 1}</span></td>
                  <td><Link to={`/search/${encodeURIComponent(developer.username)}`} className="ranking-profile" aria-label={developer.name || developer.username}><strong>{developer.name || developer.username}</strong><span>@{developer.username}</span></Link></td>
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
