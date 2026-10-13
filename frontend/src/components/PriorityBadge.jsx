import { getPriorityMeta } from "../utils/formatters";

export default function PriorityBadge({ priority, showIcon = true, size = "md" }) {
  const meta = getPriorityMeta(priority);
  return (
    <span className={`badge-priority ${meta.className} badge-${size}`} title={`Priority: ${meta.label}`}>
      {showIcon && <span className="priority-icon">{meta.icon}</span>}
      <span className="priority-text">{meta.label}</span>
    </span>
  );
}
