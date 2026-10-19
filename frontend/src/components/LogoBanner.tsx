import { useLanguage } from '../i18n/language';
import { Link } from 'react-router-dom';
import logo from '../assets/CreateLabLogo.png';
import styles from '../styles/LogoBannerStyles.module.css';

const LogoBanner = (): React.ReactElement => {
  const { t } = useLanguage();
  return (
    <Link to="/" className={styles.banner} aria-label={t('Home')}>
      <img src={logo} alt={t('Logo')} className={styles.logo} />
    </Link>
  );
};

export default LogoBanner;
