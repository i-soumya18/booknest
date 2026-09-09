import React from "react";
import styles from "./EyeSafetyPopover.module.css";

interface EyeSafetyPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  eyeSafetyMode: boolean;
  onToggleEyeSafety: () => void;
  warmth: number; // 0 to 100
  onWarmthChange: (val: number) => void;
  brightness: number; // 50 to 100
  onBrightnessChange: (val: number) => void;
  breakIntervalMinutes: number;
  onBreakIntervalChange: (val: number) => void;
}

export const EyeSafetyPopover: React.FC<EyeSafetyPopoverProps> = ({
  isOpen,
  onClose,
  eyeSafetyMode,
  onToggleEyeSafety,
  warmth,
  onWarmthChange,
  brightness,
  onBrightnessChange,
  breakIntervalMinutes,
  onBreakIntervalChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.popover} onClick={(e) => e.stopPropagation()}>
      <div className={styles.header}>
        <h4 className={styles.title}>🛡️ Eye Safety & Comfort</h4>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
        >
          ✕
        </button>
      </div>

      <div className={styles.controlGroup}>
        <div className={styles.labelRow}>
          <span>Blue-Light Warmth</span>
          <span>{warmth}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={warmth}
          onChange={(e) => onWarmthChange(parseInt(e.target.value, 10))}
          className={styles.rangeInput}
        />
      </div>

      <div className={styles.controlGroup}>
        <div className={styles.labelRow}>
          <span>Brightness</span>
          <span>{brightness}%</span>
        </div>
        <input
          type="range"
          min={50}
          max={100}
          value={brightness}
          onChange={(e) => onBrightnessChange(parseInt(e.target.value, 10))}
          className={styles.rangeInput}
        />
      </div>

      <div className={styles.controlGroup}>
        <div className={styles.labelRow}>
          <span>Eye Break Timer</span>
        </div>
        <select
          value={breakIntervalMinutes}
          onChange={(e) => onBreakIntervalChange(parseInt(e.target.value, 10))}
          className={styles.selectInput}
        >
          <option value={15}>Every 15 minutes</option>
          <option value={20}>Every 20 minutes (20-20-20 rule)</option>
          <option value={30}>Every 30 minutes</option>
          <option value={45}>Every 45 minutes</option>
          <option value={60}>Every 1 hour</option>
        </select>
      </div>

      <div className={styles.toggleRow}>
        <span style={{ fontSize: "0.85rem", color: "#f8fafc" }}>Enable Filter</span>
        <input
          type="checkbox"
          checked={eyeSafetyMode}
          onChange={onToggleEyeSafety}
          style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#6366f1" }}
        />
      </div>
    </div>
  );
};
