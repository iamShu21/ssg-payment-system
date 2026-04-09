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
          {data.map((item, index) => {
            const value = Number(item.value || 0);
            const widthPercent = maxValue > 0 ? Math.max((value / maxValue) * 100, 3) : 0;
            return (
              <div
                key={item.id ?? item.fee_id ?? item.payment_id ?? item.student_fee_id ?? index}
                className="chart-row"
              >
                <div className="chart-label">{item.label}</div>
                <div className="chart-track">
                  <div
                    className="chart-fill"
                    style={{
                      width: `${widthPercent}%`,
                      background:
                        item.color || `rgb(var(--chart-${(index % 5) + 1}))`,
                    }}
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
