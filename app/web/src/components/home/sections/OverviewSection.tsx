export function OverviewSection() {
  return (
    <section className="overview-section section-frame" aria-labelledby="overview-title">
      <div className="section-heading">
        <span className="wire-kicker">What Mineacle is</span>
        <h2 id="overview-title">Large explanatory statement</h2>
      </div>

      <div className="overview-section__body">
        <p className="wire-copy wire-copy--wide">
          One concise explanation of the server experience belongs here. The
          wireframe reserves space for hierarchy only, not final marketing copy.
        </p>

        <div className="overview-section__points">
          <div>
            <span>01</span>
            <strong>Core differentiator</strong>
          </div>
          <div>
            <span>02</span>
            <strong>Core differentiator</strong>
          </div>
          <div>
            <span>03</span>
            <strong>Core differentiator</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
