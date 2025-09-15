// --- SETUP PHASE TYPES ---

export interface RosterPlayer {
  id: number;
  name: string;
  number: number;
}

export interface StarterSetup {
  positionName: string;
  positionAbbr: string;
  playerName: string;
  playerNumber: number;
  playerId: number | null; // Link to RosterPlayer ID
  position: { x: number; y: number };
}

export interface SubSetup {
  id: number;
  playerName: string;
  playerNumber: number;
}

export interface UnavailableSetup {
  id: number;
  playerName: string;
  playerNumber: number;
  reason: string;
}

export const UNAVAILABILITY_REASONS = ['Lesión', 'Estudios', 'Viaje', 'Asuntos Personales', 'Otro'] as const;
export type UnavailabilityReason = typeof UNAVAILABILITY_REASONS[number];

export interface TeamSetup {
  formation: string;
  starters: StarterSetup[];
  subs: SubSetup[];
  unavailable: UnavailableSetup[];
}

export const MATCH_TYPES = ['Liga', 'Amistoso', 'Torneo'] as const;
export type MatchType = typeof MATCH_TYPES[number];

export interface MatchDetails {
  opponentName: string;
  myTeamLocation: 'home' | 'away';
  stadiumName: string;
  matchTime: string;
  refereeName: string;
  matchType: MatchType;
}


// --- MATCH CONTROL PHASE TYPES ---

export enum MatchState {
  NOT_STARTED = 'NOT_STARTED',
  FIRST_HALF = 'FIRST_HALF',
  HALF_TIME = 'HALF_TIME',
  SECOND_HALF = 'SECOND_HALF',
  FULL_TIME = 'FULL_TIME'
}

export interface StatEvent {
  minute: number;
}

export const GOAL_TYPES = {
  'JUGADA': 'Jugada',
  'PENALTI': 'Penalti',
  'CORNER': 'Córner',
  'FALTA_DIRECTA': 'Falta Directa',
  'CABEZA': 'Cabeza',
  'RECHACE': 'Rechace',
  'OTRO': 'Otro',
} as const;

export type GoalType = keyof typeof GOAL_TYPES;

export interface GoalEvent extends StatEvent {
    type: GoalType;
}

export type PlayerStatKeys = 
  | 'goals'
  | 'goalsConceded'
  | 'saves'
  | 'penaltiesCommitted'
  | 'penaltiesSaved'
  | 'penaltiesMissed'
  | 'foulsCommitted'
  | 'offsidesCommitted';


export interface Player {
  id: number;
  name: string;
  number: number;
  positionName: string;
  positionAbbr: string;
  yellowCards: StatEvent[];
  redCard: StatEvent | null;
  isSentOff: boolean;
  isOnField: boolean;
  isGoalkeeper: boolean;
  position: { x: number; y: number };
  
  // Detailed Stats
  goals: GoalEvent[];
  foulsCommitted: StatEvent[];
  penaltiesCommitted: StatEvent[];
  penaltiesMissed: StatEvent[];
  offsidesCommitted: StatEvent[];
  
  // Goalkeeper specific stats
  goalsConceded: StatEvent[];
  saves: StatEvent[];
  penaltiesSaved: StatEvent[];
}

export interface Team {
  name: string;
  score: number;
  logo?: string;
  starters: Player[];
  subs: Player[];
  formation: string;
  cornersFor: StatEvent[];
  substitutionWindows: number;
}

export type TeamId = 'a' | 'b';

export interface SubstitutionContext {
  teamId: TeamId | null;
}

export interface PlayerInfo {
    id: number;
    name: string;
    number: number;
}

export interface SubstitutionEvent {
  teamId: TeamId;
  minute: number;
  playerOut: PlayerInfo;
  playerIn: PlayerInfo;
}

export type MatchEventType = 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION';

export interface MatchEvent {
    minute: number;
    teamId: TeamId;
    teamName: string;
    type: MatchEventType;
    detail: string;
    playerOut?: PlayerInfo;
    playerIn?: PlayerInfo;
}

// --- TRAINING MANAGEMENT TYPES ---

export const ATTENDANCE_STATUSES = {
  PRESENT: 'Presente',
  ABSENT: 'Ausente',
  INJURED: 'Lesión',
  STUDIES: 'Estudios',
  HOLIDAYS: 'Vacaciones',
  OTHER: 'Otro',
} as const;

export type AttendanceStatus = typeof ATTENDANCE_STATUSES[keyof typeof ATTENDANCE_STATUSES];

export interface ExercisePart {
  text: string;
  duration: number; // in minutes
}

export interface TrainingSession {
  id: number;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  objective: string;
  warmup: ExercisePart;
  mainPart: ExercisePart;
  finalPart: ExercisePart;
  coolDown: ExercisePart;
  notes?: string;
  attendance: { [playerId: number]: AttendanceStatus };
  photoDataUrl?: string;
}


// --- NEW TOP-LEVEL TYPES ---

export interface MediaItem {
  id: string; // unique id, e.g., timestamp
  type: string; // mime type
  dataUrl: string; // base64 data url
  name: string;
}

export interface Match {
  id: number;
  // Setup Data
  details: MatchDetails;
  myTeamSetup: TeamSetup;
  opponentTeamSetup: TeamSetup;
  
  // Live Data (initialized when match starts)
  teamA: Team | null;
  teamB: Team | null;
  matchState: MatchState;
  totalSeconds: number;
  halfDurationMinutes: number;
  substitutionLog: SubstitutionEvent[];
  initialStartersA: Player[]; // Snapshot for stats
  initialStartersB: Player[]; // Snapshot for stats
  media: MediaItem[];
}