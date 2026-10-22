import { useEffect, useState } from "react"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { Outlet } from "react-router-dom"
import { Table, Row, Button } from "react-bootstrap"
import { Footer } from "../../Components/Footer/Footer.jsx"
import { useAppContext } from "../../Context/appContext"
import { Link } from "react-router-dom"

import "./Leaderboard.scss"

const Leaderboard = () => {
  const {
    getGlobalLeaderboard,
    globaldata,
    getFriendsLeaderboard,
    friendsdata,
  } = useAppContext()

  const [isGlobal, setIsGlobal] = useState(true)

  useEffect(() => {
    getGlobalLeaderboard()
  }, [getGlobalLeaderboard])

  const handleGlobal = (e) => {
    e.preventDefault()
    setIsGlobal(true)
    getGlobalLeaderboard()
  }

  const handleLocal = (e) => {
    e.preventDefault()
    setIsGlobal(false)
    getFriendsLeaderboard()
  }

  return (
    <div className='leaderboard-home'>
      <Outlet />
      <NavbarComponent />
      <div className='leaderboard-container'>
        <h1>Leaderboard</h1>
        <div className='leaderboard-card' style={{ color: "white" }}>
          <Row className='mx-0'>
            <Button
              className={`col ${isGlobal ? "active-btn" : "inactive-btn"}`}
              style={{ marginRight: "20px" }}
              onClick={handleGlobal}
            >
              Global
            </Button>
            <br />
            <Button
              className={`col ${isGlobal ? "inactive-btn" : "active-btn"}`}
              onClick={handleLocal}
            >
              Friends
            </Button>
          </Row>
          <Table bordered style={{ color: "white", borderColor: "#79828a" }}>
            <thead>
              <tr>
                <th>#Rank</th>
                <th width='60%'>Name</th>
                <th>Rating </th>
              </tr>
            </thead>
            <tbody>
              {isGlobal
                ? globaldata?.map((global, index) => (
                  <tr key={global.username}>
                    <td>{index + 1}</td>
                    <td><Link to={`/search/${global.username}`}>{global.name}</Link></td>
                    <td>{global.rating}</td>
                  </tr>
                ))
                : friendsdata?.map((friend, index) => (
                  <tr key={friend.username}>
                    <td>{index + 1}</td>
                    <td><Link to={`/search/${friend.username}`}>{friend.name}</Link></td>
                    <td>{friend.rating}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>
      </div>
      <Footer />
    </div>
  )
}
export default Leaderboard
