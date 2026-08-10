import { DIMENSION_ORDER } from "./types.ts";
import { getLocaleCopy } from "../i18n.ts";
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

const DIMENSION_TITLE_MAP_ZH: Record<
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

const DIMENSION_TITLE_MAP_EN: Record<
  DimensionKey,
  Array<{ title: string; summary: string }>
> = {
  field: [
    { title: "Established order", summary: "You first look for the rules and boundaries already shaping the situation." },
    { title: "Operating forces", summary: "You look for the conflicts, incentives, and power relations beneath the surface." },
    { title: "Situated perspective", summary: "You see the observer's position and point of view as part of the outcome." },
    { title: "Dynamic reconstruction", summary: "You treat the situation as changeable and focus on reshaping it through action." },
  ],
  ontology: [
    { title: "Concrete objects", summary: "You trust things that can be confirmed, grounded, and tested in practice." },
    { title: "Relations and systems", summary: "You see connections and structural positions as more important than isolated things." },
    { title: "Interpretive frames", summary: "You focus on how people define value and how interpretation shapes reality." },
    { title: "Emergent process", summary: "You see ongoing change, action, and formation as the heart of what things are." },
  ],
  phenomenon: [
    { title: "Direct experience", summary: "You tend to trust intuition and firsthand experience as relatively direct access to reality." },
    { title: "Mediated information", summary: "You assume that stories and explanations filter what reaches us as truth." },
    { title: "Constructed perspective", summary: "You emphasize the decisive role of first-person experience in how reality appears." },
    { title: "Contradiction detection", summary: "You are alert to breaks, inconsistencies, and small details that reveal a deeper problem." },
  ],
};

const getDimensionTitleMap = (lang?: string) =>
  lang === "en" ? DIMENSION_TITLE_MAP_EN : DIMENSION_TITLE_MAP_ZH;

const getDigitMarker = (digit: 1 | 2 | 3 | 4, lang?: string) =>
  lang === "en" ? getLocaleCopy("en").digitMarkers[String(digit) as "1" | "2" | "3" | "4"].title : DIGIT_MARKER_MAP[digit];

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
  lang?: string,
): string[] =>
  dimensionResults.map((result, index) => {
    const rawItem = rawAxisList?.[index]?.trim();
    if (rawItem) {
      return rawItem;
    }

    const label = getLocaleCopy(lang).dimensions[result.key];
    if (lang === "en") {
      const englishExplanations: Record<DimensionKey, Record<1 | 2 | 3 | 4, string>> = {
        field: {
          1: "You tend to identify the rules of the environment before deciding how to act.",
          2: "You look for the mechanisms and competing interests beneath the situation.",
          3: "You believe the observer's position and involvement can change the outcome.",
          4: "You see the environment as something action can transform, with room for unexpected turns.",
        },
        ontology: {
          1: "You trust resources and boundaries that can be seen, handled, and clearly verified.",
          2: "You see the way things connect as more important than any thing taken alone.",
          3: "You think an object's value depends on how people interpret and define it.",
          4: "You treat continuing change and action as the core of what a thing is.",
        },
        phenomenon: {
          1: "You usually trust what you have directly seen or heard as a reliable guide to reality.",
          2: "You are cautious about packaged information and first ask who is telling the story.",
          3: "You think everyone's view of reality carries a strong personal perspective.",
          4: "You are good at spotting hidden problems in details that feel unnatural or inconsistent.",
        },
      };
      return `${label}: ${englishExplanations[result.key][result.digit]}`;
    }
    return `${label}：${DIMENSION_AXIS_EXPLANATION_MAP[result.key][result.digit]}`;
  });

const buildFallbackSimpleStory = (dimensionResults: DimensionResult[], lang?: string) => {
  const field = dimensionResults.find((item) => item.key === "field")?.digit ?? 2;
  const ontology = dimensionResults.find((item) => item.key === "ontology")?.digit ?? 2;
  const phenomenon =
    dimensionResults.find((item) => item.key === "phenomenon")?.digit ?? 2;

  if (lang === "en") {
    return `When a problem gets complicated, you start with Field ${field}, use Ontology ${ontology} to identify what matters, and then use Phenomenon ${phenomenon} to organize your understanding and action.`;
  }
  return `在面对复杂问题时，你会先从“场域 ${field}”的方式切入，再用“本体 ${ontology}”判断关键因素，最后通过“现象 ${phenomenon}”来组织理解与行动。`;
};

const buildFallbackExamplePeople = (dimensionResults: DimensionResult[], lang?: string) => {
  const field = dimensionResults.find((item) => item.key === "field")?.title ?? (lang === "en" ? "rules first" : "规则先在");
  const ontology =
    dimensionResults.find((item) => item.key === "ontology")?.title ?? (lang === "en" ? "concrete things first" : "实体优先");
  const phenomenon =
    dimensionResults.find((item) => item.key === "phenomenon")?.title ?? (lang === "en" ? "direct experience" : "经验直达");

  if (lang === "en") {
    return `Someone who approaches situations through “${field},” judges them through “${ontology},” and makes sense of them through “${phenomenon}.”`;
  }
  return `一个遇事会从“${field}”切入、判断时偏向“${ontology}”、理解上带着“${phenomenon}”习惯的人。`;
};

const buildFallbackInfo = (
  dimensionResults: DimensionResult[],
  name: string,
  lang?: string,
) => ({
  axisList: buildAxisInsightList(dimensionResults, undefined, lang),
  featureList: lang === "en"
    ? [
        "You combine the world's conditions, the nature of things, and lived experience when making judgments.",
        "You do not rely on a single explanatory frame; you weigh competing possibilities in context.",
        `Rather than applying a standard answer, you are developing your own ${name} stance.`,
      ]
    : [
        "在判断问题时会综合场域、存在和经验三个层面。",
        "不依赖单一解释框架，倾向在现实情境中动态权衡。",
        `相比套用标准答案，你更像在发展属于自己的 ${name} 姿态。`,
      ],
  examplePeople: buildFallbackExamplePeople(dimensionResults, lang),
  simpleStory: buildFallbackSimpleStory(dimensionResults, lang),
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
  lang,
}: {
  dimensionResults: DimensionResult[];
  enhancedCatalog: Record<string, IsmCatalogEntry>;
  coreCode?: string;
  lang?: string;
}): QuizResult => {
  const resolvedCoreCode =
    coreCode ?? dimensionResults.map((result) => result.digit).join("-");
  const coreInfo = enhancedCatalog[resolvedCoreCode];
  const englishName = coreInfo?.en_name || "";

  const now = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10_000);
  const clientId = now * 10_000 + randomSuffix;

  const preferredName = coreInfo?.ch_name || (lang === "en"
    ? `${resolvedCoreCode} philosophical tendency`
    : `${resolvedCoreCode} 型哲学倾向`);
  const fallbackInfo = buildFallbackInfo(dimensionResults, preferredName, lang);
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
      axisList: buildAxisInsightList(dimensionResults, coreInfo?.axis_list, lang),
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

const voteToDigit = (
  voteCounter: Record<ChoiceValue, number>,
  dimension: DimensionKey,
): 1 | 2 | 3 | 4 => {
  // 场域维度特殊规则：4需要≥5票且为最多票数才能获胜
  if (dimension === "field") {
    if (voteCounter["4"] >= 5) {
      // 检查4是否是最高票数
      const maxVotes = Math.max(voteCounter["1"], voteCounter["2"], voteCounter["3"], voteCounter["4"]);
      if (voteCounter["4"] === maxVotes) {
        return 4;
      }
    }
    // 场域维度：4不是最高票时，按平票优先级决定
    // 优先级顺序: 2 > 3 > 4 > 1
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
  } else {
    // 本体/现象维度：简单多数取胜
    // 优先级顺序: 2 > 3 > 4 > 1
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
  }
};

const buildDimensionResult = (
  dimension: DimensionKey,
  questions: QuizQuestion[],
  answers: AnswerMap,
  lang?: string,
): DimensionResult => {
  const scoped = questions.filter((question) => question.dimension === dimension);
  const voteCounter: Record<ChoiceValue, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
  };

  for (const question of scoped) {
    const choices = answers[question.id];
    if (choices && Array.isArray(choices)) {
      for (const choice of choices) {
        if (choice in voteCounter) {
          voteCounter[choice] += 1;
        }
      }
    }
  }

  const digit = voteToDigit(voteCounter, dimension);
  const winningVotes = voteCounter[String(digit) as ChoiceValue];
  // maxScore 是可能的最高票数（每题选2个 * 6题 = 12票）
  const maxScore = scoped.length * 2;
  const percentage = maxScore === 0 ? 0 : round((winningVotes / maxScore) * 100);
  const copy = getDimensionTitleMap(lang)[dimension][digit - 1];
  const locale = getLocaleCopy(lang);

  return {
    key: dimension,
    label: locale.dimensions[dimension],
    rawScore: winningVotes,
    maxScore,
    percentage,
    digit,
    marker: getDigitMarker(digit, lang),
    title: copy.title,
    summary: copy.summary,
  };
};

const buildDimensionResultFromDigit = (
  dimension: DimensionKey,
  digit: 1 | 2 | 3 | 4,
  lang?: string,
): DimensionResult => {
  const copy = getDimensionTitleMap(lang)[dimension][digit - 1];
  const locale = getLocaleCopy(lang);

  return {
    key: dimension,
    label: locale.dimensions[dimension],
    rawScore: digit,
    maxScore: 4,
    percentage: digit * 25,
    digit,
    marker: getDigitMarker(digit, lang),
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
  lang,
}: {
  questions: QuizQuestion[];
  answers: AnswerMap;
  enhancedCatalog: Record<string, IsmCatalogEntry>;
  lang?: string;
}): QuizResult => {
  const dimensionResults = DIMENSION_ORDER.map((dimension) =>
    buildDimensionResult(dimension, questions, answers, lang),
  );

  return buildQuizResultPayload({
    dimensionResults,
    enhancedCatalog,
    lang,
  });
};

export const buildQuizResultFromCoreCode = ({
  coreCode,
  enhancedCatalog,
  lang,
}: {
  coreCode: string;
  enhancedCatalog: Record<string, IsmCatalogEntry>;
  lang?: string;
}): QuizResult => {
  const digits = parseCoreCode(coreCode);

  if (!digits) {
    throw new Error(getLocaleCopy(lang).errors.invalidCoreCode);
  }

  const normalizedCoreCode = normalizeCoreCode(coreCode);
  const dimensionResults = DIMENSION_ORDER.map((dimension, index) =>
    buildDimensionResultFromDigit(dimension, digits[index]!, lang),
  );

  return buildQuizResultPayload({
    dimensionResults,
    enhancedCatalog,
    coreCode: normalizedCoreCode,
    lang,
  });
};
