export default function StatCards({ stats }) {
  const cards = [
    { label: "Total Issues", count: stats?.total || 0, icon: "📊", color: "blue" },
    { label: "In Progress", count: stats?.by_status?.IN_PROGRESS || 0, icon: "⏳", color: "amber" },
    { label: "Completed", count: stats?.by_status?.DONE || 0, icon: "✅", color: "green" },
    {
      label: "Critical / High",
      count: (stats?.by_priority?.CRITICAL || 0) + (stats?.by_priority?.HIGH || 0),
      icon: "🔥",
      color: "red",
    },
  ];

  return (
    <div className="stat-cards-grid">
      {cards.map((c) => (
        <div key={c.label} className={`stat-card card-${c.color}`}>
          <div className="stat-icon">{c.icon}</div>
          <div>
            <span className="stat-count">{c.count}</span>
            <span className="stat-label">{c.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
