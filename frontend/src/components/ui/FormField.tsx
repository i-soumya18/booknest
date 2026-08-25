import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span style={{ color: "var(--color-error)", marginLeft: "2px" }}>*</span>}
      </label>
      {children}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Styled input that accepts an error prop
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}
export function Input({ error, className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`input-field${error ? " error" : ""} ${className}`.trim()}
    />
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}
export function SelectField({ error, className = "", children, ...props }: SelectFieldProps) {
  return (
    <select
      {...props}
      className={`input-field${error ? " error" : ""} ${className}`.trim()}
    >
      {children}
    </select>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}
export function TextareaField({ error, className = "", ...props }: TextareaFieldProps) {
  return (
    <textarea
      {...props}
      className={`input-field${error ? " error" : ""} ${className}`.trim()}
    />
  );
}
