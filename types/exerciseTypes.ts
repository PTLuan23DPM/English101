/**
 * Exercise Type Definitions
 * Naming Convention: PascalCase for types/interfaces
 */

export type SkillType = 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type QuestionType = 
  | 'SINGLE_CHOICE'
  | 'MULTI_CHOICE'
  | 'TRUE_FALSE'
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'GAP_FILL'
  | 'MATCHING'
  | 'ORDERING';

export type ActivityType =
  | 'READ_MAIN_IDEA'
  | 'READ_DETAIL'
  | 'READ_INFER'
  | 'READ_SKIMMING'
  | 'LISTEN_GIST'
  | 'LISTEN_DETAIL'
  | 'WRITE_ESSAY'
  | 'WRITE_EMAIL'
  | 'SPEAK_DESCRIBE'
  | 'SPEAK_DISCUSS';

export interface ExerciseMetadata {
  topics: string[];
  vocabulary: string[];
  grammar: string[];
  difficulty: number; // 1-5
  createdAt?: string;
  updatedAt?: string;
}

export interface ExerciseContent {
  text?: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
}

export interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  order: number;
  type: QuestionType;
  prompt: string;
  points: number;
  choices?: Choice[];
  correctAnswer?: boolean | string | string[];
  correctAnswers?: string[];
  explanation?: string;
}

export interface VocabularyItem {
  word: string;
  definition: string;
  example: string;
  pronunciation?: string;
}

export interface Exercise {
  id: string;
  title: string;
  skill: SkillType;
  level: CEFRLevel;
  type: ActivityType;
  estimatedTimeMinutes: number;
  metadata: ExerciseMetadata;
  content: ExerciseContent;
  questions: Question[];
  totalPoints: number;
  passingScore: number;
  vocabulary?: VocabularyItem[];
}

// API Response Types
export interface ExerciseListResponse {
  exercises: Exercise[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExerciseDetailResponse {
  exercise: Exercise;
}

export interface SubmissionAnswer {
  questionId: string;
  chosenIds?: string[];
  answerText?: string;
}

export interface SubmissionRequest {
  exerciseId: string;
  answers: SubmissionAnswer[];
  startTime: string;
  endTime: string;
  timeTakenSeconds: number;
}

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  maxPoints: number;
  correctAnswer?: any;
  explanation?: string;
}

export interface SubmissionResponse {
  attemptId: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  results: QuestionResult[];
  feedback: {
    overall: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
}

