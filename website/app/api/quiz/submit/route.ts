import { buildQuizResult } from "@/lib/ismism/scoring";
import { getEnhancedIsmCatalog, getQuizQuestions } from "@/lib/ismism/data";
import { CHOICE_VALUES } from "@/lib/ismism/types";
import type {
  AnswerMap,
  ChoiceValue,
  QuizQuestion,
  RespondentProfile,
} from "@/lib/ismism/types";
import { createAdminClient } from "@/utils/supabase/admin";

const ANSWERS_TABLE_NAMES = [
  process.env.SUPABASE_ANSWERS_TABLE,
  "ismsim-answers",
  "ismism-answers",
].filter((value): value is string => Boolean(value));

const RESULTS_TABLE_NAMES = [
  process.env.SUPABASE_RESULTS_TABLE,
  "ismism-result",
  "ismism-results",
].filter((value): value is string => Boolean(value));

const CLIENT_TABLE_NAMES = [
  process.env.SUPABASE_CLIENT_TABLE,
  "ismism-client",
].filter((value): value is string => Boolean(value));

const VALID_CHOICES = new Set<ChoiceValue>(CHOICE_VALUES);

const normalizeProfile = (input: unknown): RespondentProfile => {
  if (!input || typeof input !== "object") {
    return {
      name: "",
      message: "",
    };
  }

  const source = input as Record<string, unknown>;

  return {
    name: typeof source.name === "string" ? source.name.slice(0, 120) : "",
    message:
      typeof source.message === "string" ? source.message.slice(0, 2000) : "",
  };
};

const normalizeAnswers = (
  input: unknown,
  questionsById: Map<string, QuizQuestion>,
): AnswerMap | null => {
  if (!input || typeof input !== "object") {
    return null;
  }

  const source = input as Record<string, unknown>;
  const answers: AnswerMap = {};

  for (const [questionId, value] of Object.entries(source)) {
    const question = questionsById.get(questionId);
    if (!question || typeof value !== "string") {
      continue;
    }

    const selected = value as ChoiceValue;
    if (!VALID_CHOICES.has(selected)) {
      continue;
    }

    const validForQuestion = question.options.some(
      (option) => option.value === selected,
    );
    if (!validForQuestion) {
      continue;
    }

    answers[questionId] = selected;
  }

  return answers;
};

const getSelectedOptionLabel = (
  question: QuizQuestion,
  selected: ChoiceValue,
) =>
  question.options.find((option) => option.value === selected)?.label ?? selected;

const isMissingTableError = (message: string) =>
  message.includes("Could not find the table") ||
  message.includes("relation") ||
  message.includes("does not exist");

const insertIntoFirstAvailableTable = async (
  tableNames: string[],
  payload: Record<string, unknown> | Array<Record<string, unknown>>,
) => {
  const supabase = createAdminClient();
  let lastError: Error | null = null;

  for (const tableName of tableNames) {
    const { error } = await supabase.from(tableName).insert(payload);

    if (!error) {
      return tableName;
    }

    lastError = new Error(error.message);

    if (!isMissingTableError(error.message)) {
      break;
    }
  }

  throw lastError ?? new Error("Failed to write to Supabase.");
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      answers?: unknown;
      respondent?: unknown;
    };

    const [questions, enhancedCatalog] = await Promise.all([
      getQuizQuestions(),
      getEnhancedIsmCatalog(),
    ]);

    const questionsById = new Map(questions.map((question) => [question.id, question]));
    const answers = normalizeAnswers(payload.answers, questionsById);

    if (!answers || Object.keys(answers).length !== questions.length) {
      return Response.json(
        {
          error: "题目未全部作答，无法生成结果。",
        },
        { status: 400 },
      );
    }

    const respondent = normalizeProfile(payload.respondent);
    const result = buildQuizResult({
      questions,
      answers,
      enhancedCatalog,
    });

    const answersPayload = questions.map((question) => ({
      client_id: result.clientId,
      question: question.question,
      answer: getSelectedOptionLabel(question, answers[question.id]),
      created_at: result.createdAt,
    }));

    const resultPayload = {
      created_at: result.createdAt,
      client_id: result.clientId,
      field_score: result.dimensionResults[0]?.percentage ?? 0,
      ontology_score: result.dimensionResults[1]?.percentage ?? 0,
      phenomenon_score: result.dimensionResults[2]?.percentage ?? 0,
      purpose_score: null,
      position_result: result.coreCode,
      name_result: result.name,
      client_info: JSON.stringify({
        core_code: result.coreCode,
        user_agent: request.headers.get("user-agent"),
        question_count: questions.length,
      }),
    };

    try {
      const [answersTable, resultsTable, clientTable] = await Promise.all([
        insertIntoFirstAvailableTable(ANSWERS_TABLE_NAMES, answersPayload),
        insertIntoFirstAvailableTable(RESULTS_TABLE_NAMES, resultPayload),
        respondent.name || respondent.message
          ? insertIntoFirstAvailableTable(CLIENT_TABLE_NAMES, {
              created_at: result.createdAt,
              name: respondent.name || null,
              message: respondent.message || null,
              client_id: result.clientId,
            })
          : Promise.resolve<string | undefined>(undefined),
      ]);

      return Response.json({
        result,
        storage: {
          ok: true,
          answersTable,
          resultsTable,
          clientTable,
        },
      });
    } catch (storageError) {
      return Response.json({
        result,
        storage: {
          ok: false,
          message:
            storageError instanceof Error
              ? storageError.message
              : "Supabase 写入失败。",
        },
      });
    }
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
