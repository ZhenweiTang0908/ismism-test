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
      title: "规则优先",
      summary: "你更容易把世界看成一套先在的规则和秩序，人通常是在里面找位置。",
    },
    {
      title: "结构优先",
      summary: "你会先注意表面背后的安排、关系和看不见的框架。",
    },
    {
      title: "视角优先",
      summary: "你理解世界时更看重人的立场、感受和站位。",
    },
    {
      title: "行动优先",
      summary: "你更把世界看成能被行动改变的过程，而不是固定背景。",
    },
  ],
  ontology: [
    {
      title: "看重硬东西",
      summary: "你更相信资源、规则、对象这些能落地的东西最真实。",
    },
    {
      title: "看重深层关系",
      summary: "你觉得真正起作用的往往是关系、结构和位置。",
    },
    {
      title: "看重主体判断",
      summary: "你更重视人的理解、立场和赋予意义的能力。",
    },
    {
      title: "看重生成变化",
      summary: "你更相信变化、行动和形成中的过程才最关键。",
    },
  ],
  phenomenon: [
    {
      title: "相信眼前经验",
      summary: "你较相信现实能比较直接地呈现在经验里。",
    },
    {
      title: "觉得经验有过滤",
      summary: "你会觉得人看到的东西总是经过解释和加工。",
    },
    {
      title: "重视个人感受",
      summary: "你更看重第一人称感受和意义体验。",
    },
    {
      title: "对裂缝更敏感",
      summary: "你更容易从矛盾、错位和不顺的地方理解真实。",
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
      "公司突然改了报销流程，老周先把新规定从头到尾看了一遍，再把能报什么、不能报什么、最晚什么时候交逐条记下来。别人还在讨论这套制度到底合不合理，他已经开始核对自己手里的票据够不够、流程卡不卡。对他来说，先把真正起作用的条件摸清，比先谈大道理更重要。",
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
      "部门里突然传出要裁员，有的人只盯着公告本身，小陈却先去打听：是谁卡了预算，哪个部门先缩编，为什么有些岗位总是先被动到。对他来说，表面那张通知还不是全部，真正关键的是背后那套关系是怎么转起来的。",
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
      "小明每天上同一班车、做差不多的工作，起初总觉得生活在重复。后来他慢慢换了个想法：既然这一天总要来，那就尽量把它过成自己愿意点头的一天。于是他不再老想着逃走，而是学着把眼前的每一次选择都当成真正要负责的事。",
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
      "团队里一个老流程明显拖慢效率，老李没有只停在抱怨上，也没有等别人先拍板。他先拉了两个人试一个新办法，哪里不顺就当场改。对他来说，事情不是固定摆在那里的，而是可以在做的过程中一点点被改出来。",
  },
};

const round = (value: number) => Math.round(value * 100) / 100;

const DIGIT_BREAKPOINTS_BY_DIMENSION: Record<
  DimensionKey,
  readonly [number, number, number]
> = {
  field: [0.18, 0.45, 0.78],
  ontology: [0.18, 0.45, 0.85],
  phenomenon: [0.18, 0.45, 0.85],
};

const toDigit = (dimension: DimensionKey, ratio: number): 1 | 2 | 3 | 4 => {
  const bounded = Math.min(0.999999, Math.max(0, ratio));
  const [first, second, third] = DIGIT_BREAKPOINTS_BY_DIMENSION[dimension];

  if (bounded < first) {
    return 1;
  }

  if (bounded < second) {
    return 2;
  }

  if (bounded < third) {
    return 3;
  }

  return 4;
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

const buildFallbackSimpleStory = (dimensionResults: DimensionResult[]) => {
  const field = dimensionResults.find((item) => item.key === "field")?.digit ?? 2;
  const ontology = dimensionResults.find((item) => item.key === "ontology")?.digit ?? 2;
  const phenomenon = dimensionResults.find((item) => item.key === "phenomenon")?.digit ?? 2;

  const fieldOpeners: Record<1 | 2 | 3 | 4, string> = {
    1: "老周先把新规定从头到尾看了一遍，想先弄清楚规则到底怎么改了。",
    2: "老周没有只看通知，而是先去打听这套安排是谁在推动、卡点到底在哪一层。",
    3: "老周先想，自己为什么会对这件事这么敏感，自己站在什么位置上在看它。",
    4: "老周没把它当成既成事实，而是先想能不能拉几个人试着把它改掉。",
  };

  const ontologyFocus: Record<1 | 2 | 3 | 4, string> = {
    1: "他最关心的，是预算、权限、时间和手里到底有没有资源。",
    2: "他最关心的，是部门之间怎么连着、谁卡着谁、谁其实说了算。",
    3: "他最关心的，是不同的人怎么理解这件事、愿不愿意买账。",
    4: "他最关心的，是事情接下来会怎么变，能不能在推进里把局面慢慢做出来。",
  };

  const phenomenonCloser: Record<1 | 2 | 3 | 4, string> = {
    1: "所以他会先看眼前已经发生了什么，再决定下一步。",
    2: "所以他总觉得光看表面不够，还得看看哪些条件被藏起来了。",
    3: "所以他也很在意现场每个人真实的感受和反应。",
    4: "所以他最先盯住的，常常是那些前后对不上的地方。",
  };

  return `比如公司突然换了一套考核办法，很多人只看通知本身。${fieldOpeners[field]}${ontologyFocus[ontology]}${phenomenonCloser[phenomenon]}`;
};

const buildFallbackExamplePeople = (dimensionResults: DimensionResult[]) => {
  const field = dimensionResults.find((item) => item.key === "field")?.title ?? "规则优先";
  const ontology =
    dimensionResults.find((item) => item.key === "ontology")?.title ?? "看重硬东西";
  const phenomenon =
    dimensionResults.find((item) => item.key === "phenomenon")?.title ?? "相信眼前经验";

  return `一个遇事会先从“${field}”切进去、判断时偏向“${ontology}”、同时又带着“${phenomenon}”习惯的人。`;
};

const buildFallbackInfo = (
  coreCode: string,
  name: string,
  dimensionResults: DimensionResult[],
) => {
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
    examplePeople: buildFallbackExamplePeople(dimensionResults),
    simpleStory: buildFallbackSimpleStory(dimensionResults),
  };
};

export const getAnswerLabel = (value: AgreementValue) =>
  AGREEMENT_OPTIONS.find((option) => option.value === value)?.label ?? value;

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
  const fallbackInfo = buildFallbackInfo(
    resolvedCoreCode,
    preferredName,
    dimensionResults,
  );

  return {
    clientId,
    createdAt: new Date().toISOString(),
    dimensionResults,
    coreCode: resolvedCoreCode,
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
        ? coreInfo.example_people!.trim()
        : fallbackInfo.examplePeople,
      simpleStory: isMeaningfulText(coreInfo?.simple_story, 20)
        ? coreInfo.simple_story!.trim()
        : fallbackInfo.simpleStory,
    },
  };
};

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
  const digit = toDigit(dimension, normalized);
  const copy = DIMENSION_TITLE_MAP[dimension][digit - 1];

  return {
    key: dimension,
    label: DIMENSION_LABELS[dimension],
    rawScore: round(rawScore),
    maxScore: round(maxScore),
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
