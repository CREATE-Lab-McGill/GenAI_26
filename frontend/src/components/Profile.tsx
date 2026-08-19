import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/ProfileStyles.module.css';

interface ProfileButtonProps {
  name?: string;
  subtitle?: string;
  variant?: 'icon' | 'full';
  size?: 'default' | 'small';
}

const ProfileButton = ({
  name,
  subtitle,
  variant = 'icon',
  size = 'default',
}: ProfileButtonProps): React.ReactElement => {
  const navigate = useNavigate();

  return (
    <button
      className={`${styles.wrap} ${size === 'small' ? styles.small : ''} ${variant === 'full' ? styles.full : ''}`}
      onClick={() => navigate('/account')}
      aria-label="Go to profile"
    >
      <span className={styles.avatar}>
        <User size={variant === 'full' ? 18 : 16} strokeWidth={1.8} />
      </span>

      {variant === 'full' && (name || subtitle) && (
        <span className={styles.copy}>
          {name && <strong>{name}</strong>}
          {subtitle && <small>{subtitle}</small>}
        </span>
      )}
    </button>
  );
};

export default ProfileButton;