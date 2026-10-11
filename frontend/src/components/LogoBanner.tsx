import { Link } from 'react-router-dom';
import logo from '../assets/CreateLabLogo.png'; 
import styles from '../styles/LogoBannerStyles.module.css';

const LogoBanner = (): React.ReactElement => (
  <Link to="/" className={styles.banner} aria-label="Home">
    <img src={logo} alt="Logo" className={styles.logo} />
  </Link>
);

export default LogoBanner;