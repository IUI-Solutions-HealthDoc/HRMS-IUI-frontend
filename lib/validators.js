/**
 * Form Validation Utilities for HRMS
 */

export function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  // Standard RFC 5322 compatible email regex accepting all domains (@org, @gmail, @outlook, etc.)
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(trimmed);
}

export function validateStrongPassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 uppercase letter (A-Z)" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 lowercase letter (a-z)" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 numeric digit (0-9)" };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 special character (!@#$%^&*)" };
  }
  return { valid: true, message: "" };
}

export function sanitizeNumericInput(val, allowDecimal = false) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (allowDecimal) {
    return str.replace(/[^0-9.]/g, "");
  }
  return str.replace(/[^0-9]/g, "");
}

export function validateBaseSalary(val, maxCap = 10000000) {
  const num = Number(val);
  if (isNaN(num) || num < 0) {
    return { valid: false, message: "Base Salary must be a positive numeric value" };
  }
  if (num > maxCap) {
    return { valid: false, message: `Base Salary cannot exceed ₹${maxCap.toLocaleString("en-IN")}` };
  }
  return { valid: true, message: "" };
}
