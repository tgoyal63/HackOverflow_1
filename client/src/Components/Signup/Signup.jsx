import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAppContext } from "../../Context/appContext"
import { Icon } from "../UI/Icon"
import "../Login/Login.scss"
import "./Signup.scss"

const initialState = {
  username: "", name: "", email: "", password: "", github: "", hackerrank: "", codechef: "",
}

export const Signup = ({ passRegisterChildData }) => {
  const [values, setValues] = useState(initialState)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { token, registerUser } = useAppContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (token) navigate("/dashboard")
  }, [token, navigate])

  const handleChange = (event) => {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError("")
    const { username, name, email, password, github, hackerrank, codechef } = values
    const succeeded = await registerUser({ username, name, email, password, socials: { github, hackerrank, codechef } })
    setIsSubmitting(false)
    if (succeeded) passRegisterChildData(true)
    else setError("Unable to create your account. Check your details and try again.")
  }

  return (
    <form aria-label='Create account' className='auth-form signup-form' onSubmit={onSubmit} aria-busy={isSubmitting}>
      <fieldset className='signup-section'>
        <legend>Your account</legend>
        <div className='signup-fields'>
          <div className='field'>
            <label htmlFor='signup-name'>Name</label>
            <input id='signup-name' className='field-input' name='name' autoComplete='name' placeholder='Your full name' value={values.name} onChange={handleChange} required />
          </div>
          <div className='field'>
            <label htmlFor='signup-username'>Username</label>
            <input id='signup-username' className='field-input' name='username' autoComplete='username' autoCapitalize='none' spellCheck={false} placeholder='Choose a username' value={values.username} onChange={handleChange} required />
          </div>
          <div className='field signup-wide'>
            <label htmlFor='signup-email'>Email</label>
            <input id='signup-email' className='field-input' type='email' name='email' autoComplete='email' placeholder='you@example.com' value={values.email} onChange={handleChange} required />
          </div>
          <div className='field signup-wide'>
            <label htmlFor='signup-password'>Password</label>
            <div className='password-control'>
              <input id='signup-password' className='field-input' type={showPassword ? "text" : "password"} name='password' autoComplete='new-password' placeholder='Choose a password' value={values.password} onChange={handleChange} required />
              <button type='button' className='password-toggle' aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
              </button>
            </div>
          </div>
        </div>
      </fieldset>
      <fieldset className='signup-section signup-platforms'>
        <legend>Your coding profiles</legend>
        <p className='field-hint'>Use your existing usernames, without profile URLs. All three are required.</p>
        <div className='signup-fields'>
          {[
            ["github", "GitHub username", "e.g. octocat"],
            ["hackerrank", "HackerRank username", "Your HackerRank handle"],
            ["codechef", "CodeChef username", "Your CodeChef handle"],
          ].map(([platform, label, placeholder]) => (
            <div className={`field ${platform === "codechef" ? "signup-wide" : ""}`} key={platform}>
              <label htmlFor={`signup-${platform}`}>{label}</label>
              <input id={`signup-${platform}`} className='field-input' name={platform} autoCapitalize='none' spellCheck={false} placeholder={placeholder} value={values[platform]} onChange={handleChange} required />
            </div>
          ))}
        </div>
      </fieldset>
      {error && <p className='form-error' role='alert'>{error}</p>}
      <button className='button button-primary auth-submit' type='submit' disabled={isSubmitting}>
        {isSubmitting ? "Creating your account…" : "Create account"}
      </button>
    </form>
  )
}
