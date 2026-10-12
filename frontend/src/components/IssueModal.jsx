import { useState, useEffect } from "react";

export default function IssueModal({ isOpen, onClose, onSubmit, issueToEdit }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    project: "DevTrack",
    assignee: "",
  });

  useEffect(() => {
    if (issueToEdit) {
      setFormData({
        title: issueToEdit.title || "",
        description: issueToEdit.description || "",
        status: issueToEdit.status || "TODO",
        priority: issueToEdit.priority || "MEDIUM",
        project: issueToEdit.project || "DevTrack",
        assignee: issueToEdit.assignee || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        status: "TODO",
        priority: "MEDIUM",
        project: "DevTrack",
        assignee: "",
      });
    }
  }, [issueToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{issueToEdit ? `Edit Issue #${issueToEdit.id}` : "Create New Issue"}</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close Modal">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              required
              placeholder="e.g. Implement Dockerfile"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="project">Project *</label>
              <input
                id="project"
                type="text"
                required
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="assignee">Assignee</label>
              <input
                id="assignee"
                type="text"
                placeholder="e.g. Pranav"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="REVIEW">REVIEW</option>
                <option value="DONE">DONE</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows="3"
              placeholder="Add details, acceptance criteria, or notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {issueToEdit ? "Save Changes" : "Create Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
