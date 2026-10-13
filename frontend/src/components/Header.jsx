export default function Header({
  currentView,
  selectedProject,
  onOpenCreateModal,
  onRefresh,
  onToggleMobileSidebar,
  isRefreshing,
}) {
  const getViewTitle = () => {
    if (currentView === "overview") return "Overview";
    if (currentView === "my-issues") return "My Issues";
    return "All Issues";
  };

  return (
    <header className="top-nav-bar">
      <div className="top-nav-left">
        <button
          type="button"
          className="btn-menu-toggle"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>

        <div className="breadcrumb-trail">
          <span className="breadcrumb-workspace">DevTrack</span>
          <span className="breadcrumb-separator">/</span>
          {selectedProject !== "ALL" && (
            <>
              <span className="breadcrumb-project">{selectedProject}</span>
              <span className="breadcrumb-separator">/</span>
            </>
          )}
          <span className="breadcrumb-current">{getViewTitle()}</span>
        </div>
      </div>

      <div className="top-nav-right">
        <button
          type="button"
          className="btn-refresh"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh data from server"
          aria-label="Refresh data"
        >
          <span className={`refresh-icon ${isRefreshing ? "spin" : ""}`}>🔄</span>
          <span className="btn-refresh-text">Refresh</span>
        </button>

        <button
          type="button"
          className="btn btn-primary top-create-btn"
          onClick={onOpenCreateModal}
        >
          <span>+</span> New Issue
        </button>
      </div>
    </header>
  );
}
