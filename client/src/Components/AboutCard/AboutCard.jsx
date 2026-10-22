import "./AboutCard.scss"
import { Link } from "react-router-dom"
export const AboutCard = (props) => {
  return (
      <div className='about-card'>
        <div className='about-name'>{props.jobTitle}</div>
        <div className='about-content'>
          <img src={props.img} alt={props.name} />
          <div className='about-name2'>
            <h1>{props.name}</h1>
          </div>
          <div className='about-portfolio'>
            <a href={props.portfolio} target='_blank' rel='noopener noreferrer'>
              Portfolio
            </a>
          </div>

          <div className='about-socials'>
            <a aria-label={`LinkedIn: ${props.name}`} href={props.linkedin} className='twitter'>
              <i className='fa fa-linkedin'></i>
            </a>
            <a aria-label={`GitHub: ${props.name}`} href={props.github} className='twitter'>
              <i className='fa fa-github'></i>
            </a>
            <a aria-label={`Email: ${props.name}`} href={props.email} className='twitter'>
              <i className='fa fa-envelope'></i>
            </a>
            <a aria-label={`Twitter: ${props.name}`} href={props.twitter} className='twitter'>
              <i className='fa fa-twitter'></i>
            </a>
            <Link aria-label={`${props.name} dashboard`} to={`/search/${props.dashboard}`} className='twitter'>
              <i className='fa fa-dashboard'></i>
            </Link>
          </div>
        </div>
      </div>
  )
}
