import { useState } from "react";

function IssueForm({ issueToEdit, onClose, onSubmit }) {
  const getInitialDueDate = () => {
    if (!issueToEdit?.due_date) return "";
    try {
      return new Date(issueToEdit.due_date).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const [formData, setFormData] = useState({
    title: issueToEdit?.title || "",
    description: issueToEdit?.description || "",
    status: issueToEdit?.status || "TODO",
    priority: issueToEdit?.priority || "MEDIUM",
    project: issueToEdit?.project || "DevTrack",
    assignee: issueToEdit?.assignee || "",
    due_date: getInitialDueDate(),
    labelsText: Array.isArray(issueToEdit?.labels) ? issueToEdit.labels.join(", ") : "",
  });

  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setValidationError("Issue title is required.");
      return;
    }

    setIsSubmitting(true);
    setValidationError("");

    try {
      const labels = formData.labelsText
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);

      let due_date = null;
      if (formData.due_date) {
        due_date = new Date(`${formData.due_date}T23:59:59Z`).toISOString();
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
        project: formData.project.trim() || "DevTrack",
        assignee: formData.assignee.trim() || null,
        due_date,
        labels,
      };

      await onSubmit(payload);
    } catch (err) {
      setValidationError(err.message || "Failed to submit issue");
      setIsSubmitting(false);
    }
  };

  const parsedLabels = formData.labelsText
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <form onSubmit={handleSubmit}>
      {validationError && (
        <div className="modal-alert-error" role="alert">
          <span>⚠️ {validationError}</span>
        </div>
      )}

      {/* Title Field */}
      <div className="form-group">
        <label htmlFor="modal-title-input">
          Title <span className="req-star">*</span>
        </label>
        <input
          id="modal-title-input"
          type="text"
          className="form-input"
          required
          placeholder="e.g. Implement Prometheus metrics exporter"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          autoFocus
          disabled={isSubmitting}
        />
      </div>

      {/* Description Field */}
      <div className="form-group">
        <label htmlFor="modal-description-input">Description</label>
        <textarea
          id="modal-description-input"
          rows={3}
          className="form-textarea"
          placeholder="Add details, acceptance criteria, error logs, or notes..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={isSubmitting}
        />
      </div>

      {/* Status & Priority Row */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="modal-status-select">Status</label>
          <select
            id="modal-status-select"
            className="form-select"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            disabled={isSubmitting}
          >
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">Todo</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="modal-priority-select">Priority</label>
          <select
            id="modal-priority-select"
            className="form-select"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            disabled={isSubmitting}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* Assignee & Due Date Row */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="modal-assignee-input">Assignee</label>
          <input
            id="modal-assignee-input"
            type="text"
            className="form-input"
            placeholder="e.g. Alex Chen"
            value={formData.assignee}
            onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="modal-due-date-input">Due Date</label>
          <input
            id="modal-due-date-input"
            type="date"
            className="form-input"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Project & Labels Row */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="modal-project-input">Project</label>
          <input
            id="modal-project-input"
            type="text"
            className="form-input"
            placeholder="DevTrack"
            value={formData.project}
            onChange={(e) => setFormData({ ...formData, project: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="modal-labels-input">Labels (comma separated)</label>
          <input
            id="modal-labels-input"
            type="text"
            className="form-input"
            placeholder="e.g. bug, backend, api"
            value={formData.labelsText}
            onChange={(e) => setFormData({ ...formData, labelsText: e.target.value })}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Label Preview Tags */}
      {parsedLabels.length > 0 && (
        <div className="label-preview-row">
          <span className="label-preview-title">Preview:</span>
          <div className="labels-wrapper">
            {parsedLabels.map((tag) => (
              <span key={tag} className="label-badge">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span>Saving...</span>
          ) : issueToEdit ? (
            "Save Changes"
          ) : (
            "Create Issue"
          )}
        </button>
      </div>
    </form>
  );
}

export default function IssueModal({ isOpen, onClose, onSubmit, issueToEdit }) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-modal-title"
    >
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">⚡</span>
            <h2 id="issue-modal-title" className="modal-title">
              {issueToEdit ? `Edit Issue #${issueToEdit.id}` : "Create New Issue"}
            </h2>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <IssueForm
          key={issueToEdit ? `edit-${issueToEdit.id}` : "create-new"}
          issueToEdit={issueToEdit}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
