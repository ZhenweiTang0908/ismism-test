import fullCatalogJson from "@/data/ism.json";
import questionBankJson from "@/data/ismism-question-bank.json";
import enhancedCatalogJson from "@/data/ismism-sum-enhanced.json";
import { FALLBACK_ISM_INFO, MOCK_QUESTIONS } from "@/lib/ismism/mock-data";
import {
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  QUESTION_TYPE_WEIGHTS,
} from "@/lib/ismism/types";
import type {
  DimensionKey,
  IsmCatalogEntry,
  QuestionType,
  QuizQuestion,
} from "@/lib/ismism/types";

type RawQuestion = {
  question?: string;
  dimension?: string;
  demenstion?: string;
  type?: string;
};

const COLLATOR = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });

const QUIZ_BLUEPRINT: Record<DimensionKey, QuestionType[]> = {
  field: [
    "abstract",
    "abstract",
    "abstract",
    "personal",
    "personal",
    "personal",
    "art",
    "art",
  ],
  ontology: [
    "abstract",
    "abstract",
    "abstract",
    "personal",
    "personal",
    "personal",
    "art",
    "art",
  ],
  phenomenon: [
    "abstract",
    "abstract",
    "abstract",
    "personal",
    "personal",
    "personal",
    "art",
    "art",
  ],
};

const normalizeDimension = (value?: string): DimensionKey | null => {
  switch (value?.trim()) {
    case "场域":
      return "field";
    case "本体":
      return "ontology";
    case "认识":
    case "现象":
      return "phenomenon";
    default:
      return null;
  }
};

const normalizeQuestionType = (value?: string): QuestionType | null => {
  switch (value?.trim()) {
    case "abstract":
    case "personal":
    case "art":
      return value as QuestionType;
    default:
      return null;
  }
};

const normalizeDatasetQuestion = (
  id: string,
  rawQuestion: RawQuestion,
): QuizQuestion | null => {
  const dimension = normalizeDimension(
    rawQuestion.dimension ?? rawQuestion.demenstion,
  );
  const type = normalizeQuestionType(rawQuestion.type);
  const question = rawQuestion.question?.trim();

  if (!dimension || !type || !question) {
    return null;
  }

  return {
    id,
    question,
    dimension,
    dimensionLabel: DIMENSION_LABELS[dimension],
    type,
    weight: QUESTION_TYPE_WEIGHTS[type],
    source: "dataset",
  };
};

const buildDimensionQuestionSet = (
  dimension: DimensionKey,
  datasetQuestions: QuizQuestion[],
): QuizQuestion[] => {
  const existingByType = {
    abstract: datasetQuestions
      .filter((question) => question.type === "abstract")
      .sort((left, right) => COLLATOR.compare(left.id, right.id)),
    personal: datasetQuestions
      .filter((question) => question.type === "personal")
      .sort((left, right) => COLLATOR.compare(left.id, right.id)),
    art: datasetQuestions
      .filter((question) => question.type === "art")
      .sort((left, right) => COLLATOR.compare(left.id, right.id)),
  };
  const mockByType = {
    abstract: MOCK_QUESTIONS.filter(
      (question) => question.dimension === dimension && question.type === "abstract",
    ),
    personal: MOCK_QUESTIONS.filter(
      (question) => question.dimension === dimension && question.type === "personal",
    ),
    art: MOCK_QUESTIONS.filter(
      (question) => question.dimension === dimension && question.type === "art",
    ),
  };

  return QUIZ_BLUEPRINT[dimension].map((type) => {
    const nextDataset = existingByType[type].shift();
    if (nextDataset) {
      return nextDataset;
    }

    const nextMock = mockByType[type].shift();
    if (!nextMock) {
      throw new Error(`Missing mock question for ${dimension}:${type}`);
    }

    return nextMock;
  });
};

let questionsPromise: Promise<QuizQuestion[]> | null = null;
let enhancedCatalogPromise: Promise<Record<string, IsmCatalogEntry>> | null = null;
let fullCatalogPromise: Promise<Record<string, IsmCatalogEntry>> | null = null;

export const getQuizQuestions = async () => {
  questionsPromise ??= (async () => {
    const normalized = Object.entries(questionBankJson as Record<string, RawQuestion>)
      .map(([id, rawQuestion]) => normalizeDatasetQuestion(id, rawQuestion))
      .filter((question): question is QuizQuestion => question !== null);

    return DIMENSION_ORDER.flatMap((dimension) =>
      buildDimensionQuestionSet(
        dimension,
        normalized.filter((question) => question.dimension === dimension),
      ),
    );
  })();

  return questionsPromise;
};

export const getEnhancedIsmCatalog = async () => {
  enhancedCatalogPromise ??= (async () => {
    return {
      ...FALLBACK_ISM_INFO,
      ...(enhancedCatalogJson as Record<string, IsmCatalogEntry>),
    };
  })();

  return enhancedCatalogPromise;
};

export const getFullIsmCatalog = async () => {
  fullCatalogPromise ??= (async () => {
    return {
      ...FALLBACK_ISM_INFO,
      ...(fullCatalogJson as Record<string, IsmCatalogEntry>),
    };
  })();

  return fullCatalogPromise;
};
