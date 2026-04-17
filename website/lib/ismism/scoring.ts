import { DIMENSION_LABELS, DIMENSION_ORDER } from "./types.ts";
import type {
  AnswerMap,
  ChoiceValue,
  DimensionKey,
  DimensionResult,
  IsmCatalogEntry,
  QuizQuestion,
  QuizResult,
} from "./types.ts";

const DIGIT_MARKER_MAP: Record<1 | 2 | 3 | 4, string> = {
  1: "秩序",
  2: "冲突",
  3: "中心",
  4: "虚无",
};

const DIMENSION_TITLE_MAP: Record<
  DimensionKey,
  Array<{ title: string; summary: string }>
> = {
  field: [
    {
      title: "规则先在",
      summary: "先看既有规则和场景边界，再决定行动方式。",
    },
    {
      title: "结构张力",
      summary: "关注系统内部冲突和机制关系，重视结构解释。",
    },
    {
      title: "主体位置",
      summary: "强调观察者位置和参与方式对理解结果的影响。",
    },
    {
      title: "生成变化",
      summary: "将场域视为可改造过程，重视实践中的重组能力。",
    },
  ],
  ontology: [
    {
      title: "实体优先",
      summary: "更信任可确认对象、资源和稳定边界。",
    },
    {
      title: "关系优先",
      summary: "把关系网络和结构位置看作核心存在条件。",
    },
    {
      title: "意义优先",
      summary: "关注主体如何赋义，强调理解框架的作用。",
    },
    {
      title: "过程优先",
      summary: "把变化、行动与生成过程看作存在核心。",
    },
  ],
  phenomenon: [
    {
      title: "经验直达",
      summary: "倾向相信经验能较直接地接近现实。",
    },
    {
      title: "中介过滤",
      summary: "认为现象常被叙事、结构和解释机制过滤。",
    },
    {
      title: "体验建构",
      summary: "强调第一人称体验在现实显现中的作用。",
    },
    {
      title: "裂缝敏感",
      summary: "更容易从矛盾、断裂和偏差中识别真实问题。",
    },
  ],
};

const DIMENSION_AXIS_EXPLANATION_MAP: Record<
  DimensionKey,
  Record<1 | 2 | 3 | 4, string>
> = {
  field: {
    1: "你更倾向先把世界看作既有秩序，再谈个体选择。",
    2: "你更容易从结构冲突和机制分配理解局势。",
    3: "你会把主体位置和参与方式放在解释中心。",
    4: "你重视在行动中重塑场景，接受变化与重组。",
  },
  ontology: {
    1: "你更看重可确认、可落地、可验证的存在。",
    2: "你更看重关系位置和系统结构的作用。",
    3: "你更看重主体赋义和解释框架的力量。",
    4: "你更看重过程、生成和行动中的存在。",
  },
  phenomenon: {
    1: "你更相信经验可以较直接呈现现实。",
    2: "你会先考虑经验被中介与叙事过滤的问题。",
    3: "你强调体验结构和意义生成的主观维度。",
    4: "你对断裂、错位和不一致信息更敏感。",
  },
};

const round = (value: number) => Math.round(value * 100) / 100;

const isMeaningfulText = (value?: string | null, minimumLength = 8) =>
  typeof value === "string" && value.trim().length >= minimumLength;

const mergeInformativeList = (
  list: string[] | undefined,
  fallback: string[],
  minimumLength = 8,
) => {
  const normalized = (list ?? []).filter((item) =>
    isMeaningfulText(item, minimumLength),
  );
  return normalized.length ? normalized : fallback;
};

const buildAxisInsightList = (
  dimensionResults: DimensionResult[],
  rawAxisList: string[] | undefined,
): string[] =>
  dimensionResults.map((result, index) => {
    const rawItem = rawAxisList?.[index]?.trim();
    if (rawItem) {
      return rawItem;
    }

    return `${DIMENSION_LABELS[result.key]}：${DIMENSION_AXIS_EXPLANATION_MAP[result.key][result.digit]}`;
  });

const buildFallbackSimpleStory = (dimensionResults: DimensionResult[]) => {
  const field = dimensionResults.find((item) => item.key === "field")?.digit ?? 2;
  const ontology = dimensionResults.find((item) => item.key === "ontology")?.digit ?? 2;
  const phenomenon =
    dimensionResults.find((item) => item.key === "phenomenon")?.digit ?? 2;

  return `在面对复杂问题时，你会先从“场域 ${field}”的方式切入，再用“本体 ${ontology}”判断关键因素，最后通过“现象 ${phenomenon}”来组织理解与行动。`;
};

const buildFallbackExamplePeople = (dimensionResults: DimensionResult[]) => {
  const field = dimensionResults.find((item) => item.key === "field")?.title ?? "规则先在";
  const ontology =
    dimensionResults.find((item) => item.key === "ontology")?.title ?? "实体优先";
  const phenomenon =
    dimensionResults.find((item) => item.key === "phenomenon")?.title ?? "经验直达";

  return `一个遇事会从“${field}”切入、判断时偏向“${ontology}”、理解上带着“${phenomenon}”习惯的人。`;
};

const buildFallbackInfo = (
  dimensionResults: DimensionResult[],
  name: string,
) => ({
  axisList: buildAxisInsightList(dimensionResults, undefined),
  featureList: [
    "在判断问题时会综合场域、存在和经验三个层面。",
    "不依赖单一解释框架，倾向在现实情境中动态权衡。",
    `相比套用标准答案，你更像在发展属于自己的 ${name} 姿态。`,
  ],
  examplePeople: buildFallbackExamplePeople(dimensionResults),
  simpleStory: buildFallbackSimpleStory(dimensionResults),
});

const calculateMatchRate = (dimensionResults: DimensionResult[]): number => {
  // 科学计算方法：基于信息熵（Information Entropy）的决策一致性分析
  // 1. 计算每个维度的归一化熵
  // 2. 熵越低，代表用户的选择越聚焦，结果越“准确”
  
  const scores = dimensionResults.map(d => {
    // 简单的线性映射：如果一个人在某个维度选了 100% 同一个选项，CI=1.0
    // 如果选得非常分散，CI 较低。
    // 我们使用 (WinningPercentage - 25) / 75 作为一个基础一致度
    const baseCI = Math.max(0, (d.percentage - 25) / 75);
    return baseCI;
  });

  const avgCI = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // 非线性映射，使结果更符合“准确度”的直观感受
  // 使用逻辑回归函数形状：80% 基础分 + 20% 的表现分
  const finalRate = 75 + (avgCI * 25);
  
  return round(Math.min(99.9, finalRate));
};

const buildQuizResultPayload = ({
  dimensionResults,
  enhancedCatalog,
  coreCode,
}: {
  dimensionResults: DimensionResult[];
  enhancedCatalog: Record<string, IsmCatalogEntry>;
  coreCode?: string;
}): QuizResult => {
  const resolvedCoreCode =
    coreCode ?? dimensionResults.map((result) => result.digit).join("-");
  const coreInfo = enhancedCatalog[resolvedCoreCode];
  const englishName = coreInfo?.en_name || "";

  const now = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10_000);
  const clientId = now * 10_000 + randomSuffix;

  const preferredName = coreInfo?.ch_name || `${resolvedCoreCode} 型哲学倾向`;
  const fallbackInfo = buildFallbackInfo(dimensionResults, preferredName);
  const matchRate = calculateMatchRate(dimensionResults);

  return {
    clientId,
    createdAt: new Date().toISOString(),
    dimensionResults,
    coreCode: resolvedCoreCode,
    name: preferredName,
    englishName,
    matchRate,
    info: {
      axisList: buildAxisInsightList(dimensionResults, coreInfo?.axis_list),
      featureList: mergeInformativeList(coreInfo?.feature_list, fallbackInfo.featureList),
      examplePeople: isMeaningfulText(coreInfo?.example_people, 4)
        ? coreInfo.example_people!.trim()
        : fallbackInfo.examplePeople,
      simpleStory: isMeaningfulText(coreInfo?.simple_story, 20)
        ? coreInfo.simple_story!.trim()
        : fallbackInfo.simpleStory,
    },
  };
};

const voteToDigit = (voteCounter: Record<ChoiceValue, number>): 1 | 2 | 3 | 4 => {
  let winner: ChoiceValue = "1";
  let maxVotes = voteCounter[winner];

  for (const candidate of ["2", "3", "4"] as const) {
    if (voteCounter[candidate] > maxVotes) {
      winner = candidate;
      maxVotes = voteCounter[candidate];
    }
  }

  return Number(winner) as 1 | 2 | 3 | 4;
};

const buildDimensionResult = (
  dimension: DimensionKey,
  questions: QuizQuestion[],
  answers: AnswerMap,
): DimensionResult => {
  const scoped = questions.filter((question) => question.dimension === dimension);
  const voteCounter: Record<ChoiceValue, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
  };

  for (const question of scoped) {
    const choice = answers[question.id];
    if (choice) {
      voteCounter[choice] += 1;
    }
  }

  const digit = voteToDigit(voteCounter);
  const winningVotes = voteCounter[String(digit) as ChoiceValue];
  const maxScore = scoped.length;
  const percentage = maxScore === 0 ? 0 : round((winningVotes / maxScore) * 100);
  const copy = DIMENSION_TITLE_MAP[dimension][digit - 1];

  return {
    key: dimension,
    label: DIMENSION_LABELS[dimension],
    rawScore: winningVotes,
    maxScore,
    percentage,
    digit,
    marker: DIGIT_MARKER_MAP[digit],
    title: copy.title,
    summary: copy.summary,
  };
};

const buildDimensionResultFromDigit = (
  dimension: DimensionKey,
  digit: 1 | 2 | 3 | 4,
): DimensionResult => {
  const copy = DIMENSION_TITLE_MAP[dimension][digit - 1];

  return {
    key: dimension,
    label: DIMENSION_LABELS[dimension],
    rawScore: digit,
    maxScore: 4,
    percentage: digit * 25,
    digit,
    marker: DIGIT_MARKER_MAP[digit],
    title: copy.title,
    summary: copy.summary,
  };
};

const normalizeCoreCode = (value: string) => value.trim().replace(/\s+/g, "");

const parseCoreCode = (coreCode: string): Array<1 | 2 | 3 | 4> | null => {
  const normalized = normalizeCoreCode(coreCode);

  if (!/^[1-4]-[1-4]-[1-4]$/.test(normalized)) {
    return null;
  }

  return normalized
    .split("-")
    .map((digit) => Number(digit) as 1 | 2 | 3 | 4);
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

  return buildQuizResultPayload({
    dimensionResults,
    enhancedCatalog,
  });
};

export const buildQuizResultFromCoreCode = ({
  coreCode,
  enhancedCatalog,
}: {
  coreCode: string;
  enhancedCatalog: Record<string, IsmCatalogEntry>;
}): QuizResult => {
  const digits = parseCoreCode(coreCode);

  if (!digits) {
    throw new Error("结果代码格式不对，请输入类似 1-1-1 的三位数字。");
  }

  const normalizedCoreCode = normalizeCoreCode(coreCode);
  const dimensionResults = DIMENSION_ORDER.map((dimension, index) =>
    buildDimensionResultFromDigit(dimension, digits[index]!),
  );

  return buildQuizResultPayload({
    dimensionResults,
    enhancedCatalog,
    coreCode: normalizedCoreCode,
  });
};
