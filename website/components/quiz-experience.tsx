"use client";

import { startTransition, useState } from "react";

import { AGREEMENT_OPTIONS } from "@/lib/ismism/types";
import type {
  AgreementValue,
  AnswerMap,
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
    body: "它讨论你如何理解世界的背景系统：你会先看到稳定秩序、深层结构、主体视角，还是一个需要实践介入的行动场。",
  },
  {
    title: "本体",
    body: "它讨论什么才算真正存在：是对象与资源、关系结构、主体观念，还是持续生成中的行动与过程更关键。",
  },
  {
    title: "现象",
    body: "它讨论真实如何向人显现：你更信任直观经验、中介解释、第一人称体验，还是裂缝、错位与未完成状态。",
  },
] as const;

export default function QuizExperience({ questions }: QuizExperienceProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [profile, setProfile] = useState<RespondentProfile>(emptyProfile);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<SubmitQuizResponse | null>(null);

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
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-700 sm:mt-5 sm:text-base sm:leading-8">
            题目顺序随机。作答后可随时回到任意题号修改，全部完成后手动提交结果。
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-stone-200/70 bg-white/94 p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.9rem] sm:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
            Framework
          </p>
          <h3 className="mt-4 font-serif text-2xl font-semibold text-stone-950 sm:text-3xl">
            这个测试在测什么
          </h3>
          <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
            这套框架原本从场域、本体、现象、目的四个维度理解一种哲学立场。当前测试聚焦前三条轴线，也就是你如何看待世界背景、什么算真正存在，以及真实如何向你显现。
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
            不同维度会落在秩序、冲突、中心、虚无等不同要素上，因此结果不是“分高分低”，而是一张关于你理解世界方式的组合画像。
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
          <p className="mt-3 text-sm leading-6 text-stone-600 sm:mt-4 sm:leading-7">
            当前在第 {currentIndex + 1} 题。可以点击左侧题号回到任意题目修改答案。
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
