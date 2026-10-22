import { useCallback, useEffect } from "react"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { Footer } from "../../Components/Footer/Footer.jsx"
import { Container } from "react-bootstrap"
import "./Friends.scss"
import { Tabs, Tab } from "react-bootstrap"
import { useAppContext } from "../../Context/appContext"
const Friends = () => {
  const {
    getPendingReq,
    pending,
    requests,
    friends,
    getCancelReq,
    getFriendsReq,
    getRequestsReq,
    acceptReq,
  } = useAppContext()

  const refreshFriends = useCallback(() => Promise.all([
    getPendingReq(),
    getFriendsReq(),
    getRequestsReq(),
  ]), [getPendingReq, getFriendsReq, getRequestsReq])

  useEffect(() => {
    refreshFriends()
  }, [refreshFriends])

  async function handleCancel(friend) {
    if (await getCancelReq(friend)) await refreshFriends()
  }

  async function handleAccept(friend) {
    if (await acceptReq(friend)) await refreshFriends()
  }

  return (
    <div className='home'>
      <NavbarComponent />
      <Container>
        <div
          data-aos='fade-in'
          data-aos-offset='10'
          data-aos-delay='0'
          data-aos-duration='500'
          data-aos-mirror='true'
          data-aos-easing='ease-in-out'
          id='friends'
        >
          <div className='schedule'>
            <h1>Friends</h1>
            <Tabs
              defaultActiveKey='Friends'
              id='uncontrolled-tab-example'
              className='mb-3 tabs'
            >
              <Tab eventKey='Friends' title='Friends'>
                <table className='table  table-bordered text-center'>
                  <tbody>
                    <tr>
                      <td>Name</td>
                      <td style={{ width: "30%" }}> Remove </td>
                    </tr>
                    {friends?.map((friend) => (
                        <tr key={friend}>
                          <td> {friend}</td>
                          <td style={{ width: "30%" }}>
                            <button
                              type='button'
                              aria-label={`Remove ${friend}`}
                              className='btn'
                              onClick={(event) => {
                                event.preventDefault()
                                handleCancel(friend)
                              }}
                            >
                              ❌
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Tab>

              <Tab eventKey='Pending' title='Pending'>
                <table className='table table-bordered text-center'>
                  <tbody>
                    <tr>
                      <td>Name</td>
                      <td style={{ width: "30%" }}> Cancel Request </td>
                    </tr>
                    {pending?.map((friend) => (
                        <tr key={friend}>
                          <td> {friend}</td>
                          <td style={{ width: "30%" }}>
                            <button
                              type='button'
                              aria-label={`Cancel request to ${friend}`}
                              className='btn'
                              onClick={(event) => {
                                event.preventDefault()
                                handleCancel(friend)
                              }}
                            >
                              ❌
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Tab>
              <Tab eventKey='Requests' title='Requests'>
                <table className='table  table-bordered text-center'>
                  <tbody>
                    <tr>
                      <td>Name</td>
                      <td style={{ width: "30%" }}> Accept/Reject </td>
                    </tr>
                    {requests?.map((friend) => (
                        <tr key={friend}>
                          <td> {friend}</td>
                          <td style={{ width: "30%" }}>
                            <button
                              type='button'
                              aria-label={`Accept request from ${friend}`}
                              className='btn'
                              onClick={(event) => {
                                event.preventDefault()
                                handleAccept(friend)
                              }}
                            >
                              ✔️
                            </button>
                            <button
                              type='button'
                              aria-label={`Reject request from ${friend}`}
                              className='btn'
                              onClick={(event) => {
                                event.preventDefault()
                                handleCancel(friend)
                              }}
                            >
                              ❌
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Tab>
            </Tabs>
          </div>
        </div>
      </Container>
      <Footer />
    </div>
  )
}

export default Friends
