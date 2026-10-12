export default function Header({ selectedProject, onOpenCreateModal }) {
  return (
    <header className="header">
      <div>
        <h1>{selectedProject === "ALL" ? "All Projects Dashboard" : `${selectedProject} Dashboard`}</h1>
        <p className="subtitle">Track tasks, priorities, and development velocity</p>
      </div>
      <button className="btn btn-primary" onClick={onOpenCreateModal}>
        + New Issue
      </button>
    </header>
  );
}
