import { useEffect, useRef } from "react"
import "./SearchDashboard.scss"
import NavbarComponent from "../../Components/Navbar/NavbarComponent"
import { useParams, useNavigate } from "react-router-dom"
import { Footer } from "../../Components/Footer/Footer.jsx"
import { useAppContext } from "../../Context/appContext"
import "react-toastify/dist/ReactToastify.css"
import Github from "../../Components/Github/Github"
import Hackerrank from "../../Components/Hackerrank/Hackerrank"
import CodeChef from "../../Components/CodeChef/CodeChef"
import "font-awesome/css/font-awesome.min.css"
import { toast, ToastContainer } from "react-toastify"

const SearchDashboard = () => {
  const {
    name,
    socials,
    upvotes,
    downvotes,
    voteStatus,
    status,
    searchUser,
    addFriend,
    acceptReq,
    getCancelReq,
    getUpVote,
    getDownVote,
    removeVote,
    loginUsername
  } = useAppContext()

  const { username } = useParams()
  const navigate = useNavigate()
  const currentUsername = useRef(username)
  useEffect(() => {
    currentUsername.current = username
    if (username === loginUsername) {
      navigate("/dashboard")
      return
    }
    if (username) searchUser(username)
    return () => { currentUsername.current = undefined }
  }, [username, loginUsername, navigate, searchUser])

  async function handleFriend(username) {
    let succeeded
    let message
    if (status === "Add Friend") {
      succeeded = await addFriend(username)
      message = "Friend request sent!"
    } else if (status === "Accept Request") {
      succeeded = await acceptReq(username)
      message = "You are now friends!"
    } else {
      succeeded = await getCancelReq(username)
      message = status === "Remove Friend" ? "Friend Removed" : "Friend Request Removed!"
    }
    if (succeeded && currentUsername.current === username) {
      await searchUser(username)
      toast(message)
    }
  }

  const handleUpVote = async () => {
    const succeeded = voteStatus === "upvoted"
      ? await removeVote(username)
      : await getUpVote(username)
    if (succeeded && currentUsername.current === username) await searchUser(username)
  }

  const handleDownVote = async () => {
    const succeeded = voteStatus === "downvoted"
      ? await removeVote(username)
      : await getDownVote(username)
    if (succeeded && currentUsername.current === username) await searchUser(username)
  }

  return (
    <>
      <div className='dashboardHome'>
        <NavbarComponent />
        <div className='container-fluid mt-5'>
          <div className='row'>
            <div
              className='col-lg-12 col-sm-6 text-center justify-content-center'
              style={{ color: "white", paddingBottom: "1rem" }}
            >
              <h1>{name}</h1>({username})
            </div>
          </div>
          <div className='row'>
            <div className='col-lg-12 col-sm-6 text-center d-flex justify-content-center gap-4'>
              <button
                className='btn btn-up p-3'
                type='button'
                disabled={!status}
                title='Upvote'
                aria-label='Upvote'
                aria-pressed={voteStatus === 'upvoted'}
                onClick={handleUpVote}
              >
                <div className='d-flex justify-content-center p-0 m-0'>
                  {upvotes}
                  <i className='fa fa-thumbs-up fa-lg '></i>
                </div>
              </button>
              <button
                className='btn btn-down  p-3'
                type='button'
                disabled={!status}
                title='Downvote'
                aria-label='Downvote'
                aria-pressed={voteStatus === 'downvoted'}
                onClick={handleDownVote}
              >
                <div className='d-flex justify-content-center p-0 m-0'>
                  {downvotes}
                  <i className='fa fa-thumbs-down fa-lg'></i>
                </div>
              </button>
              <button
                className='btn btn-add  p-3'
                disabled={!status}
                title={status}
                aria-label={status || "Friend request"}
                type='button'
                onClick={(event) => {
                  event.preventDefault()
                  handleFriend(username)
                }}
              >
                {status === "Add Friend" || status === "Accept Request" ? (
                  <i className='fa fa-user-plus fa-lg'></i>
                ) : (
                  <i className='fa fa-user-times fa-lg'></i>
                )}
              </button>
            </div>
          </div>
        </div>
        <Github username={socials?.github} />
        <Hackerrank username={socials?.hackerrank} />
        <CodeChef username={socials?.codechef} />

        {/* {isGithubError ? <ToastContainer /> : <></>} */}
        <Footer />
      </div>
      <ToastContainer />
    </>
  )
}

export default SearchDashboard
