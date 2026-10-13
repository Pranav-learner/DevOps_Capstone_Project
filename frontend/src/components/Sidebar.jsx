export default function Sidebar({
  currentView,
  onSelectView,
  selectedProject,
  onSelectProject,
  projects = [],
  totalCount = 0,
  onOpenCreateModal,
  isMobileOpen = false,
  onCloseMobile,
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isMobileOpen ? "sidebar-mobile-open" : ""}`}>
        {/* Workspace Brand */}
        <div className="sidebar-brand-wrapper">
          <div className="sidebar-brand">
            <span className="brand-logo-icon">⚡</span>
            <div className="brand-text-group">
              <span className="brand-name">DevTrack</span>
              <span className="brand-workspace-pill">Engineering</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close-mobile-btn"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="sidebar-action-container">
          <button
            type="button"
            className="btn btn-primary sidebar-create-btn"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onOpenCreateModal();
            }}
            id="sidebar-new-issue-btn"
          >
            <span className="create-plus-icon">+</span>
            <span>New Issue</span>
            <kbd className="sidebar-kbd">C</kbd>
          </button>
        </div>

        {/* Primary Navigation */}
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Views</h3>
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${currentView === "overview" ? "active" : ""}`}
              onClick={() => {
                onSelectView("overview");
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-label">Overview</span>
            </button>

            <button
              type="button"
              className={`nav-item ${currentView === "issues" ? "active" : ""}`}
              onClick={() => {
                onSelectView("issues");
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <span className="nav-icon">📋</span>
              <span className="nav-label">All Issues</span>
              {totalCount > 0 && <span className="nav-badge">{totalCount}</span>}
            </button>

            <button
              type="button"
              className={`nav-item ${currentView === "my-issues" ? "active" : ""}`}
              onClick={() => {
                onSelectView("my-issues");
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <span className="nav-icon">👤</span>
              <span className="nav-label">My Issues</span>
            </button>
          </nav>
        </div>

        {/* Projects Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <h3 className="sidebar-section-title">Projects</h3>
            <span className="sidebar-count">{projects.length}</span>
          </div>

          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${selectedProject === "ALL" ? "active" : ""}`}
              onClick={() => {
                onSelectProject("ALL");
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <span className="nav-icon">📁</span>
              <span className="nav-label">All Projects</span>
            </button>

            {projects.map((proj) => (
              <button
                type="button"
                key={proj}
                className={`nav-item ${selectedProject === proj ? "active" : ""}`}
                onClick={() => {
                  onSelectProject(proj);
                  if (onCloseMobile) onCloseMobile();
                }}
              >
                <span className="nav-icon">📂</span>
                <span className="nav-label">{proj}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-indicator-dot" />
            <span className="system-status-text">FastAPI Backend Connected</span>
          </div>
        </div>
      </aside>
    </>
  );
}
