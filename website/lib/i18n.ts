export type SupportedLanguage = "zh" | "en";

export type LocaleCopy = {
  languageName: string;
  dimensions: Record<"field" | "ontology" | "phenomenon", string>;
  dimensionCaptions: Record<"field" | "ontology" | "phenomenon", string>;
  digitMarkers: Record<"1" | "2" | "3" | "4", { title: string; caption: string }>;
  errors: {
    ai: string;
    preview: string;
    submit: string;
    incomplete: string;
    invalidCoreCode: string;
    previewUnavailable: string;
    invalidAccessKey: string;
  };
  intro: {
    start: string;
    maxChoices: string;
    startButton: string;
    whatItMeasures: string;
    description: string;
    scoreDescription: string;
    declaration: string;
    declarationBody: string;
    declarationInvite: string;
    references: string;
    originalAuthor: string;
    originalVideo: string;
    ismismCube: string;
    otherIsms: string;
    previewButton: string;
    openingPreview: string;
  };
  quiz: {
    question: (current: number, remaining: number) => string;
    questionLabel: (current: number) => string;
    maxChoices: string;
    previous: string;
    next: string;
    finish: string;
    submitting: string;
    submit: string;
  };
  profile: {
    title: string;
    description: string;
    nickname: string;
    nicknamePlaceholder: string;
    message: string;
    messagePlaceholder: string;
    back: string;
  };
  result: {
    label: string;
    matchRate: string;
    scoreLegend: string;
    firstDimension: string;
    firstDimensionDescription: string;
    example: string;
    aiInterpretation: string;
    generating: string;
    simpleExplanation: string;
    analyzing: string;
    aiWaiting: string;
    retryAi: string;
    retake: string;
    backToTop: string;
    saveCard: string;
    savingCard: string;
    firstDimensionOptions: Array<{ title: string; description: string }>;
  };
  catalog: {
    listTitle: string;
    listDescription: (count: number) => string;
    code: string;
    name: string;
    representative: string;
    unnamed: string;
    noRepresentative: string;
    view: string;
    representativePrefix: string;
    backToList: string;
    close: string;
    example: string;
    noExample: string;
    coreFeatures: string;
  };
};

const zh: LocaleCopy = {
  languageName: "中文",
  dimensions: { field: "场域", ontology: "本体", phenomenon: "现象" },
  dimensionCaptions: {
    field: "世界是什么样",
    ontology: "事物怎么存在",
    phenomenon: "怎么认识世界",
  },
  digitMarkers: {
    "1": { title: "秩序", caption: "环境规则" },
    "2": { title: "冲突", caption: "内在矛盾" },
    "3": { title: "调和", caption: "个人意义" },
    "4": { title: "虚无", caption: "动态重塑" },
  },
  errors: {
    ai: "AI 解读生成失败，请稍后重试。",
    preview: "测试结果打开失败，请稍后重试。",
    submit: "生成结果失败，请稍后重试。",
    incomplete: "题目未全部作答，无法生成结果。",
    invalidCoreCode: "结果代码格式不对，请输入类似 1-1-1 的三位数字。",
    previewUnavailable: "预览结果生成失败。",
    invalidAccessKey: "密钥不正确。",
  },
  intro: {
    start: "开始测试",
    maxChoices: "每道题最多可选 2 个答案",
    startButton: "开始答题",
    whatItMeasures: "这个测试在测什么",
    description: "这是一个庸俗的哲学意识形态分类框架，会从场域、本体和现象三个维度评估你的意识形态倾向。",
    scoreDescription: "每个维度会填入一个 1-4 的数字，代表你在这个维度上的倾向。最后会根据这三个数字进行分析。",
    declaration: "声明",
    declarationBody: "Hi 大家好，我是网站作者，但不是这套理论的作者。我仅仅看了一部分原作者的视频，对哲学的了解也非常有限。这个网站其实是为了练习vibe coding做的，因此绝不是正经哲学测试。大家把它当作一个玩具愉快玩耍即可，无需较真。",
    declarationInvite: "不过欢迎大家留下有趣的想法！",
    references: "参考信息",
    originalAuthor: "原作者讲解：",
    originalVideo: "【主义主义】哲学意识形态大全-总纲",
    ismismCube: "主义主义魔方：",
    otherIsms: "查看其他主义",
    previewButton: "测试按钮",
    openingPreview: "正在打开测试结果...",
  },
  quiz: {
    question: (current, remaining) => `第 ${current} 题 · 剩余 ${remaining} 题`,
    questionLabel: (current) => `第 ${current} 题`,
    maxChoices: "每道题最多可选 2 个答案",
    previous: "上一题",
    next: "下一题",
    finish: "完成答题",
    submitting: "正在生成结果...",
    submit: "提交结果",
  },
  profile: {
    title: "答题完成",
    description: "生成结果前，你可以留下昵称和想法。两项都是可选的，直接提交也可以。",
    nickname: "昵称（可选）",
    nicknamePlaceholder: "留空也可以",
    message: "留言（可选）",
    messagePlaceholder: "可留一句想法",
    back: "返回答题",
  },
  result: {
    label: "测试结果",
    matchRate: "分析准确度",
    scoreLegend: "1=秩序 2=冲突 3=调和 4=虚无",
    firstDimension: "第一个数字",
    firstDimensionDescription: "第一个数字是场域，也是这套结果里最先看的因素。它回答的其实是：你默认觉得世界背景是什么样。很多后面的判断，都会先被这个底色影响。",
    example: "一个例子",
    aiInterpretation: "AI 解读",
    generating: "正在生成中...",
    simpleExplanation: "通俗解释",
    analyzing: "分析中...",
    aiWaiting: "AI 正在生成可读版解释，请稍候。",
    retryAi: "重新生成 AI 解读",
    retake: "重新测试",
    backToTop: "回到顶部",
    saveCard: "保存结果卡片",
    savingCard: "生成中...",
    firstDimensionOptions: [
      { title: "实在论", description: "如果你在这个维度选了 1，你通常会将世界看作一个预先存在的现实背景。规则、环境和秩序先于个人而存在，人需要先看清现实，再决定如何行动。" },
      { title: "形而上学", description: "选 2 代表你不会只看表面现象，而是习惯追问背后的原则和机制。你会觉得世界不是杂乱无章的，而是有一套更深层的逻辑和结构在支撑。" },
      { title: "观念论", description: "选 3 说明你认为世界离不开个人的视角和解读。对你来说，现实总会通过人的理解、立场和赋予的意义被重新组织，主观感受非常重要。" },
      { title: "唯物主义", description: "选 4 代表你更倾向于在行动和关系中把握现实。你会更在意具体的条件、行动的过程以及现实是如何被改变的，而不是单纯停留在抽象的原则上。" },
    ],
  },
  catalog: {
    listTitle: "全部主义列表",
    listDescription: (count) => `${count} 个主义，点击查看了解详情`,
    code: "代码",
    name: "主义名称",
    representative: "代表人物",
    unnamed: "未命名",
    noRepresentative: "暂无典型人物",
    view: "查看",
    representativePrefix: "代表人物：",
    backToList: "返回列表",
    close: "关闭",
    example: "一个例子",
    noExample: "暂无具体例子。",
    coreFeatures: "核心特征",
  },
};

const en: LocaleCopy = {
  languageName: "English",
  dimensions: { field: "Field", ontology: "Ontology", phenomenon: "Phenomenon" },
  dimensionCaptions: {
    field: "What the world is like",
    ontology: "How things exist",
    phenomenon: "How we understand the world",
  },
  digitMarkers: {
    "1": { title: "Order", caption: "Rules and conditions" },
    "2": { title: "Conflict", caption: "Internal tensions" },
    "3": { title: "Reconciliation", caption: "Personal meaning" },
    "4": { title: "Negativity", caption: "Dynamic transformation" },
  },
  errors: {
    ai: "The AI interpretation could not be generated. Please try again.",
    preview: "The preview result could not be opened. Please try again.",
    submit: "The result could not be generated. Please try again.",
    incomplete: "Please answer every question before submitting.",
    invalidCoreCode: "Invalid result code. Enter three digits such as 1-1-1.",
    previewUnavailable: "The preview result could not be generated.",
    invalidAccessKey: "The access key is incorrect.",
  },
  intro: {
    start: "Start the test",
    maxChoices: "Choose up to two answers for each question",
    startButton: "Start answering",
    whatItMeasures: "What does this test measure?",
    description: "This is a playful framework for mapping philosophical and ideological tendencies across three dimensions: Field, Ontology, and Phenomenon.",
    scoreDescription: "Each dimension receives a number from 1 to 4. Your final result is based on the pattern formed by those three numbers.",
    declaration: "Disclaimer",
    declarationBody: "Hi everyone! I made this website, but I did not create the theory behind it. I have only watched some of the original author's videos, and my understanding of philosophy is very limited. This site was made to practice vibe coding, so it is absolutely not a serious philosophy test. Treat it as a toy and have fun—there is no need to take it too seriously.",
    declarationInvite: "That said, I would love to hear your interesting thoughts!",
    references: "References",
    originalAuthor: "Original author:",
    originalVideo: "Ismism: A General Introduction to Philosophical Ideologies",
    ismismCube: "Ismism Cube:",
    otherIsms: "Explore all isms",
    previewButton: "Preview result",
    openingPreview: "Opening preview...",
  },
  quiz: {
    question: (current, remaining) => `Question ${current} · ${remaining} remaining`,
    questionLabel: (current) => `Question ${current}`,
    maxChoices: "Choose up to two answers",
    previous: "Previous",
    next: "Next",
    finish: "Finish answering",
    submitting: "Generating result...",
    submit: "Submit result",
  },
  profile: {
    title: "You’re all done",
    description: "Before generating your result, you can leave a nickname and a thought. Both fields are optional, so you can also submit right away.",
    nickname: "Nickname (optional)",
    nicknamePlaceholder: "You can leave this blank",
    message: "Message (optional)",
    messagePlaceholder: "Share a thought if you like",
    back: "Back to questions",
  },
  result: {
    label: "Your result",
    matchRate: "Pattern fit",
    scoreLegend: "1=Order  2=Conflict  3=Reconciliation  4=Negativity",
    firstDimension: "The first number",
    firstDimensionDescription: "The first number represents Field—the background you assume the world has. It is the first layer of the result because many later judgments are shaped by this starting picture.",
    example: "An example",
    aiInterpretation: "AI interpretation",
    generating: "Generating...",
    simpleExplanation: "In plain English",
    analyzing: "Analyzing...",
    aiWaiting: "The AI is preparing a readable interpretation. Please wait.",
    retryAi: "Generate the AI interpretation again",
    retake: "Take the test again",
    backToTop: "Back to top",
    saveCard: "Save result card",
    savingCard: "Generating...",
    firstDimensionOptions: [
      { title: "Realism", description: "Choosing 1 usually means you see the world as a reality that already exists before you. Rules, conditions, and order come first; action begins with understanding the situation." },
      { title: "Metaphysics", description: "Choosing 2 means you look past appearances and ask about the principles and mechanisms underneath. You assume the world has a deeper logic holding it together." },
      { title: "Idealism", description: "Choosing 3 means you see the world as inseparable from perspective and interpretation. Reality is reorganized through understanding, position, and the meaning people give it." },
      { title: "Materialism", description: "Choosing 4 means you grasp reality through action and relationships. You care about concrete conditions, ongoing practice, and how the world can actually be changed." },
    ],
  },
  catalog: {
    listTitle: "All isms",
    listDescription: (count) => `${count} isms · select one to view its details`,
    code: "Code",
    name: "Name",
    representative: "Representative",
    unnamed: "Unnamed",
    noRepresentative: "No representative listed",
    view: "View",
    representativePrefix: "Representative: ",
    backToList: "Back to list",
    close: "Close",
    example: "An example",
    noExample: "No example is available.",
    coreFeatures: "Core features",
  },
};

export const getLocaleCopy = (lang?: string): LocaleCopy => (lang === "en" ? en : zh);

export const getSupportedLanguage = (lang?: string): SupportedLanguage =>
  lang === "en" ? "en" : "zh";
