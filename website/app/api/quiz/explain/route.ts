import { DIMENSION_ORDER } from "@/lib/ismism/types";
import { generateQuizResultInterpretation } from "@/lib/ai/quiz-result-interpretation";
import type { DimensionKey, QuizResult } from "@/lib/ismism/types";

const isDimensionKey = (value: unknown): value is DimensionKey =>
  typeof value === "string" && DIMENSION_ORDER.includes(value as DimensionKey);

const normalizeQuizResult = (input: unknown): QuizResult | null => {
  if (!input || typeof input !== "object") {
    return null;
  }

  const source = input as Record<string, unknown>;
  const infoSource =
    source.info && typeof source.info === "object"
      ? (source.info as Record<string, unknown>)
      : null;

  if (
    typeof source.clientId !== "number" ||
    typeof source.createdAt !== "string" ||
    typeof source.coreCode !== "string" ||
    typeof source.name !== "string" ||
    typeof source.englishName !== "string" ||
    !Array.isArray(source.dimensionResults) ||
    !infoSource ||
    !Array.isArray(infoSource.axisList) ||
    !Array.isArray(infoSource.featureList) ||
    typeof infoSource.examplePeople !== "string" ||
    typeof infoSource.simpleStory !== "string"
  ) {
    return null;
  }

  const dimensionResults = source.dimensionResults
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;

      if (
        !isDimensionKey(record.key) ||
        typeof record.label !== "string" ||
        typeof record.rawScore !== "number" ||
        typeof record.maxScore !== "number" ||
        typeof record.percentage !== "number" ||
        typeof record.digit !== "number" ||
        typeof record.title !== "string" ||
        typeof record.summary !== "string"
      ) {
        return null;
      }

      if (![1, 2, 3, 4].includes(record.digit)) {
        return null;
      }

      return {
        key: record.key,
        label: record.label,
        rawScore: record.rawScore,
        maxScore: record.maxScore,
        percentage: record.percentage,
        digit: record.digit as 1 | 2 | 3 | 4,
        title: record.title,
        summary: record.summary,
      };
    })
    .filter(
      (
        item,
      ): item is QuizResult["dimensionResults"][number] => item !== null,
    );

  const axisList = infoSource.axisList.filter(
    (item): item is string => typeof item === "string",
  );
  const featureList = infoSource.featureList.filter(
    (item): item is string => typeof item === "string",
  );

  if (dimensionResults.length !== DIMENSION_ORDER.length) {
    return null;
  }

  return {
    clientId: source.clientId,
    createdAt: source.createdAt,
    coreCode: source.coreCode,
    name: source.name,
    englishName: source.englishName,
    dimensionResults,
    info: {
      axisList,
      featureList,
      examplePeople: infoSource.examplePeople,
      simpleStory: infoSource.simpleStory,
    },
  };
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      result?: unknown;
    };

    const result = normalizeQuizResult(payload.result);
    if (!result) {
      return Response.json({ error: "Invalid quiz result payload" }, { status: 400 });
    }

    const interpretation = await generateQuizResultInterpretation(result);
    return Response.json({ interpretation });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate AI interpretation",
      },
      { status: 500 },
    );
  }
}
