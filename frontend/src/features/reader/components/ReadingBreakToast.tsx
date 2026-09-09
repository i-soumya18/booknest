import React from "react";
import styles from "./ReadingBreakToast.module.css";

interface ReadingBreakToastProps {
  readingMinutes: number;
  onDismiss: () => void;
  onTakeBreak: () => void;
}

export const ReadingBreakToast: React.FC<ReadingBreakToastProps> = ({
  readingMinutes,
  onDismiss,
  onTakeBreak,
}) => {
  return (
    <div className={styles.toastContainer} role="alert">
      <div className={styles.toastHeader}>
        <span>⏱️ Eye Safety Reminder</span>
      </div>
      <p className={styles.toastBody}>
        You have been immersed in reading for {readingMinutes} minutes! Remember the
        20-20-20 rule: look at an object 20 feet away for 20 seconds to protect your
        eyes.
      </p>
      <div className={styles.toastActions}>
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={onDismiss}
        >
          Dismiss (+{readingMinutes}m)
        </button>
        <button
          type="button"
          className={styles.breakBtn}
          onClick={onTakeBreak}
        >
          Take a Break
        </button>
      </div>
    </div>
  );
};
