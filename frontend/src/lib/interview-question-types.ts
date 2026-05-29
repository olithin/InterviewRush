export type InterviewDifficulty = "Easy" | "Medium" | "Hard";

export type InterviewQuestionListItem = {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  tags: string[];
  isPublished: boolean;
  isActive: boolean;
  sortOrder: number;
  updatedAtUtc: string;
};

export type InterviewQuestion = {
  id: number;
  title: string;
  questionText: string;
  category: string;
  difficulty: string;
  tags: string[];
  answerEnglish: string;
  answerRussian: string;
  memoryCue: string;
  commonTrap: string;
  followUpQuestions: string[];
  notes: string;
  sortOrder: number;
  isPublished: boolean;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CreateInterviewQuestionBody = {
  title: string;
  questionText: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
  answerEnglish?: string;
  answerRussian?: string;
  memoryCue?: string;
  commonTrap?: string;
  followUpQuestions?: string[];
  notes?: string;
  sortOrder?: number;
  isPublished?: boolean;
  isActive?: boolean;
};

export type UpdateInterviewQuestionBody = {
  title: string;
  questionText: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
  answerEnglish?: string;
  answerRussian?: string;
  memoryCue?: string;
  commonTrap?: string;
  followUpQuestions?: string[];
  notes?: string;
  sortOrder?: number;
  isPublished?: boolean;
  isActive?: boolean;
};

export type BulkCreateResult = {
  created: { id: number; title: string }[];
  failed: { index: number; message: string }[];
};

export type InterviewQuestionListQuery = {
  q?: string;
  category?: string;
  difficulty?: string;
  tag?: string;
  sort?: "order" | "title" | "updated" | "category" | "difficulty";
  dir?: "asc" | "desc";
  includeInactive?: boolean;
  publishedOnly?: boolean;
  limit?: number;
};
