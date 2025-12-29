import { db } from "@/lib/db";
import {
  runs,
  campaigns,
  characters,
  universes,
  messages,
  scenes,
} from "@/lib/db/schema";
import { getUserProfileByClerkId } from "@/lib/db/queries/user-profile";
import { auth } from "@clerk/nextjs/server";
import { eq, asc } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { GamePlayClient } from "./game-play-client";
import { getPublicUrl } from "@/lib/storage/r2";
import type { UIMessage } from "@/types/ui-message";
import type { Scene } from "@/lib/db/schema";
import { getQuestsByRunId } from "@/lib/db/queries/quests";

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
    notFound();
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

  // Fetch current scene if it exists
  let currentScene: Scene | null = null;
  if (run.currentSceneId) {
    const [sceneData] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, run.currentSceneId))
      .limit(1);

    if (sceneData) {
      // Convert R2 key to public URL if needed
      const imageUrl =
        sceneData.imageUrl && !sceneData.imageUrl.startsWith("http")
          ? await getPublicUrl(sceneData.imageUrl)
          : sceneData.imageUrl;

      currentScene = {
        ...sceneData,
        imageUrl,
      };
    }
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

  // Convert to AI SDK v6 UIMessage format - parts-only approach
  // In AI SDK v6, messages use parts array directly (stored in content JSONB field)
  const uiMessages: UIMessage[] = messageHistory.map((msg) => {
    // msg.content is stored as JSONB array of parts in AI SDK v6 format
    const contentData = msg.content as unknown[] | null | undefined;

    // Validate and extract parts array
    let parts: unknown[] | undefined;
    if (Array.isArray(contentData) && contentData.length > 0) {
      // Validate parts structure - ensure each part is an object with a type
      const validParts = contentData.filter(
        (part): part is Record<string, unknown> =>
          typeof part === "object" &&
          part !== null &&
          !Array.isArray(part) &&
          "type" in part &&
          typeof part.type === "string"
      );

      if (validParts.length > 0) {
        parts = validParts;
      }
    }

    // Map role to valid UIMessage role
    const baseRole =
      msg.role === "system" || msg.role === "user" || msg.role === "assistant"
        ? msg.role
        : "assistant";

    // Build UIMessage with parts (AI SDK v6 format)
    const message: UIMessage = {
      id: msg.id,
      role: baseRole,
      parts: parts as UIMessage["parts"],
    };

    return message;
  });

  // Deduplicate tool parts by toolCallId across all messages - keep output version, remove input-only version
  const deduplicatedMessages = deduplicateToolPartsAcrossMessages(uiMessages);

  // Query quests separately
  const quests = await getQuestsByRunId(run.id);

  return (
    <GamePlayClient
      run={run}
      character={character}
      campaign={campaign}
      universe={universe}
      messages={deduplicatedMessages}
      currentScene={currentScene}
      quests={quests}
    />
  );
}

/**
 * Deduplicate tool parts by toolCallId across all messages
 * If tool parts with the same toolCallId exist across messages, keep the one with output
 * and remove the ones with only input (immutable pattern - messages may have duplicates)
 */
function deduplicateToolPartsAcrossMessages(
  messages: UIMessage[]
): UIMessage[] {
  // First pass: collect all tool parts by toolCallId across all messages
  const toolPartsByCallId = new Map<string, unknown[]>();

  for (const message of messages) {
    if (
      message.role !== "assistant" ||
      !message.parts ||
      !Array.isArray(message.parts)
    ) {
      continue;
    }

    for (const part of message.parts) {
      if (
        typeof part === "object" &&
        part !== null &&
        !Array.isArray(part) &&
        "type" in part &&
        "toolCallId" in part
      ) {
        const typedPart = part as { toolCallId?: string };
        const toolCallId = typedPart.toolCallId;

        if (typeof toolCallId === "string" && toolCallId.length > 0) {
          if (!toolPartsByCallId.has(toolCallId)) {
            toolPartsByCallId.set(toolCallId, []);
          }
          toolPartsByCallId.get(toolCallId)?.push(part);
        }
      }
    }
  }

  // Determine which toolCallIds have output
  const toolCallIdsWithOutput = new Set<string>();
  for (const [toolCallId, parts] of toolPartsByCallId.entries()) {
    const hasOutput = parts.some((part) => {
      if (
        typeof part === "object" &&
        part !== null &&
        !Array.isArray(part) &&
        ("output" in part || "result" in part)
      ) {
        const typedPart = part as {
          state?: string;
          output?: unknown;
          result?: unknown;
        };
        return (
          (typedPart.state === "output-available" ||
            typedPart.state === "result") &&
          (typedPart.output !== undefined || typedPart.result !== undefined)
        );
      }
      return false;
    });

    if (hasOutput) {
      toolCallIdsWithOutput.add(toolCallId);
    }
  }

  // Second pass: filter out tool parts with only input if output exists
  return messages.map((message) => {
    if (
      message.role !== "assistant" ||
      !message.parts ||
      !Array.isArray(message.parts)
    ) {
      return message;
    }

    const filteredParts = message.parts.filter((part) => {
      // Keep non-tool parts
      if (
        typeof part !== "object" ||
        part === null ||
        Array.isArray(part) ||
        !("type" in part) ||
        !("toolCallId" in part)
      ) {
        return true;
      }

      const typedPart = part as { toolCallId?: string };
      const toolCallId = typedPart.toolCallId;

      // Keep tool parts without valid toolCallId
      if (typeof toolCallId !== "string" || toolCallId.length === 0) {
        return true;
      }

      // If this toolCallId has an output version, remove input-only versions
      if (toolCallIdsWithOutput.has(toolCallId)) {
        // Check if this part has output
        const hasOutput =
          ("output" in part || "result" in part) &&
          typeof part === "object" &&
          part !== null &&
          !Array.isArray(part);
        if (hasOutput) {
          const typedPartWithState = part as {
            state?: string;
            output?: unknown;
            result?: unknown;
          };
          return (
            (typedPartWithState.state === "output-available" ||
              typedPartWithState.state === "result") &&
            (typedPartWithState.output !== undefined ||
              typedPartWithState.result !== undefined)
          );
        }
        // This is an input-only part for a toolCallId that has output - remove it
        return false;
      }

      // ToolCallId doesn't have output yet - keep this part
      return true;
    });

    return {
      ...message,
      parts: filteredParts as UIMessage["parts"],
    };
  });
}
