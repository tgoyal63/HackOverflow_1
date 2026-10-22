import { useEffect, useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { toast } from "react-toastify"
import { Login } from "../../Components/Login/Login"
import { Signup } from "../../Components/Signup/Signup"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { Footer } from "../../Components/Footer/Footer"
import "./Landing.scss"

const Landing = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const isSignUp = searchParams.get("mode") !== "login"
  const selectMode = (signup) => {
    const next = new URLSearchParams(searchParams)
    if (signup) next.delete("mode")
    else next.set("mode", "login")
    setSearchParams(next, { replace: true })
  }
  const [isLoginUser, setIsLoginUser] = useState(false)
  const [isRegisterUser, setIsRegisterUser] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    if (isLoginUser) toast("Signed in. Welcome back.")
    if (isRegisterUser) toast("Your account is ready.")
  }, [isLoginUser, isRegisterUser])

  return (
    <div className='app-page auth-page'>
      <NavbarComponent pathname={pathname} />
      <main id='main-content' className='workspace auth-workspace'>
        <section className={`auth-panel ${isSignUp ? "auth-panel-signup" : "auth-panel-login"}`} aria-labelledby='auth-form-title'>
          <h1 id='auth-form-title'>{isSignUp ? "Create account" : "Sign in"}</h1>
          <fieldset className='auth-mode-switch'>
            <legend>Account access</legend>
            <button type='button' className={isSignUp ? "selected" : ""} aria-pressed={isSignUp} onClick={() => selectMode(true)}>Sign up</button>
            <button type='button' className={!isSignUp ? "selected" : ""} aria-pressed={!isSignUp} onClick={() => selectMode(false)}>Sign in</button>
          </fieldset>
          {isSignUp ? <Signup passRegisterChildData={setIsRegisterUser} /> : <Login passLoginChildData={setIsLoginUser} />}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Landing
