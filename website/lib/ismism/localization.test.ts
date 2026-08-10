import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

type JsonEntry = {
  dimension?: string;
  type?: string;
  question?: string;
  options?: Array<{ value: string; label?: string }>;
  ch_name?: string;
  en_name?: string;
  axis_list?: string[];
  feature_list?: string[];
  example_people?: string;
  simple_story?: string;
};

const readJson = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../data/${name}`, import.meta.url), "utf8")) as Record<string, JsonEntry>;

const chineseText = /[\u3400-\u9fff]/;
const translationProcessText = /(?:^|\n)(?:Here is|Here's|Translation:|Alternative translations?|Translator'?s? notes?|Notes?:)/i;

test("English question bank preserves the Chinese bank structure", () => {
  const zh = readJson("ismism-question-bank.json");
  const en = readJson("ismism-question-bank-en.json");

  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());

  for (const id of Object.keys(zh)) {
    const zhEntry = zh[id];
    const enEntry = en[id];
    assert.ok(zhEntry && enEntry, `${id} exists in both banks`);
    assert.equal(enEntry.dimension, zhEntry.dimension, `${id} dimension`);
    assert.equal(enEntry.type, zhEntry.type, `${id} type`);
    assert.deepEqual(
      (enEntry.options ?? []).map((option) => option.value).sort(),
      (zhEntry.options ?? []).map((option) => option.value).sort(),
      `${id} option values`,
    );
  }
});

test("English user-facing data contains no translation-process text or Chinese residue", () => {
  const questionBank = readJson("ismism-question-bank-en.json");
  const catalog = readJson("ismism-sum-enhanced-en.json");
  const overview = readFileSync(new URL("../../data/overview-en.txt", import.meta.url), "utf8");
  const values = [
    ...Object.values(questionBank).flatMap((entry) => [
      entry.question,
      ...(entry.options ?? []).map((option) => option.label),
    ]),
    ...Object.values(catalog).flatMap((entry) => [
      entry.ch_name,
      entry.en_name,
      ...(entry.axis_list ?? []),
      ...(entry.feature_list ?? []),
      entry.example_people,
      entry.simple_story,
    ]),
    overview,
  ].filter((value): value is string => typeof value === "string");

  for (const value of values) {
    assert.equal(chineseText.test(value), false, value);
    assert.equal(translationProcessText.test(value), false, value);
  }
});
