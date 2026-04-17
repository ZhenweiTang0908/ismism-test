export const DIMENSION_ORDER = [
  "field",
  "ontology",
  "phenomenon",
] as const;

export type DimensionKey = (typeof DIMENSION_ORDER)[number];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  field: "场域",
  ontology: "本体",
  phenomenon: "现象",
};

export const QUESTION_TYPE_WEIGHTS = {
  life: 1,
  public: 1,
  abstract: 1,
} as const;

export type QuestionType = keyof typeof QUESTION_TYPE_WEIGHTS;

export const CHOICE_VALUES = ["1", "2", "3", "4"] as const;
export type ChoiceValue = (typeof CHOICE_VALUES)[number];

export type AnswerMap = Record<string, ChoiceValue>;

export type QuizOption = {
  value: ChoiceValue;
  label: string;
};

export type QuizQuestion = {
  id: string;
  question: string;
  dimension: DimensionKey;
  dimensionLabel: string;
  type: QuestionType;
  weight: number;
  options: [QuizOption, QuizOption, QuizOption, QuizOption];
  source: "dataset" | "mock";
};

export type IsmCatalogEntry = {
  ch_name?: string;
  en_name?: string;
  axis_list?: string[];
  feature_list?: string[];
  example_people?: string;
  simple_story?: string;
};

export type RespondentProfile = {
  name: string;
  message: string;
};

export type DimensionResult = {
  key: DimensionKey;
  label: string;
  rawScore: number;
  maxScore: number;
  percentage: number;
  digit: 1 | 2 | 3 | 4;
  marker: string;
  title: string;
  summary: string;
};

export type QuizResult = {
  clientId: number;
  createdAt: string;
  dimensionResults: DimensionResult[];
  coreCode: string;
  name: string;
  englishName: string;
  info: {
    axisList: string[];
    featureList: string[];
    examplePeople: string;
    simpleStory: string;
  };
  matchRate: number;
};

export type QuizResultAiInterpretation = {
  simpleExplanation: string;
  dimensionInterpretations: Array<{
    key: DimensionKey;
    label: string;
    digit: 1 | 2 | 3 | 4;
    title: string;
    explanation: string;
  }>;
};

export type SubmitQuizResponse = {
  result: QuizResult;
  storage: {
    ok: boolean;
    answersTable?: string;
    resultsTable?: string;
    clientTable?: string;
    message?: string;
  };
};

export type QuizResultAiInterpretationResponse = {
  interpretation: QuizResultAiInterpretation;
};
