import { useEffect } from "react"
import { useAppContext } from "../../Context/appContext"
import { Metric, PlatformPanel, hasValue } from "../Github/PlatformParts"
import "./Hackerrank.scss"

const Hackerrank = ({ username }) => {
  const context = useAppContext()
  const { getHackerrank, hackerrankUsername, hackerrank_created_at, level, followers_count,
    totalSubmissions, totalBadges, badgeData } = context
  useEffect(() => {
    if (typeof username === "string") getHackerrank(username)
  }, [getHackerrank, username])
  const hasData = [level, followers_count, totalSubmissions, totalBadges].some(hasValue)
  return <PlatformPanel platform="hackerrank" title="HackerRank" username={username}
    handle={hackerrankUsername} resource={context.resources?.hackerrank} hasData={hasData}
    href={`https://www.hackerrank.com/${encodeURIComponent(hackerrankUsername || username || "")}`}
    onRetry={() => getHackerrank(username)}>
    <dl className="platform-metrics">
      <Metric label="Submissions" value={totalSubmissions} featured />
      <Metric label="Badges" value={totalBadges} featured />
      <Metric label="Level" value={level} />
      <Metric label="Followers" value={followers_count} />
      <Metric label="Joined HackerRank" value={hackerrank_created_at} />
    </dl>
    <div className="platform-badges"><h3>Skill badges</h3>
      {Array.isArray(badgeData) && badgeData.length > 0
        ? <ul>{badgeData.map((badge) => <li key={badge.badge_name}><span>{badge.badge_name}</span>
          <span className="platform-badge-stars">{hasValue(badge.stars) ? `${badge.stars} stars` : "Stars unavailable"}</span></li>)}</ul>
        : <p className="muted">{totalBadges === 0 ? "No badges reported yet." : "Badge details are not available."}</p>}
    </div>
  </PlatformPanel>
}

export default Hackerrank
