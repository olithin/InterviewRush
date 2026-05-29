import type {
  BulkCreateResult,
  CreateInterviewQuestionBody,
  InterviewQuestion,
  InterviewQuestionListItem,
  InterviewQuestionListQuery,
  UpdateInterviewQuestionBody
} from "@/lib/interview-question-types";
import type {
  CreateKnowledgeMapNodeBody,
  KnowledgeMapTree,
  MoveKnowledgeMapNodeBody,
  UpdateKnowledgeMapNodeBody
} from "@/lib/knowledge-map-types";
import {
  CoachMentalModel,
  ProblemNavItem,
  PracticeSolution,
  ProblemTeachingDetails,
  SolutionVersionListItem
} from "@/lib/problem-types";
import { DrillSource } from "@/lib/pattern-drill-types";
import { normalizeMultiline } from "@/lib/utils";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ProblemSummaryApi = {
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  pattern?: string;
  sortOrder?: number;
};

type ProblemByIdApi = {
  id: number;
  title: string;
  problemStatement: string;
  pattern?: string;
};

type ProblemExplanationApi = {
  pattern: string;
  wordingSignals: string[];
  mnemonic: string;
  howToThink: string;
  howToThinkSteps: string[];
  bruteForceIdea?: string;
  optimalIdea?: string;
  stepByStepAlgorithm: string[];
  visualExplanation: string;
  whyThisPattern: string;
  whyNotOtherPatterns: string[];
  complexity: string;
  edgeCaseChecklist: string[];
  commonMistakes: {
    critical: string[];
    important: string[];
    niceToHave: string[];
  };
  gapLearningHints: string[];
  interviewExplanationEnglish: string;
  simpleExplanationRussian: string;
  mentalModelTrigger?: string;
  mentalModelCue?: string;
  mentalModelScript?: string;
  mentalModelTrap?: string;
  mentalModelPersonalWords?: string;
  mentalModelInterviewPhrase?: string;
};

export type UpdateProblemExplanationBody = {
  pattern: string;
  wordingSignals: string[];
  mnemonic: string;
  howToThink: string;
  howToThinkSteps: string[];
  bruteForceIdea: string;
  optimalIdea: string;
  stepByStepAlgorithm: string[];
  visualExplanation: string;
  whyThisPattern: string;
  whyNotOtherPatterns: string[];
  complexity: string;
  edgeCaseChecklist: string[];
  commonMistakes: { critical: string[]; important: string[]; niceToHave: string[] };
  gapLearningHints: string[];
  interviewExplanationEnglish: string;
  simpleExplanationRussian: string;
  mentalModelTrigger: string;
  mentalModelCue: string;
  mentalModelScript: string;
  mentalModelTrap: string;
  mentalModelPersonalWords: string;
  mentalModelInterviewPhrase: string;
};

type ProblemSolutionApi = {
  id: number;
  language: string;
  label: string | null;
  solutionCode: string;
  nUnitTestsCode: string;
  nUnitSampleTestsCode?: string;
  thinkPattern: string | null;
  thinkIdea: string | null;
  thinkComplexity: string | null;
};

type FlashcardApi = {
  id: number;
  topic: string;
  category: string;
  front: string;
  back: string;
  difficulty: number;
};

type GapApi = {
  id: number;
  topicId: number;
  topic: string;
  severity: number;
  notes: string;
  updatedAtUtc: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

/**
 * Accepts both camelCase and PascalCase property names (interop with ASP.NET default serializers).
 */
function readApiJsonEnvelope<T>(raw: string, context: string): ApiResponse<T> {
  const t = raw.trim();
  if (!t) {
    throw new Error(
      `Empty response from ${context}. Is the API running at ${API_BASE_URL}? If the front uses a different host, set NEXT_PUBLIC_API_BASE_URL.`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(t);
  } catch {
    throw new Error(
      `Not valid JSON from ${context} (first 300 chars): ${t.slice(0, 300)}`
    );
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`Invalid JSON envelope from ${context}`);
  }
  const o = parsed as Record<string, unknown>;
  const success = o.success === true || o.Success === true;
  const message = String(o.message ?? o.Message ?? "");
  const data = (o.data !== undefined ? o.data : o.Data) as T;
  return { success, message, data };
}

async function readApiBody<T>(response: Response, context: string): Promise<ApiResponse<T>> {
  const raw = await response.text();
  return readApiJsonEnvelope<T>(raw, context);
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  const body = await readApiBody<T>(response, `GET ${path}`);

  if (!response.ok) {
    throw new Error(body.message?.trim() ? body.message : `API request failed: ${path} (${response.status})`);
  }
  if (!body.success) {
    throw new Error(`API error on ${path}: ${body.message}`);
  }

  return body.data;
}

async function apiSend<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, cache: "no-store" });
  const body = await readApiBody<T>(response, `${init.method ?? "POST"} ${path}`);

  if (!response.ok || !body.success) {
    throw new Error(
      body.message?.trim()
        ? body.message
        : `Request failed (${response.status} ${response.statusText})`
    );
  }
  if (body.data === null || body.data === undefined) {
    throw new Error("Empty data in API response envelope.");
  }
  return body.data;
}

export async function getProblems(): Promise<ProblemNavItem[]> {
  const rows = await apiGet<ProblemSummaryApi[]>("/api/problems");
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    pattern: row.pattern ?? "General",
    difficulty: row.difficulty,
    solved: false,
    sortOrder: row.sortOrder ?? 0
  }));
}

export async function createProblem(body: {
  title: string;
  slug?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  problemStatement?: string;
  topic?: string;
  sortOrder?: number;
}): Promise<{ id: number }> {
  return apiSend<{ id: number }>("/api/problems", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function deleteProblem(id: number): Promise<{ deleted: boolean }> {
  return apiSend<{ deleted: boolean }>(`/api/problems/${id}`, {
    method: "DELETE"
  });
}

export async function reorderProblems(items: { id: number; sortOrder: number }[]): Promise<{ updated: number }> {
  return apiSend<{ updated: number }>("/api/problems/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
}

/**
 * Legacy API stored a duplicate "HowToThink" intro; the app now uses one line-per-step list only.
 * If a non-empty intro exists and is not already the first step, prepend it (one-time read compatibility).
 */
function normalizeHowToThinkSteps(legacyIntro: string | undefined, steps: string[]): string[] {
  const intro = (legacyIntro ?? "").trim();
  if (!intro) {
    return [...steps];
  }
  if (steps.length === 0) {
    return [intro];
  }
  if (steps[0] === intro) {
    return [...steps];
  }
  return [intro, ...steps];
}

export async function getProblemTeachingDetails(problemId: number): Promise<ProblemTeachingDetails> {
  const [problem, explanation, solutions] = await Promise.all([
    apiGet<ProblemByIdApi>(`/api/problems/${problemId}`),
    apiGet<ProblemExplanationApi>(`/api/problems/${problemId}/explanation`),
    apiGet<ProblemSolutionApi[]>(`/api/problems/${problemId}/solutions`)
  ]);

  const csharpSolutions = solutions.filter((x) => x.language.toLowerCase() === "c#");
  const primarySolution = csharpSolutions[0] ?? solutions[0];

  const toPractice = (s: ProblemSolutionApi, i: number): PracticeSolution => ({
    id: s.id,
    label: s.label?.trim() ? s.label.trim() : `Solution ${i + 1}`,
    code: normalizeMultiline(s.solutionCode ?? ""),
    nUnitTestsCode: normalizeMultiline(s.nUnitTestsCode ?? ""),
    nUnitSampleTestsCode: normalizeMultiline(s.nUnitSampleTestsCode ?? ""),
    thinkPattern: s.thinkPattern ?? "",
    thinkIdea: s.thinkIdea ?? "",
    thinkComplexity: s.thinkComplexity ?? ""
  });

  const solutionTemplates: PracticeSolution[] =
    csharpSolutions.length > 0
      ? csharpSolutions.map((s, i) => toPractice(s, i))
      : primarySolution
        ? [toPractice(primarySolution, 0)]
        : [
            {
              id: 0,
              label: "Draft",
              code: "",
              nUnitTestsCode: "",
              nUnitSampleTestsCode: "",
              thinkPattern: "",
              thinkIdea: "",
              thinkComplexity: ""
            }
          ];

  return {
    id: problem.id,
    title: problem.title,
    statement: problem.problemStatement,
    pattern: explanation.pattern || problem.pattern || "General",
    wordingSignals: explanation.wordingSignals,
    mnemonic: explanation.mnemonic,
    howToThink: "",
    howToThinkSteps: normalizeHowToThinkSteps(explanation.howToThink, explanation.howToThinkSteps),
    bruteForceIdea: explanation.bruteForceIdea ?? "",
    optimalIdea: explanation.optimalIdea ?? "",
    algorithmSteps: explanation.stepByStepAlgorithm,
    visualExplanation: explanation.visualExplanation,
    whyThisPattern: explanation.whyThisPattern,
    whyNotOtherPatterns: explanation.whyNotOtherPatterns,
    complexity: explanation.complexity,
    edgeCaseChecklist: explanation.edgeCaseChecklist,
    commonMistakes: explanation.commonMistakes,
    gapHints: explanation.gapLearningHints,
    interviewEnglish: explanation.interviewExplanationEnglish,
    simpleRussian: explanation.simpleExplanationRussian,
    mentalModel: {
      trigger: explanation.mentalModelTrigger ?? "",
      cue: explanation.mentalModelCue ?? "",
      script: explanation.mentalModelScript ?? "",
      trap: explanation.mentalModelTrap ?? "",
      personalWords: explanation.mentalModelPersonalWords ?? "",
      interviewPhrase: explanation.mentalModelInterviewPhrase ?? ""
    } satisfies CoachMentalModel,
    code: normalizeMultiline(primarySolution?.solutionCode ?? ""),
    tests: normalizeMultiline(primarySolution?.nUnitTestsCode ?? ""),
    solutionTemplates
  };
}

function buildUpdateExplanationFromDetails(d: ProblemTeachingDetails): UpdateProblemExplanationBody {
  return {
    pattern: d.pattern,
    wordingSignals: [...d.wordingSignals],
    mnemonic: d.mnemonic,
    howToThink: "",
    howToThinkSteps: [...d.howToThinkSteps],
    bruteForceIdea: d.bruteForceIdea,
    optimalIdea: d.optimalIdea,
    stepByStepAlgorithm: [...d.algorithmSteps],
    visualExplanation: d.visualExplanation,
    whyThisPattern: d.whyThisPattern,
    whyNotOtherPatterns: [...d.whyNotOtherPatterns],
    complexity: d.complexity,
    edgeCaseChecklist: [...d.edgeCaseChecklist],
    commonMistakes: {
      critical: [...d.commonMistakes.critical],
      important: [...d.commonMistakes.important],
      niceToHave: [...d.commonMistakes.niceToHave]
    },
    gapLearningHints: [...d.gapHints],
    interviewExplanationEnglish: d.interviewEnglish,
    simpleExplanationRussian: d.simpleRussian,
    mentalModelTrigger: d.mentalModel.trigger,
    mentalModelCue: d.mentalModel.cue,
    mentalModelScript: d.mentalModel.script,
    mentalModelTrap: d.mentalModel.trap,
    mentalModelPersonalWords: d.mentalModel.personalWords,
    mentalModelInterviewPhrase: d.mentalModel.interviewPhrase
  };
}

export { buildUpdateExplanationFromDetails };

export async function updateProblemExplanation(
  problemId: number,
  body: UpdateProblemExplanationBody
): Promise<void> {
  await apiSend<{ updated: boolean }>(`/api/problems/${problemId}/explanation`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

/**
 * Client-only: writes to `public/images/problems/uploads/` via the Next.js route.
 * The returned path (e.g. `/images/problems/uploads/problem-1-….png`) is what you store
 * in `visualExplanation` as `IMAGE:path|alt` or set in the coach editor.
 */
export async function uploadProblemVisualImage(problemId: number, file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("problemId", String(problemId));
  const res = await fetch("/api/upload/problem-visual", { method: "POST", body: fd });
  const data = (await res.json().catch(() => ({}))) as { publicPath?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }
  if (!data.publicPath) {
    throw new Error("Upload response missing publicPath");
  }
  return data.publicPath;
}

export async function getPatternDrillSources(): Promise<DrillSource[]> {
  try {
    const problems = await apiGet<Array<{ id: number; title: string; pattern?: string; problemStatement: string }>>("/api/problems");

    const explanations = await Promise.all(
      problems.map(async (p) => {
        try {
          const exp = await apiGet<ProblemExplanationApi>(`/api/problems/${p.id}/explanation`);
          return { id: p.id, exp };
        } catch {
          return null;
        }
      })
    );

    const expMap = new Map<number, ProblemExplanationApi>();
    for (const row of explanations) {
      if (row) expMap.set(row.id, row.exp);
    }

    return problems
      .filter((p) => expMap.has(p.id))
      .map((p) => {
        const exp = expMap.get(p.id)!;
        return {
          id: p.id,
          title: p.title,
          statement: p.problemStatement,
          pattern: exp.pattern || p.pattern || "General",
          wordingSignals: exp.wordingSignals,
          mnemonic: exp.mnemonic,
          explanation: exp.whyThisPattern,
          whyNotOtherPatterns: exp.whyNotOtherPatterns
        };
      });
  } catch (error) {
    throw new Error(
      `Failed to load pattern drill data from API: ${error instanceof Error ? error.message : "unknown"}`
    );
  }
}

export async function getFlashcards(): Promise<FlashcardApi[]> {
  return apiGet<FlashcardApi[]>("/api/flashcards");
}

export async function getGaps(): Promise<GapApi[]> {
  return apiGet<GapApi[]>("/api/gaps");
}

export type LearningMapProblem = { id: number; title: string; difficulty: string };

export type LearningMapPattern = {
  label: string;
  problemCount: number;
  problems: LearningMapProblem[];
};

export type LearningMapTrigger = {
  id: number;
  label: string;
  multiplePatterns: boolean;
  patterns: LearningMapPattern[];
};

export type LearningMapTree = { triggers: LearningMapTrigger[] };

export async function getLearningMapTree(): Promise<LearningMapTree> {
  return apiGet<LearningMapTree>("/api/learning-map/tree");
}

export type PracticeTestScope = "full" | "sample";

export type PracticeRunResult = {
  exitCode: number;
  output: string;
  passed: boolean;
  resultKind: string;
  summaryMessage: string | null;
  totalTestCount: number | null;
  passedTestCount: number | null;
  failedTestCount: number | null;
  failedTestName: string | null;
  expected: string | null;
  actual: string | null;
};

export type PracticeRunOptions = {
  solutionId?: number;
  testScope?: PracticeTestScope;
  /** When set, the API uses this NUnit source for the run (same as the editor). */
  nUnitTestsCode?: string;
};

export async function runPracticeCode(
  problemId: number,
  code: string,
  options: PracticeRunOptions = {}
): Promise<PracticeRunResult> {
  const body: Record<string, unknown> = { problemId, code };
  if (options.solutionId != null && options.solutionId > 0) {
    body.solutionId = options.solutionId;
  }
  if (options.testScope) {
    body.testScope = options.testScope;
  }
  if (options.nUnitTestsCode != null && options.nUnitTestsCode.length > 0) {
    body.nUnitTestsCode = options.nUnitTestsCode;
  }
  const response = await fetch(`${API_BASE_URL}/api/practice/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const res = await readApiBody<PracticeRunResult>(response, "POST /api/practice/run");
  if (!response.ok || !res.success) {
    throw new Error(res.message?.trim() ? res.message : `Request failed (${response.status})`);
  }

  if (res.data === null || res.data === undefined) {
    throw new Error("Empty run result.");
  }

  return normalizePracticeRunResult(res.data);
}

function normalizePracticeRunResult(d: unknown): PracticeRunResult {
  const x = d as Record<string, unknown>;
  const passed = Boolean(x.passed);
  const exitCode = Number(x.exitCode);
  const output = String(x.output ?? "");
  const rk = String(
    x.resultKind ?? (passed ? "Passed" : exitCode !== 0 ? "TestFailure" : "Unknown")
  );
  return {
    exitCode: Number.isFinite(exitCode) ? exitCode : -1,
    output,
    passed,
    resultKind: rk,
    summaryMessage: (x.summaryMessage as string) ?? null,
    totalTestCount: (x.totalTestCount as number | null) ?? null,
    passedTestCount: (x.passedTestCount as number | null) ?? null,
    failedTestCount: (x.failedTestCount as number | null) ?? null,
    failedTestName: (x.failedTestName as string) ?? null,
    expected: (x.expected as string) ?? null,
    actual: (x.actual as string) ?? null
  };
}

export type SolutionRowApi = {
  id: number;
  language: string;
  label: string | null;
  solutionCode: string;
  nUnitTestsCode: string;
  nUnitSampleTestsCode: string;
  thinkPattern: string | null;
  thinkIdea: string | null;
  thinkComplexity: string | null;
};

export type CreateSolutionBody = {
  label?: string;
  solutionCode: string;
  nUnitTestsCode?: string;
  nUnitSampleTestsCode?: string;
  thinkPattern?: string;
  thinkIdea?: string;
  thinkComplexity?: string;
};

export type UpdateSolutionBody = {
  label?: string;
  solutionCode?: string;
  nUnitTestsCode?: string;
  nUnitSampleTestsCode?: string;
  thinkPattern?: string;
  thinkIdea?: string;
  thinkComplexity?: string;
};

export async function createSolution(
  problemId: number,
  body: CreateSolutionBody
): Promise<SolutionRowApi> {
  return apiSend<SolutionRowApi>(`/api/problems/${problemId}/solutions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function updateSolution(
  problemId: number,
  solutionId: number,
  body: UpdateSolutionBody
): Promise<SolutionRowApi> {
  return apiSend<SolutionRowApi>(`/api/problems/${problemId}/solutions/${solutionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function deleteSolution(problemId: number, solutionId: number): Promise<void> {
  await apiSend<{ deleted: boolean }>(`/api/problems/${problemId}/solutions/${solutionId}`, {
    method: "DELETE"
  });
}

export async function listSolutionVersions(
  problemId: number,
  solutionId: number
): Promise<SolutionVersionListItem[]> {
  const rows = await apiGet<SolutionVersionListItem[]>(
    `/api/problems/${problemId}/solutions/${solutionId}/versions`
  );
  return rows.map((v) => ({ ...v, solutionCode: normalizeMultiline(v.solutionCode) }));
}

export async function createSolutionVersion(
  problemId: number,
  solutionId: number
): Promise<{ id: number; createdAtUtc: string }> {
  return apiSend<{ id: number; createdAtUtc: string }>(
    `/api/problems/${problemId}/solutions/${solutionId}/versions`,
    { method: "POST" }
  );
}

/** @deprecated */
export const createSolutionTemplate = createSolution;
/** @deprecated */
export const updateSolutionTemplate = updateSolution;
/** @deprecated */
export const deleteSolutionTemplate = deleteSolution;

// --- Interview questions (text prep, not coding problems) ---

function buildInterviewQuestionsQueryString(q: InterviewQuestionListQuery | undefined): string {
  if (!q) {
    return "";
  }
  const p = new URLSearchParams();
  if (q.q) {
    p.set("q", q.q);
  }
  if (q.category) {
    p.set("category", q.category);
  }
  if (q.difficulty) {
    p.set("difficulty", q.difficulty);
  }
  if (q.tag) {
    p.set("tag", q.tag);
  }
  if (q.sort) {
    p.set("sort", q.sort);
  }
  if (q.dir) {
    p.set("dir", q.dir);
  }
  if (q.includeInactive) {
    p.set("includeInactive", "true");
  }
  if (q.publishedOnly) {
    p.set("publishedOnly", "true");
  }
  if (q.limit != null) {
    p.set("limit", String(q.limit));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function getInterviewQuestionCategories(): Promise<string[]> {
  return apiGet<string[]>("/api/interview-questions/categories");
}

export async function getInterviewQuestionsList(
  q?: InterviewQuestionListQuery
): Promise<InterviewQuestionListItem[]> {
  return apiGet<InterviewQuestionListItem[]>(
    `/api/interview-questions${buildInterviewQuestionsQueryString(q)}`
  );
}

export async function getInterviewQuestionById(id: number): Promise<InterviewQuestion> {
  return apiGet<InterviewQuestion>(`/api/interview-questions/${id}`);
}

export async function createInterviewQuestion(body: CreateInterviewQuestionBody): Promise<{ id: number }> {
  return apiSend<{ id: number }>("/api/interview-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function updateInterviewQuestion(
  id: number,
  body: UpdateInterviewQuestionBody
): Promise<{ updated: boolean }> {
  return apiSend<{ updated: boolean }>(`/api/interview-questions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function deleteInterviewQuestion(id: number): Promise<{ deleted: boolean }> {
  return apiSend<{ deleted: boolean }>(`/api/interview-questions/${id}`, {
    method: "DELETE"
  });
}

export async function bulkCreateInterviewQuestions(
  items: CreateInterviewQuestionBody[]
): Promise<BulkCreateResult> {
  return apiSend<BulkCreateResult>("/api/interview-questions/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
}

export async function reorderInterviewQuestions(
  items: { id: number; sortOrder: number }[]
): Promise<{ updated: number }> {
  return apiSend<{ updated: number }>("/api/interview-questions/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
}

// --- Knowledge map (hierarchical tree of topics) ---

export async function getKnowledgeMapTree(mapKey = "default"): Promise<KnowledgeMapTree> {
  return apiGet<KnowledgeMapTree>(`/api/knowledge-maps/${encodeURIComponent(mapKey)}/tree`);
}

export async function createKnowledgeMapNode(body: CreateKnowledgeMapNodeBody): Promise<{ id: number }> {
  return apiSend<{ id: number }>("/api/knowledge-map-nodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function updateKnowledgeMapNode(
  id: number,
  body: UpdateKnowledgeMapNodeBody
): Promise<{ updated: boolean }> {
  return apiSend<{ updated: boolean }>(`/api/knowledge-map-nodes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function moveKnowledgeMapNode(
  id: number,
  body: MoveKnowledgeMapNodeBody
): Promise<{ moved: boolean }> {
  return apiSend<{ moved: boolean }>(`/api/knowledge-map-nodes/${id}/move`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function deleteKnowledgeMapNode(id: number): Promise<{ deleted: number }> {
  return apiSend<{ deleted: number }>(`/api/knowledge-map-nodes/${id}`, { method: "DELETE" });
}

export async function seedKnowledgeMapCsharp2026(
  mapKey = "default",
  reset = false
): Promise<{ mapKey: string; created: number; rootTitle: string }> {
  const qs = reset ? "?reset=true" : "";
  return apiSend<{ mapKey: string; created: number; rootTitle: string }>(
    `/api/knowledge-maps/${encodeURIComponent(mapKey)}/seed-csharp-2026${qs}`,
    { method: "POST" }
  );
}

/** Creates interview questions and sets InterviewQuestionId on each leaf of the C# 2026 demo tree. */
export async function seedKnowledgeMapDemoQuestions(
  mapKey = "default"
): Promise<{
  mapKey: string;
  leaves: number;
  interviewQuestionsCreated: number;
  nodesLinked: number;
  nodesSkipped: number;
}> {
  return apiSend<{
    mapKey: string;
    leaves: number;
    interviewQuestionsCreated: number;
    nodesLinked: number;
    nodesSkipped: number;
  }>(`/api/knowledge-maps/${encodeURIComponent(mapKey)}/seed-demo-questions`, { method: "POST" });
}
