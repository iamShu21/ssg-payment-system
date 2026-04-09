/**
 * Shared form validation utilities
 */

export const ALLOWED_COURSES = [
  "Bachelor of Science in Architecture (BSArchi)",
  "Bachelor of Science in Civil Engineering (BSCE)",
  "Bachelor of Science in Computer Engineering (BSCoE)",
  "Bachelor of Science in Computer Science (BSCS)",
  "Bachelor of Science in Electrical Engineering (BSEE)",
  "Bachelor of Science in Electronics Engineering (BSEcE)",
  "Bachelor of Science in Information Technology (BSIT)",
  "Bachelor of Library and Information Science (BLIS)",
];

export const OFFICER_POSITIONS = ["President", "Vice President", "Treasurer"];

/**
 * Email validation - stricter than HTML5 type="email"
 * Requires at least one dot in domain
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};


/**
 * Get email validation message
 */
export const getEmailErrorMessage = (email) => {
  if (!email) return "Email is required";
  if (!isValidEmail(email)) return "Please enter a valid email address (e.g., name@domain.com)";
  return null;
};

