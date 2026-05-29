export type KnowledgeMapNode = {
  id: number;
  mapKey: string;
  parentId: number | null;
  title: string;
  description: string;
  interviewQuestionId: number | null;
  sortOrder: number;
  children: KnowledgeMapNode[];
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type KnowledgeMapTree = {
  mapKey: string;
  roots: KnowledgeMapNode[];
};

export type CreateKnowledgeMapNodeBody = {
  mapKey: string;
  parentId: number | null;
  title: string;
  description?: string;
  interviewQuestionId?: number | null;
  sortOrder?: number;
};

export type UpdateKnowledgeMapNodeBody = {
  title: string;
  description?: string;
  interviewQuestionId?: number | null;
  sortOrder?: number;
};

export type MoveKnowledgeMapNodeBody = {
  parentId: number | null;
  position?: number | null;
};
