import { PRESET_INTERPRETATIONS } from "./preset-interpretations-data.ts";
import type {
  QuizResult,
  QuizResultAiInterpretation,
} from "@/lib/ismism/types";

export const getPresetInterpretation = (
  result: QuizResult,
  lang: string = "zh",
): QuizResultAiInterpretation | null => {
  const language = lang === "en" ? "en" : "zh";
  const entry = PRESET_INTERPRETATIONS[result.coreCode]?.[language];

  if (!entry || !entry.simpleExplanation || entry.dimensions.length !== result.dimensionResults.length) {
    return null;
  }

  return {
    simpleExplanation: entry.simpleExplanation,
    dimensionInterpretations: result.dimensionResults.map((item, index) => ({
      key: item.key,
      label: item.label,
      digit: item.digit,
      marker: item.marker,
      title: item.title,
      explanation: entry.dimensions[index] ?? "",
    })),
  };
};
