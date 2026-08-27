export function WorldActivitySection() {
  return (
    <section className="activity-section section-frame" aria-labelledby="activity-title">
      <div className="section-heading section-heading--row">
        <div>
          <span className="wire-kicker">World activity</span>
          <h2 id="activity-title">A living feed from server systems</h2>
        </div>
        <span className="wire-muted">Public-safe events only</span>
      </div>

      <div className="activity-stream">
        {["Economy event", "Competitive event", "Team event", "Server event"].map(
          (label, index) => (
            <div className="activity-row" key={label}>
              <span className="activity-row__time">{index + 1}m</span>
              <span className="activity-row__marker" aria-hidden="true" />
              <strong>{label}</strong>
              <span>Short normalized event description</span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
