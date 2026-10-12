export default function IssueTable({ issues, onEdit, onDelete }) {
  if (!issues || issues.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📂</div>
        <h3>No issues found</h3>
        <p>Click <strong>"+ New Issue"</strong> above to track your first task!</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="issue-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Project</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assignee</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id}>
              <td className="id-cell">#{issue.id}</td>
              <td className="title-cell">
                <span className="issue-title-text">{issue.title}</span>
                {issue.description && <p className="desc-preview">{issue.description}</p>}
              </td>
              <td>
                <span className="project-badge">{issue.project}</span>
              </td>
              <td>
                <span className={`badge badge-priority-${issue.priority?.toLowerCase()}`}>
                  {issue.priority}
                </span>
              </td>
              <td>
                <span className={`badge badge-status-${issue.status?.toLowerCase().replace("_", "-")}`}>
                  {issue.status?.replace("_", " ")}
                </span>
              </td>
              <td>
                {issue.assignee ? (
                  <span className="assignee-text">👤 {issue.assignee}</span>
                ) : (
                  <span className="text-muted">Unassigned</span>
                )}
              </td>
              <td className="actions-cell">
                <button
                  className="btn-icon"
                  title="Edit"
                  onClick={() => onEdit(issue)}
                  aria-label="Edit Issue"
                >
                  ✏️
                </button>
                <button
                  className="btn-icon btn-danger"
                  title="Delete"
                  onClick={() => onDelete(issue.id)}
                  aria-label="Delete Issue"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
