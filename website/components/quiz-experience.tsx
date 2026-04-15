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
  const answeredCount = Object.keys(answers).length;
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
      <section className="w-full grid gap-4 sm:gap-5">
        <div className="rounded-[1.5rem] border border-stone-200/70 bg-white/94 p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.8rem] sm:p-7">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
            测试结果
          </p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-serif text-3xl font-semibold text-stone-950 sm:text-4xl">
                {response.result.coreCode}
              </h2>
              <p className="mt-2 text-xl font-medium text-stone-900 sm:text-2xl">
                {response.result.name}
              </p>
              {response.result.englishName ? (
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500 sm:text-sm sm:tracking-[0.24em]">
                  {response.result.englishName}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {response.result.dimensionResults.map((item) => (
            <article
              key={item.key}
              className="rounded-[1.4rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.5rem] sm:p-6"
            >
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-stone-500">
                  {item.label}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-stone-950 sm:text-2xl">
                  {item.digit}. {item.title}
                </h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-stone-700">{item.summary}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.8rem] sm:p-7">
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
              轴线解读
            </p>
            {response.result.info.axisList.length ? (
              <div className="mt-5 grid gap-3">
                {response.result.info.axisList.map((axisItem) => (
                  <div
                    key={axisItem}
                    className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm leading-7 text-stone-700"
                  >
                    {axisItem}
                  </div>
                ))}
              </div>
            ) : null}

            {response.result.info.featureList.length ? (
              <div className="mt-5 grid gap-3">
                {response.result.info.featureList.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-2xl bg-gradient-to-r from-stone-100 to-amber-50 px-4 py-3 text-sm leading-7 text-stone-800"
                  >
                    {feature}
                  </div>
                ))}
              </div>
            ) : null}
          </article>

          <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.8rem] sm:p-7">
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
              示例叙事
            </p>
            <p className="mt-4 text-lg font-medium text-stone-900">
              {response.result.info.examplePeople || "暂无典型人物"}
            </p>
            <p className="mt-4 text-sm leading-7 text-stone-700">
              {response.result.info.simpleStory}
            </p>
          </article>
        </div>

        <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.8rem] sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
                AI 解读
              </p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-950">
                基于框架说明的结果解析
              </h3>
            </div>
            {isGeneratingAiInterpretation ? (
              <span className="text-sm text-stone-500">正在生成中...</span>
            ) : null}
          </div>

          {aiInterpretation ? (
            <div className="mt-6 grid gap-5">
              <section className="grid gap-3">
                <div className="rounded-[1.35rem] border border-stone-200 bg-stone-50/80 p-4">
                  <p className="text-sm font-semibold text-stone-900">这个结果是什么？</p>
                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    {aiInterpretation.resultSummary}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-stone-200 bg-stone-50/80 p-4">
                  <p className="text-sm font-semibold text-stone-900">哲学解释</p>
                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    {aiInterpretation.philosophicalExplanation}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-stone-200 bg-stone-50/80 p-4">
                  <p className="text-sm font-semibold text-stone-900">通俗解释</p>
                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    {aiInterpretation.simpleExplanation}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-stone-200 bg-stone-50/80 p-4">
                  <p className="text-sm font-semibold text-stone-900">举例说明</p>
                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    {aiInterpretation.exampleScenario}
                  </p>
                </div>
              </section>

              <section>
                <p className="text-sm font-semibold text-stone-900">针对每个维度的解释</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {aiInterpretation.dimensionInterpretations.map((item) => (
                    <article
                      key={item.key}
                      className="rounded-[1.3rem] bg-gradient-to-br from-stone-100 to-white p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                        {item.label}
                      </p>
                      <h4 className="mt-2 text-lg font-semibold text-stone-950">
                        {item.digit}. {item.title}
                      </h4>
                      <p className="mt-3 text-sm leading-7 text-stone-700">
                        {item.explanation}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {!aiInterpretation && isGeneratingAiInterpretation ? (
            <div className="mt-6 grid gap-3">
              <div className="rounded-[1.35rem] border border-stone-200 bg-stone-50/80 p-4 text-sm leading-7 text-stone-600">
                AI 正在结合框架说明与测试结果生成详细解读，这里会补充“这个结果是什么”“哲学解释”“通俗解释”“举例说明”以及逐维度说明。
              </div>
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
      <section className="mx-auto grid w-full max-w-4xl gap-4 sm:gap-5">
        <div className="rounded-[1.5rem] border border-stone-200/70 bg-white/94 p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.9rem] sm:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
            Philosophy Tendency Test
          </p>
          <h2 className="mt-4 max-w-3xl text-balance font-serif text-3xl font-semibold leading-tight text-stone-950 sm:text-4xl lg:text-5xl">
            用 24 道判断题，测出你在场域、本体、现象三条轴线上的哲学偏向。
          </h2>
        </div>

        <div className="rounded-[1.5rem] border border-stone-200/70 bg-white/94 p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.9rem] sm:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
            Framework
          </p>
          <h3 className="mt-4 font-serif text-2xl font-semibold text-stone-950 sm:text-3xl">
            这个测试在测什么
          </h3>
          <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
            这套测试基于《主义主义》里提出的一套“四维矩阵”框架。原始框架试图用场域、本体、现象、目的四个维度来描述一种哲学立场，也就是依次回答四个问题：你认为世界背景是什么样的，什么才算真正存在，这些存在如何向人显现，以及人的行动最终朝向什么目标。
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
            当前版本的测试先聚焦前三条轴线，也就是“世界背景”“存在判断”“经验显现”这三部分。也就是说，它更关心你如何理解世界、如何界定真实、如何看待经验，而不直接评估你的最终行动目的。因此结果不是一个价值高低判断，而是一张关于你思考方式的结构画像。
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
            在这套框架里，每个维度都可能落在几种不同的基础要素上，例如秩序、冲突、中心、虚无。它们不是单纯的性格标签，而是你在理解世界时更容易倚靠的哲学材料。比如有的人更容易从稳定规则出发，有的人会优先看到结构矛盾，有的人更强调主体经验，也有人更敏感于裂缝、生成和未完成状态。
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
            所以最终结果不应该理解成“你得了多少分”，而应该理解成：在场域、本体、现象这三条轴线上，你分别更接近哪一种理解方式。这三个位置组合起来，才构成你当前更接近的哲学倾向。它更像一张地图，而不是一次考试成绩。
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {FRAMEWORK_DIMENSIONS.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.3rem] border border-stone-200 bg-stone-50/70 p-4"
              >
                <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-stone-700">{item.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-stone-200/70 bg-white/94 p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.9rem] sm:p-8">
          <label className="grid gap-2">
            <span className="text-sm text-stone-500">称呼（可选）</span>
            <input
              value={profile.name}
              onChange={(event) => updateName(event.target.value)}
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-teal-600 focus:bg-white"
              placeholder="留空也可以"
            />
          </label>

          <label className="mt-4 grid gap-2">
            <span className="text-sm text-stone-500">留言（可选）</span>
            <textarea
              value={profile.message}
              onChange={(event) => updateMessage(event.target.value)}
              rows={3}
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-teal-600 focus:bg-white"
              placeholder="可以留一句话"
            />
          </label>

          <button
            type="button"
            onClick={() => setPhase("quiz")}
            className="mt-6 w-full rounded-full bg-[linear-gradient(90deg,#0f766e,#14b8a6)] px-5 py-4 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,118,110,0.28)] active:translate-y-0"
          >
            开始测试
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-6 lg:grid-cols-[18rem_minmax(0,46rem)] lg:justify-center">
      <aside className="grid gap-3 self-start sm:gap-4 lg:sticky lg:top-8">
        <div className="rounded-[1.45rem] border border-stone-200/70 bg-white/94 p-4 shadow-[0_18px_48px_rgba(31,24,18,0.06)] sm:rounded-[1.7rem] sm:p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
            Progress
          </p>
          <p className="mt-3 text-3xl font-semibold text-stone-950 sm:mt-4 sm:text-4xl">
            {answeredCount}
            <span className="text-base text-stone-400 sm:text-lg"> / {questions.length}</span>
          </p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-100 sm:mt-5">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#c2410c)]"
              style={{ width: `${progress}%` }}
            />
          </div>
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

      <div className="w-full rounded-[1.6rem] border border-stone-200/70 bg-white/96 p-5 shadow-[0_18px_48px_rgba(31,24,18,0.06)] sm:rounded-[1.95rem] sm:p-8 lg:max-w-[46rem]">
        <div className="min-h-0 sm:min-h-[13rem]">
          <h2 className="text-balance font-serif text-2xl leading-tight text-stone-950 sm:text-3xl lg:text-4xl">
            {currentQuestion.question}
          </h2>
          <p className="mt-4 text-sm leading-6 text-stone-600 sm:mt-5 sm:leading-7">
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
                className={`rounded-[1.25rem] border px-4 py-3.5 text-left transition duration-200 sm:rounded-[1.55rem] sm:px-5 sm:py-4 ${
                  selected
                    ? `border-stone-900 bg-gradient-to-r ${optionToneMap[option.value]} scale-[1.01] shadow-[0_14px_34px_rgba(31,24,18,0.10)]`
                    : "border-stone-200 bg-stone-50/80 text-stone-700 hover:-translate-y-0.5 hover:border-stone-400 hover:bg-white hover:shadow-[0_12px_26px_rgba(31,24,18,0.06)] active:translate-y-0"
                }`}
              >
                <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="text-sm font-medium sm:text-base">{option.label}</span>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs opacity-70 sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm">
                    {(option.ratio * 100).toFixed(0)}%
                  </span>
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
