import { useEffect, useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { toast } from "react-toastify"
import { Login } from "../../Components/Login/Login"
import { Signup } from "../../Components/Signup/Signup"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { Footer } from "../../Components/Footer/Footer"
import { Icon } from "../../Components/UI/Icon"
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
        <div className='auth-layout'>
          <section className='auth-introduction' aria-labelledby='auth-introduction-title'>
            <span className='eyebrow'>Your coding journey, connected</span>
            <h1 id='auth-introduction-title'>Good code.<br />Great company.</h1>
            <p>Bring your coding profiles together. Explore your progress, find your friends, and see where you stand.</p>
            <ul className='auth-platform-list' aria-label='Supported platforms'>
              <li><Icon name='github' size={18} />GitHub</li>
              <li><Icon name='code' size={18} />HackerRank</li>
              <li><Icon name='bolt' size={18} />CodeChef</li>
            </ul>
            <div className='auth-note'>
              <span className='auth-note-icon'><Icon name='users' size={24} /></span>
              <div><strong>A little friendly competition.</strong><p>Compare coding profiles and connect with people who keep you moving.</p></div>
            </div>
          </section>
          <section className='panel auth-panel' aria-labelledby='auth-form-title'>
            <div className='auth-panel-heading'>
              <span className='eyebrow'>{isSignUp ? "Start here" : "Your workspace awaits"}</span>
              <h2 id='auth-form-title'>{isSignUp ? "Create your account" : "Welcome back"}</h2>
              <p className='muted'>{isSignUp ? "Set up your account and connect your coding profiles." : "Sign in to pick up where you left off."}</p>
            </div>
            <fieldset className='auth-mode-switch'>
              <legend>Account access</legend>
              <button type='button' className={isSignUp ? "selected" : ""} aria-pressed={isSignUp} onClick={() => selectMode(true)}>Sign up</button>
              <button type='button' className={!isSignUp ? "selected" : ""} aria-pressed={!isSignUp} onClick={() => selectMode(false)}>Sign in</button>
            </fieldset>
            {isSignUp ? <Signup passRegisterChildData={setIsRegisterUser} /> : <Login passLoginChildData={setIsLoginUser} />}
            <p className='auth-switch-copy'>
              {isSignUp ? "Already have an account?" : "New to HackOverflow?"}{" "}
              <button type='button' onClick={() => selectMode(!isSignUp)}>{isSignUp ? "Sign in" : "Create an account"}</button>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Landing
