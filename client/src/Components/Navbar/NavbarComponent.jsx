import { useEffect, useState } from "react"
import { Nav, NavDropdown, Container, Navbar, Button } from "react-bootstrap"
import { Link, useLocation } from "react-router-dom"
import { useAppContext } from "../../Context/appContext"
import { useNavigate } from "react-router-dom"
import "./NavbarComponent.scss"
import "font-awesome/css/font-awesome.min.css"
import { ToastContainer, toast } from "react-toastify"

const NavbarComponent = ({ pathname }) => {
  const { token, logoutUser, loginUsername } = useAppContext()
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = pathname ?? location.pathname
  const [username, setSearchUsername] = useState("")

  const isLogin = currentPath === "/" || currentPath === "/register"

  const handleChange = (e) => {
    e.preventDefault()
    setSearchUsername(e.target.value)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const searchUsername = username.trim()
    if (!searchUsername) return

    if (searchUsername === loginUsername) {
      navigate("/dashboard")
    } else {
      navigate(`/search/${encodeURIComponent(searchUsername)}`)
    }
  }

  useEffect(() => {
    if (!isLogin && !token) navigate("/")
  }, [isLogin, navigate, token])

  const handleLogout = () => {
    logoutUser()
    toast("User Logout Successfully")
  }

  return (
    <Navbar sticky='top' className='navheader' collapseOnSelect expand='lg'>
      <Container>
        <Navbar.Brand
          as={Link}
          to={isLogin ? "/" : "/dashboard"}
          className='nav-logo'
          style={{ cursor: "pointer" }}
        >
          {" "}
          <span>Ha</span>ck<span>Ov</span>er<span>flow</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls='responsive-navbar-nav' />
        <Navbar.Collapse id='responsive-navbar-nav'>
          {!isLogin ? (
            <Nav className='ms-auto'>
              <div className='search-bar'>
                <form onSubmit={handleSubmit}>
                  <input
                    type='text'
                    name='username'
                    aria-label='Search username'
                    value={username}
                    onChange={handleChange}
                    className='search-input'
                    placeholder='Enter Username'
                    required
                  />
                  <button className='btn btn-outline-secondary' type='submit' aria-label='Search'>
                    <i className='fa fa-search'></i>
                  </button>
                </form>
              </div>
              <Nav.Link
                as={Link}
                to='/dashboard'
                style={{ textDecoration: "none" }}
              >
                Dashboard
              </Nav.Link>
              <Nav.Link
                as={Link}
                to='/leaderboard'
                style={{ textDecoration: "none" }}
              >
                Leaderboard
              </Nav.Link>

              <Nav.Link
                as={Link}
                to='/friends'
                style={{ textDecoration: "none" }}
              >
                Friends
              </Nav.Link>

              {/* <Nav.Link
                as={Link}
                to='/about'
                style={{ textDecoration: "none" }}
              >
                About
              </Nav.Link> */}
              <NavDropdown
                title='Profile ▼'
                id='collasible-nav-dropdown'
              >
                <NavDropdown.Item as={Link} to='/settings'>
                  Settings
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to='/changepassword'>
                  Change Password
                </NavDropdown.Item>
                <NavDropdown.Item as={Button} onClick={handleLogout}>
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
              {/* <Button className='logout-btn' onClick={logoutUser}>
                Logout
              </Button> */}
            </Nav>
          ) : null}
        </Navbar.Collapse>
      </Container>
      <ToastContainer />
    </Navbar>
  )
}

export default NavbarComponent
