import {
  AGREEMENT_OPTIONS,
  DIMENSION_LABELS,
  DIMENSION_ORDER,
} from "@/lib/ismism/types";
import type {
  AgreementValue,
  AnswerMap,
  DimensionKey,
  DimensionResult,
  IsmCatalogEntry,
  QuizQuestion,
  QuizResult,
} from "@/lib/ismism/types";

const AGREEMENT_RATIO_MAP = Object.fromEntries(
  AGREEMENT_OPTIONS.map((option) => [option.value, option.ratio]),
) as Record<AgreementValue, number>;

const DIMENSION_TITLE_MAP: Record<
  DimensionKey,
  Array<{ title: string; summary: string }>
> = {
  field: [
    {
      title: "秩序场感",
      summary: "你更容易把世界理解成先验存在、等待进入的稳定框架。",
    },
    {
      title: "结构场感",
      summary: "你会注意到表层秩序之外仍有分层、剩余与看不见的布置。",
    },
    {
      title: "主体场感",
      summary: "你倾向从立场、意识和主体位置出发理解整体环境。",
    },
    {
      title: "实践场感",
      summary: "你更把世界视作需要介入、改写和重新组织的行动场。",
    },
  ],
  ontology: [
    {
      title: "对象本位",
      summary: "你更相信客观资源、规则与可落地对象具有最硬的存在分量。",
    },
    {
      title: "结构本位",
      summary: "你会把深层关系、框架和不易直接看到的力量视为真正关键。",
    },
    {
      title: "主体本位",
      summary: "你更看重观念、自我立场和主体性在存在判断中的位置。",
    },
    {
      title: "生成本位",
      summary: "你倾向把行动、关系和持续生成的过程视为真正存在的东西。",
    },
  ],
  phenomenon: [
    {
      title: "直观显现",
      summary: "你较相信经验能把现实较直接地呈现在人面前。",
    },
    {
      title: "中介显现",
      summary: "你会警惕表象背后仍有解释层和认识过程在塑形。",
    },
    {
      title: "体验显现",
      summary: "你更重视第一人称感受、意义构造与主观经验的分量。",
    },
    {
      title: "裂缝显现",
      summary: "你更敏感于错位、反讽、断裂和无法被彻底整合的显现方式。",
    },
  ],
};

const round = (value: number) => Math.round(value * 100) / 100;

const toDigit = (ratio: number): 1 | 2 | 3 | 4 => {
  const bounded = Math.min(0.999999, Math.max(0, ratio));
  return (Math.floor(bounded * 4) + 1) as 1 | 2 | 3 | 4;
};

export const getAnswerLabel = (value: AgreementValue) =>
  AGREEMENT_OPTIONS.find((option) => option.value === value)?.label ?? value;

const buildDimensionResult = (
  dimension: DimensionKey,
  questions: QuizQuestion[],
  answers: AnswerMap,
): DimensionResult => {
  const scoped = questions.filter((question) => question.dimension === dimension);
  const rawScore = scoped.reduce((total, question) => {
    const baseRatio = AGREEMENT_RATIO_MAP[answers[question.id]];
    const ratio = dimension === "field" ? 1 - baseRatio : baseRatio;
    return total + question.weight * ratio;
  }, 0);
  const maxScore = scoped.reduce((total, question) => total + question.weight, 0);
  const normalized = maxScore === 0 ? 0 : rawScore / maxScore;
  const percentage = round(normalized * 100);
  const digit = toDigit(normalized);
  const copy = DIMENSION_TITLE_MAP[dimension][digit - 1];

  return {
    key: dimension,
    label: DIMENSION_LABELS[dimension],
    rawScore: round(rawScore),
    maxScore: round(maxScore),
    percentage,
    digit,
    title: copy.title,
    summary: copy.summary,
  };
};

export const buildQuizResult = ({
  questions,
  answers,
  enhancedCatalog,
}: {
  questions: QuizQuestion[];
  answers: AnswerMap;
  enhancedCatalog: Record<string, IsmCatalogEntry>;
}): QuizResult => {
  const dimensionResults = DIMENSION_ORDER.map((dimension) =>
    buildDimensionResult(dimension, questions, answers),
  );

  const coreCode = dimensionResults.map((result) => result.digit).join("-");

  const coreInfo = enhancedCatalog[coreCode];
  const englishName = coreInfo?.en_name || "";

  const now = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10_000);
  const clientId = now * 10_000 + randomSuffix;

  const preferredName = coreInfo?.ch_name || `${coreCode} 型哲学倾向`;

  return {
    clientId,
    createdAt: new Date().toISOString(),
    dimensionResults,
    coreCode,
    name: preferredName,
    englishName,
    info: {
      axisList: coreInfo?.axis_list ?? [],
      featureList: coreInfo?.feature_list?.filter(Boolean) ?? [],
      examplePeople: coreInfo?.example_people ?? "",
      simpleStory:
        coreInfo?.simple_story ||
        "你的结果更像是一种仍在生成中的哲学姿态，说明你会在结构、存在与经验之间持续寻找自己的稳定位置。",
    },
  };
};
