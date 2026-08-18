import { useState } from 'react';
import styles from '../styles/TagBadgeStyles.module.css';

export type TagKind = 'topic' | 'subtopic' | 'prep' | 'difficulty';

interface TagBadgeProps {
  kind: TagKind;
  label: string;
}

const KIND_PREFIX: Record<TagKind, string> = {
  topic: 'Topic',
  subtopic: 'Subtopic',
  prep: 'Prep',
  difficulty: 'Diff',
};

const TagBadge = ({ kind, label }: TagBadgeProps): React.ReactElement => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <span 
      className={`${styles.tag} ${styles[kind]} ${isExpanded ? styles.expanded : styles.truncated}`}
      onClick={() => setIsExpanded(!isExpanded)}
      title={label}
    >
      <span className={styles.prefix}>{KIND_PREFIX[kind]}</span>
      <span className={styles.labelText}>{label}</span>
    </span>
  );
};

export default TagBadge;