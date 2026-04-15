import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DIMENSION_LABELS } from "@/lib/ismism/types";
import type {
  QuizResult,
  QuizResultAiInterpretation,
} from "@/lib/ismism/types";

const DEFAULT_SILICONCLOUD_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_SILICONCLOUD_MODEL = "Pro/MiniMaxAI/MiniMax-M2.5";
const DEFAULT_AZURE_API_VERSION = "2024-12-01-preview";
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEBSITE_ENV_LOCAL_FILE_PATH = path.resolve(MODULE_DIR, "../../.env.local");
const WEBSITE_ENV_FILE_PATH = path.resolve(MODULE_DIR, "../../.env");
const ROOT_ENV_LOCAL_FILE_PATH = path.resolve(MODULE_DIR, "../../../.env.local");
const ROOT_ENV_FILE_PATH = path.resolve(MODULE_DIR, "../../../.env");
const OVERVIEW_FILE_PATH = path.resolve(MODULE_DIR, "../../data/overview.txt");

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

let cachedFallbackEnv: Map<string, string> | null = null;
let cachedOverviewText: Promise<string> | null = null;

const parseDotEnv = (content: string) => {
  const values = new Map<string, string>();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim().replace(/^export\s+/, "");
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  return values;
};

const loadFallbackEnv = () => {
  if (cachedFallbackEnv) {
    return cachedFallbackEnv;
  }

  const loaded = new Map<string, string>();
  const candidates = [
    WEBSITE_ENV_LOCAL_FILE_PATH,
    WEBSITE_ENV_FILE_PATH,
    ROOT_ENV_LOCAL_FILE_PATH,
    ROOT_ENV_FILE_PATH,
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    const parsed = parseDotEnv(readFileSync(candidate, "utf8"));
    for (const [key, value] of parsed.entries()) {
      if (!loaded.has(key)) {
        loaded.set(key, value);
      }
    }
  }

  cachedFallbackEnv = loaded;
  return loaded;
};

const getServerEnv = (key: string) => process.env[key] ?? loadFallbackEnv().get(key);

const readOverviewText = async () => readFile(OVERVIEW_FILE_PATH, "utf8");

export const loadOverviewText = async () => {
  cachedOverviewText ??= readOverviewText();
  return cachedOverviewText;
};

const buildSystemPrompt = () => `
你是一个严谨、清晰的中文哲学测评解释器。你会根据给定的框架说明 overview 和具体测评结果，生成一份结构化 AI 解读。

要求：
1. 只根据用户提供的 overview 和测评结果解释，不要编造额外史实，不要输出分数、百分比或高低优劣判断。
2. 把结果解释成“理解世界的方式组合”，而不是考试成绩。
3. 语言要同时兼顾哲学准确性和普通读者可读性。
4. 返回必须是 JSON 对象，不要包含 Markdown 代码块，不要输出额外说明。
5. JSON 结构必须包含以下字段：
{
  "resultSummary": "这个结果是什么",
  "philosophicalExplanation": "哲学解释",
  "simpleExplanation": "通俗解释",
  "exampleScenario": "举例说明",
  "dimensionInterpretations": [
    {
      "explanation": "针对单个维度的解释"
    }
  ]
}
6. dimensionInterpretations 必须严格返回 3 项，顺序与输入结果中的 dimensionResults 一致。
7. 每段都要写得充实一些，避免空泛套话。
`.trim();

const buildUserPrompt = (overviewText: string, result: QuizResult) =>
  [
    "请基于下面两部分内容生成解读。",
    "",
    "【overview】",
    overviewText,
    "",
    "【测评结果】",
    JSON.stringify(
      {
        coreCode: result.coreCode,
        name: result.name,
        englishName: result.englishName,
        dimensionResults: result.dimensionResults.map((item) => ({
          key: item.key,
          label: item.label,
          digit: item.digit,
          title: item.title,
          summary: item.summary,
        })),
        info: result.info,
      },
      null,
      2,
    ),
  ].join("\n");

const extractTextContent = (payload: unknown) => {
  const message = (payload as { choices?: Array<{ message?: { content?: unknown } }> })
    ?.choices?.[0]?.message?.content;

  if (typeof message === "string") {
    return message;
  }

  if (!Array.isArray(message)) {
    return "";
  }

  return message
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }

      return "";
    })
    .join("");
};

const parseJsonFromText = (text: string) => {
  const direct = text.trim();
  if (!direct) {
    throw new Error("Empty AI response");
  }

  try {
    return JSON.parse(direct) as Record<string, unknown>;
  } catch {
    const fencedMatch = direct.match(/```json\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1]) as Record<string, unknown>;
    }

    const firstBrace = direct.indexOf("{");
    const lastBrace = direct.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(direct.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
    }

    throw new Error("Failed to parse AI JSON response");
  }
};

const getLongText = (
  value: unknown,
  fallback: string,
  minimumLength: number,
) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length >= minimumLength ? trimmed : fallback;
};

const buildFallbackInterpretation = (result: QuizResult): QuizResultAiInterpretation => ({
  resultSummary: `${result.name}（${result.coreCode}）表示你在场域、本体、现象三条轴线上形成了一种稳定的组合倾向。这个结果更像一张哲学位置图，说明你理解世界时会优先依赖哪些判断路径。`,
  philosophicalExplanation: `从哲学上看，这个结果并不是把你归入某个单一流派，而是把你放进一个三维框架中观察：你如何理解世界背景、如何判断什么是真实存在的、以及你认为真实如何向人显现。${result.name} 代表的是这三种判断方式叠加后的整体姿态。`,
  simpleExplanation: `如果用更通俗的话说，这个结果说明你看问题时有一套比较固定的“默认模式”。你会更自然地从某些角度理解现实，例如更看重结构还是主体、更相信直观经验还是中介解释。`,
  exampleScenario: `比如遇到一条社会规则时，你不只是判断它好不好用，而会连带去想：它背后的世界背景是什么、真正起作用的东西到底是什么、以及人是如何感受到它的。你的结果反映的就是这套连贯的理解路径。`,
  dimensionInterpretations: result.dimensionResults.map((item) => ({
    key: item.key,
    label: item.label,
    digit: item.digit,
    title: item.title,
    explanation: `${item.label}维度上，你目前落在 ${item.digit}.${item.title}。这意味着 ${item.summary} 这不是单一观点的复述，而是说明你在这一条轴线上更容易以这种方式组织判断。`,
  })),
});

const normalizeInterpretation = (
  raw: Record<string, unknown>,
  result: QuizResult,
): QuizResultAiInterpretation => {
  const fallback = buildFallbackInterpretation(result);
  const rawDimensions = Array.isArray(raw.dimensionInterpretations)
    ? raw.dimensionInterpretations
    : [];

  return {
    resultSummary: getLongText(raw.resultSummary, fallback.resultSummary, 24),
    philosophicalExplanation: getLongText(
      raw.philosophicalExplanation,
      fallback.philosophicalExplanation,
      40,
    ),
    simpleExplanation: getLongText(raw.simpleExplanation, fallback.simpleExplanation, 32),
    exampleScenario: getLongText(raw.exampleScenario, fallback.exampleScenario, 32),
    dimensionInterpretations: result.dimensionResults.map((item, index) => {
      const source = rawDimensions[index];
      const explanation =
        typeof source === "object" &&
        source !== null &&
        "explanation" in source &&
        typeof source.explanation === "string" &&
        source.explanation.trim().length >= 24
          ? source.explanation.trim()
          : fallback.dimensionInterpretations[index]?.explanation ??
            `${DIMENSION_LABELS[item.key]}维度上，你更接近 ${item.digit}.${item.title}。${item.summary}`;

      return {
        key: item.key,
        label: item.label,
        digit: item.digit,
        title: item.title,
        explanation,
      };
    }),
  };
};

const requestSiliconCloud = async (messages: ChatMessage[]) => {
  const apiKey = getServerEnv("SILICONCLOUD_API_KEY");
  if (!apiKey) {
    throw new Error("Missing SILICONCLOUD_API_KEY");
  }

  const response = await fetch(
    `${(getServerEnv("SILICONCLOUD_BASE_URL") ?? DEFAULT_SILICONCLOUD_BASE_URL).replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getServerEnv("SILICONCLOUD_MODEL") ?? DEFAULT_SILICONCLOUD_MODEL,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
};

const requestAzureOpenAI = async (messages: ChatMessage[]) => {
  const endpoint = getServerEnv("AZURE_OPENAI_ENDPOINT");
  const apiKey = getServerEnv("AZURE_OPENAI_API_KEY");
  const deployment = getServerEnv("AZURE_OPENAI_DEPLOYMENT");

  if (!endpoint || !apiKey || !deployment) {
    throw new Error("Missing Azure OpenAI configuration");
  }

  const apiVersion = getServerEnv("AZURE_OPENAI_API_VERSION") ?? DEFAULT_AZURE_API_VERSION;
  const url =
    `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions` +
    `?api-version=${encodeURIComponent(apiVersion)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
};

export const generateQuizResultInterpretation = async (
  result: QuizResult,
): Promise<QuizResultAiInterpretation> => {
  const overviewText = await loadOverviewText();
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt(),
    },
    {
      role: "user",
      content: buildUserPrompt(overviewText, result),
    },
  ];

  const errors: string[] = [];

  const providers = [
    {
      enabled: Boolean(getServerEnv("SILICONCLOUD_API_KEY")),
      name: "SiliconCloud",
      run: () => requestSiliconCloud(messages),
    },
    {
      enabled: Boolean(
        getServerEnv("AZURE_OPENAI_ENDPOINT") &&
          getServerEnv("AZURE_OPENAI_API_KEY") &&
          getServerEnv("AZURE_OPENAI_DEPLOYMENT"),
      ),
      name: "Azure OpenAI",
      run: () => requestAzureOpenAI(messages),
    },
  ];

  for (const provider of providers) {
    if (!provider.enabled) {
      continue;
    }

    try {
      const payload = await provider.run();
      const text = extractTextContent(payload);
      const parsed = parseJsonFromText(text);
      return normalizeInterpretation(parsed, result);
    } catch (error) {
      errors.push(
        `${provider.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  if (!providers.some((provider) => provider.enabled)) {
    throw new Error("No AI provider configured for quiz interpretation");
  }

  throw new Error(errors.join(" | "));
};
