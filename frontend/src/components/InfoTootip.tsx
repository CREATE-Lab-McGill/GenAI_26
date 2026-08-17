import { useState } from 'react';
import styles from '../styles/InfoTooltip.module.css';

interface InfoTooltipProps {
  text: string;
}

const InfoTooltip = ({ text }: InfoTooltipProps): React.ReactElement => {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={styles.icon}
        aria-label="More info"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open && <span className={styles.tooltip} role="tooltip">{text}</span>}
    </span>
  );
};

export default InfoTooltip;