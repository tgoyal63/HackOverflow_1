import { useEffect } from "react"
import { useAppContext } from "../../Context/appContext"
import { Metric, PlatformPanel, hasValue } from "../Github/PlatformParts"
import "./CodeChef.scss"

const CodeChef = ({ username }) => {
  const context = useAppContext()
  const { getCodechef, codechefUsername, ratings, language, band, div, global, country, submissionStats } = context
  useEffect(() => {
    if (typeof username === "string") getCodechef(username)
  }, [getCodechef, username])
  const hasData = [ratings, global, country, div, language, band, ...Object.values(submissionStats || {})].some(hasValue)
  return <PlatformPanel platform="codechef" title="CodeChef" eyebrow="Competitive programming" username={username}
    handle={codechefUsername} resource={context.resources?.codechef} hasData={hasData}
    href={`https://www.codechef.com/users/${encodeURIComponent(codechefUsername || username || "")}`}
    onRetry={() => getCodechef(username)}>
    <dl className="platform-metrics">
      <Metric label="Contest rating" value={ratings} featured />
      <Metric label="Global rank" value={global} featured />
      <Metric label="Country rank" value={country} />
      <Metric label="Division" value={div} />
      <Metric label="Band" value={band} />
      <Metric label="Language" value={language} />
    </dl>
    <div className="platform-submissions"><h3>Submission statistics</h3>
      <dl className="platform-metrics platform-metrics-compact">
        <Metric label="Solved problems" value={submissionStats?.solvedProblems} />
        <Metric label="Accepted submissions" value={submissionStats?.acceptedSubmissions} />
        <Metric label="Attempted problems" value={submissionStats?.attemptedProblems} />
        <Metric label="Submitted solutions" value={submissionStats?.submittedSolutions} />
        <Metric label="Partially solved" value={submissionStats?.partiallySolvedProblems} />
        <Metric label="Wrong submissions" value={submissionStats?.wrongSubmissions} />
        <Metric label="Time limit exceeded" value={submissionStats?.timeLimitExceed} />
        <Metric label="Runtime errors" value={submissionStats?.runTimeError} />
      </dl>
    </div>
  </PlatformPanel>
}

export default CodeChef
