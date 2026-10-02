import { LegalPage } from "@/components/legal/LegalPage";
import { getCurrentViewer } from "@/features/auth/session";
import { legalDocument } from "@/features/legal/legal-content";
import { getTopPlayers } from "@/features/players/top-players";

const doc = legalDocument("refunds");

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${doc.title} | Mineacle`,
  description: doc.description,
};

export default async function Page() {
  const [viewer, topPlayers] = await Promise.all([getCurrentViewer(), getTopPlayers()]);

  return <LegalPage viewer={viewer} topPlayers={topPlayers} doc={doc} />;
}
