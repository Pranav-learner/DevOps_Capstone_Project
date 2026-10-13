import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import IssueWorkspace from "./components/IssueWorkspace";
import IssueModal from "./components/IssueModal";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState("overview"); // 'overview' | 'issues' | 'my-issues'
  const [selectedProject, setSelectedProject] = useState("ALL");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Issues & Statistics State
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
    by_status: {},
    by_priority: {},
    by_project: {},
    recent_issues: [],
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, updated, due_date, priority, title

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);

  // Debounce search input (300ms)
  const searchTimeoutRef = useRef(null);
  const handleSearchChange = (val) => {
    setSearchInput(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val.trim());
    }, 300);
  };

  // Map sort option to backend parameters
  const getSortParams = (sortKey) => {
    switch (sortKey) {
      case "oldest":
        return { sort_by: "created_at", order: "asc" };
      case "updated":
        return { sort_by: "updated_at", order: "desc" };
      case "due_date":
        return { sort_by: "due_date", order: "asc" };
      case "priority":
        return { sort_by: "priority", order: "desc" };
      case "title":
        return { sort_by: "title", order: "asc" };
      case "newest":
      default:
        return { sort_by: "created_at", order: "desc" };
    }
  };

  // Fetch data from backend
  const fetchData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      // Build Issues Query URL
      const params = new URLSearchParams();
      if (selectedProject !== "ALL") {
        params.append("project", selectedProject);
      }

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }

      if (priorityFilter !== "ALL") {
        params.append("priority", priorityFilter);
      }

      if (currentView === "my-issues") {
        // If viewing "My Issues", show assigned issues (or specific current developer)
        params.append("assignee", "Pranav");
      } else if (assigneeFilter !== "ALL") {
        params.append("assignee", assigneeFilter);
      }

      if (overdueOnly) {
        params.append("overdue", "true");
      }

      const { sort_by, order } = getSortParams(sortBy);
      params.append("sort_by", sort_by);
      params.append("order", order);

      // Stats URL
      const statsUrl =
        selectedProject === "ALL"
          ? `${API_BASE_URL}/api/issues/stats`
          : `${API_BASE_URL}/api/issues/stats?project=${encodeURIComponent(selectedProject)}`;

      const issuesUrl = `${API_BASE_URL}/api/issues?${params.toString()}`;

      const [issuesRes, statsRes] = await Promise.all([
        fetch(issuesUrl),
        fetch(statsUrl),
      ]);

      if (!issuesRes.ok || !statsRes.ok) {
        throw new Error(
          `Backend request failed (Issues: ${issuesRes.status}, Stats: ${statsRes.status})`
        );
      }

      const issuesData = await issuesRes.json();
      const statsData = await statsRes.json();

      setIssues(issuesData);
      setStats(statsData);
    } catch (err) {
      console.error("DevTrack fetch error:", err);
      setError(
        `Unable to reach backend at ${API_BASE_URL}. Verify that FastAPI is running on port 8000.`
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [
    selectedProject,
    debouncedSearch,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    overdueOnly,
    sortBy,
    currentView,
  ]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Global keyboard shortcut ('C' for New Issue)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.key === "c" || e.key === "C") &&
        !isModalOpen &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "SELECT"
      ) {
        e.preventDefault();
        setEditingIssue(null);
        setIsModalOpen(true);
      } else if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  // Create Issue
  const handleCreateIssue = async (formData) => {
    const res = await fetch(`${API_BASE_URL}/api/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error (${res.status})`);
    }

    setIsModalOpen(false);
    await fetchData(true);
  };

  // Update Issue
  const handleUpdateIssue = async (formData) => {
    if (!editingIssue) return;
    const res = await fetch(`${API_BASE_URL}/api/issues/${editingIssue.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error (${res.status})`);
    }

    setIsModalOpen(false);
    setEditingIssue(null);
    await fetchData(true);
  };

  // Delete Issue
  const handleDeleteIssue = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/issues/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to delete issue (${res.status})`);
      }

      await fetchData(true);
    } catch (err) {
      alert("Error deleting issue: " + err.message);
    }
  };

  // Handle Dashboard Click Navigation to Filtered Issues
  const handleDashboardFilterNavigate = (targetFilter = {}) => {
    if (targetFilter.status === "OPEN") {
      // Clear status filter to view active work
      setStatusFilter("ALL");
      setOverdueOnly(false);
    } else if (targetFilter.status) {
      setStatusFilter(targetFilter.status);
      setOverdueOnly(false);
    } else if (targetFilter.priority) {
      setPriorityFilter(targetFilter.priority);
      setOverdueOnly(false);
    } else if (targetFilter.overdue) {
      setOverdueOnly(true);
      setStatusFilter("ALL");
    } else {
      // Clear all
      setStatusFilter("ALL");
      setPriorityFilter("ALL");
      setAssigneeFilter("ALL");
      setOverdueOnly(false);
      setSearchInput("");
      setDebouncedSearch("");
    }
    setCurrentView("issues");
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setAssigneeFilter("ALL");
    setOverdueOnly(false);
  };

  const projects = Object.keys(stats?.by_project || {});

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        projects={projects}
        totalCount={stats?.total || 0}
        onOpenCreateModal={() => {
          setEditingIssue(null);
          setIsModalOpen(true);
        }}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Workspace */}
      <div className="workspace-main">
        <Header
          currentView={currentView}
          selectedProject={selectedProject}
          onOpenCreateModal={() => {
            setEditingIssue(null);
            setIsModalOpen(true);
          }}
          onRefresh={() => fetchData(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isRefreshing={isRefreshing}
        />

        <main className="content-scroll-area">
          {/* Recoverable Error Banner */}
          {error && (
            <div className="banner-alert banner-error" role="alert">
              <div className="banner-text">
                <span className="banner-icon">⚠️</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fetchData(false)}
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && !error && (
            <div className="loading-state-wrapper">
              <div className="loading-spinner" />
              <span className="loading-text">Synchronizing DevTrack workspace...</span>
            </div>
          )}

          {/* Views */}
          {!loading && !error && currentView === "overview" && (
            <Dashboard
              stats={stats}
              onNavigateToIssues={handleDashboardFilterNavigate}
              onOpenCreateModal={() => {
                setEditingIssue(null);
                setIsModalOpen(true);
              }}
              onEditIssue={(issue) => {
                setEditingIssue(issue);
                setIsModalOpen(true);
              }}
              selectedProject={selectedProject}
            />
          )}

          {!loading && !error && (currentView === "issues" || currentView === "my-issues") && (
            <IssueWorkspace
              issues={issues}
              onEditIssue={(issue) => {
                setEditingIssue(issue);
                setIsModalOpen(true);
              }}
              onDeleteIssue={handleDeleteIssue}
              onOpenCreateModal={() => {
                setEditingIssue(null);
                setIsModalOpen(true);
              }}
              selectedProject={selectedProject}
              searchTerm={searchInput}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              assigneeFilter={assigneeFilter}
              onAssigneeFilterChange={setAssigneeFilter}
              overdueOnly={overdueOnly}
              onOverdueToggle={() => setOverdueOnly(!overdueOnly)}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onClearFilters={handleClearFilters}
            />
          )}
        </main>

        {/* Create / Edit Modal */}
        <IssueModal
          isOpen={isModalOpen}
          issueToEdit={editingIssue}
          onClose={() => {
            setIsModalOpen(false);
            setEditingIssue(null);
          }}
          onSubmit={editingIssue ? handleUpdateIssue : handleCreateIssue}
        />
      </div>
    </div>
  );
}
