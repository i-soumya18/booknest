/**
 * BookNest Authentication Validation Rules & Utilities
 * Matches backend validation rules in `backend/app/schemas/auth.py`
 */

export interface PasswordRequirements {
  minLength: boolean; // At least 8 characters
  maxLength: boolean; // At most 128 characters
  hasUppercase: boolean; // At least one uppercase letter (A-Z)
  hasLowercase: boolean; // At least one lowercase letter (a-z)
  hasDigit: boolean; // At least one digit (0-9)
  hasSpecial: boolean; // At least one special character (!@#$%^&*...)
  isValid: boolean; // All required rules passed
}

export function evaluatePassword(password: string): PasswordRequirements {
  const minLength = password.length >= 8;
  const maxLength = password.length <= 128;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

  const isValid =
    minLength &&
    maxLength &&
    hasUppercase &&
    hasLowercase &&
    hasDigit &&
    hasSpecial;

  return {
    minLength,
    maxLength,
    hasUppercase,
    hasLowercase,
    hasDigit,
    hasSpecial,
    isValid,
  };
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: "Email address is required" };
  }
  // Standard RFC 5322 compatible regex check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  return { isValid: true };
}

export function validateName(name: string): { isValid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: "Name cannot be empty or whitespace only" };
  }
  if (trimmed.length > 255) {
    return { isValid: false, error: "Name cannot exceed 255 characters" };
  }
  return { isValid: true };
}

