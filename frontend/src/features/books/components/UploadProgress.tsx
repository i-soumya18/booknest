"use client";

import React from "react";
import styles from "./UploadProgress.module.css";

interface UploadProgressProps {
  progress: number;
  fileName?: string;
  statusText?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  fileName,
  statusText,
}) => {
  const safeProgress = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div
      className={styles.container}
      role="progressbar"
      aria-valuenow={safeProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={statusText || `Uploading ${fileName || "file"}`}
    >
      <div className={styles.header}>
        <span className={styles.fileName}>{fileName || statusText || "Uploading..."}</span>
        <span className={styles.percentage}>{safeProgress}%</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${safeProgress}%` }} />
      </div>
    </div>
  );
};
