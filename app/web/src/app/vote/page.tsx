import { AppSidebar } from "@/components/shell/AppSidebar";
import { getCurrentViewer } from "@/features/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Rewards | Mineacle",
  description: "Vote for Mineacle on active Minecraft server listings.",
};

const VOTE_SITES = [
  {
    name: "MinecraftServer.buzz",
    href: "https://minecraftserver.buzz/servers/mineacle-network/vote",
    note: "Direct Mineacle voting page",
  },
  {
    name: "Minecraft-MP",
    href: "https://minecraft-mp.com/server-s359207",
    note: "Mineacle server listing with its vote action",
  },
] as const;

export default async function VotePage() {
  const viewer = await getCurrentViewer();

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />

      <main className="system-page">
        <section className="system-card vote-shell">
          <header className="system-page-header">
            <div>
              <small>REWARDS</small>
              <h1>Vote for Mineacle</h1>
              <p>
                Use your Minecraft username when a listing asks for it.
                Availability and vote cooldowns are controlled by each listing.
              </p>
            </div>
          </header>

          <div className="vote-grid">
            {VOTE_SITES.map((site) => (
              <a
                className="vote-card"
                href={site.href}
                key={site.name}
                rel="noreferrer"
                target="_blank"
              >
                <span>
                  <small>ACTIVE LISTING</small>
                  <strong>{site.name}</strong>
                  <p>{site.note}</p>
                </span>
                <b>Open vote site →</b>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
