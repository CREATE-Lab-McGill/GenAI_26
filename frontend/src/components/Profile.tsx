import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/ProfileStyles.module.css';
import { MATH_AVATARS } from '../types/avatar';

interface ProfileButtonProps {
  name?: string;
  subtitle?: string;
  variant?: 'icon' | 'full';
  size?: 'default' | 'small';
}

const AVATAR_KEY = 'mathcraft_user_avatar';

const ProfileButton = ({
  name,
  subtitle,
  variant = 'icon',
  size = 'default',
}: ProfileButtonProps): React.ReactElement => {
  const navigate = useNavigate();
  
  const [avatarId, setAvatarId] = useState(() => {
    return localStorage.getItem(AVATAR_KEY) || 'calculator';
  });

  useEffect(() => {
    const handleAvatarChange = () => {
      setAvatarId(localStorage.getItem(AVATAR_KEY) || 'calculator');
    };
    window.addEventListener('avatarChanged', handleAvatarChange);
    return () => window.removeEventListener('avatarChanged', handleAvatarChange);
  }, []);

  const activeAvatar = MATH_AVATARS.find(a => a.id === avatarId) || MATH_AVATARS[0];
  const ActiveAvatarIcon = activeAvatar.Icon; 

  return (
    <button
      className={`${styles.wrap} ${size === 'small' ? styles.small : ''} ${variant === 'full' ? styles.full : ''}`}
      onClick={() => navigate('/account')}
      aria-label="Go to profile"
    >
      <span 
        className={styles.avatar} 
        style={{ background: activeAvatar.bg }}
      >
        <ActiveAvatarIcon 
          size={variant === 'full' ? 18 : 16} 
          color="#ffffff" 
          strokeWidth={2.5} 
        />
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