import type { PlayerPreview, TeamPreview } from "@/features/players/types";
import type { ServerSummary } from "@/features/server/types";

/**
 * Wireframe-only data.
 *
 * These values deliberately do not pretend to be live Mineacle data. The
 * final page will receive typed data from the API/services layer.
 */
export const wireframeServer: ServerSummary = {
  online: null,
  onlinePlayers: null,
  maxPlayers: null,
  version: null,
  updatedAt: null,
};

export const wireframePlayers: PlayerPreview[] = [
  {
    uuid: null,
    username: "Player identity",
    displayName: "Featured player",
    rankLabel: null,
    metricLabel: "Primary metric",
    metricValue: "—",
  },
  {
    uuid: null,
    username: "Player identity",
    displayName: "Featured player",
    rankLabel: null,
    metricLabel: "Primary metric",
    metricValue: "—",
  },
  {
    uuid: null,
    username: "Player identity",
    displayName: "Featured player",
    rankLabel: null,
    metricLabel: "Primary metric",
    metricValue: "—",
  },
];

export const wireframeTeams: TeamPreview[] = [
  {
    id: null,
    name: "Team identity",
    memberCount: null,
    metricLabel: "Primary metric",
    metricValue: "—",
  },
  {
    id: null,
    name: "Team identity",
    memberCount: null,
    metricLabel: "Primary metric",
    metricValue: "—",
  },
  {
    id: null,
    name: "Team identity",
    memberCount: null,
    metricLabel: "Primary metric",
    metricValue: "—",
  },
];
