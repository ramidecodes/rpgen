import { create } from "zustand";
import type { Character, Run } from "@/lib/db/schema";

type PendingSkillCheck = {
  toolCallId: string;
  attribute:
    | "strength"
    | "agility"
    | "intelligence"
    | "scholarship"
    | "intuition";
  difficulty: number;
  reason: string;
};

type GameStore = {
  // Current run data
  currentRun: Run | null;
  currentCharacter: Character | null;

  // UI state
  isRolling: boolean;
  pendingSkillCheck: PendingSkillCheck | null;
  activeScene: string | null;

  // Actions
  setCurrentRun: (run: Run | null) => void;
  setCurrentCharacter: (character: Character | null) => void;
  setIsRolling: (isRolling: boolean) => void;
  setPendingSkillCheck: (check: PendingSkillCheck | null) => void;
  setActiveScene: (sceneId: string | null) => void;
  clearPendingSkillCheck: () => void;
};

export const useGameStore = create<GameStore>((set) => ({
  currentRun: null,
  currentCharacter: null,
  isRolling: false,
  pendingSkillCheck: null,
  activeScene: null,

  setCurrentRun: (run) => set({ currentRun: run }),
  setCurrentCharacter: (character) => set({ currentCharacter: character }),
  setIsRolling: (isRolling) => set({ isRolling }),
  setPendingSkillCheck: (check) => set({ pendingSkillCheck: check }),
  setActiveScene: (sceneId) => set({ activeScene: sceneId }),
  clearPendingSkillCheck: () =>
    set({ pendingSkillCheck: null, isRolling: false }),
}));
