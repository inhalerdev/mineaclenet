export function AccountUtilitySection() {
  return (
    <section className="account-utility section-frame" aria-labelledby="account-utility-title">
      <div className="account-utility__media wire-media">
        <span>Player / world visual</span>
      </div>

      <div className="account-utility__content">
        <span className="wire-kicker">Companion app surface</span>
        <h2 id="account-utility-title">The homepage changes when the player signs in</h2>
        <p className="wire-copy">
          This area can become balance movement, notifications, team updates,
          recent fights, followed players, and account actions. Signed-out
          visitors instead receive a concise account-claim entry point.
        </p>

        <div className="account-utility__preview" aria-label="Authenticated utility placeholders">
          <div>
            <span>Balance / stat</span>
            <strong>—</strong>
          </div>
          <div>
            <span>Rank / position</span>
            <strong>—</strong>
          </div>
          <div>
            <span>Notifications</span>
            <strong>—</strong>
          </div>
        </div>

        <a className="wire-button" href="#">
          Claim player / sign in
        </a>
      </div>
    </section>
  );
}
