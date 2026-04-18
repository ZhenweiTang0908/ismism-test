import fullCatalogJson from "@/data/ism.json";
import questionBankJson from "@/data/ismism-question-bank.json";
import enhancedCatalogJson from "@/data/ismism-sum-enhanced.json";
import { FALLBACK_ISM_INFO } from "@/lib/ismism/mock-data";
import {
  CHOICE_VALUES,
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  QUESTION_TYPE_WEIGHTS,
} from "@/lib/ismism/types";
import type {
  ChoiceValue,
  DimensionKey,
  IsmCatalogEntry,
  QuestionType,
  QuizOption,
  QuizQuestion,
} from "@/lib/ismism/types";

type RawQuestionOption = {
  value?: string;
  label?: string;
};

type RawQuestion = {
  question?: string;
  dimension?: string;
  demenstion?: string;
  type?: string;
  options?: RawQuestionOption[];
};

const REQUIRED_TOTAL_QUESTIONS = 17;

const QUIZ_BLUEPRINT_COUNTS: Record<
  DimensionKey,
  Record<QuestionType, number>
> = {
  field: { life: 1, public: 3, abstract: 3 },
  ontology: { life: 1, public: 2, abstract: 2 },
  phenomenon: { life: 1, public: 2, abstract: 2 },
};

const COLLATOR = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});

const shuffleArray = <T>(array: T[]): T[] => {
  const randomized = [...array];

  for (let index = randomized.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [randomized[index], randomized[swapIndex]] = [
      randomized[swapIndex],
      randomized[index],
    ];
  }

  return randomized;
};

const shuffleQuestions = (questions: QuizQuestion[]) => shuffleArray(questions);

const normalizeDimension = (value?: string): DimensionKey | null => {
  switch (value?.trim().toLowerCase()) {
    case "场域":
    case "鍦哄煙":
    case "field":
      return "field";
    case "本体":
    case "鏈綋":
    case "ontology":
      return "ontology";
    case "现象":
    case "鐜拌薄":
    case "认识":
    case "璁よ瘑":
    case "phenomenon":
      return "phenomenon";
    default:
      return null;
  }
};

const normalizeQuestionType = (value?: string): QuestionType | null => {
  switch (value?.trim().toLowerCase()) {
    case "life":
      return "life";
    case "public":
      return "public";
    case "abstract":
      return "abstract";
    default:
      return null;
  }
};

const normalizeOption = (
  rawOption: RawQuestionOption,
): QuizOption | null => {
  if (!rawOption || typeof rawOption !== "object") {
    return null;
  }

  const value = rawOption.value?.trim() as ChoiceValue | undefined;
  const label = rawOption.label?.trim();

  if (!value || !CHOICE_VALUES.includes(value) || !label) {
    return null;
  }

  return { value, label };
};

const normalizeOptions = (
  options: RawQuestion["options"],
): [QuizOption, QuizOption, QuizOption, QuizOption] | null => {
  if (!Array.isArray(options) || options.length !== 4) {
    return null;
  }

  const normalized = options
    .map((item) => normalizeOption(item))
    .filter((item): item is QuizOption => item !== null);

  if (normalized.length !== 4) {
    return null;
  }

  const valueSet = new Set(normalized.map((item) => item.value));
  if (valueSet.size !== 4 || CHOICE_VALUES.some((value) => !valueSet.has(value))) {
    return null;
  }

  const ordered = CHOICE_VALUES.map((value) =>
    normalized.find((item) => item.value === value),
  );

  if (ordered.some((item) => !item)) {
    return null;
  }

  return ordered as [QuizOption, QuizOption, QuizOption, QuizOption];
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
  const options = normalizeOptions(rawQuestion.options);

  if (!dimension || !type || !question || !options) {
    return null;
  }

  return {
    id,
    question,
    dimension,
    dimensionLabel: DIMENSION_LABELS[dimension],
    type,
    weight: QUESTION_TYPE_WEIGHTS[type],
    options: shuffleArray(options) as [QuizOption, QuizOption, QuizOption, QuizOption],
    source: "dataset",
  };
};

const validateQuestionBank = (questions: QuizQuestion[]) => {
  if (questions.length !== REQUIRED_TOTAL_QUESTIONS) {
    throw new Error(
      `Question bank must contain ${REQUIRED_TOTAL_QUESTIONS} valid questions, got ${questions.length}.`,
    );
  }

  const uniqueQuestionTexts = new Set(questions.map((item) => item.question.trim()));
  if (uniqueQuestionTexts.size !== questions.length) {
    throw new Error("Question texts must be unique.");
  }

  for (const dimension of DIMENSION_ORDER) {
    const scoped = questions.filter((item) => item.dimension === dimension);
    const expectedCount = dimension === "field" ? 7 : 5;
    if (scoped.length !== expectedCount) {
      throw new Error(
        `Dimension "${dimension}" must contain ${expectedCount} questions, got ${scoped.length}.`,
      );
    }

    for (const type of Object.keys(
      QUESTION_TYPE_WEIGHTS,
    ) as QuestionType[]) {
      const expectedTypeCount = QUIZ_BLUEPRINT_COUNTS[dimension][type];
      const actualCount = scoped.filter((item) => item.type === type).length;
      if (actualCount !== expectedTypeCount) {
        throw new Error(
          `Dimension "${dimension}" type "${type}" must contain ${expectedTypeCount} questions, got ${actualCount}.`,
        );
      }
    }

    for (const question of scoped) {
      const optionValues = question.options.map((option) => option.value);
      const optionSet = new Set(optionValues);
      if (
        optionSet.size !== 4 ||
        CHOICE_VALUES.some((value) => !optionSet.has(value))
      ) {
        throw new Error(
          `Question "${question.id}" must contain exactly one option for each value 1/2/3/4.`,
        );
      }
    }
  }
};

const pickDimensionQuestions = (
  dimension: DimensionKey,
  datasetQuestions: QuizQuestion[],
) => {
  const scoped = datasetQuestions.filter((item) => item.dimension === dimension);
  const byType = {
    life: scoped
      .filter((item) => item.type === "life")
      .sort((left, right) => COLLATOR.compare(left.id, right.id)),
    public: scoped
      .filter((item) => item.type === "public")
      .sort((left, right) => COLLATOR.compare(left.id, right.id)),
    abstract: scoped
      .filter((item) => item.type === "abstract")
      .sort((left, right) => COLLATOR.compare(left.id, right.id)),
  };

  return (Object.keys(QUESTION_TYPE_WEIGHTS) as QuestionType[]).flatMap((type) =>
    byType[type].slice(0, QUIZ_BLUEPRINT_COUNTS[dimension][type]),
  );
};

let questionsPromise: Promise<QuizQuestion[]> | null = null;
let enhancedCatalogPromise: Promise<Record<string, IsmCatalogEntry>> | null = null;
let fullCatalogPromise: Promise<Record<string, IsmCatalogEntry>> | null = null;

export const getQuizQuestions = async () => {
  questionsPromise ??= (async () => {
    const normalized = Object.entries(questionBankJson as Record<string, RawQuestion>)
      .map(([id, rawQuestion]) => normalizeDatasetQuestion(id, rawQuestion))
      .filter((question): question is QuizQuestion => question !== null);

    validateQuestionBank(normalized);

    const ordered = DIMENSION_ORDER.flatMap((dimension) =>
      pickDimensionQuestions(dimension, normalized),
    );

    return shuffleQuestions(ordered);
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
