export function JoinSection() {
  return (
    <section className="join-section section-frame" aria-labelledby="join-title">
      <div>
        <span className="wire-kicker">Final action</span>
        <h2 id="join-title">Join Mineacle</h2>
        <p className="wire-copy">Short joining instruction / server identity area.</p>
      </div>

      <div className="join-section__actions">
        <div className="server-address">
          <span>Server address</span>
          <strong>mineacle.net</strong>
        </div>
        <a className="wire-button" href="#">
          Copy / play action
        </a>
      </div>
    </section>
  );
}
