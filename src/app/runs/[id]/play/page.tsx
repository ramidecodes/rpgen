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
import { eq, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { GamePlayClient } from "./game-play-client";
import { getPublicUrl } from "@/lib/storage/r2";
import type { UIMessage } from "ai";

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

  // Load message history in chronological order (oldest first)
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
    .orderBy(asc(messages.createdAt))
    .limit(100);

  // Convert to AI SDK UIMessage format - reconstruct full message structure
  // UIMessage is the format expected by useChat hook for display
  const uiMessages: UIMessage[] = messageHistory.map((msg) => {
    // msg.content is stored as JSONB with potentially both content and parts
    const contentData = msg.content as
      | { content?: unknown; parts?: unknown[] }
      | string
      | unknown[]
      | null
      | undefined;

    // Handle different storage formats
    let content: string | unknown[] | undefined;
    let parts: unknown[] | undefined;

    // Check if contentData is an object with content/parts structure
    if (
      typeof contentData === "object" &&
      contentData !== null &&
      !Array.isArray(contentData) &&
      ("content" in contentData || "parts" in contentData)
    ) {
      // New format: { content: ..., parts: ... }
      const dataObj = contentData as {
        content?: unknown;
        parts?: unknown[];
      };
      content = dataObj.content;
      parts = Array.isArray(dataObj.parts) ? dataObj.parts : undefined;
    } else if (Array.isArray(contentData)) {
      // Legacy format: array (treated as content)
      content = contentData;
      parts = undefined;
    } else if (typeof contentData === "string") {
      // Legacy format: string content
      content = contentData;
      parts = undefined;
    } else {
      // Null, undefined, or unknown format
      content = undefined;
      parts = undefined;
    }

    // Build UIMessage with proper structure
    // Ensure message has required fields: id, role, and either content or parts
    const message: UIMessage = {
      id: msg.id,
      role: msg.role as "system" | "user" | "assistant" | "tool" | "data",
    };

    // Priority: parts > meaningful content
    // If parts exist and are valid, use them (even if content is empty string)
    if (parts && Array.isArray(parts) && parts.length > 0) {
      // Validate parts structure - ensure each part is an object with a type
      const validParts = parts.filter(
        (part): part is Record<string, unknown> =>
          typeof part === "object" &&
          part !== null &&
          !Array.isArray(part) &&
          "type" in part &&
          typeof part.type === "string"
      );

      if (validParts.length > 0) {
        message.parts = validParts;
        // Only set content if it's a meaningful string (not empty)
        // Parts take priority, so content is optional when parts exist
        if (
          content !== undefined &&
          content !== null &&
          typeof content === "string" &&
          content.trim().length > 0
        ) {
          message.content = content;
        } else if (Array.isArray(content) && content.length > 0) {
          message.content = content;
        }
        // If we have valid parts, we don't need to set empty content
        return message;
      }
    }

    // If no valid parts, handle content
    if (content !== undefined && content !== null) {
      if (typeof content === "string") {
        // For strings, only set if non-empty (after trimming)
        // Empty strings will be filtered out by the chat interface
        if (content.trim().length > 0) {
          message.content = content;
        }
        // Don't set empty string content - let the message have no content
        // This prevents messages from being incorrectly filtered
      } else if (Array.isArray(content) && content.length > 0) {
        message.content = content;
      }
    }

    // Ensure message has either content or parts (required by UIMessage)
    // If neither exists, set empty content to maintain message structure
    // but note that empty content messages may be filtered by the UI
    if (!message.parts && !message.content) {
      message.content = "";
    }

    return message;
  });

  return (
    <GamePlayClient
      run={run}
      character={character}
      campaign={campaign}
      universe={universe}
      messages={uiMessages}
    />
  );
}
