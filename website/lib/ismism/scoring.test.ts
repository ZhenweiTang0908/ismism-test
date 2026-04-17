import test from "node:test";
import assert from "node:assert/strict";

import { buildQuizResult } from "./scoring.ts";
import type {
  AnswerMap,
  ChoiceValue,
  DimensionKey,
  QuizQuestion,
} from "./types.ts";

const makeOptions = () =>
  [
    { value: "1", label: "选项1" },
    { value: "2", label: "选项2" },
    { value: "3", label: "选项3" },
    { value: "4", label: "选项4" },
  ] as const;

const makeQuestion = (
  id: string,
  dimension: DimensionKey,
  type: "life" | "public" | "abstract",
): QuizQuestion => ({
  id,
  question: `${dimension}-${id}`,
  dimension,
  dimensionLabel: dimension,
  type,
  weight: 1,
  options: makeOptions(),
  source: "mock",
});

const buildQuestions = () => {
  const questions: QuizQuestion[] = [];
  const mixes: Array<"life" | "public" | "abstract"> = [
    "life",
    "life",
    "life",
    "public",
    "public",
    "abstract",
  ];

  for (const dimension of ["field", "ontology", "phenomenon"] as const) {
    for (let i = 0; i < 6; i += 1) {
      questions.push(makeQuestion(`${dimension}-${i + 1}`, dimension, mixes[i]!));
    }
  }

  return questions;
};

const toAnswers = (pairs: Array<[string, ChoiceValue]>): AnswerMap =>
  Object.fromEntries(pairs);

test("单维多数票定档", () => {
  const questions = buildQuestions();
  const answers = toAnswers([
    ["field-1", "1"],
    ["field-2", "1"],
    ["field-3", "1"],
    ["field-4", "1"],
    ["field-5", "2"],
    ["field-6", "3"],
    ["ontology-1", "2"],
    ["ontology-2", "2"],
    ["ontology-3", "2"],
    ["ontology-4", "3"],
    ["ontology-5", "4"],
    ["ontology-6", "1"],
    ["phenomenon-1", "4"],
    ["phenomenon-2", "4"],
    ["phenomenon-3", "4"],
    ["phenomenon-4", "4"],
    ["phenomenon-5", "1"],
    ["phenomenon-6", "2"],
  ]);

  const result = buildQuizResult({
    questions,
    answers,
    enhancedCatalog: {},
  });

  const field = result.dimensionResults.find((item) => item.key === "field");
  assert.equal(field?.digit, 1);
  assert.equal(field?.rawScore, 4);
});

test("同票时低值优先（1 > 2 > 3 > 4）", () => {
  const questions = buildQuestions();
  const answers = toAnswers([
    ["field-1", "1"],
    ["field-2", "1"],
    ["field-3", "2"],
    ["field-4", "2"],
    ["field-5", "3"],
    ["field-6", "4"],
    ["ontology-1", "1"],
    ["ontology-2", "1"],
    ["ontology-3", "1"],
    ["ontology-4", "1"],
    ["ontology-5", "1"],
    ["ontology-6", "1"],
    ["phenomenon-1", "4"],
    ["phenomenon-2", "4"],
    ["phenomenon-3", "4"],
    ["phenomenon-4", "4"],
    ["phenomenon-5", "4"],
    ["phenomenon-6", "4"],
  ]);

  const result = buildQuizResult({
    questions,
    answers,
    enhancedCatalog: {},
  });

  const field = result.dimensionResults.find((item) => item.key === "field");
  assert.equal(field?.digit, 1);
});

test("三维混合输入可生成稳定 coreCode", () => {
  const questions = buildQuestions();
  const answers = toAnswers([
    ["field-1", "2"],
    ["field-2", "2"],
    ["field-3", "2"],
    ["field-4", "1"],
    ["field-5", "3"],
    ["field-6", "4"],
    ["ontology-1", "3"],
    ["ontology-2", "3"],
    ["ontology-3", "3"],
    ["ontology-4", "3"],
    ["ontology-5", "1"],
    ["ontology-6", "2"],
    ["phenomenon-1", "4"],
    ["phenomenon-2", "4"],
    ["phenomenon-3", "4"],
    ["phenomenon-4", "2"],
    ["phenomenon-5", "1"],
    ["phenomenon-6", "3"],
  ]);

  const result = buildQuizResult({
    questions,
    answers,
    enhancedCatalog: {},
  });

  assert.equal(result.coreCode, "2-3-4");
});

test("percentage 等于该维获胜票数占比", () => {
  const questions = buildQuestions();
  const answers = toAnswers([
    ["field-1", "2"],
    ["field-2", "2"],
    ["field-3", "2"],
    ["field-4", "2"],
    ["field-5", "1"],
    ["field-6", "3"],
    ["ontology-1", "1"],
    ["ontology-2", "1"],
    ["ontology-3", "1"],
    ["ontology-4", "1"],
    ["ontology-5", "1"],
    ["ontology-6", "1"],
    ["phenomenon-1", "4"],
    ["phenomenon-2", "4"],
    ["phenomenon-3", "3"],
    ["phenomenon-4", "3"],
    ["phenomenon-5", "2"],
    ["phenomenon-6", "1"],
  ]);

  const result = buildQuizResult({
    questions,
    answers,
    enhancedCatalog: {},
  });

  const field = result.dimensionResults.find((item) => item.key === "field");
  assert.equal(field?.rawScore, 4);
  assert.equal(field?.maxScore, 6);
  assert.equal(field?.percentage, 66.67);
});
