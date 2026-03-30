const defaultFormatter = (value) => String(value);

const SimpleBarChart = ({ title, data = [], valueFormatter = defaultFormatter, emptyMessage }) => {
  const maxValue = data.length > 0 ? Math.max(...data.map((item) => Number(item.value || 0))) : 0;

  return (
    <div className="card section-card chart-card">
      <h3>{title}</h3>
      {data.length === 0 ? (
        <p className="small-text">{emptyMessage || "No chart data available."}</p>
      ) : (
        <div className="chart-list">
          {data.map((item) => {
            const value = Number(item.value || 0);
            const widthPercent = maxValue > 0 ? Math.max((value / maxValue) * 100, 3) : 0;
            return (
              <div key={item.label} className="chart-row">
                <div className="chart-label">{item.label}</div>
                <div className="chart-track">
                  <div
                    className="chart-fill"
                    style={{ width: `${widthPercent}%`, background: item.color || undefined }}
                  />
                </div>
                <div className="chart-value">{valueFormatter(value)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SimpleBarChart;
