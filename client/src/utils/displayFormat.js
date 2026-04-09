/**
 * Presentation-only helpers. Does not change stored role values or API payloads.
 */

/**
 * Human-readable role label for UI (chips, labels).
 * @param {string | undefined} role
 * @returns {string}
 */
export function formatRoleLabel(role) {
  if (role == null || role === "") return "—";
  const r = String(role).trim().toLowerCase().replace(/\s+/g, "_");
  if (r === "student") return "Student";
  if (r === "admin") return "Admin";
  if (r === "ssg_officer") return "SSG Officer";
  return String(role)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * Sidebar subtitle under NDMU SSG branding based on logged-in role (display only).
 * @param {string | undefined} role
 * @returns {string}
 */
export function getPortalSubtitle(role) {
  if (role == null || role === "") return "Payment Portal";
  const r = String(role).trim().toLowerCase().replace(/\s+/g, "_");
  if (r === "student") return "Student Portal";
  if (r === "admin") return "Admin Portal";
  if (r === "ssg_officer") return "SSG Officer Portal";
  return "SSG Portal";
}

/**
 * Name for welcome line in header. Uses student first/last from auth when available.
 * @param {{ user?: object; student?: object | null }} params
 * @returns {string}
 */
export function getWelcomeDisplayName({ user, student }) {
  if (!user) return "User";
  const role = String(user.role || "").toLowerCase().replace(/\s+/g, "_");
  if (role === "student" && student) {
    const fn = student.first_name?.trim?.() ?? "";
    const ln = student.last_name?.trim?.() ?? "";
    const full = [fn, ln].filter(Boolean).join(" ");
    if (full) return full;
  }
  return user.username?.trim() || "User";
}

/**
 * Human-readable year level label for UI display.
 * @param {number | string | undefined} yearLevel
 * @returns {string}
 */
export function formatYearLevel(yearLevel) {
  const num = Number(yearLevel);
  if (isNaN(num) || num < 1 || num > 5) return String(yearLevel || "-");
  const suffixes = ["", "st", "nd", "rd", "th", "th"];
  return `${num}${suffixes[num]} Year`;
}

/**
 * Short course abbreviation for UI display.
 * @param {string | undefined} course
 * @returns {string}
 */
export function formatCourseAbbrev(course) {
  if (!course) return "-";
  const c = String(course).trim();
  const mapping = {
    "Bachelor of Science in Architecture (BSArchi)": "BSArchi",
    "Bachelor of Science in Civil Engineering (BSCE)": "BSCE",
    "Bachelor of Science in Computer Engineering (BSCoE)": "BSCoE",
    "Bachelor of Science in Computer Science (BSCS)": "BSCS",
    "Bachelor of Science in Electrical Engineering (BSEE)": "BSEE",
    "Bachelor of Science in Electronics Engineering (BSEcE)": "BSEcE",
    "Bachelor of Science in Information Technology (BSIT)": "BSIT",
    "Bachelor of Library and Information Science (BLIS)": "BLIS",
  };
  return mapping[c] || c;
}
