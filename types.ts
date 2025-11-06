// --- SETUP PHASE TYPES ---

// Fix: Moved UNAVAILABILITY_REASONS and UnavailabilityReason up to be used in RosterPlayer and UnavailableSetup.
export const UNAVAILABILITY_REASONS = ['Lesión', 'Estudios', 'Viaje', 'Asuntos Personales', 'Otro'] as const;
export type UnavailabilityReason = typeof UNAVAILABILITY_REASONS[number];

export interface RosterPlayer {
  id: number;
  name: string;
  number: number;
  dateOfBirth?: string; // Storing as YYYY-MM-DD
  photoId?: string; // ID for IndexedDB player photo
  availability?: {
    status: 'Disponible' | 'No Disponible';
    // Fix: Used UnavailabilityReason for consistency.
    reason: UnavailabilityReason;
  }
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
  // Fix: Changed reason from string to the specific UnavailabilityReason type.
  reason: UnavailabilityReason;
}

// Fix: Added missing TeamSetup interface definition.
export interface TeamSetup {
  formation: string;
  starters: StarterSetup[];
  subs: SubSetup[];
  unavailable: UnavailableSetup[];
}


export const MATCH_TYPES = ['Liga', 'Amistoso', 'Torneo'] as const;
export type MatchType = typeof MATCH_TYPES[number];

export const TOURNAMENT_STAGES = ['Fase de Grupos', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Final'] as const;
export type TournamentStage = typeof TOURNAMENT_STAGES[number];

export interface MatchDetails {
  opponentName: string;
  myTeamLocation: 'home' | 'away';
  stadiumName: string;
  matchTime: string;
  refereeName: string;
  matchType: MatchType;
  jornada?: number;
  tournamentStage?: TournamentStage;
  myTeamLogo?: string;
  opponentLogo?: string;
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
  id: string;
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
  | 'goalChances'
  | 'goalsConceded'
  | 'saves'
  | 'penaltiesCommitted'
  | 'penaltiesSaved'
  | 'penaltiesMissed'
  | 'offsidesCommitted';


export interface Player {
  id: number;
  name: string;
  number: number;
  photoId?: string; // ID for IndexedDB player photo
  positionName: string;
  positionAbbr: string;
  yellowCards: StatEvent[];
  redCard: StatEvent | null;
  isSentOff: boolean;
  isOnField: boolean;
  isGoalkeeper: boolean;
  position: { x: number; y: number };
  unavailabilityReason?: UnavailabilityReason;
  
  // Detailed Stats
  goals: GoalEvent[];
  goalChances: StatEvent[];
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
  unavailable: Player[];
  formation: string;
  cornersFor: StatEvent[];
  foulsCommitted: StatEvent[];
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
  id: string;
  teamId: TeamId;
  minute: number;
  playerOut: PlayerInfo;
  playerIn: PlayerInfo;
}

export type MatchEventType = 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'GOAL_CHANCE' | 'CORNER' | 'FOUL' | 'OFFSIDE';

export interface MatchEvent {
    id: string;
    minute: number;
    teamId: TeamId;
    teamName: string;
    type: MatchEventType;
    detail: string;
    playerOut?: PlayerInfo;
    playerIn?: PlayerInfo;
    playerId?: number | null;
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

// --- OPPONENT TEAM MANAGEMENT TYPES ---
export interface OpponentPlayer {
  id: number;
  name: string;
  number: number;
}

export interface OpponentStaff {
  firstCoach: string;
  secondCoach: string;
  delegate: string;
  physio: string;
}

export interface OpponentTeam {
  id: number;
  name: string;
  crest?: string;
  players: OpponentPlayer[];
  staff: OpponentStaff;
}

// --- NEW TOP-LEVEL TYPES ---

export interface MediaItem {
  id: string; // unique id, e.g., timestamp
  type: string; // mime type
  dataUrl: string; // base64 data url for youtube, otherwise placeholder
  name: string;
  storage?: 'indexeddb'; // To denote that the blob is in the DB
}

export interface Match {
  id: number;
  // Setup Data
  details: MatchDetails;
  myTeamSetup: TeamSetup;
  opponentTeamSetup: TeamSetup;
  opponentTeamId?: number; // Link to saved opponent team
  
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

export interface TeamSettings {
  primaryColor: string;
  secondaryColor: string;
}

// Stats Dashboard Types
export interface AggregatedPlayerStats {
  gamesPlayed: number;
  started: number;
  subbedIn: number;
  minutesPlayed: number;
  bench: number;
  unavailable: number;
  notCalledUp: number;
  goals: number;
  yellowCards: number;
  redCards: number;
  // GK stats
  goalsConceded: number;
  saves: number;
}