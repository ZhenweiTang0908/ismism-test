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
  3: "调和",
  4: "虚无",
};

const DIMENSION_TITLE_MAP: Record<
  DimensionKey,
  Array<{ title: string; summary: string }>
> = {
  field: [
    {
      title: "既有秩序",
      summary: "倾向先看清环境规则和边界，在既定框架内行动。",
    },
    {
      title: "运作机制",
      summary: "关注系统内部的逻辑冲突和权力关系，重视深层解释。",
    },
    {
      title: "参与立场",
      summary: "强调观察者的位置和视角会直接影响对结果的理解。",
    },
    {
      title: "动态重塑",
      summary: "将场景视为可改变的过程，重视在行动中重新组合。",
    },
  ],
  ontology: [
    {
      title: "确凿对象",
      summary: "更信任可以被确认、落地和验证的实物、资源与边界。",
    },
    {
      title: "关系网络",
      summary: "认为事物之间的连接方式和结构位置比个体更核心。",
    },
    {
      title: "解释框架",
      summary: "关注人们如何定义价值，强调理解方式对现实的作用。",
    },
    {
      title: "演化过程",
      summary: "将不断的变化、行动和生成过程看作事物的核心。",
    },
  ],
  phenomenon: [
    {
      title: "直接经验",
      summary: "倾向于相信直觉和感官经验能较直接地接近现实。",
    },
    {
      title: "信息中介",
      summary: "认为真相常被叙事、包装或特定解释机制所过滤。",
    },
    {
      title: "视角建构",
      summary: "强调第一人称的个人体验在现实呈现中的决定作用。",
    },
    {
      title: "细节侦测",
      summary: "擅长从矛盾、断裂和不一致的信息中识别真实问题。",
    },
  ],
};

const DIMENSION_AXIS_EXPLANATION_MAP: Record<
  DimensionKey,
  Record<1 | 2 | 3 | 4, string>
> = {
  field: {
    1: "你倾向于先看清环境中的规则，再考虑如何行动。",
    2: "你习惯分析事物背后的运作机制和利益冲突。",
    3: "你认为观察者的身份和介入方式会改变事情的结果。",
    4: "你相信环境是可以被行动改变的，重视过程中的变数。",
  },
  ontology: {
    1: "你更信任看得见、摸得着、能被明确证实的资源和边界。",
    2: "你认为事物之间的连接方式比事物本身更重要。",
    3: "你觉得一件事的价值在于人们如何解读它、定义它。",
    4: "你把不断变化和行动的过程看作事情的核心。",
  },
  phenomenon: {
    1: "你相信亲眼所见、亲耳所闻的经验通常就是真实的。",
    2: "你警惕信息被加工或包装过，会先思考谁在讲这个故事。",
    3: "你认为每个人看到的现实都带有极强的个人视角偏好。",
    4: "你擅长从不自然、不一致的细节中发现潜在的问题。",
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
  // 采用调和平均值（Harmonic Mean）算法
  // 相比算术平均值，调和平均值对低分更加敏感，能更好地体现“三个维度必须都一致”的科学性
  
  const percentages = dimensionResults.map(d => Math.max(d.percentage, 1));
  
  // 计算调和平均值: n / (Σ 1/p)
  const harmonicSum = percentages.reduce((acc, p) => acc + (1 / p), 0);
  const rawRate = dimensionResults.length / harmonicSum;
  
  // 适度调整，使结果落在 40-100 的合理心理区间，而不是纯线性
  // 这种调整依然保留了极大的区分度
  const adjustedRate = rawRate * 0.8 + 15;
  
  return round(Math.min(99.9, adjustedRate));
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
  // 虚无(4)需要≥5票才能获胜
  if (voteCounter["4"] >= 5) return 4;

  // 平票优先级顺序: 2 > 3 > 4 > 1
  const priorities: ChoiceValue[] = ["2", "3", "4", "1"];
  let winner: ChoiceValue = priorities[0];
  let maxVotes = voteCounter[winner];

  for (let i = 1; i < priorities.length; i++) {
    const candidate = priorities[i];
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
