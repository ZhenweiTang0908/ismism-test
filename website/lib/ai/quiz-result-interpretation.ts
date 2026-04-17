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
你是一个不仅懂哲学、还非常擅长“说人话”的深度生活观察员。你的任务是将深奥的哲学测评结果转换成普通人听了会直呼“太准了”的生活化解读。

要求：
1. **彻底拒绝学术腔**：禁止使用“场域”、“本体”、“现象学”、“主客体”等干巴巴的术语作为解释的主体。如果必须提到概念，请用“你脑子里的滤镜”、“你眼中的游戏规则”、“你觉得什么才是干货”这种口语表达。
2. **生活化类比**：优先使用现代生活场景进行类比（例如：点外卖、社交媒体评论区、公司开会、打联机游戏、挑选理财产品、处理人际关系等）。
3. **语气风格**：亲切、幽默、略带一点洞察力，像是在深夜咖啡馆跟老朋友聊天，而不是在写学术论文。
4. **拒绝废话**：不要说“这反映了你在某某维度的倾向”这种套话，直接说“你这人吧，看问题的时候总是先盯着...”
5. **结构要求**：
   - simpleExplanation：通俗解读。先用一两句极其犀利的大白话总结这个人的“性格底色”，然后结合现代生活场景展开，解释这种思维方式在现实中是怎么表现的。控制在 300 字左右。
   - dimensionInterpretations：针对三个维度的拆解。每条解释必须包含：[生活化金句] + [大白话分析]。控制在 100 字以内。
6. **约束**：不要输出分数、百分比或优劣判断。只根据 overview 和测评结果生成的 feature_list 等信息进行解读，不要瞎编历史。
7. **返回格式**：严格返回 JSON 对象，不要包含 Markdown 代码块。
{
  "simpleExplanation": "内容...",
  "dimensionInterpretations": [
    { "explanation": "内容..." }
  ]
}
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
        axis_list: result.info.axisList,
        feature_list: result.info.featureList,
        example_people: result.info.examplePeople,
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

const findLastBreakIndex = (text: string, charset: string) => {
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (charset.includes(text[index] ?? "")) {
      return index;
    }
  }

  return -1;
};

const shortenText = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const visibleSlice = normalized.slice(0, maxLength);
  const majorBreakIndex = findLastBreakIndex(visibleSlice, "。！？；");

  if (majorBreakIndex >= Math.floor(maxLength * 0.55)) {
    return visibleSlice.slice(0, majorBreakIndex + 1).trim();
  }

  const minorBreakIndex = findLastBreakIndex(visibleSlice, "，、");

  if (minorBreakIndex >= Math.floor(maxLength * 0.65)) {
    return `${visibleSlice.slice(0, minorBreakIndex).trim()}。`;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
};

const buildFallbackInterpretation = (result: QuizResult): QuizResultAiInterpretation => ({
  simpleExplanation: `你这人吧，看世界的时候脑子里自带了一套独有的“滤镜”。简单来说，就像是你去餐厅点菜或者在手机上刷评论区时，总会本能地先关注某些点，再决定这事儿靠不靠谱。这套测试结果展示了你默认的思维导航系统。`,
  dimensionInterpretations: result.dimensionResults.map((item) => ({
    key: item.key,
    label: item.label,
    digit: item.digit,
    title: item.title,
    explanation: `在${item.label}这块，你更倾向于“${item.title}”。通俗点说，就是${item.summary}`,
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
    simpleExplanation: shortenText(
      getLongText(raw.simpleExplanation, fallback.simpleExplanation, 32),
      800,
    ),
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
        explanation: shortenText(explanation, 150),
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
