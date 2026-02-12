// WebSocket event types shared between client and server

export interface ServerToClientEvents {
  // Session lifecycle
  SESSION_STATE_CHANGE: (data: { state: string; currentQuestionIndex: number }) => void;
  
  // Question flow
  QUESTION_START: (data: {
    questionIndex: number;
    question: QuestionPayload;
    timeLimit: number;
    startedAt: number;
  }) => void;
  QUESTION_LOCK: (data: { questionIndex: number }) => void;
  
  // Answers & scoring
  ANSWER_COUNT_UPDATE: (data: { questionIndex: number; count: number; total: number }) => void;
  SCORE_UPDATE: (data: { participantId: string; score: number; rank: number }) => void;
  
  // Results
  QUESTION_RESULTS: (data: {
    questionIndex: number;
    correctAnswer: string;
    stats: QuestionStats;
    leaderboard: LeaderboardEntry[];
  }) => void;
  
  // Participants
  PARTICIPANT_JOINED: (data: { id: string; name: string; count: number }) => void;
  PARTICIPANT_LEFT: (data: { id: string; count: number }) => void;
  PARTICIPANT_COUNT: (data: { count: number }) => void;
  
  // Power-ups
  POWER_UP_USED: (data: { participantId: string; type: string; questionIndex: number }) => void;
  
  // Session end
  SESSION_COMPLETE: (data: {
    finalLeaderboard: LeaderboardEntry[];
    analytics: SessionAnalytics;
  }) => void;
  
  // Error
  ERROR: (data: { message: string; code?: string }) => void;
  
  // Timer sync
  TIMER_SYNC: (data: { remaining: number }) => void;
}

export interface ClientToServerEvents {
  // Join/Leave
  JOIN_SESSION: (data: { sessionId: string; participantId: string }) => void;
  LEAVE_SESSION: (data: { sessionId: string }) => void;
  
  // Instructor controls
  START_SESSION: (data: { sessionId: string }) => void;
  NEXT_QUESTION: (data: { sessionId: string }) => void;
  LOCK_QUESTION: (data: { sessionId: string }) => void;
  SHOW_RESULTS: (data: { sessionId: string }) => void;
  END_SESSION: (data: { sessionId: string }) => void;
  
  // Student actions
  SUBMIT_ANSWER: (data: {
    sessionId: string;
    participantId: string;
    questionId: string;
    answerData: any;
    timeTakenMs: number;
  }) => void;
  
  USE_POWER_UP: (data: {
    sessionId: string;
    participantId: string;
    type: string;
    questionIndex: number;
  }) => void;
}

// ─── Payload Types ──────────────────────────────────────

export interface QuestionPayload {
  id: string;
  type: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  points: number;
  optionsData?: any; // Options without correct answers
}

export interface QuestionStats {
  totalAnswers: number;
  correctCount: number;
  accuracy: number;
  avgTimeMs: number;
  distribution: Record<string, number>; // option -> count
}

export interface LeaderboardEntry {
  participantId: string;
  name: string;
  score: number;
  rank: number;
  streak: number;
  avatar?: string;
}

export interface SessionAnalytics {
  totalParticipants: number;
  avgScore: number;
  medianScore: number;
  completionRate: number;
  questionStats: QuestionStats[];
}

// ─── Socket Room Naming ──────────────────────────────────

export function getSessionRoom(sessionId: string): string {
  return `session:${sessionId}`;
}

export function getInstructorRoom(sessionId: string): string {
  return `session:${sessionId}:instructor`;
}
