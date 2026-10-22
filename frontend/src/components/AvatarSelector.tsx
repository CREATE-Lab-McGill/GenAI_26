import React from 'react';
import { MATH_AVATARS } from '../types/avatar';
import styles from '../styles/AvatarSelector.module.css';


interface AvatarModalProps {
  isOpen: boolean;
  activeId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}

const AvatarSelector: React.FC<AvatarModalProps> = ({ isOpen, activeId, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Customize your profile</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <p className={styles.description}>Choose the icon that best represents your style.</p>
        
        <div className={styles.grid}>
          {MATH_AVATARS.map((av) => {
            const ActiveIcon = av.Icon;
            
            return (
              <button
                key={av.id}
                type="button"
                className={`${styles.option} ${activeId === av.id ? styles.active : ''}`}
                style={{ background: av.bg }}
                onClick={() => {
                  onSelect(av.id);
                  onClose();
                }}
                title={av.name}
              >
                <ActiveIcon size={26} color="#ffffff" strokeWidth={2.5} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;