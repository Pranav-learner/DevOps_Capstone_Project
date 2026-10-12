export default function Sidebar({ selectedProject, onSelectProject, projects = [] }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">⚡</span>
        <h2>DevTrack</h2>
      </div>

      <div className="sidebar-section">
        <h3>VIEWS</h3>
        <button
          className={`nav-item ${selectedProject === "ALL" ? "active" : ""}`}
          onClick={() => onSelectProject("ALL")}
        >
          📋 All Issues
        </button>
      </div>

      <div className="sidebar-section">
        <h3>PROJECTS</h3>
        {projects.length === 0 ? (
          <p className="sidebar-empty">No projects yet</p>
        ) : (
          projects.map((proj) => (
            <button
              key={proj}
              className={`nav-item ${selectedProject === proj ? "active" : ""}`}
              onClick={() => onSelectProject(proj)}
            >
              📁 {proj}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
