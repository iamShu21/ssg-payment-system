const normalizeStatus = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "unreviewed";
  return raw.replace(/\s+/g, "_");
};

const labelize = (value) => {
  const text = String(value || "unreviewed").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const StatusBadge = ({ value }) => {
  const normalized = normalizeStatus(value);
  return <span className={`status status-${normalized}`}>{labelize(normalized)}</span>;
};

export default StatusBadge;
