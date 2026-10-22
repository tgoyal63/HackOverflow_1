import { useState, useEffect } from "react"
import "./Login.scss"
import { useNavigate } from "react-router-dom"
import { useAppContext } from "../../Context/appContext"

const initialState = {
  username: "",
  password: "",
}

export const Login = (props) => {
  const [values, setValues] = useState(initialState)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { token, loginUser } = useAppContext()
  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError("")
    const { username, password } = values
    const currentUser = { username, password }
    const succeeded = await loginUser(currentUser)
    setIsSubmitting(false)
    if (succeeded) props.passLoginChildData(true)
    else setError("Unable to sign in. Check your username and password, then try again.")
  }

  useEffect(() => {
    if (token) navigate("/dashboard")
  }, [token, navigate])

  return (
    <div className='loginBox text-center'>
      <form onSubmit={onSubmit} aria-busy={isSubmitting}>
        <div className='inputBox'>
          <input
            type='text'
            name='username'
            autoComplete='username'
            aria-label='Username'
            placeholder='Username'
            value={values.username}
            onChange={handleChange}
            required
          />
          <input
            type='password'
            name='password'
            autoComplete='current-password'
            aria-label='Password'
            placeholder='Password'
            value={values.password}
            onChange={handleChange}
            required
          />
        </div>
        {error && <p role='alert' style={{ color: "#ff9999" }}>{error}</p>}
        <button disabled={isSubmitting} className=' loginbtn' type='submit'>
          SIGNIN
        </button>
      </form>
    </div>
  )
}
