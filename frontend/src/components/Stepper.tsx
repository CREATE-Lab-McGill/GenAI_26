import styles from '../styles/StepperStyles.module.css';

export interface StepDef {
  number: number;
  title: string;
}

interface StepperProps {
  steps: StepDef[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

const Stepper = ({ steps, currentStep, onStepClick }: StepperProps): React.ReactElement => (
  <nav className={styles.stepper} aria-label="Problem generation progress">
    {steps.map((item) => {
      const isActive = currentStep === item.number;
      const isComplete = currentStep > item.number;
      const isLocked = item.number > currentStep;
      return (
        <button
          key={item.number}
          type="button"
          className={`${styles.step} ${isActive ? styles.active : ''} ${isComplete ? styles.complete : ''}`}
          onClick={() => !isLocked && onStepClick(item.number)}
          disabled={isLocked}
        >
          <span className={styles.stepNumber}>{isComplete ? '✓' : item.number}</span>
          <span className={styles.stepCopy}>
            <strong>{item.title}</strong>
          </span>
        </button>
      );
    })}
  </nav>
);

export default Stepper;
