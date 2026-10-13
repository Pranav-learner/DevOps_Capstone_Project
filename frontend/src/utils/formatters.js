export function getStatusMeta(status) {
  const norm = (status || "").toUpperCase().replace(" ", "_").replace("-", "_");
  switch (norm) {
    case "BACKLOG":
      return { key: "BACKLOG", label: "Backlog", className: "status-backlog", icon: "◌" };
    case "TODO":
      return { key: "TODO", label: "Todo", className: "status-todo", icon: "○" };
    case "IN_PROGRESS":
    case "INPROGRESS":
      return { key: "IN_PROGRESS", label: "In Progress", className: "status-in-progress", icon: "◐" };
    case "IN_REVIEW":
    case "INREVIEW":
    case "REVIEW":
      return { key: "IN_REVIEW", label: "In Review", className: "status-in-review", icon: "◒" };
    case "DONE":
      return { key: "DONE", label: "Done", className: "status-done", icon: "✓" };
    default:
      return { key: norm, label: status || "Unknown", className: "status-unknown", icon: "•" };
  }
}

export function getPriorityMeta(priority) {
  const norm = (priority || "").toUpperCase();
  switch (norm) {
    case "CRITICAL":
      return { key: "CRITICAL", label: "Critical", className: "priority-critical", icon: "▲", weight: 4 };
    case "HIGH":
      return { key: "HIGH", label: "High", className: "priority-high", icon: "⇡", weight: 3 };
    case "MEDIUM":
      return { key: "MEDIUM", label: "Medium", className: "priority-medium", icon: "⇢", weight: 2 };
    case "LOW":
      return { key: "LOW", label: "Low", className: "priority-low", icon: "⇣", weight: 1 };
    default:
      return { key: norm, label: priority || "None", className: "priority-none", icon: "–", weight: 0 };
  }
}

export function formatDate(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function checkIsOverdue(dueDate, status) {
  if (!dueDate || status === "DONE") return false;
  const due = new Date(dueDate).getTime();
  return !isNaN(due) && due < Date.now();
}
