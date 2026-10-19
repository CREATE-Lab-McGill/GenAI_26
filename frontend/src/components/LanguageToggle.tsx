import { useLanguage } from '../i18n/language';
import styles from '../styles/LanguageToggleStyles.module.css';

export default function LanguageToggle() {
  const { locale, toggleLanguage, t } = useLanguage();
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={locale === 'fr'}
      onClick={toggleLanguage}
      title={t('French interface')}
    >
      <span className={styles.track} aria-hidden="true">
        <span />
      </span>
      <span lang="fr">Français</span>
    </button>
  );
}
