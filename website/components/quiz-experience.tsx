"use client";

import { startTransition, useEffect, useState } from "react";

import { AGREEMENT_OPTIONS } from "@/lib/ismism/types";
import type {
  AgreementValue,
  AnswerMap,
  QuizResult,
  QuizResultAiInterpretation,
  QuizResultAiInterpretationResponse,
  QuizQuestion,
  RespondentProfile,
  SubmitQuizResponse,
} from "@/lib/ismism/types";

const emptyProfile: RespondentProfile = {
  name: "",
  message: "",
};

type Phase = "intro" | "quiz" | "result";

type QuizExperienceProps = {
  questions: QuizQuestion[];
};

const optionToneMap: Record<AgreementValue, string> = {
  strongly_disagree: "from-stone-100 to-stone-200 text-stone-800",
  disagree: "from-orange-100 to-amber-100 text-amber-950",
  neutral: "from-zinc-100 to-zinc-200 text-zinc-900",
  agree: "from-emerald-100 to-teal-100 text-teal-950",
  strongly_agree: "from-teal-200 to-cyan-200 text-teal-950",
};

const FRAMEWORK_DIMENSIONS = [
  {
    title: "场域",
    body: "它讨论你如何理解世界的背景系统。这里不是把世界看成一个抽象大词，而是追问：事物到底是在什么样的整体关系网里发生的。你更可能先看到稳定秩序、深层结构、主体视角，还是一个需要行动介入的实践场。",
  },
  {
    title: "本体",
    body: "它讨论什么才算真正存在。是对象、资源、制度这些可确认的东西更根本，还是关系结构、主体观念、生成过程更关键。换句话说，它在追问你的“存在清单”到底由什么构成。",
  },
  {
    title: "现象",
    body: "它讨论真实如何向人显现。你更信任直观经验，还是认为一切经验都经过中介和解释；你更看重第一人称体验，还是对裂缝、错位、反讽和未完成状态更敏感。",
  },
] as const;

const dimensionToneMap = {
  field: {
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    panel:
      "border-amber-200/70 bg-[linear-gradient(145deg,rgba(255,251,235,0.95),rgba(255,255,255,0.92))]",
  },
  ontology: {
    badge: "border-teal-200 bg-teal-50 text-teal-900",
    panel:
      "border-teal-200/70 bg-[linear-gradient(145deg,rgba(240,253,250,0.95),rgba(255,255,255,0.92))]",
  },
  phenomenon: {
    badge: "border-sky-200 bg-sky-50 text-sky-900",
    panel:
      "border-sky-200/70 bg-[linear-gradient(145deg,rgba(240,249,255,0.96),rgba(255,255,255,0.92))]",
  },
} as const;

const digitToneMap = {
  1: "border-amber-200 bg-amber-50 text-amber-950",
  2: "border-orange-200 bg-orange-50 text-orange-950",
  3: "border-emerald-200 bg-emerald-50 text-emerald-950",
  4: "border-stone-300 bg-stone-100 text-stone-950",
} as const;

const requestAiInterpretation = async (result: QuizResult) => {
  const response = await fetch("/api/quiz/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ result }),
  });

  const payload = (await response.json()) as Partial<QuizResultAiInterpretationResponse> & {
    error?: string;
  };

  if (!response.ok || !payload.interpretation) {
    throw new Error(payload.error || "AI 解读生成失败，请稍后再试。");
  }

  return payload.interpretation;
};

export default function QuizExperience({ questions }: QuizExperienceProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [profile, setProfile] = useState<RespondentProfile>(emptyProfile);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<SubmitQuizResponse | null>(null);
  const [aiInterpretation, setAiInterpretation] =
    useState<QuizResultAiInterpretation | null>(null);
  const [aiError, setAiError] = useState("");
  const [isGeneratingAiInterpretation, setIsGeneratingAiInterpretation] =
    useState(false);

  const currentQuestion = questions[currentIndex];
  const currentQuestionNumber = currentIndex + 1;
  const answeredCount = Object.keys(answers).length;
  const remainingCount = questions.length - answeredCount;
  const progress = phase === "quiz" ? (answeredCount / questions.length) * 100 : 0;
  const allAnswered = answeredCount === questions.length;

  const updateName = (value: string) => {
    setProfile((previous) => ({
      ...previous,
      name: value,
    }));
  };

  const updateMessage = (value: string) => {
    setProfile((previous) => ({
      ...previous,
      message: value,
    }));
  };

  const resetQuiz = () => {
    setPhase("intro");
    setCurrentIndex(0);
    setAnswers({});
    setProfile(emptyProfile);
    setError("");
    setIsSubmitting(false);
    setResponse(null);
    setAiInterpretation(null);
    setAiError("");
    setIsGeneratingAiInterpretation(false);
  };

  const movePrevious = () => {
    if (isSubmitting) {
      return;
    }

    setError("");
    setCurrentIndex((index) => Math.max(0, index - 1));
  };

  const jumpToQuestion = (index: number) => {
    if (isSubmitting) {
      return;
    }

    setError("");
    setCurrentIndex(index);
  };

  const submitQuiz = async () => {
    if (!allAnswered) {
      setError("还有题目未作答，完成后才能提交。");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const submission = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers,
          respondent: profile,
        }),
      });

      const payload = (await submission.json()) as SubmitQuizResponse & {
        error?: string;
      };

      if (!submission.ok || !payload.result) {
        throw new Error(payload.error || "生成结果失败，请稍后再试。");
      }

      startTransition(() => {
        setResponse(payload);
        setPhase("result");
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "生成结果失败，请稍后再试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const recordAnswer = (questionId: string, value: AgreementValue) => {
    if (isSubmitting) {
      return;
    }

    const nextAnswers = {
      ...answers,
      [questionId]: value,
    };

    setAnswers(nextAnswers);
    setError("");

    if (currentIndex < questions.length - 1) {
      window.setTimeout(() => {
        setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
      }, 120);
    }
  };

  const retryAiInterpretation = async () => {
    if (!response?.result) {
      return;
    }

    setAiError("");
    setIsGeneratingAiInterpretation(true);

    try {
      const interpretation = await requestAiInterpretation(response.result);
      setAiInterpretation(interpretation);
    } catch (interpretationError) {
      setAiError(
        interpretationError instanceof Error
          ? interpretationError.message
          : "AI 解读生成失败，请稍后再试。",
      );
    } finally {
      setIsGeneratingAiInterpretation(false);
    }
  };

  useEffect(() => {
    if (phase !== "result" || !response?.result) {
      return;
    }

    let cancelled = false;

    const loadInterpretation = async () => {
      setAiInterpretation(null);
      setAiError("");
      setIsGeneratingAiInterpretation(true);

      try {
        const interpretation = await requestAiInterpretation(response.result);
        if (!cancelled) {
          setAiInterpretation(interpretation);
        }
      } catch (interpretationError) {
        if (!cancelled) {
          setAiError(
            interpretationError instanceof Error
              ? interpretationError.message
              : "AI 解读生成失败，请稍后再试。",
          );
        }
      } finally {
        if (!cancelled) {
          setIsGeneratingAiInterpretation(false);
        }
      }
    };

    void loadInterpretation();

    return () => {
      cancelled = true;
    };
  }, [phase, response?.result]);

  if (phase === "result" && response) {
    return (
      <section className="grid w-full gap-4 sm:gap-5">
        <article className="rounded-[1.6rem] border border-stone-200/70 bg-[linear-gradient(135deg,rgba(255,252,248,0.98),rgba(255,247,237,0.92)_42%,rgba(240,253,250,0.88))] p-5 shadow-[0_24px_72px_rgba(31,24,18,0.08)] sm:rounded-[2rem] sm:p-7">
          <h2
            className="break-keep whitespace-nowrap font-serif text-[clamp(4rem,12vw,7.2rem)] font-semibold leading-none tracking-[-0.05em] text-stone-950"
            aria-label={`结果代码 ${response.result.coreCode}`}
          >
            {response.result.coreCode}
          </h2>

          <div className="mt-4">
            <p className="text-2xl font-medium text-stone-950 sm:text-3xl">
              {response.result.name}
            </p>
            {response.result.englishName ? (
              <p className="mt-2 text-sm text-stone-500">{response.result.englishName}</p>
            ) : null}
          </div>

          <p className="mt-5 text-sm leading-7 text-stone-600 sm:text-base">
            1 = 秩序　2 = 冲突　3 = 调和　4 = 虚无
          </p>
        </article>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:p-6">
            <h3 className="text-lg font-medium text-stone-950">举个生活里的例子</h3>
            <p className="mt-4 text-sm leading-8 text-stone-700 sm:text-[15px]">
              {response.result.info.simpleStory}
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:p-6">
            <h3 className="text-lg font-medium text-stone-950">常见对应形象</h3>
            <p className="mt-4 text-base leading-8 text-stone-800">
              {response.result.info.examplePeople || "暂无典型人物"}
            </p>
          </article>
        </div>

        <section className="grid gap-3 md:grid-cols-3">
          {response.result.dimensionResults.map((item) => {
            const tone = dimensionToneMap[item.key];

            return (
              <article
                key={item.key}
                className={`rounded-[1.35rem] border px-4 py-5 shadow-[0_10px_28px_rgba(31,24,18,0.05)] ${tone.panel}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-base font-medium text-stone-900">{item.label}</p>
                  <p className="font-serif text-3xl leading-none text-stone-950">{item.digit}</p>
                </div>
                <p className="mt-4 text-lg font-medium text-stone-950">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-stone-700">{item.summary}</p>
              </article>
            );
          })}
        </section>

        <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.8rem] sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-serif text-2xl font-semibold text-stone-950">AI 解读</h3>
            {isGeneratingAiInterpretation ? (
              <span className="text-sm text-stone-500">正在生成中...</span>
            ) : null}
          </div>

          {aiInterpretation ? (
            <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <section className="grid gap-3">
                <div className="rounded-[1.35rem] border border-stone-200 bg-[linear-gradient(145deg,rgba(255,251,235,0.85),rgba(255,255,255,0.9))] p-4">
                  <p className="text-sm font-semibold text-stone-900">结果大意</p>
                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    {aiInterpretation.resultSummary}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-stone-200 bg-[linear-gradient(145deg,rgba(240,253,250,0.88),rgba(255,255,255,0.9))] p-4">
                  <p className="text-sm font-semibold text-stone-900">放到这套测试里</p>
                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    {aiInterpretation.philosophicalExplanation}
                  </p>
                </div>
              </section>

              <section className="grid gap-3">
                <div className="rounded-[1.35rem] border border-stone-200 bg-[linear-gradient(145deg,rgba(240,249,255,0.88),rgba(255,255,255,0.9))] p-4">
                  <p className="text-sm font-semibold text-stone-900">换成大白话</p>
                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    {aiInterpretation.simpleExplanation}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-stone-200 bg-stone-50/80 p-4">
                  <p className="text-sm font-semibold text-stone-900">再举个例子</p>
                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    {aiInterpretation.exampleScenario}
                  </p>
                </div>
              </section>

              <section className="lg:col-span-2">
                <p className="text-sm font-semibold text-stone-900">三个维度分别怎么看</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {aiInterpretation.dimensionInterpretations.map((item) => {
                    const tone = dimensionToneMap[item.key];

                    return (
                      <article
                        key={item.key}
                        className={`rounded-[1.3rem] border p-4 ${tone.panel}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                            {item.label}
                          </p>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${digitToneMap[item.digit]}`}
                          >
                            {item.digit}
                          </span>
                        </div>
                        <h4 className="mt-3 text-lg font-semibold text-stone-950">
                          {item.title}
                        </h4>
                        <p className="mt-3 text-sm leading-7 text-stone-700">
                          {item.explanation}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}

          {!aiInterpretation && isGeneratingAiInterpretation ? (
            <div className="mt-6 rounded-[1.35rem] border border-stone-200 bg-stone-50/80 p-4 text-sm leading-7 text-stone-600">
              AI 正在生成更容易读懂的解释。
            </div>
          ) : null}

          {!aiInterpretation && aiError ? (
            <div className="mt-6 rounded-[1.35rem] border border-red-200 bg-red-50/80 p-4">
              <p className="text-sm leading-7 text-red-700">{aiError}</p>
              <button
                type="button"
                onClick={retryAiInterpretation}
                disabled={isGeneratingAiInterpretation}
                className="mt-4 rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                重新生成 AI 解读
              </button>
            </div>
          ) : null}
        </article>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={resetQuiz}
            className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition duration-200 hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-[0_10px_24px_rgba(28,25,23,0.18)] active:translate-y-0 sm:w-auto"
          >
            重新测试
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-full rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-500 hover:bg-white hover:text-stone-950 active:translate-y-0 sm:w-auto"
          >
            回到顶部
          </button>
        </div>
      </section>
    );
  }

  if (phase === "intro") {
    return (
      <section className="mx-auto grid w-full max-w-5xl gap-4 sm:gap-5">
        <div className="rounded-[1.7rem] border border-stone-200/70 bg-white/94 p-5 shadow-[0_24px_72px_rgba(31,24,18,0.08)] sm:rounded-[2rem] sm:p-8">
          <h2 className="max-w-3xl text-balance font-serif text-3xl font-semibold leading-tight text-stone-950 sm:text-4xl lg:text-5xl">
            用 24 道判断题，测出你在场域、本体、现象三条轴线上的哲学偏向。
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
            这不是性格测试，也不是谁高谁低的分数。它更像一张坐标图，帮你看清自己更习惯从哪种角度理解世界。
          </p>
          <p className="mt-5 text-sm text-stone-600 sm:text-base">
            24 道判断题 · 3 个核心维度 · 5 档认同程度
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[1.6rem] border border-stone-200/70 bg-[linear-gradient(145deg,rgba(15,118,110,0.08),rgba(255,255,255,0.96)_28%,rgba(255,247,237,0.88))] p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.9rem] sm:p-8">
            <h3 className="font-serif text-2xl font-semibold text-stone-950 sm:text-3xl">
              先开始测试
            </h3>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              称呼和留言都可以留空，直接开始也行。
            </p>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm text-stone-500">称呼（可选）</span>
                <input
                  value={profile.name}
                  onChange={(event) => updateName(event.target.value)}
                  className="rounded-2xl border border-stone-200 bg-white/82 px-4 py-3 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-teal-600 focus:bg-white"
                  placeholder="留空也可以"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-stone-500">留言（可选）</span>
                <textarea
                  value={profile.message}
                  onChange={(event) => updateMessage(event.target.value)}
                  rows={4}
                  className="rounded-2xl border border-stone-200 bg-white/82 px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-teal-600 focus:bg-white"
                  placeholder="可以留一句话"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setPhase("quiz")}
              className="mt-6 w-full rounded-full bg-[linear-gradient(90deg,#0f766e,#14b8a6)] px-5 py-4 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,118,110,0.28)] active:translate-y-0"
            >
              开始测试
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-stone-200/70 bg-white/94 p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.9rem] sm:p-8">
            <h3 className="font-serif text-2xl font-semibold text-stone-950 sm:text-3xl">
              这个测试在测什么
            </h3>
            <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
              这套测试基于《主义主义》里的“四维矩阵”框架，但当前版本只先测前三条轴线：场域、本体、现象。也就是你如何理解世界背景、如何界定什么算真实、以及真实通常怎样出现在你的经验里。
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
              所以结果不是高低判断，而是一张思考方式的结构图。你可以把它理解成一张地图，而不是一次考试成绩。
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {FRAMEWORK_DIMENSIONS.map((item) => (
                <article
                  key={item.title}
                  className={`rounded-[1.3rem] border p-4 ${
                    item.title === "场域"
                      ? dimensionToneMap.field.panel
                      : item.title === "本体"
                        ? dimensionToneMap.ontology.panel
                        : dimensionToneMap.phenomenon.panel
                  }`}
                >
                  <p className="text-base font-medium text-stone-900">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-stone-700">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-6 lg:grid-cols-[19rem_minmax(0,48rem)] lg:justify-center">
      <aside className="grid gap-3 self-start sm:gap-4 lg:sticky lg:top-8">
        <div className="rounded-[1.55rem] border border-stone-200/70 bg-[linear-gradient(150deg,rgba(255,251,235,0.92),rgba(255,255,255,0.94)_46%,rgba(240,253,250,0.92))] p-4 shadow-[0_18px_48px_rgba(31,24,18,0.06)] sm:rounded-[1.85rem] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold text-stone-950 sm:text-4xl">
                {answeredCount}
                <span className="text-base text-stone-400 sm:text-lg"> / {questions.length}</span>
              </p>
            </div>
            <div
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${dimensionToneMap[currentQuestion.dimension].badge}`}
            >
              {currentQuestion.dimensionLabel}
            </div>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/80 sm:mt-5">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#c2410c)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-4 text-sm leading-7 text-stone-600">
            第 {currentQuestionNumber} 题 · 剩余 {remainingCount} 题
          </p>
        </div>

        <div className="rounded-[1.45rem] border border-stone-200/70 bg-white/94 p-4 shadow-[0_18px_48px_rgba(31,24,18,0.06)] sm:rounded-[1.7rem] sm:p-5">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-4">
            {questions.map((question, index) => {
              const answered = Boolean(answers[question.id]);
              const current = index === currentIndex;

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => jumpToQuestion(index)}
                  className={`rounded-xl border px-0 py-2.5 text-xs font-medium transition duration-200 sm:rounded-2xl sm:py-3 sm:text-sm ${
                    current
                      ? "border-stone-900 bg-stone-900 text-white"
                      : answered
                        ? "border-teal-200 bg-teal-50 text-teal-900 hover:border-teal-400"
                        : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-400 hover:bg-white"
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="w-full rounded-[1.7rem] border border-stone-200/70 bg-white/96 p-5 shadow-[0_18px_56px_rgba(31,24,18,0.07)] sm:rounded-[2rem] sm:p-8 lg:max-w-[48rem]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">
            第 {currentQuestionNumber} 题
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${dimensionToneMap[currentQuestion.dimension].badge}`}
          >
            {currentQuestion.dimensionLabel}
          </span>
        </div>

        <div className="min-h-0 sm:min-h-[13rem]">
          <h2 className="mt-5 text-balance font-serif text-2xl leading-tight text-stone-950 sm:text-3xl lg:text-[2.55rem]">
            {currentQuestion.question}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:mt-5 sm:text-base">
            请选择你对这句话的认同程度。这里没有标准答案，只看你平时更自然的判断倾向。
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:mt-8">
          {AGREEMENT_OPTIONS.map((option) => {
            const selected = answers[currentQuestion.id] === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => recordAnswer(currentQuestion.id, option.value)}
                className={`rounded-[1.35rem] border px-4 py-4 text-left transition duration-200 sm:rounded-[1.65rem] sm:px-5 sm:py-[1.125rem] ${
                  selected
                    ? `border-stone-900 bg-gradient-to-r ${optionToneMap[option.value]} scale-[1.01] shadow-[0_14px_34px_rgba(31,24,18,0.10)]`
                    : "border-stone-200 bg-stone-50/80 text-stone-700 hover:-translate-y-0.5 hover:border-stone-400 hover:bg-white hover:shadow-[0_12px_26px_rgba(31,24,18,0.06)] active:translate-y-0"
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-300 bg-white text-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    •
                  </span>

                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium sm:text-base">{option.label}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={movePrevious}
            disabled={currentIndex === 0 || isSubmitting}
            className="w-full rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-500 hover:bg-white hover:text-stone-950 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            上一题
          </button>
          <button
            type="button"
            onClick={submitQuiz}
            disabled={!allAnswered || isSubmitting}
            className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition duration-200 hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-[0_10px_24px_rgba(28,25,23,0.18)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-100 disabled:shadow-none sm:w-auto"
          >
            {isSubmitting ? "正在生成结果..." : "提交结果"}
          </button>
        </div>
      </div>
    </section>
  );
}
