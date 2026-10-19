import { useLanguage } from '../i18n/language';
import { useState } from 'react';
import styles from '../styles/TagBadgeStyles.module.css';

export type TagKind = 'topic' | 'subtopic' | 'prep' | 'difficulty' | 'custom';

interface TagBadgeProps {
  kind: TagKind;
  label: string;
  onClear?: () => void;
}

const KIND_PREFIX: Record<TagKind, string> = {
  topic: 'Topic',
  subtopic: 'Subtopic',
  prep: 'Prep',
  difficulty: 'Diff',
  custom: 'Format',
};

const TagBadge = ({ kind, label }: TagBadgeProps): React.ReactElement => {
  const { label: translateLabel } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <span
      className={`${styles.tag} ${styles[kind]} ${isExpanded ? styles.expanded : styles.truncated}`}
      onClick={() => setIsExpanded(!isExpanded)}
      title={translateLabel(label)}
    >
      <span className={styles.prefix}>{translateLabel(KIND_PREFIX[kind])}</span>
      <span className={styles.labelText}>{translateLabel(label)}</span>
    </span>
  );
};

export default TagBadge;
