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
    body: "世界是什么样",
  },
  {
    title: "本体",
    body: "自我如何存在",
  },
  {
    title: "现象",
    body: "如何认识世界",
  },
] as const;

const DIGIT_MEANING_CARDS = [
  { digit: "1", label: "秩序", note: "规则先在" },
  { digit: "2", label: "冲突", note: "结构张力" },
  { digit: "3", label: "调和", note: "主体参与" },
  { digit: "4", label: "虚无", note: "生成变化" },
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

const conciseDimensionLabelMap = {
  field: "场域",
  ontology: "本体",
  phenomenon: "认识",
} as const;

const dimensionCaptionMap = {
  field: "世界是什么样",
  ontology: "事物怎么存在",
  phenomenon: "怎么认识世界",
} as const;

const fieldDigitMeaningMap: Record<
  1 | 2 | 3 | 4,
  {
    name: string;
    blurb: string;
    body: string;
  }
> = {
  1: {
    name: "实在论",
    blurb: "世界先在那里，人先去面对它。",
    body: "如果第一个数字更接近 1，你通常会先把世界理解成一个本来就存在的现实背景。对象、环境、外部条件和既有秩序先于个人而存在，人需要先面对它、认识它，再决定怎么行动。",
  },
  2: {
    name: "形而上学",
    blurb: "眼前发生的事，背后还有更深的结构。",
    body: "如果第一个数字更接近 2，你往往不会停在表面现象，而会追问更底层的原则、结构和本质。你会觉得世界不是一堆散乱事件，而是有一套更深的安排在支撑它。",
  },
  3: {
    name: "观念论",
    blurb: "世界总和人的理解方式绑在一起。",
    body: "如果第一个数字更接近 3，你更容易把世界看成离不开主体视角、意义和解释的背景。对你来说，世界不是一块完全独立的冷背景，它总会通过人的理解、意识和立场被组织起来。",
  },
  4: {
    name: "唯物主义",
    blurb: "世界要在现实条件和实践里把握。",
    body: "如果第一个数字更接近 4，你更容易把世界理解成一个需要进入其中、在关系和实践里把握的现实场。你会更在意具体条件、行动过程以及现实是怎样被改变的，而不是只停在抽象原则上。",
  },
};

const splitExamplePeople = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/^([^：:]+)[：:]\s*(.+)$/);

  if (!match) {
    return {
      name: trimmed,
      description: "",
    };
  }

  return {
    name: match[1]?.trim() ?? trimmed,
    description: match[2]?.trim() ?? "",
  };
};

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

const requestPreviewResult = async (accessKey: string, coreCode: string) => {
  const response = await fetch("/api/quiz/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessKey, coreCode }),
  });

  const payload = (await response.json()) as SubmitQuizResponse & {
    error?: string;
  };

  if (!response.ok || !payload.result) {
    throw new Error(payload.error || "测试结果打开失败，请稍后再试。");
  }

  return payload;
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
  const examplePeopleDisplay = response?.result?.info.examplePeople
    ? splitExamplePeople(response.result.info.examplePeople)
    : { name: "暂无典型人物", description: "" };
  const fieldResult = response?.result?.dimensionResults.find((item) => item.key === "field") ?? null;

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

  const openPreviewResult = async () => {
    const accessKey = window.prompt("请输入测试密钥");
    if (accessKey === null) {
      return;
    }

    const coreCode = window.prompt("请输入结果代码，例如 1-1-1");
    if (coreCode === null) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const payload = await requestPreviewResult(accessKey, coreCode);

      startTransition(() => {
        setResponse(payload);
        setPhase("result");
      });
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "测试结果打开失败，请稍后再试。",
      );
    } finally {
      setIsSubmitting(false);
    }
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
        <article className="overflow-hidden rounded-[1.6rem] border border-stone-200/70 bg-[linear-gradient(135deg,rgba(255,252,248,0.98),rgba(255,247,237,0.92)_42%,rgba(240,253,250,0.88))] p-5 shadow-[0_24px_72px_rgba(31,24,18,0.08)] sm:rounded-[2rem] sm:p-7">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500">测试结果</p>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-8 lg:items-stretch">
            <div className="flex min-h-full flex-col justify-between">
              <h2
                className="break-keep whitespace-nowrap font-serif text-[clamp(4rem,12vw,7.2rem)] font-semibold leading-none tracking-[-0.05em] text-stone-950"
                aria-label={`结果代码 ${response.result.coreCode}`}
              >
                {response.result.coreCode}
              </h2>

              <div className="mt-5 max-w-[26rem]">
                <p className="text-[2.2rem] font-semibold leading-tight text-stone-950 sm:text-[2.8rem]">
                  {response.result.name}
                </p>
                {response.result.englishName ? (
                  <p className="mt-3 text-sm uppercase tracking-[0.28em] text-stone-500">
                    {response.result.englishName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex min-h-full items-end">
              <div className="w-full rounded-[1.45rem] border border-white/80 bg-white/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-[2px] sm:p-6">
                <div className="h-1 w-14 rounded-full bg-[linear-gradient(90deg,rgba(217,119,6,0.7),rgba(13,148,136,0.5))]" />
                <p className="mt-5 text-[1.95rem] font-semibold leading-tight text-stone-950 sm:text-[2.2rem]">
                  {examplePeopleDisplay.name}
                </p>
                {examplePeopleDisplay.description ? (
                  <p className="mt-3 max-w-[28rem] text-[1.02rem] leading-8 text-stone-700 sm:text-[1.08rem]">
                    {examplePeopleDisplay.description}
                  </p>
                ) : null}

                <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
                  {response.result.dimensionResults.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-[1.1rem] border border-stone-200/80 bg-white/78 px-4 py-3.5"
                    >
                      <p className="text-base font-semibold text-stone-900">
                        {conciseDimensionLabelMap[item.key]}
                      </p>
                      <p className="mt-1 whitespace-nowrap text-sm leading-6 text-stone-500">
                        {dimensionCaptionMap[item.key]}
                      </p>
                      <p className="mt-3 text-[1.15rem] font-semibold text-stone-900">
                        {item.marker}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>

        {fieldResult ? (
          <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.8rem] sm:p-7">
            <h3 className="font-serif text-2xl font-semibold text-stone-950">第一个数字</h3>
            <p className="mt-4 text-[15px] leading-8 text-stone-700">
              第一个数字是场域，也是这套结果里最先看的因素。它回答的其实是：你默认觉得世界背景是什么样。很多后面的判断，都会先被这个底色影响。
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {([1, 2, 3, 4] as const).map((digit) => {
                const meaning = fieldDigitMeaningMap[digit];
                const isActive = fieldResult.digit === digit;

                return (
                  <article
                    key={digit}
                    className={`rounded-[1.25rem] border p-4 transition-colors ${
                      isActive
                        ? "border-stone-900 bg-stone-950 text-stone-50 shadow-[0_18px_32px_rgba(28,25,23,0.12)]"
                        : "border-stone-200 bg-stone-50/80 text-stone-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-base font-semibold ${
                          isActive ? "bg-white/15 text-stone-50" : "bg-white text-stone-900"
                        }`}
                      >
                        {digit}
                      </span>
                      <p className="text-lg font-semibold">{meaning.name}</p>
                    </div>
                    <p
                      className={`mt-3 text-sm leading-7 ${
                        isActive ? "text-stone-200" : "text-stone-600"
                      }`}
                    >
                      {meaning.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </article>
        ) : null}

        <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.8rem] sm:p-7">
          <h3 className="font-serif text-2xl font-semibold text-stone-950">
            举个生活里的例子
          </h3>
          <p className="mt-4 text-sm leading-8 text-stone-700 sm:text-[15px]">
            {response.result.info.simpleStory}
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.8rem] sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-serif text-2xl font-semibold text-stone-950">AI 解读</h3>
            {isGeneratingAiInterpretation ? (
              <span className="text-sm text-stone-500">正在生成中...</span>
            ) : null}
          </div>

          {aiInterpretation ? (
            <div className="mt-6 grid gap-5">
              <section className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[1.35rem] border border-stone-200 bg-[linear-gradient(145deg,rgba(255,251,235,0.85),rgba(255,255,255,0.9))] p-4">
                  <p className="text-base font-semibold text-stone-900">结果大意</p>
                  <p className="mt-2 text-[15px] leading-8 text-stone-700">
                    {aiInterpretation.resultSummary}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-stone-200 bg-[linear-gradient(145deg,rgba(240,249,255,0.88),rgba(255,255,255,0.9))] p-4">
                  <p className="text-base font-semibold text-stone-900">换成大白话</p>
                  <p className="mt-2 text-[15px] leading-8 text-stone-700">
                    {aiInterpretation.simpleExplanation}
                  </p>
                </div>
              </section>

              <section>
                <p className="text-base font-semibold text-stone-900">三个维度分别怎么看</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {aiInterpretation.dimensionInterpretations.map((item) => {
                    const tone = dimensionToneMap[item.key];

                    return (
                      <article
                        key={item.key}
                        className={`rounded-[1.3rem] border p-4 ${tone.panel}`}
                      >
                        <p className="text-base font-semibold text-stone-900">
                          {conciseDimensionLabelMap[item.key]}
                        </p>
                        <p className="mt-1 text-sm text-stone-500">
                          {dimensionCaptionMap[item.key]}
                        </p>
                        <p className="mt-3 text-[15px] leading-8 text-stone-700">
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
        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[1.6rem] border border-stone-200/70 bg-[linear-gradient(145deg,rgba(15,118,110,0.08),rgba(255,255,255,0.96)_28%,rgba(255,247,237,0.88))] p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.9rem] sm:p-8">
            <h3 className="font-serif text-2xl font-semibold text-stone-950 sm:text-3xl">
              开始
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
              onClick={() => {
                setError("");
                setPhase("quiz");
              }}
              disabled={isSubmitting}
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
              这是一个庸俗的哲学意识形态分类框架，会从场域、本体和现象三个维度评估你的意识形态倾向。
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

            <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
              每个维度会填入一个 1-4 的数字，代表你在这个维度上的倾向。最后会根据这三个数字进行分析。
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {DIGIT_MEANING_CARDS.map((item) => (
                <article
                  key={item.digit}
                  className="rounded-[1.25rem] border border-stone-200/80 bg-stone-50/75 px-4 py-4"
                >
                  <p className="font-serif text-3xl font-semibold leading-none text-stone-950">
                    {item.digit}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-stone-950">{item.label}</p>
                  <p className="mt-1 text-sm text-stone-600">{item.note}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={openPreviewResult}
            disabled={isSubmitting}
            className="rounded-full border border-stone-300 bg-white/80 px-4 py-2 text-sm text-stone-600 transition duration-200 hover:border-stone-500 hover:bg-white hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "正在打开测试结果..." : "测试按钮"}
          </button>
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
