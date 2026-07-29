import styles from '../styles/TagBadgeStyles.module.css';

export type TagKind = 'curr' | 'prep' | 'difficulty';

interface TagBadgeProps {
  kind: TagKind;
  label: string;
}

const KIND_PREFIX: Record<TagKind, string> = {
  curr: 'Curr',
  prep: 'Prep',
  difficulty: 'Diff',
};

const TagBadge = ({ kind, label }: TagBadgeProps): React.ReactElement => (
  <span className={`${styles.tag} ${styles[kind]}`}>
    <span className={styles.prefix}>{KIND_PREFIX[kind]}</span>
    {label}
  </span>
);

export default TagBadge;