import { getStatusMeta } from "../utils/formatters";

export default function StatusBadge({ status, showIcon = true, size = "md" }) {
  const meta = getStatusMeta(status);
  return (
    <span className={`badge-status ${meta.className} badge-${size}`} title={`Status: ${meta.label}`}>
      {showIcon && <span className="status-dot">{meta.icon}</span>}
      <span className="status-text">{meta.label}</span>
    </span>
  );
}
