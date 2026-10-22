import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAppContext } from "../../Context/appContext"
import { Icon } from "../UI/Icon"
import "./Login.scss"

const initialState = { username: "", password: "" }

export const Login = ({ passLoginChildData }) => {
  const [values, setValues] = useState(initialState)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { token, loginUser } = useAppContext()
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
    const succeeded = await loginUser(values)
    setIsSubmitting(false)
    if (succeeded) passLoginChildData(true)
    else setError("Unable to sign in. Check your username and password, then try again.")
  }

  return (
    <form aria-label='Sign in' className='auth-form login-form' onSubmit={onSubmit} aria-busy={isSubmitting}>
      <div className='field'>
        <label htmlFor='login-username'>Username</label>
        <input
          id='login-username'
          className='field-input'
          name='username'
          autoComplete='username'
          autoCapitalize='none'
          spellCheck={false}
          placeholder='Your HackOverflow username'
          value={values.username}
          onChange={handleChange}
          required
        />
      </div>
      <div className='field'>
        <label htmlFor='login-password'>Password</label>
        <div className='password-control'>
          <input
            id='login-password'
            className='field-input'
            type={showPassword ? "text" : "password"}
            name='password'
            autoComplete='current-password'
            value={values.password}
            onChange={handleChange}
            required
          />
          <button
            type='button'
            className='password-toggle'
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
          </button>
        </div>
      </div>
      {error && <p className='form-error' role='alert'>{error}</p>}
      <button className='button button-primary auth-submit' type='submit' disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  )
}
