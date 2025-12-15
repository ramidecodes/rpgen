import { toast } from "sonner";
import type {
  CampaignState,
  Front,
  QuestThread,
} from "@/lib/db/schemas/campaign";

type StateChange = {
  type: "front" | "quest" | "vector" | "none";
  data?: {
    front?: Front;
    isDoomed?: boolean;
    quest?: QuestThread;
    hopeDelta?: number;
    chaosDelta?: number;
  };
};

/**
 * Compare two campaign states and detect meaningful changes
 */
export function detectStateChanges(
  oldState: CampaignState,
  newState: CampaignState
): StateChange[] {
  const changes: StateChange[] = [];

  // Check for front advancements
  for (let i = 0; i < newState.activeFronts.length; i++) {
    const newFront = newState.activeFronts[i];
    const oldFront = oldState.activeFronts.find(
      (f) => f.name === newFront.name
    );

    if (oldFront) {
      if (newFront.doomClock > oldFront.doomClock) {
        const isDoomed = newFront.doomClock >= newFront.maxDoom;
        const wasDoomed = oldFront.doomClock >= oldFront.maxDoom;
        const isNearDoom = newFront.doomClock / newFront.maxDoom >= 0.7;

        // Only notify if doom triggered or if it's a significant advancement
        if (isDoomed && !wasDoomed) {
          changes.push({
            type: "front",
            data: { front: newFront, isDoomed: true },
          });
        } else if (isNearDoom && newFront.doomClock > oldFront.doomClock) {
          changes.push({
            type: "front",
            data: { front: newFront, isDoomed: false },
          });
        }
      }
    } else {
      // New front added
      changes.push({
        type: "front",
        data: { front: newFront, isDoomed: false },
      });
    }
  }

  // Check for new quests
  for (const newQuest of newState.questThreads) {
    const oldQuest = oldState.questThreads.find(
      (q) => q.title === newQuest.title
    );
    if (!oldQuest) {
      // New quest created
      changes.push({
        type: "quest",
        data: { quest: newQuest },
      });
    }
  }

  // Check for narrative vector changes (significant deltas > 0.1)
  const hopeDelta =
    newState.narrativeVectors.hope - oldState.narrativeVectors.hope;
  const chaosDelta =
    newState.narrativeVectors.chaos - oldState.narrativeVectors.chaos;

  if (Math.abs(hopeDelta) > 0.1 || Math.abs(chaosDelta) > 0.1) {
    changes.push({
      type: "vector",
      data: { hopeDelta, chaosDelta },
    });
  }

  return changes;
}

/**
 * Show toast notifications for state changes
 */
export function notifyStateChanges(changes: StateChange[]): void {
  for (const change of changes) {
    switch (change.type) {
      case "front":
        if (change.data?.front) {
          const front = change.data.front;
          if (change.data.isDoomed) {
            toast.error(`🚨 ${front.name} has reached maximum doom!`, {
              description: "The threat has been unleashed.",
              duration: 6000,
            });
          } else {
            const doomProgress = Math.round(
              (front.doomClock / front.maxDoom) * 100
            );
            toast.warning(`⚠️ ${front.name} advances!`, {
              description: `Doom clock: ${front.doomClock}/${front.maxDoom} (${doomProgress}%)`,
              duration: 5000,
            });
          }
        }
        break;

      case "quest":
        if (change.data?.quest) {
          toast.info(`📜 New quest: ${change.data.quest.title}`, {
            description: change.data.quest.description,
            duration: 5000,
          });
        }
        break;

      case "vector":
        if (change.data) {
          const { hopeDelta, chaosDelta } = change.data;
          if (hopeDelta && Math.abs(hopeDelta) > 0.1) {
            if (hopeDelta > 0) {
              toast.success("✨ Hope increases", {
                description: "A sense of optimism fills the air.",
                duration: 4000,
              });
            } else {
              toast.warning("💔 Hope decreases", {
                description: "Despair creeps in.",
                duration: 4000,
              });
            }
          }
          if (chaosDelta && Math.abs(chaosDelta) > 0.1) {
            if (chaosDelta > 0) {
              toast.warning("🌪️ Chaos rises", {
                description: "The situation becomes more unstable.",
                duration: 4000,
              });
            } else {
              toast.success("🕊️ Chaos subsides", {
                description: "Order begins to restore.",
                duration: 4000,
              });
            }
          }
        }
        break;
    }
  }
}
