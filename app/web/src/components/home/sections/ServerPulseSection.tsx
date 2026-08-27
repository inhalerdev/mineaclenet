import type { ServerSummary } from "@/features/server/types";

type ServerPulseSectionProps = {
  server: ServerSummary;
};

export function ServerPulseSection({ server }: ServerPulseSectionProps) {
  const items = [
    ["Server", server.online === null ? "—" : server.online ? "Online" : "Offline"],
    ["Online", server.onlinePlayers ?? "—"],
    ["Version", server.version ?? "—"],
    ["Status / season", "—"],
  ];

  return (
    <section className="server-pulse" aria-label="Server pulse">
      {items.map(([label, value]) => (
        <div className="server-pulse__item" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <a className="wire-text-link" href="#">
        Full status →
      </a>
    </section>
  );
}
