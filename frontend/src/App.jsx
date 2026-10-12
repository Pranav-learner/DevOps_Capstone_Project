import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatCards from "./components/StatCards";
import IssueTable from "./components/IssueTable";
import IssueModal from "./components/IssueModal";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function App() {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    by_status: {},
    by_priority: {},
    by_project: {},
  });
  const [selectedProject, setSelectedProject] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch issues & statistics from FastAPI
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch issues list
      const issuesUrl =
        selectedProject === "ALL"
          ? `${API_BASE_URL}/api/issues`
          : `${API_BASE_URL}/api/issues?project=${encodeURIComponent(selectedProject)}`;

      const [issuesRes, statsRes] = await Promise.all([
        fetch(issuesUrl),
        fetch(`${API_BASE_URL}/api/issues/stats`),
      ]);

      if (!issuesRes.ok || !statsRes.ok) {
        throw new Error(
          `Failed to fetch from backend (Issues: ${issuesRes.status}, Stats: ${statsRes.status})`
        );
      }

      const issuesData = await issuesRes.json();
      const statsData = await statsRes.json();

      setIssues(issuesData);
      setStats(statsData);
    } catch (err) {
      console.error("Error connecting to DevTrack API:", err);
      setError(
        "Could not connect to FastAPI backend at " +
          API_BASE_URL +
          ". Is Uvicorn running on port 8000?"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProject]);

  // 2. Create new issue (POST)
  const handleCreateIssue = async (formData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error(`Failed to create issue (${res.status})`);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      alert("Error creating issue: " + err.message);
    }
  };

  // 3. Update existing issue (PUT)
  const handleUpdateIssue = async (formData) => {
    if (!editingIssue) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/issues/${editingIssue.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error(`Failed to update issue (${res.status})`);
      }

      setIsModalOpen(false);
      setEditingIssue(null);
      await fetchData();
    } catch (err) {
      alert("Error updating issue: " + err.message);
    }
  };

  // 4. Delete issue (DELETE)
  const handleDeleteIssue = async (id) => {
    if (!confirm(`Are you sure you want to delete issue #${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/issues/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Failed to delete issue (${res.status})`);
      }

      await fetchData();
    } catch (err) {
      alert("Error deleting issue: " + err.message);
    }
  };

  // Compute available project names from stats
  const projects = Object.keys(stats?.by_project || {});

  return (
    <div className="app-layout">
      <Sidebar
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        projects={projects}
      />

      <main className="main-content">
        <Header
          selectedProject={selectedProject}
          onOpenCreateModal={() => {
            setEditingIssue(null);
            setIsModalOpen(true);
          }}
        />

        {error && (
          <div className="status-banner error">
            <span>⚠️ {error}</span>
            <button className="btn btn-secondary" onClick={fetchData}>
              Retry
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="status-banner loading">
            <span>⏳ Loading DevTrack data from FastAPI...</span>
          </div>
        )}

        <StatCards stats={stats} />

        <IssueTable
          issues={issues}
          onEdit={(issue) => {
            setEditingIssue(issue);
            setIsModalOpen(true);
          }}
          onDelete={handleDeleteIssue}
        />

        <IssueModal
          isOpen={isModalOpen}
          issueToEdit={editingIssue}
          onClose={() => {
            setIsModalOpen(false);
            setEditingIssue(null);
          }}
          onSubmit={editingIssue ? handleUpdateIssue : handleCreateIssue}
        />
      </main>
    </div>
  );
}
