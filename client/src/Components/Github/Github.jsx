import { useEffect } from "react"
import { useAppContext } from "../../Context/appContext"
import { ExternalCharts, Metric, PlatformPanel, hasValue } from "./PlatformParts"

const Github = ({ username }) => {
  const context = useAppContext()
  const { getGithub, graph, stats, mul, contributions, githubUsername,
    public_repos, public_gists, followers, following, organizations, github_created_at } = context
  useEffect(() => {
    if (typeof username === "string") getGithub(username)
  }, [getGithub, username])
  const hasData = [public_repos, public_gists, followers, following, organizations].some(hasValue)

  return (
    <PlatformPanel platform="github" title="GitHub" eyebrow="Code & collaboration" username={username}
      handle={githubUsername} resource={context.resources?.github} hasData={hasData}
      href={`https://github.com/${encodeURIComponent(githubUsername || username || "")}`}
      onRetry={() => getGithub(username)}>
      <dl className="platform-metrics">
        <Metric label="Public repositories" value={public_repos} featured />
        <Metric label="Followers" value={followers} featured />
        <Metric label="Following" value={following} />
        <Metric label="Public gists" value={public_gists} />
        <Metric label="Organizations" value={organizations} />
        <Metric label="Joined GitHub" value={github_created_at} />
      </dl>
      <ExternalCharts charts={[
        { label: "GitHub activity graph", src: graph },
        { label: "GitHub profile statistics", src: stats },
        { label: "GitHub contribution streak", src: contributions },
        { label: "GitHub language statistics", src: mul },
      ]} />
    </PlatformPanel>
  )
}

export default Github
