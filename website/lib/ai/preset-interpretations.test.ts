import test from "node:test";
import assert from "node:assert/strict";

import { getPresetInterpretation } from "./preset-interpretations.ts";
import { PRESET_INTERPRETATIONS } from "./preset-interpretations-data.ts";
import type { QuizResult } from "../ismism/types.ts";

const presets = PRESET_INTERPRETATIONS;

const ALL_CODES = ["1", "2", "3", "4"].flatMap((first) =>
  ["1", "2", "3", "4"].flatMap((second) =>
    ["1", "2", "3", "4"].map((third) => `${first}-${second}-${third}`),
  ),
);

const buildResult = (coreCode: string): QuizResult => ({
  clientId: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  coreCode,
  name: "测试",
  englishName: "Test",
  matchRate: 50,
  dimensionResults: [
    { key: "field", label: "场域", rawScore: 1, maxScore: 2, percentage: 50, digit: 1, marker: "秩序", title: "既有秩序", summary: "摘要" },
    { key: "ontology", label: "本体", rawScore: 1, maxScore: 2, percentage: 50, digit: 2, marker: "冲突", title: "关系网络", summary: "摘要" },
    { key: "phenomenon", label: "现象", rawScore: 1, maxScore: 2, percentage: 50, digit: 3, marker: "调和", title: "视角建构", summary: "摘要" },
  ],
  info: { axisList: [], featureList: [], examplePeople: "", simpleStory: "" },
});

test("preset file covers every core code in both languages", () => {
  assert.equal(ALL_CODES.length, 64);

  for (const code of ALL_CODES) {
    for (const lang of ["zh", "en"] as const) {
      const entry = presets[code]?.[lang];
      assert.ok(entry, `missing preset for ${code} (${lang})`);
      assert.ok(
        entry.simpleExplanation.length >= (lang === "en" ? 48 : 32),
        `short simpleExplanation for ${code} (${lang})`,
      );
      assert.ok(
        entry.simpleExplanation.length <= 800,
        `oversized simpleExplanation for ${code} (${lang})`,
      );
      assert.equal(
        entry.dimensions.length,
        3,
        `expected 3 dimension explanations for ${code} (${lang})`,
      );
      for (const dimension of entry.dimensions) {
        assert.ok(dimension.length >= 24, `short dimension text for ${code} (${lang})`);
        assert.ok(dimension.length <= 150, `oversized dimension text for ${code} (${lang})`);
      }
    }
  }
});

test("getPresetInterpretation maps preset text onto dimension results", () => {
  const result = buildResult("2-3-1");
  const interpretation = getPresetInterpretation(result, "zh");
  const preset = presets["2-3-1"]?.zh;

  assert.ok(interpretation);
  assert.ok(preset);
  assert.equal(interpretation.simpleExplanation, preset.simpleExplanation);
  assert.deepEqual(
    interpretation.dimensionInterpretations.map((item) => item.key),
    ["field", "ontology", "phenomenon"],
  );
  assert.deepEqual(
    interpretation.dimensionInterpretations.map((item) => item.explanation),
    preset.dimensions,
  );
});

test("getPresetInterpretation returns null for an unknown code", () => {
  assert.equal(getPresetInterpretation(buildResult("9-9-9"), "zh"), null);
});
