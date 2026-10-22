import { useState, useEffect } from "react"
import "./Signup.scss"
import { useNavigate } from "react-router-dom"
import { useAppContext } from "../../Context/appContext"
const initialState = {
  username: "",
  name: "",
  email: "",
  password: "",
  github: "",
  hackerrank: "",
  codechef: "",
}

export const Signup = (props) => {
  const [values, setValues] = useState(initialState)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { token, registerUser } = useAppContext()
  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError("")
    const { username, name, email, password, github, hackerrank, codechef } =
      values
    const socials = { github, hackerrank, codechef }
    const currentUser = { username, name, email, password, socials }
    const succeeded = await registerUser(currentUser)
    setIsSubmitting(false)
    if (succeeded) props.passRegisterChildData(true)
    else setError("Unable to create your account. Check your details and try again.")
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
            type='text'
            name='name'
            aria-label='Name'
            placeholder='Name'
            value={values.name}
            onChange={handleChange}
            required
          />
          <input
            type='email'
            name='email'
            aria-label='Email'
            placeholder='Email'
            value={values.email}
            onChange={handleChange}
          />
          <input
            type='password'
            name='password'
            autoComplete='new-password'
            aria-label='Password'
            placeholder='Password'
            value={values.password}
            onChange={handleChange}
            required
          />
          <input
            type='text'
            name='github'
            aria-label='GitHub username'
            placeholder='Github Username'
            value={values.github}
            onChange={handleChange}
            required
          />
          <input
            type='text'
            name='hackerrank'
            aria-label='HackerRank username'
            placeholder='Hackerrank Username'
            value={values.hackerrank}
            onChange={handleChange}
            required
          />
          <input
            type='text'
            name='codechef'
            aria-label='CodeChef username'
            placeholder='CodeChef Username'
            value={values.codechef}
            onChange={handleChange}
            required
          />
        </div>
        {error && <p role='alert' style={{ color: "#ff9999" }}>{error}</p>}
        <button disabled={isSubmitting} className=' signUpbtn' type='submit'>
          SIGNUP
        </button>
      </form>
    </div>
  )
}
