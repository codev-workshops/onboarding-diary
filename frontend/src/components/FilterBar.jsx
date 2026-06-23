export default function FilterBar({ filters, onFilterChange, filterConfig }) {
  return (
    <div className="filter-bar">
      {filterConfig.map((config) => (
        <div key={config.name} className="filter-item">
          <label>{config.label}</label>
          {config.type === 'date' ? (
            <input
              type="date"
              value={filters[config.name] || ''}
              onChange={(e) => onFilterChange(config.name, e.target.value)}
            />
          ) : (
            <select
              value={filters[config.name] || ''}
              onChange={(e) => onFilterChange(config.name, e.target.value)}
            >
              <option value="">All</option>
              {config.options.map((opt) => (
                <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
