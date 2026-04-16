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
你是一个严谨、清晰、但面向普通用户的中文测评解释器。你会根据给定的框架说明 overview 和具体测评结果，生成一份结构化 AI 解读。

要求：
1. 只根据用户提供的 overview 和测评结果解释，不要编造额外史实，不要输出分数、百分比或高低优劣判断。
2. 把结果解释成“理解世界的方式组合”，而不是考试成绩。
3. 语言要明显偏日常、偏口语，优先让没学过哲学的普通用户也能读懂。
4. 可以保留必要概念，但不要堆术语；如果提到概念，要立刻用普通话解释清楚。
5. 不要照抄输入里的学术表达，不要把原文换个说法再重复一遍。
6. 每段都先说“这大概是什么意思”，再补充框架上的理解。
7. 返回必须是 JSON 对象，不要包含 Markdown 代码块，不要输出额外说明。
8. JSON 结构必须包含以下字段：
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
9. dimensionInterpretations 必须严格返回 3 项，顺序与输入结果中的 dimensionResults 一致。
10. 每段都要写得充实一些，避免空泛套话。
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
  resultSummary: `${result.name}（${result.coreCode}）表示你看世界时，通常会沿着一套比较稳定的思路走。它不是在说你好或不好，而是在描述你更自然会从哪些角度理解现实。`,
  philosophicalExplanation: `放到这套测试里看，这个结果的意思是：你对“世界是什么样”“什么最重要”“人是怎么感受到现实的”这三件事，有一组彼此能接上的倾向。它不是把你塞进某个学派，而是在总结你更常用的理解方式。`,
  simpleExplanation: `换成大白话，这就像你脑子里有一套默认的看问题方法。遇到一件事时，你会比较自然地先看哪些部分、相信哪些东西更关键、又会从什么地方感觉到“这件事到底是怎么回事”。`,
  exampleScenario: `比如面对一条新规则，有的人先看它合不合理，有的人先看是谁定的，有的人先看自己有什么感觉。你的结果就是在说明，你通常更像哪一种人，以及这几种判断会怎么连起来。`,
  dimensionInterpretations: result.dimensionResults.map((item) => ({
    key: item.key,
    label: item.label,
    digit: item.digit,
    title: item.title,
    explanation: `在${item.label}这一块，你更接近“${item.title}”。简单说就是：${item.summary} 也就是说，你在这一条线上做判断时，更容易先从这个方向切进去。`,
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
