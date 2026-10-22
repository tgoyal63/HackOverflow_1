import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { Footer } from "../../Components/Footer/Footer"
import { Icon } from "../../Components/UI/Icon"
import { ErrorState, LoadingState, PageHeader } from "../../Components/UI/Surface"
import { useAppContext } from "../../Context/appContext"
import "./Setting.scss"

const platforms = [
  { key: "github", name: "GitHub", prefix: "github.com/", url: "https://github.com/" },
  { key: "hackerrank", name: "HackerRank", prefix: "hackerrank.com/", url: "https://www.hackerrank.com/" },
  { key: "codechef", name: "CodeChef", prefix: "codechef.com/users/", url: "https://www.codechef.com/users/" },
]

const Setting = () => {
  const context = useAppContext()
  const { getUser, editSocials, resources, accountProfile } = context
  const account = accountProfile || (resources === undefined ? context : null)
  const { upvotes, downvotes, email, username, name, github, hackerrank, codechef } = account || {}
  const [isEdit, setIsEdit] = useState(false)
  const [values, setValues] = useState({ github: "", hackerrank: "", codechef: "" })
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const firstProfileInputRef = useRef(null)
  const editButtonRef = useRef(null)
  const wasEditingRef = useRef(false)
  const handles = { github, hackerrank, codechef }
  const profile = resources?.profile
  const initialLoading = !username && (!profile || profile.status === "idle" || profile.status === "loading")

  useEffect(() => { getUser() }, [getUser])
  useEffect(() => {
    if (isEdit) {
      firstProfileInputRef.current?.focus()
      wasEditingRef.current = true
    } else if (wasEditingRef.current) {
      editButtonRef.current?.focus()
      wasEditingRef.current = false
    }
  }, [isEdit])

  const handleEdit = () => {
    setValues({ github: github || "", hackerrank: hackerrank || "", codechef: codechef || "" })
    setFeedback(null)
    setIsEdit(true)
  }

  const handleChange = (event) => {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const handleFormSubmit = async (event) => {
    event.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    setFeedback(null)
    const succeeded = await editSocials({ socials: values })
    if (succeeded) {
      const refreshed = await getUser()
      setIsEdit(false)
      setFeedback({ type: refreshed ? "success" : "warning", message: refreshed ? "Your coding profiles have been updated." : "Your changes were saved, but the latest profile could not load. Refresh to see your updated details." })
      toast("Coding profiles saved.")
    } else {
      setFeedback({ type: "error", message: "We couldn’t save your profiles. Your changes are still here. Please try again." })
      toast("We couldn’t save your coding profiles.")
    }
    setIsSaving(false)
  }

  return (
    <div className='app-page settings-page'>
      <NavbarComponent />
      <main id='main-content' className='workspace'>
        <PageHeader title='Account settings' />
        {initialLoading ? <LoadingState label='Loading your account…' /> : (
          <>
            {profile?.status === "error" && <ErrorState title='Your account could not refresh' message={profile.message || "Please try again to load your account details."} onRetry={getUser} />}
            {username && <div className='settings-layout'>
              <section className='account-summary' aria-labelledby='account-summary-title'>
                <div className='account-summary-heading'>
                  <div><h2 id='account-summary-title'>{name || username}</h2><p className='muted account-username'>@{username}</p></div>
                  <Link className='button button-secondary' to='/changepassword'>Change password</Link>
                </div>
                <section className='account-votes' aria-label='Community votes'>
                  <div><strong>{upvotes ?? "—"}</strong><span>Upvotes</span></div>
                  <div><strong>{downvotes ?? "—"}</strong><span>Downvotes</span></div>
                </section>
                <dl className='account-details'>
                  <div><dt>Username</dt><dd>{username}</dd></div>
                  <div><dt>Email address</dt><dd>{email || "Not available"}</dd></div>
                </dl>
              </section>
              <section className='linked-profiles' aria-labelledby='linked-profiles-title'>
                <div className='settings-section-heading'>
                  <h2 className='section-title' id='linked-profiles-title'>Coding profiles</h2>
                  {!isEdit && <button className='button button-secondary' type='button' ref={editButtonRef} onClick={handleEdit}>Edit profiles</button>}
                </div>
                <form aria-label='Coding profiles' onSubmit={handleFormSubmit} aria-busy={isSaving}>
                  <div className='linked-profile-list'>
                    {platforms.map((platform) => (
                      <div className='linked-profile-row' key={platform.key}>
                        <div className='linked-profile-content'>
                          {isEdit ? <div className='field'>
                            <label htmlFor={`settings-${platform.key}`}>{platform.name} username</label>
                            <input id={`settings-${platform.key}`} ref={platform.key === "github" ? firstProfileInputRef : null} className='field-input' name={platform.key} autoCapitalize='none' spellCheck={false} value={values[platform.key]} onChange={handleChange} disabled={isSaving} required />
                            <span className='field-hint'>Enter your username, without {platform.prefix}</span>
                          </div> : <>
                            <h3>{platform.name}</h3>
                            <p className='muted'>{handles[platform.key] || "Not available"}</p>
                          </>}
                        </div>
                        {!isEdit && handles[platform.key] && <a className='button button-quiet profile-visit' href={`${platform.url}${encodeURIComponent(handles[platform.key])}`} target='_blank' rel='noopener noreferrer' aria-label={`Open ${platform.name} profile`}>Open profile<Icon name='external' size={15} /></a>}
                      </div>
                    ))}
                  </div>
                  {feedback && <p className={feedback.type === "success" ? "form-success" : feedback.type === "warning" ? "profile-save-warning" : "form-error"} role={feedback.type === "error" ? "alert" : "status"}>{feedback.message}</p>}
                  {isEdit && <div className='inline-actions settings-save-actions'>
                    <button className='button button-primary' type='submit' disabled={isSaving}>{isSaving ? "Saving changes…" : "Save changes"}</button>
                    <button className='button button-secondary' type='button' disabled={isSaving} onClick={() => { setIsEdit(false); setFeedback(null) }}>Cancel</button>
                  </div>}
                </form>
              </section>
            </div>}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Setting
