import { getUniverseAction } from "@/app/actions/universe";
import { CharacterCreationForm } from "@/components/character/character-creation-form";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ universeId?: string }>;
}

export default async function CreateCharacterPage({ searchParams }: PageProps) {
  const { universeId } = await searchParams;

  if (!universeId) {
    redirect("/universes");
  }

  const { success, universe } = await getUniverseAction(universeId);

  if (!success || !universe) {
    notFound();
  }

  return (
    <main className="container max-w-4xl py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Create New Character
        </h1>
        <p className="text-muted-foreground">
          Forge a new destiny in{" "}
          <span className="font-semibold text-primary">{universe.name}</span>
        </p>
      </div>

      <div className="p-6 border rounded-lg bg-muted/50">
        <h3 className="mb-2 font-semibold">Universe Ontology</h3>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <span className="block text-muted-foreground">Timeframe</span>
            {universe.ontology.timeframe}
          </div>
          <div>
            <span className="block text-muted-foreground">Magic</span>
            {universe.ontology.magicLevel}
          </div>
          <div>
            <span className="block text-muted-foreground">Tech/Physics</span>
            {universe.ontology.physics}
          </div>
        </div>
      </div>

      <CharacterCreationForm universe={universe} />
    </main>
  );
}
