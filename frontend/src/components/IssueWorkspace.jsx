import { useState, useMemo } from "react";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import { formatDate, formatRelativeTime, checkIsOverdue } from "../utils/formatters";

export default function IssueWorkspace({
  issues,
  onEditIssue,
  onDeleteIssue,
  onOpenCreateModal,
  selectedProject,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  overdueOnly,
  onOverdueToggle,
  sortBy,
  onSortChange,
  onClearFilters,
}) {
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Extract unique assignees from loaded issues
  const assignees = useMemo(() => {
    const set = new Set();
    issues.forEach((i) => {
      if (i.assignee && i.assignee.trim()) {
        set.add(i.assignee.trim());
      }
    });
    return Array.from(set).sort();
  }, [issues]);

  const hasActiveFilters =
    Boolean(searchTerm) ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    assigneeFilter !== "ALL" ||
    overdueOnly;

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="issues-workspace">
      {/* 1. Header Bar */}
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">
            {selectedProject === "ALL" ? "All Issues" : `${selectedProject} Issues`}
          </h1>
          <p className="workspace-subtitle">
            Dense issue management, filters, and priority queues
          </p>
        </div>
        <div className="workspace-actions">
          <button
            className="btn btn-primary"
            onClick={onOpenCreateModal}
            id="workspace-new-issue-btn"
          >
            <span>+</span> New Issue <kbd className="shortcut-kbd">C</kbd>
          </button>
        </div>
      </div>

      {/* 2. Controls Toolbar: Search & Filters */}
      <div className="toolbar-container">
        {/* Search Input */}
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search issues by title or description..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="filters-group">
          {/* Status Filter */}
          <div className="filter-select-wrapper">
            <span className="filter-prefix">Status:</span>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="BACKLOG">Backlog</option>
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="filter-select-wrapper">
            <span className="filter-prefix">Priority:</span>
            <select
              className="filter-select"
              value={priorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="filter-select-wrapper">
            <span className="filter-prefix">Assignee:</span>
            <select
              className="filter-select"
              value={assigneeFilter}
              onChange={(e) => onAssigneeFilterChange(e.target.value)}
            >
              <option value="ALL">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {assignees.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          {/* Overdue Toggle */}
          <button
            type="button"
            className={`btn-toggle ${overdueOnly ? "active" : ""}`}
            onClick={onOverdueToggle}
            title="Filter unfinished issues with past due dates"
          >
            <span>⏰ Overdue</span>
          </button>

          {/* Sort Selector */}
          <div className="filter-select-wrapper sort-wrapper">
            <span className="filter-prefix">Sort:</span>
            <select
              className="filter-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="updated">Recently updated</option>
              <option value="due_date">Due date</option>
              <option value="priority">Priority</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="active-filters-bar">
          <span className="active-filters-label">Active filters:</span>
          {searchTerm && (
            <span className="filter-chip">
              Search: "{searchTerm}"
              <button type="button" onClick={() => onSearchChange("")}>✕</button>
            </span>
          )}
          {statusFilter !== "ALL" && (
            <span className="filter-chip">
              Status: {statusFilter.replace("_", " ")}
              <button type="button" onClick={() => onStatusFilterChange("ALL")}>✕</button>
            </span>
          )}
          {priorityFilter !== "ALL" && (
            <span className="filter-chip">
              Priority: {priorityFilter}
              <button type="button" onClick={() => onPriorityFilterChange("ALL")}>✕</button>
            </span>
          )}
          {assigneeFilter !== "ALL" && (
            <span className="filter-chip">
              Assignee: {assigneeFilter}
              <button type="button" onClick={() => onAssigneeFilterChange("ALL")}>✕</button>
            </span>
          )}
          {overdueOnly && (
            <span className="filter-chip filter-chip-warning">
              Overdue only
              <button type="button" onClick={onOverdueToggle}>✕</button>
            </span>
          )}
          <button
            type="button"
            className="btn-clear-filters"
            onClick={onClearFilters}
          >
            Clear all
          </button>
        </div>
      )}

      {/* 3. Issue Table / List */}
      {issues.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3 className="empty-title">
            {hasActiveFilters ? "No matching issues" : "No issues found"}
          </h3>
          <p className="empty-description">
            {hasActiveFilters
              ? "Try adjusting your search query or removing active filters."
              : "Track your engineering tasks and sprint issues by creating your first task."}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              className="btn btn-secondary mt-3"
              onClick={onClearFilters}
            >
              Clear Filters
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={onOpenCreateModal}
            >
              + Create New Issue
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="issues-table">
            <thead>
              <tr>
                <th style={{ width: "70px" }}>ID</th>
                <th style={{ width: "130px" }}>Status</th>
                <th style={{ width: "110px" }}>Priority</th>
                <th>Title &amp; Labels</th>
                <th style={{ width: "130px" }}>Due Date</th>
                <th style={{ width: "150px" }}>Assignee</th>
                <th style={{ width: "110px" }}>Updated</th>
                <th style={{ width: "90px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => {
                const isOverdue = checkIsOverdue(issue.due_date, issue.status);
                const formattedDue = formatDate(issue.due_date);

                return (
                  <tr
                    key={issue.id}
                    className="issue-row"
                    onClick={() => onEditIssue(issue)}
                    title="Click to edit issue"
                  >
                    {/* Identifier */}
                    <td className="cell-id">
                      <span className="issue-id-tag">#{issue.id}</span>
                    </td>

                    {/* Status */}
                    <td className="cell-status">
                      <StatusBadge status={issue.status} size="sm" />
                    </td>

                    {/* Priority */}
                    <td className="cell-priority">
                      <PriorityBadge priority={issue.priority} size="sm" />
                    </td>

                    {/* Title & Description & Labels */}
                    <td className="cell-title">
                      <div className="title-row">
                        <span className="issue-title-heading">{issue.title}</span>
                        {issue.project && issue.project !== "DevTrack" && (
                          <span className="project-sub-badge">{issue.project}</span>
                        )}
                      </div>
                      {issue.description && (
                        <p className="issue-desc-snippet">{issue.description}</p>
                      )}
                      {issue.labels && issue.labels.length > 0 && (
                        <div className="labels-wrapper">
                          {issue.labels.map((label) => (
                            <span key={label} className="label-badge">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="cell-due">
                      {formattedDue ? (
                        <span className={`due-date-pill ${isOverdue ? "due-date-overdue" : ""}`}>
                          {isOverdue && <span className="warning-dot">⚠️</span>}
                          {formattedDue}
                        </span>
                      ) : (
                        <span className="text-subtle">–</span>
                      )}
                    </td>

                    {/* Assignee */}
                    <td className="cell-assignee">
                      {issue.assignee ? (
                        <div className="assignee-item">
                          <span className="assignee-avatar" title={issue.assignee}>
                            {getInitials(issue.assignee)}
                          </span>
                          <span className="assignee-name">{issue.assignee}</span>
                        </div>
                      ) : (
                        <span className="text-subtle">Unassigned</span>
                      )}
                    </td>

                    {/* Updated Time */}
                    <td className="cell-time">
                      <span className="timestamp-text">
                        {formatRelativeTime(issue.updated_at || issue.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="cell-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="btn-icon"
                        title="Edit issue"
                        onClick={() => onEditIssue(issue)}
                        aria-label={`Edit issue #${issue.id}`}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        title="Delete issue"
                        onClick={() => setDeleteCandidate(issue)}
                        aria-label={`Delete issue #${issue.id}`}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div
          className="modal-backdrop"
          onClick={() => setDeleteCandidate(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-box modal-box-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Delete Issue</h2>
              <button
                type="button"
                className="btn-close"
                onClick={() => setDeleteCandidate(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete{" "}
                <strong>
                  #{deleteCandidate.id} — {deleteCandidate.title}
                </strong>
                ?
              </p>
              <p className="text-subtle mt-2">
                This action cannot be undone and will permanently remove this issue.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  const id = deleteCandidate.id;
                  setDeleteCandidate(null);
                  onDeleteIssue(id);
                }}
              >
                Delete Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
