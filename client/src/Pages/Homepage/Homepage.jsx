import React from "react"
import "./Homepage.scss"
import Button from "@material-ui/core/Button"
import img1 from "./img-1.svg"
import img2 from "./img-2.svg"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { useLocation } from "react-router-dom"
import { Footer } from "../../Components/Footer/Footer"

import { Link } from "react-router-dom"

export const Homepage = () => {
  const { pathname } = useLocation()

  return (
    <>
      <div className='main-home'>
        <NavbarComponent pathname={pathname} />

        <div id='home'>
          <div className='home-container'>
            <div className='home-content'>
              <div className='home-lead'>
                <span>S</span>ocial Coding Experience <br />
              </div>

              <div className='home-text'>
                <span>L</span>et's Compare and explore our ranking with the
                globe and with our friends
              </div>

              <Link to='/register' style={{ textDecoration: "none" }}>
                <Button
                  style={{ marginTop: 25, backgroundColor: "#FF6666" }}
                  size='large'
                  variant='contained'
                  color='primary'
                  disableElevation
                >
                  Register
                </Button>
              </Link>
            </div>

            <img className='home-img' src={img2} alt='' />
          </div>
        </div>

        <div id='home'>
          <div className='home-container'>
            <img className='home-img' src={img1} alt='' />

            <div className='home-content'>
              <div className='home-lead-right'>
                <span>I</span>t's open source, <br />
                Use it as you like!
              </div>

              <div className='home-text-right'>
                <span>I</span>n todays online platform, there are lot of
                platforms to practice as well as to solve problems... So we built
                a platform by using API's Of different platform to showcase user profiles and statistics.
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
