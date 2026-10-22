import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { useAppContext } from "../../Context/appContext"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { Footer } from "../../Components/Footer/Footer"
import { Icon } from "../../Components/UI/Icon"
import { PageHeader } from "../../Components/UI/Surface"
import "./ChangePassword.scss"

const initialState = { currentPassword: "", newPassword: "", confirmPassword: "" }
const fields = [
  { name: "currentPassword", label: "Current Password", hint: "Enter the password you use to sign in.", complete: "current-password" },
  { name: "newPassword", label: "New Password", hint: "Choose a password you don’t use for another account.", complete: "new-password" },
  { name: "confirmPassword", label: "Confirm Password", hint: "Enter your new password once more.", complete: "new-password" },
]

const ChangePassword = () => {
  const [values, setValues] = useState(initialState)
  const [visible, setVisible] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const { token, changePassword, loginUsername, accountProfile } = useAppContext()
  const navigate = useNavigate()

  useEffect(() => { if (!token) navigate("/") }, [token, navigate])

  const handleChange = (event) => {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (isSaving) return
    setFeedback(null)
    const { currentPassword, newPassword, confirmPassword } = values
    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "Your new passwords don’t match. Check both fields and try again." })
      toast("Your new passwords don’t match.")
      return
    }
    setIsSaving(true)
    const succeeded = await changePassword({ currentPassword, newPassword })
    if (succeeded) {
      setValues(initialState)
      setVisible({})
      setFeedback({ type: "success", message: "Your password has been updated. You’re still signed in." })
      toast("Password updated.")
    } else {
      setFeedback({ type: "error", message: "We couldn’t update your password. Check your current password and try again." })
      toast("We couldn’t update your password.")
    }
    setIsSaving(false)
  }

  return (
    <div className='app-page password-page'>
      <NavbarComponent />
      <main id='main-content' className='workspace'>
        <PageHeader eyebrow='Account security' title='Change password' description='A fresh password helps keep your account yours.' action={<Link className='button button-secondary' to='/settings'>Back to settings<Icon name='arrowRight' size={16} /></Link>} />
        <div className='password-layout'>
          <section className='panel password-panel' aria-labelledby='password-panel-title'>
            <div className='password-panel-heading'><span className='password-panel-icon'><Icon name='shield' size={22} /></span><div><h2 className='section-title' id='password-panel-title'>Update your password</h2><p className='section-subtitle'>You’ll stay signed in after saving your new password.</p></div></div>
            <form aria-label='Change password' className='password-form' onSubmit={onSubmit} aria-busy={isSaving}>
              <input type='hidden' name='username' autoComplete='username' value={accountProfile?.username || loginUsername || ""} />
              {fields.map((field) => (
                <div className='field' key={field.name}>
                  <label htmlFor={`password-${field.name}`}>{field.label}</label>
                  <div className='password-control'>
                    <input id={`password-${field.name}`} className='field-input' type={visible[field.name] ? "text" : "password"} name={field.name} autoComplete={field.complete} aria-describedby={`password-hint-${field.name}`} value={values[field.name]} onChange={handleChange} disabled={isSaving} required />
                    <button className='password-toggle' type='button' aria-label={`${visible[field.name] ? "Hide" : "Show"} ${field.label.toLowerCase()}`} aria-pressed={Boolean(visible[field.name])} onClick={() => setVisible((current) => ({ ...current, [field.name]: !current[field.name] }))}><Icon name={visible[field.name] ? "eyeOff" : "eye"} size={18} /></button>
                  </div>
                  <span className='field-hint' id={`password-hint-${field.name}`}>{field.hint}</span>
                </div>
              ))}
              {feedback && <p className={feedback.type === "success" ? "form-success" : "form-error"} role={feedback.type === "success" ? "status" : "alert"}>{feedback.message}</p>}
              <div className='inline-actions password-actions'>
                <button className='button button-primary' type='submit' disabled={isSaving}>{isSaving ? "Updating password…" : "Update password"}</button>
                <button className='button button-quiet' type='button' disabled={isSaving} onClick={() => navigate("/settings")}>Cancel</button>
              </div>
            </form>
          </section>
          <aside className='password-advice' aria-labelledby='password-advice-title'>
            <span className='eyebrow'>A few good habits</span>
            <h2 id='password-advice-title'>Make it hard to guess.<br />Easy to keep safe.</h2>
            <ul><li><Icon name='check' size={17} /><span>Use a unique password for HackOverflow.</span></li><li><Icon name='check' size={17} /><span>A longer passphrase can be easier to remember.</span></li><li><Icon name='check' size={17} /><span>Keep it in a trusted password manager.</span></li></ul>
            <p className='field-hint'>Never share your password or send it to someone claiming to offer account support.</p>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ChangePassword
