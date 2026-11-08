
export type MotorsportSeries =
  | "F1"
  | "WEC"
  | "IndyCar"
  | "NASCAR"
  | "MotoGP";

export type IncidentCategory =
  | "collision"
  | "overtaking"
  | "track-limits"
  | "defending"
  | "unsafe-release"
  | "pit-lane"
  | "safety-car"
  | "other";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type ResponsibilityFinding =
  | "driver-a"
  | "driver-b"
  | "racing-incident"
  | "not-determined";

export type PenaltyType =
  | "no-further-action"
  | "warning"
  | "reprimand"
  | "time-penalty"
  | "drive-through"
  | "stop-and-go"
  | "grid-penalty"
  | "championship-points"
  | "disqualification"
  | "other";

export type EvidenceStatus =
  | "draft"
  | "under-review"
  | "verified";

export type VideoPermission =
  | "not-cleared"
  | "official-embed"
  | "licensed"
  | "permission-granted";

export interface IncidentDriver {
  name: string;
  carNumber?: string;
  team?: string;
  carColor?: string;
}

export interface IncidentSource {
  title: string;
  publisher: string;
  url: string;
  sourceType:
    | "official-document"
    | "official-regulations"
    | "official-video"
    | "reputable-report";
  accessedDate: string;
}

export interface IncidentVideo {
  url: string;
  provider: string;
  permission: VideoPermission;
  permanentlyMuted?: boolean;
}

export interface IncidentDecision {
  responsibility: ResponsibilityFinding;
  responsibilityIsScorable: boolean;
  penalty: PenaltyType;
  penaltyDetails?: string;
  explanation: string;
}

export interface Incident {
  id: string;
  series: MotorsportSeries;
  season: number;
  event: string;
  date: string;

  category: IncidentCategory;
  difficulty: Difficulty;

  driverA: IncidentDriver;
  driverB: IncidentDriver;

  title: string;
  summary?: string;

  circuit?: string;
  lapNumber?: number;
  corner?: string;

  video?: IncidentVideo;

  officialDecision: IncidentDecision;
  sources: IncidentSource[];

  evidenceStatus: EvidenceStatus;
}
