import { db } from "@/lib/db";
import {
  runs,
  campaigns,
  characters,
  universes,
  messages,
} from "@/lib/db/schema";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { GamePlayClient } from "./game-play-client";
import { getPublicUrl } from "@/lib/storage/r2";
import type { CoreMessage } from "ai";

interface PlayPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { userId: clerkUserId } = await auth();
  const { id } = await params;

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const userProfile = await getUserProfileByClerkId(clerkUserId);
  if (!userProfile) {
    redirect("/sign-in");
  }

  // Fetch run with campaign, character, and universe details
  const [runData] = await db
    .select({
      run: runs,
      campaign: campaigns,
      character: characters,
      universe: universes,
    })
    .from(runs)
    .innerJoin(campaigns, eq(runs.campaignId, campaigns.id))
    .innerJoin(characters, eq(runs.characterId, characters.id))
    .innerJoin(universes, eq(campaigns.universeId, universes.id))
    .where(eq(runs.id, id))
    .limit(1);

  if (!runData) {
    return <div>Run not found</div>;
  }

  const { run, campaign, character, universe } = runData;

  // Verify ownership
  if (run.userId !== userProfile.id) {
    redirect("/campaigns");
  }

  // Resolve character image URL if needed
  if (
    character.properties?.imageUrl &&
    !character.properties.imageUrl.startsWith("http")
  ) {
    character.properties.imageUrl = await getPublicUrl(
      character.properties.imageUrl
    );
  }

  // Load message history
  const messageHistory = await db
    .select({
      id: messages.id,
      runId: messages.runId,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.runId, run.id))
    .orderBy(desc(messages.createdAt))
    .limit(100);

  // Convert to AI SDK message format - reconstruct full message structure
  const initialMessages: CoreMessage[] = messageHistory.reverse().map((msg) => {
    // msg.content is stored as JSONB with potentially both content and parts
    const contentData = msg.content as
      | { content?: unknown; parts?: unknown[] }
      | string
      | unknown[];

    // Handle different storage formats
    let content: string | unknown[];
    let parts: unknown[] | undefined;

    if (
      typeof contentData === "object" &&
      contentData !== null &&
      !Array.isArray(contentData) &&
      ("content" in contentData || "parts" in contentData)
    ) {
      // New format: { content: ..., parts: ... }
      content =
        (contentData as { content?: unknown }).content ??
        (Array.isArray(contentData) ? contentData : []);
      parts = (contentData as { parts?: unknown[] }).parts;
    } else {
      // Legacy format: just content (string or array)
      content = contentData as string | unknown[];
      parts = undefined;
    }

    const message: CoreMessage = {
      id: msg.id,
      role: msg.role as "system" | "user" | "assistant" | "tool" | "data",
      content,
    };

    if (parts && Array.isArray(parts) && parts.length > 0) {
      (message as { parts: unknown[] }).parts = parts;
    }

    return message;
  });

  return (
    <GamePlayClient
      run={run}
      character={character}
      campaign={campaign}
      universe={universe}
      initialMessages={initialMessages}
    />
  );
}
