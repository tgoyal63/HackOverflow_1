import { Link } from "react-router-dom"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { Footer } from "../../Components/Footer/Footer"
import illustration from "./img-1.svg"
import "./Homepage.scss"

export function Homepage() {
  return (
    <div className='homepage app-page'>
      <NavbarComponent />
      <main id='main-content' className='home-content'>
        <section className='home-intro' aria-labelledby='home-title'>
          <div className='home-intro-copy'>
            <h1 id='home-title'>Your coding profiles, together.</h1>
            <p>View your GitHub, HackerRank and CodeChef profiles in one dashboard.</p>
            <div className='home-actions'>
              <Link className='button button-primary' to='/register'>Create your account</Link>
              <Link className='button button-secondary' to='/register?mode=login'>Sign in</Link>
            </div>
          </div>
          <img className='home-illustration' src={illustration} width='1041' height='554' alt='' />
        </section>
        <section className='home-details' id='how-it-works' aria-label='What you can do on HackOverflow'>
          <div>
            <h2>Coding profiles</h2>
            <p>Review GitHub activity, HackerRank badges and CodeChef statistics together.</p>
          </div>
          <div>
            <h2>Developers and friends</h2>
            <p>Find developers by username, explore their profiles and connect as friends.</p>
          </div>
          <div>
            <h2>Community ratings</h2>
            <p>View the global leaderboard or compare ratings within your friends list.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
