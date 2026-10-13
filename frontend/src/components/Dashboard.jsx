import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import { formatRelativeTime, checkIsOverdue } from "../utils/formatters";

export default function Dashboard({
  stats,
  onNavigateToIssues,
  onOpenCreateModal,
  onEditIssue,
  selectedProject,
}) {
  const total = stats?.total || 0;
  const openCount = stats?.open || 0;
  const inProgressCount = stats?.in_progress || 0;
  const completedCount = stats?.completed || 0;
  const overdueCount = stats?.overdue || 0;

  const byStatus = stats?.by_status || {};
  const byPriority = stats?.by_priority || {};
  const recentIssues = stats?.recent_issues || [];

  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // Status distribution items
  const statusItems = [
    { key: "BACKLOG", label: "Backlog", color: "#6e7681", count: byStatus.BACKLOG || 0 },
    { key: "TODO", label: "Todo", color: "#94a3b8", count: byStatus.TODO || 0 },
    { key: "IN_PROGRESS", label: "In Progress", color: "#f59e0b", count: byStatus.IN_PROGRESS || 0 },
    { key: "IN_REVIEW", label: "In Review", color: "#a855f7", count: byStatus.IN_REVIEW || 0 },
    { key: "DONE", label: "Done", color: "#6366f1", count: byStatus.DONE || 0 },
  ];

  // Priority distribution items
  const priorityItems = [
    { key: "CRITICAL", label: "Critical", color: "#ef4444", count: byPriority.CRITICAL || 0 },
    { key: "HIGH", label: "High", color: "#f97316", count: byPriority.HIGH || 0 },
    { key: "MEDIUM", label: "Medium", color: "#eab308", count: byPriority.MEDIUM || 0 },
    { key: "LOW", label: "Low", color: "#64748b", count: byPriority.LOW || 0 },
  ];

  return (
    <div className="dashboard-container">
      {/* 1. Header Bar */}
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">
            {selectedProject === "ALL" ? "Workspace Overview" : `${selectedProject} Overview`}
          </h1>
          <p className="workspace-subtitle">
            Linear-style engineering dashboard & velocity metrics
          </p>
        </div>
        <div className="workspace-actions">
          <button
            className="btn btn-primary"
            onClick={onOpenCreateModal}
            id="dashboard-new-issue-btn"
          >
            <span>+</span> New Issue <kbd className="shortcut-kbd">C</kbd>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <div className="stat-cards-grid">
        <button
          type="button"
          className="stat-card"
          onClick={() => onNavigateToIssues({})}
          title="View all issues"
        >
          <div className="stat-header">
            <span className="stat-label">Total Issues</span>
            <span className="stat-pill">All</span>
          </div>
          <div className="stat-count-row">
            <span className="stat-count">{total}</span>
            <span className="stat-icon-badge">📁</span>
          </div>
          <div className="stat-footer">Across active workspace</div>
        </button>

        <button
          type="button"
          className="stat-card"
          onClick={() => onNavigateToIssues({ status: "OPEN" })}
          title="View open unfinished issues"
        >
          <div className="stat-header">
            <span className="stat-label">Open Issues</span>
            <span className="stat-pill stat-pill-blue">Active</span>
          </div>
          <div className="stat-count-row">
            <span className="stat-count">{openCount}</span>
            <span className="stat-icon-badge">○</span>
          </div>
          <div className="stat-footer">
            {total > 0 ? `${Math.round((openCount / total) * 100)}% of total workload` : "No open issues"}
          </div>
        </button>

        <button
          type="button"
          className="stat-card"
          onClick={() => onNavigateToIssues({ status: "IN_PROGRESS" })}
          title="View in progress issues"
        >
          <div className="stat-header">
            <span className="stat-label">In Progress</span>
            <span className="stat-pill stat-pill-amber">Current</span>
          </div>
          <div className="stat-count-row">
            <span className="stat-count text-amber">{inProgressCount}</span>
            <span className="stat-icon-badge text-amber">◐</span>
          </div>
          <div className="stat-footer">Active engineering focus</div>
        </button>

        <button
          type="button"
          className="stat-card"
          onClick={() => onNavigateToIssues({ status: "DONE" })}
          title="View completed issues"
        >
          <div className="stat-header">
            <span className="stat-label">Completed Issues</span>
            <span className="stat-pill stat-pill-green">Done</span>
          </div>
          <div className="stat-count-row">
            <span className="stat-count text-green">{completedCount}</span>
            <span className="stat-icon-badge text-green">✓</span>
          </div>
          <div className="stat-footer">{completionRate}% completed rate</div>
        </button>

        <button
          type="button"
          className={`stat-card ${overdueCount > 0 ? "stat-card-warning" : ""}`}
          onClick={() => onNavigateToIssues({ overdue: true })}
          title="View overdue unfinished issues"
        >
          <div className="stat-header">
            <span className="stat-label">Overdue</span>
            <span className={`stat-pill ${overdueCount > 0 ? "stat-pill-red" : "stat-pill-muted"}`}>
              {overdueCount > 0 ? "Attention" : "On track"}
            </span>
          </div>
          <div className="stat-count-row">
            <span className={`stat-count ${overdueCount > 0 ? "text-red" : ""}`}>{overdueCount}</span>
            <span className="stat-icon-badge text-red">⚠️</span>
          </div>
          <div className="stat-footer">
            {overdueCount > 0 ? "Past due date & uncompleted" : "All deadlines met"}
          </div>
        </button>
      </div>

      {/* 3. Visualizations Row */}
      <div className="dashboard-grid-two">
        {/* Progress & Status Distribution */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Workflow Distribution</h3>
              <p className="panel-subtitle">Issues organized by lifecycle stage</p>
            </div>
            <div className="completion-chip">
              <span className="completion-value">{completionRate}%</span>
              <span className="completion-label">Complete</span>
            </div>
          </div>

          {/* Stacked Progress Bar */}
          <div className="stacked-bar-container" title={`Completion: ${completionRate}%`}>
            {total === 0 ? (
              <div className="stacked-segment-empty" />
            ) : (
              statusItems.map((item) => {
                const pct = (item.count / total) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={item.key}
                    className="stacked-segment"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: item.color,
                    }}
                    title={`${item.label}: ${item.count} (${Math.round(pct)}%)`}
                  />
                );
              })
            )}
          </div>

          {/* Status Breakdown Legend */}
          <div className="distribution-legend">
            {statusItems.map((item) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <button
                  type="button"
                  key={item.key}
                  className="legend-item"
                  onClick={() => onNavigateToIssues({ status: item.key })}
                  title={`Filter issues by ${item.label}`}
                >
                  <div className="legend-left">
                    <span className="legend-dot" style={{ backgroundColor: item.color }} />
                    <span className="legend-name">{item.label}</span>
                  </div>
                  <div className="legend-right">
                    <span className="legend-count">{item.count}</span>
                    <span className="legend-pct">{pct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution Bar Chart */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Priority Breakdown</h3>
              <p className="panel-subtitle">Distribution across urgency tiers</p>
            </div>
            <span className="panel-tag">Tiers</span>
          </div>

          <div className="priority-bars-container">
            {priorityItems.map((item) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <button
                  type="button"
                  key={item.key}
                  className="priority-bar-row"
                  onClick={() => onNavigateToIssues({ priority: item.key })}
                  title={`Filter issues by ${item.label} priority`}
                >
                  <div className="priority-bar-header">
                    <div className="priority-label-group">
                      <PriorityBadge priority={item.key} size="sm" />
                    </div>
                    <div className="priority-stats">
                      <span className="priority-count">{item.count}</span>
                      <span className="priority-pct">{pct}%</span>
                    </div>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Recent Issues */}
      <div className="panel-card recent-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Recent Activity</h3>
            <p className="panel-subtitle">Latest updated issues in DevTrack</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onNavigateToIssues({})}
          >
            View all ({total}) →
          </button>
        </div>

        {recentIssues.length === 0 ? (
          <div className="empty-state-mini">
            <span className="empty-icon-mini">📂</span>
            <p className="empty-text">No recent issues found. Create your first issue to get started.</p>
          </div>
        ) : (
          <div className="recent-list">
            {recentIssues.map((issue) => {
              const isOverdue = checkIsOverdue(issue.due_date, issue.status);

              return (
                <div
                  key={issue.id}
                  className="recent-row"
                  onClick={() => onEditIssue(issue)}
                  title="Click to view or edit"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onEditIssue(issue);
                    }
                  }}
                >
                  <div className="recent-main">
                    <span className="issue-id-pill">#{issue.id}</span>
                    <StatusBadge status={issue.status} size="sm" />
                    <span className="recent-title">{issue.title}</span>
                  </div>

                  <div className="recent-meta">
                    {issue.labels && issue.labels.length > 0 && (
                      <div className="labels-group">
                        {issue.labels.slice(0, 2).map((label) => (
                          <span key={label} className="label-chip">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                    <PriorityBadge priority={issue.priority} size="sm" />
                    {issue.due_date && (
                      <span className={`due-pill ${isOverdue ? "due-overdue" : ""}`}>
                        📅 {new Date(issue.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                    <span className="assignee-pill">
                      {issue.assignee ? `👤 ${issue.assignee}` : "Unassigned"}
                    </span>
                    <span className="time-pill">{formatRelativeTime(issue.updated_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
