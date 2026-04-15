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
      summary: "你更容易把世界理解成先于个人而存在、等待进入的稳定框架。",
    },
    {
      title: "结构场感",
      summary: "你会注意到表面秩序之外仍有分层、剩余与看不见的布置。",
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
      summary: "你会把深层关系、框架和不易直接看见的力量视为真正关键。",
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

const DIMENSION_AXIS_EXPLANATION_MAP: Record<
  DimensionKey,
  Record<1 | 2 | 3 | 4, string>
> = {
  field: {
    1: "你会先把世界理解成一个先于个人而存在的自然或秩序背景，人的判断和行动通常是在这个既有场域中展开，而不是先从主体意志出发定义世界。",
    2: "你会把世界看成由深层结构、制度关系和隐藏布置支撑起来的场域，表面发生的事情往往只是更深层安排的一次露面。",
    3: "你理解世界时更强调主体位置、经验视角和意义参与，场域不是纯粹外在的背景，而总是和观察者的站位一起被组织出来。",
    4: "你倾向把场域理解为一个可以被行动介入、被冲突改写的开放过程，世界不是静止背景，而是会在实践中持续重组。",
  },
  ontology: {
    1: "你更相信对象、资源、规则和可确认的现实后果具有最坚实的存在资格，存在首先表现为那些能够稳定落地、被外部确认的东西。",
    2: "你会把关系网络、结构位置和系统性机制视为更深一层的存在，个别对象的重要性往往要放回整体框架里才能被理解。",
    3: "你更看重主体、观念和内在理解在存在判断中的作用，什么算真实不仅取决于对象本身，也取决于主体如何赋义和确认。",
    4: "你会把生成、变化、行动和关系流动本身视为存在的核心，真正重要的不是静止实体，而是那些不断生成现实的过程。",
  },
  phenomenon: {
    1: "你更相信经验可以较直接地把现实带到眼前，现象与真实之间虽然不必完全重合，但通常不需要过多中介才能把握。",
    2: "你会警惕表象背后仍有解释框架、认知路径和符号中介，任何经验都不是直接透明的，而是经过加工和过滤后才出现。",
    3: "你更重视第一人称体验、心理感受和意义生成的层面，真实如何显现出来，往往要通过主体的感受结构才能被理解。",
    4: "你对断裂、错位、反讽和未完成状态格外敏感，显现本身就带着裂缝，真实并不会总以平整、完整、统一的方式出现。",
  },
};

const DEFAULT_INFO_BY_CODE: Record<
  string,
  {
    axisList: string[];
    featureList: string[];
    examplePeople: string;
    simpleStory: string;
  }
> = {
  "1-1-1": {
    axisList: [
      "场域上更倾向把世界理解为先于个人而存在的稳定秩序。",
      "本体上更信任可落地、可验证、能产生现实后果的存在。",
      "现象上更相信经验能够较直接地呈现真实。",
    ],
    featureList: [
      "判断问题时优先看规则、资源和现实约束，而不是先看解释姿态。",
      "更容易把复杂局面拆成可以确认的事实、位置和可执行条件。",
      "对模糊叙事和抽象宣言保持距离，更在意什么真正有效。",
    ],
    examplePeople: "更像务实的现实观察者、制度分析者或经验主义者。",
    simpleStory:
      "你通常先确认世界如何运转，再决定自己站在哪里。比起宏大解释，你更相信已经摆在眼前、能持续起作用的秩序、资源和事实。",
  },
  "2-2-2": {
    axisList: [
      "场域上会注意表面秩序背后还有更深一层的结构安排。",
      "本体上更相信关系、框架和系统位置比孤立对象更关键。",
      "现象上意识到经验总会经过解释、中介和视角过滤。",
    ],
    featureList: [
      "会本能地追问规则从何而来，以及谁在背后决定分配方式。",
      "看到的不只是谁说了什么，还会去看结构如何让某些说法更有力量。",
      "面对复杂问题时，倾向从隐藏机制而非表面冲突出发。",
    ],
    examplePeople: "更像结构分析者、制度批判者或关系网络的解读者。",
    simpleStory:
      "你不太满足于接受表面现象，而是会进一步追问：是什么结构让事情只能这样发生。你对隐藏机制、位置差异和中介过程尤其敏感。",
  },
  "3-3-3": {
    axisList: [
      "场域上更强调主体的立场、反思能力和介入方式。",
      "本体上会把观念、自我理解和主体现身看得更重要。",
      "现象上更重视第一人称经验、意义生成与内在感受。",
    ],
    featureList: [
      "判断问题时会先校准自己站在什么位置上理解它。",
      "不把世界当成纯粹外在对象，而会反问主体如何参与了定义过程。",
      "相比现成答案，更在意意义如何被体验、确认与承担。",
    ],
    examplePeople: "更像反思型主体、意义追问者或体验导向的哲学读者。",
    simpleStory:
      "你会不断把问题带回主体自身：我如何理解、如何确认、如何承担。对你来说，意义不是现成摆在那里，而是在反思和体验中逐步成立。",
  },
  "4-4-4": {
    axisList: [
      "场域上更把世界视为可被行动重新组织的开放过程。",
      "本体上更重视生成、关系变化和持续实践中的存在。",
      "现象上对裂缝、偏差和未完成状态保持高度敏感。",
    ],
    featureList: [
      "不会把秩序视为终点，更关心怎样通过行动改写它。",
      "能接受不确定性，并把变化本身看作真实的一部分。",
      "当现成框架失效时，更愿意进入实践、试错与重组。",
    ],
    examplePeople: "更像行动导向者、实践改造者或生成视角的思考者。",
    simpleStory:
      "你不满足于解释世界已经是什么样，而更关心如何把它推向新的形态。对你来说，现实不是封闭成品，而是正在被行动持续改写的过程。",
  },
};

const round = (value: number) => Math.round(value * 100) / 100;

const toDigit = (ratio: number): 1 | 2 | 3 | 4 => {
  const bounded = Math.min(0.999999, Math.max(0, ratio));
  return (Math.floor(bounded * 4) + 1) as 1 | 2 | 3 | 4;
};

const isMeaningfulText = (value?: string | null, minimumLength = 8) =>
  typeof value === "string" && value.trim().length >= minimumLength;

const mergeInformativeList = (
  list: string[] | undefined,
  fallback: string[],
  minimumLength = 8,
) => {
  const normalized = (list ?? []).filter((item) => isMeaningfulText(item, minimumLength));
  return normalized.length ? normalized : fallback;
};

const buildAxisInsightList = (
  dimensionResults: DimensionResult[],
  rawAxisList: string[] | undefined,
  fallbackAxisList: string[],
): string[] =>
  dimensionResults.map((result, index) => {
    const rawItem = rawAxisList?.[index]?.trim();

    if (typeof rawItem === "string" && rawItem.length >= 28) {
      return rawItem;
    }

    if (typeof rawItem === "string" && rawItem.length >= 4) {
      return `${rawItem}：${DIMENSION_AXIS_EXPLANATION_MAP[result.key][result.digit]}`;
    }

    return (
      fallbackAxisList[index] ??
      `${DIMENSION_LABELS[result.key]} ${result.digit}：${DIMENSION_AXIS_EXPLANATION_MAP[result.key][result.digit]}`
    );
  });

const buildFallbackInfo = (coreCode: string, name: string) => {
  const exact = DEFAULT_INFO_BY_CODE[coreCode];

  if (exact) {
    return exact;
  }

  return {
    axisList: [
      "这个结果表示你在场域、本体、现象三条轴线上形成了一种组合式倾向。",
      "你不会只依赖单一视角，而是在结构、存在和经验之间做自己的权衡。",
      "最终编码不是标签本身，而是你处理世界方式的一种压缩表达。",
    ],
    featureList: [
      "会根据情境在不同理解框架之间切换，不轻易被单一说法固定。",
      "既关注现实条件，也会注意经验视角和行动方式如何改变判断。",
      `相较于套用标准答案，你更像在发展一种属于自己的 ${name} 姿态。`,
    ],
    examplePeople: "更像一种仍在生成中的思想姿态，而不是单一典型人物。",
    simpleStory:
      "你的结果不是落进一个狭窄标签，而是显示出多条哲学轴线的交汇方式。你理解世界时，会在现实条件、主观体验和行动可能性之间寻找自己的重心。",
  };
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
  const fallbackInfo = buildFallbackInfo(coreCode, preferredName);

  return {
    clientId,
    createdAt: new Date().toISOString(),
    dimensionResults,
    coreCode,
    name: preferredName,
    englishName,
    info: {
      axisList: buildAxisInsightList(
        dimensionResults,
        coreInfo?.axis_list,
        fallbackInfo.axisList,
      ),
      featureList: mergeInformativeList(coreInfo?.feature_list, fallbackInfo.featureList),
      examplePeople: isMeaningfulText(coreInfo?.example_people, 4)
        ? coreInfo!.example_people!.trim()
        : fallbackInfo.examplePeople,
      simpleStory: isMeaningfulText(coreInfo?.simple_story, 20)
        ? coreInfo!.simple_story!.trim()
        : fallbackInfo.simpleStory,
    },
  };
};
