import { PunishmentsPage } from "@/components/punishments/PunishmentsPage";
import { getCurrentViewer } from "@/features/auth/session";
import { readPunishmentFilters } from "@/features/punishments/format";
import {
  getPunishments,
  type PunishmentPage,
} from "@/features/punishments/repository";
import { getTopPlayers } from "@/features/players/top-players";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bans & Punishments | Mineacle",
  description: "Search Mineacle's public record of bans, mutes, warnings and kicks.",
};

async function loadRecords(
  filters: ReturnType<typeof readPunishmentFilters>,
): Promise<PunishmentPage | null> {
  try {
    return await getPunishments({
      search: filters.q,
      type: filters.type,
      status: filters.status,
      page: filters.page,
      pageSize: 30,
    });
  } catch (error) {
    console.error("[mineacle-punishments] Failed to load LiteBans data", error);
    return null;
  }
}

export default async function Punishments({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = readPunishmentFilters(await searchParams);
  const [viewer, topPlayers, data] = await Promise.all([
    getCurrentViewer(),
    getTopPlayers(),
    loadRecords(filters),
  ]);

  return (
    <PunishmentsPage
      viewer={viewer}
      topPlayers={topPlayers}
      filters={{ q: filters.q, type: filters.type, status: filters.status }}
      data={data}
    />
  );
}
