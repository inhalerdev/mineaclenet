import { MarketplacePage } from "@/components/marketplace/MarketplacePage";
import { getCurrentViewer } from "@/features/auth/session";
import {
  featuredPackageId,
  getMarketplaceCategories,
} from "@/features/marketplace/tebex";
import { getTopPlayers } from "@/features/players/top-players";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketplace | Mineacle",
  description:
    "Crate keys and more for Mineacle, delivered in-game to your Minecraft account.",
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Marketplace({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [viewer, topPlayers, categories] = await Promise.all([
    getCurrentViewer(),
    getTopPlayers(),
    getMarketplaceCategories(),
  ]);

  return (
    <MarketplacePage
      viewer={viewer}
      topPlayers={topPlayers}
      categories={categories}
      featuredId={featuredPackageId(categories)}
      activeSlug={single(params.category) ?? null}
      purchased={single(params.purchased) === "1"}
    />
  );
}
