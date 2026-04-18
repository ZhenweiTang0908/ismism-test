import test from "node:test";
import assert from "node:assert/strict";

import { buildQuizResult } from "./scoring.ts";
import type {
  AnswerMap,
  ChoiceValue,
  DimensionKey,
  QuizQuestion,
} from "./types.ts";

const makeOptions = (): [QuizQuestion["options"][number], QuizQuestion["options"][number], QuizQuestion["options"][number], QuizQuestion["options"][number]] => [
  { value: "1", label: "选项1" },
  { value: "2", label: "选项2" },
  { value: "3", label: "选项3" },
  { value: "4", label: "选项4" },
];

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
  // 每维度5题: { life: 1, public: 2, abstract: 2 }
  const mixes: Array<"life" | "public" | "abstract"> = [
    "life",
    "public",
    "public",
    "abstract",
    "abstract",
  ];

  for (const dimension of ["field", "ontology", "phenomenon"] as const) {
    for (let i = 0; i < 5; i += 1) {
      questions.push(makeQuestion(`${dimension}-${i + 1}`, dimension, mixes[i]!));
    }
  }

  return questions;
};

// 多选答案：每道题的答案是一个数组
const toAnswers = (pairs: Array<[string, ChoiceValue | ChoiceValue[]]>): AnswerMap =>
  Object.fromEntries(
    pairs.map(([id, value]) => [
      id,
      Array.isArray(value) ? value : [value],
    ])
  );

test("单维多数票定档（多选）", () => {
  const questions = buildQuestions();
  // 每维度5题
  const answers = toAnswers([
    // 场域：1→4票，2→1票，3→0票，4→0票 → 1获胜
    ["field-1", "1"],
    ["field-2", "1"],
    ["field-3", "1"],
    ["field-4", "1"],
    ["field-5", "2"],
    // 本体：2→3票，3→1票，4→1票 → 2获胜
    ["ontology-1", "2"],
    ["ontology-2", "2"],
    ["ontology-3", "2"],
    ["ontology-4", "3"],
    ["ontology-5", "4"],
    // 现象：4→3票，1→2票，2→0票 → 4获胜
    ["phenomenon-1", "4"],
    ["phenomenon-2", "4"],
    ["phenomenon-3", "4"],
    ["phenomenon-4", "1"],
    ["phenomenon-5", "1"],
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

test("同票时优先级（2 > 3 > 4 > 1）", () => {
  const questions = buildQuestions();
  // 场域：1→2票, 2→2票（平票最高）, 3→1票, 4→0票
  // 按优先级 2>3>4>1，2获胜
  const answers = toAnswers([
    ["field-1", "1"],
    ["field-2", "1"],
    ["field-3", "2"],
    ["field-4", "2"],
    ["field-5", "3"],
    // 其他维度全1
    ["ontology-1", "1"],
    ["ontology-2", "1"],
    ["ontology-3", "1"],
    ["ontology-4", "1"],
    ["ontology-5", "1"],
    ["phenomenon-1", "1"],
    ["phenomenon-2", "1"],
    ["phenomenon-3", "1"],
    ["phenomenon-4", "1"],
    ["phenomenon-5", "1"],
  ]);

  const result = buildQuizResult({
    questions,
    answers,
    enhancedCatalog: {},
  });

  const field = result.dimensionResults.find((item) => item.key === "field");
  assert.equal(field?.digit, 2); // 1和2各2票，按优先级2>1，2获胜
});

test("场域维度：4需要≥5票且为最高票数才能判定为4", () => {
  const questions = buildQuestions();
  // 场域：4有4票(全选4)且是最高票，但不满足≥5条件
  // 1: 1票, 2: 0票, 3: 0票, 4: 4票 → 按优先级2>3>4>1，4获胜
  const answers = toAnswers([
    ["field-1", "4"],
    ["field-2", "4"],
    ["field-3", "4"],
    ["field-4", "4"],
    ["field-5", "1"],
    ["ontology-1", "1"],
    ["ontology-2", "1"],
    ["ontology-3", "1"],
    ["ontology-4", "1"],
    ["ontology-5", "1"],
    ["phenomenon-1", "1"],
    ["phenomenon-2", "1"],
    ["phenomenon-3", "1"],
    ["phenomenon-4", "1"],
    ["phenomenon-5", "1"],
  ]);

  const result = buildQuizResult({
    questions,
    answers,
    enhancedCatalog: {},
  });

  const field = result.dimensionResults.find((item) => item.key === "field");
  // 4有4票但不满足≥5条件，按优先级是最高票，所以4获胜
  assert.equal(field?.digit, 4);
});

test("场域维度：4只有4票但不是最高票 → 按优先级选择", () => {
  const questions = buildQuestions();
  // 场域：1有5票，4只有0票 → 1获胜
  const answers = toAnswers([
    ["field-1", "1"],
    ["field-2", "1"],
    ["field-3", "1"],
    ["field-4", "1"],
    ["field-5", "1"],
    ["ontology-1", "1"],
    ["ontology-2", "1"],
    ["ontology-3", "1"],
    ["ontology-4", "1"],
    ["ontology-5", "1"],
    ["phenomenon-1", "1"],
    ["phenomenon-2", "1"],
    ["phenomenon-3", "1"],
    ["phenomenon-4", "1"],
    ["phenomenon-5", "1"],
  ]);

  const result = buildQuizResult({
    questions,
    answers,
    enhancedCatalog: {},
  });

  const field = result.dimensionResults.find((item) => item.key === "field");
  assert.equal(field?.digit, 1); // 场域：1有5票，1获胜
});

test("本体/现象维度：简单多数取胜", () => {
  const questions = buildQuestions();
  const answers = toAnswers([
    // 场域全1
    ["field-1", "1"],
    ["field-2", "1"],
    ["field-3", "1"],
    ["field-4", "1"],
    ["field-5", "1"],
    // 本体：3→3票，4→2票 → 3获胜
    ["ontology-1", "3"],
    ["ontology-2", "3"],
    ["ontology-3", "3"],
    ["ontology-4", "4"],
    ["ontology-5", "4"],
    // 现象：2→2票，3→2票，1→1票 → 按优先级2>3>4>1，2获胜
    ["phenomenon-1", "2"],
    ["phenomenon-2", "2"],
    ["phenomenon-3", "3"],
    ["phenomenon-4", "3"],
    ["phenomenon-5", "1"],
  ]);

  const result = buildQuizResult({
    questions,
    answers,
    enhancedCatalog: {},
  });

  const ontology = result.dimensionResults.find((item) => item.key === "ontology");
  assert.equal(ontology?.digit, 3); // 本体：3有3票，4有2票，3获胜
});

test("多选题：每题选多个答案", () => {
  const questions = buildQuestions();
  // 每道题选2个答案
  // 场域：1→10票(5题×2)，2→0票, 3→0票, 4→0票 → 1获胜
  const answers = toAnswers([
    ["field-1", ["1", "1"]],
    ["field-2", ["1", "1"]],
    ["field-3", ["1", "1"]],
    ["field-4", ["1", "1"]],
    ["field-5", ["1", "1"]],
    ["ontology-1", "1"],
    ["ontology-2", "1"],
    ["ontology-3", "1"],
    ["ontology-4", "1"],
    ["ontology-5", "1"],
    ["phenomenon-1", "1"],
    ["phenomenon-2", "1"],
    ["phenomenon-3", "1"],
    ["phenomenon-4", "1"],
    ["phenomenon-5", "1"],
  ]);

  const result = buildQuizResult({
    questions,
    answers,
    enhancedCatalog: {},
  });

  const field = result.dimensionResults.find((item) => item.key === "field");
  assert.equal(field?.digit, 1);
  assert.equal(field?.rawScore, 10); // 1有10票(5题×2)
  assert.equal(field?.maxScore, 10);
  assert.equal(field?.percentage, 100);
});

test("三维混合输入可生成稳定 coreCode", () => {
  const questions = buildQuestions();
  // 场域：2→3票, 1→1票, 3→1票, 4→0票 → 2获胜
  // 本体：3→3票, 1→2票 → 3获胜
  // 现象：4→2票, 2→2票, 1→1票 → 2获胜(平票优先级 2>4)
  const answers = toAnswers([
    ["field-1", "2"],
    ["field-2", "2"],
    ["field-3", "2"],
    ["field-4", "1"],
    ["field-5", "3"],
    ["ontology-1", "3"],
    ["ontology-2", "3"],
    ["ontology-3", "3"],
    ["ontology-4", "1"],
    ["ontology-5", "1"],
    ["phenomenon-1", "4"],
    ["phenomenon-2", "4"],
    ["phenomenon-3", "2"],
    ["phenomenon-4", "2"],
    ["phenomenon-5", "1"],
  ]);

  const result = buildQuizResult({
    questions,
    answers,
    enhancedCatalog: {},
  });

  assert.equal(result.coreCode, "2-3-2"); // 现象：2和4各2票，按优先级2>4
});

test("percentage 计算基于最高可能票数（每题选2个 * 5题 = 10票）", () => {
  const questions = buildQuestions();
  // 场域：2→4票(2+2), 1→1票, 3→1票, 4→0票 → 2获胜
  const answers = toAnswers([
    ["field-1", "2"],
    ["field-2", "2"],
    ["field-3", "2"],
    ["field-4", "2"],
    ["field-5", "1"],
    ["ontology-1", "1"],
    ["ontology-2", "1"],
    ["ontology-3", "1"],
    ["ontology-4", "1"],
    ["ontology-5", "1"],
    ["phenomenon-1", "1"],
    ["phenomenon-2", "1"],
    ["phenomenon-3", "1"],
    ["phenomenon-4", "1"],
    ["phenomenon-5", "1"],
  ]);

  const result = buildQuizResult({
    questions,
    answers,
    enhancedCatalog: {},
  });

  const field = result.dimensionResults.find((item) => item.key === "field");
  assert.equal(field?.digit, 2);
  assert.equal(field?.rawScore, 4);
  assert.equal(field?.maxScore, 10); // 多选模式下最高10票(5题×2)
  assert.equal(field?.percentage, 40); // 4/10 = 40%
});
