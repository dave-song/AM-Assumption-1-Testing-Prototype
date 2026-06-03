import type { Session } from "@/types";

// Shared contract for every step component rendered by SessionRunner.
export interface StepProps {
  session: Session;
  setSession: (updater: (s: Session) => Session) => void;
  onNext: () => void;
  now: () => number;
}
