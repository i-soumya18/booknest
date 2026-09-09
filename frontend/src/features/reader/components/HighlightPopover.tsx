import React from "react";
import styles from "./HighlightPopover.module.css";
import { HighlightColor } from "@/types";

interface HighlightPopoverProps {
  x: number;
  y: number;
  onSelectColor: (color: HighlightColor) => void;
  onClose: () => void;
}

const COLORS: { key: HighlightColor; label: string; className: string }[] = [
  { key: "yellow", label: "Yellow", className: styles.colorYellow },
  { key: "green", label: "Green", className: styles.colorGreen },
  { key: "blue", label: "Blue", className: styles.colorBlue },
  { key: "pink", label: "Pink", className: styles.colorPink },
  { key: "purple", label: "Purple", className: styles.colorPurple },
];

export const HighlightPopover: React.FC<HighlightPopoverProps> = ({
  x,
  y,
  onSelectColor,
  onClose,
}) => {
  return (
    <div
      className={styles.popover}
      style={{ left: `${x}px`, top: `${y}px` }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {COLORS.map((c) => (
        <button
          key={c.key}
          type="button"
          className={`${styles.colorBtn} ${c.className}`}
          title={`Highlight ${c.label}`}
          aria-label={`Highlight ${c.label}`}
          onClick={() => onSelectColor(c.key)}
        />
      ))}

      <div className={styles.divider} />

      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        title="Cancel"
      >
        ✕
      </button>
    </div>
  );
};
