import { useState } from "react"
import { Icon } from "../UI/Icon"
import { EmptyState, ErrorState, LoadingState } from "../UI/Surface"
import "./Github.scss"

export const hasValue = (value) => value !== null && value !== undefined && value !== "" &&
  (typeof value !== "number" || Number.isFinite(value))

export const Metric = ({ label, value, featured = false }) => (
  <div className={`platform-metric${featured ? " platform-metric-featured" : ""}`}>
    <dt>{label}</dt>
    <dd>{hasValue(value)
      ? typeof value === "number" ? new Intl.NumberFormat("en").format(value) : String(value)
      : <span className="platform-unknown"><span aria-hidden="true">—</span><span className="platform-visually-hidden">Not available</span></span>}</dd>
  </div>
)

export const PlatformPanel = ({ platform, title, eyebrow, username, handle, resource, hasData, href, onRetry, children }) => {
  const matchesIdentity = resource?.identity === undefined || resource.identity === username
  const status = !matchesIdentity ? "idle" : resource?.status || (hasData ? "success" : "idle")
  const available = status === "success" && hasData
  const shownHandle = available ? handle || username : username
  return (
    <section id={platform} className={`panel platform-card platform-${platform}`} aria-labelledby={`${platform}-heading`}>
      <header className="platform-heading">
        <div className="platform-heading-main">
          <span className="platform-mark"><Icon name={platform === "github" ? "github" : "code"} size={23} /></span>
          <div><p className="eyebrow">{eyebrow}</p><h2 id={`${platform}-heading`}>{title}</h2></div>
        </div>
        {shownHandle && <span className="platform-handle">@{shownHandle}</span>}
      </header>
      {status === "loading" && <LoadingState label={`Loading ${title} profile…`} />}
      {status === "error" && <ErrorState title={`${title} unavailable`} message={resource.message}
        onRetry={typeof username === "string" ? onRetry : undefined} />}
      {status === "idle" && <EmptyState icon="link" title={typeof username === "string" ? `${title} profile not loaded` : `${title} isn’t linked`}
        description={typeof username === "string" ? "Load this profile to see its public statistics." : "No public username has been linked to this profile."}
        action={typeof username === "string" ? <button type="button" className="button button-secondary" onClick={onRetry}>Load {title}</button> : undefined} />}
      {status === "success" && !hasData && <EmptyState icon="code" title="No statistics available"
        description={`${title} returned no public statistics for this profile. You can try again or open the profile directly.`}
        action={<button type="button" className="button button-secondary" onClick={onRetry}>Try again</button>} />}
      {available && children}
      {(available || status === "success") && (handle || username) && <footer className="platform-footer">
        <a href={href} target="_blank" rel="noopener noreferrer" className="platform-profile-link">View {title} profile <Icon name="external" size={15} /></a>
        <span className="muted">Public profile data</span>
      </footer>}
    </section>
  )
}

const validChartSource = (source) => {
  if (typeof source !== "string") return false
  try { return new URL(source).protocol === "https:" } catch { return false }
}

const ChartImage = ({ src, label }) => {
  const [failed, setFailed] = useState(false)
  return <figure className="platform-chart"><figcaption>{label}</figcaption>
    {failed ? <p className="platform-chart-error">This external chart is unavailable. The profile metrics above are still available.</p>
      : <img src={src} alt={label} loading="lazy" onError={() => setFailed(true)} />}
  </figure>
}

export const ExternalCharts = ({ charts }) => {
  const [open, setOpen] = useState(false)
  const availableCharts = charts.filter(({ src }) => validChartSource(src))
  if (!availableCharts.length) return null
  return <details className="platform-chart-details" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><span>Explore external charts</span><Icon name="chevron" size={16} /></summary>
    <p className="field-hint">Charts are provided by independent services and may be unavailable or update separately.</p>
    {open && <div className="platform-chart-grid">{availableCharts.map(({ src, label }) => <ChartImage key={src} src={src} label={label} />)}</div>}
  </details>
}
