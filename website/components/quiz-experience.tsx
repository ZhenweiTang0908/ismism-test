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
      <section className="grid gap-5">
        <div className="rounded-[1.8rem] border border-stone-200/70 bg-white/94 p-7 shadow-[0_18px_60px_rgba(31,24,18,0.07)]">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
            Result
          </p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-serif text-4xl font-semibold text-stone-950">
                {response.result.coreCode}
              </h2>
              <p className="mt-2 text-2xl font-medium text-stone-900">
                {response.result.name}
              </p>
              {response.result.englishName ? (
                <p className="mt-1 text-sm uppercase tracking-[0.24em] text-stone-500">
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
              className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_14px_36px_rgba(43,33,23,0.05)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-stone-500">
                    {item.label}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-stone-950">
                    {item.digit}. {item.title}
                  </h3>
                </div>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
                  {item.percentage.toFixed(2)}
                </span>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#c2410c)]"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <p className="mt-4 text-sm leading-7 text-stone-700">{item.summary}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[1.8rem] border border-stone-200/80 bg-white/92 p-7 shadow-[0_14px_36px_rgba(43,33,23,0.05)]">
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
              Related Notes
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

          <article className="rounded-[1.8rem] border border-stone-200/80 bg-white/92 p-7 shadow-[0_14px_36px_rgba(43,33,23,0.05)]">
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
              Example
            </p>
            <p className="mt-4 text-lg font-medium text-stone-900">
              {response.result.info.examplePeople || "暂无典型人物"}
            </p>
            <p className="mt-4 text-sm leading-7 text-stone-700">
              {response.result.info.simpleStory}
            </p>
          </article>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetQuiz}
            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition duration-200 hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-[0_10px_24px_rgba(28,25,23,0.18)] active:translate-y-0"
          >
            重新测试
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-500 hover:bg-white hover:text-stone-950 active:translate-y-0"
          >
            回到顶部
          </button>
        </div>
      </section>
    );
  }

  if (phase === "intro") {
    return (
      <section className="mx-auto grid max-w-4xl gap-5">
        <div className="rounded-[1.9rem] border border-stone-200/70 bg-white/94 p-8 shadow-[0_18px_60px_rgba(31,24,18,0.07)]">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
            Philosophy Tendency Test
          </p>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight text-stone-950 lg:text-5xl">
            用 24 道判断题，测出你在场域、本体、现象三条轴线上的哲学偏向。
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-stone-700">
            题目顺序随机。作答后可随时回到任意题号修改，全部完成后手动提交结果。
          </p>
        </div>

        <div className="rounded-[1.9rem] border border-stone-200/70 bg-white/94 p-8 shadow-[0_18px_60px_rgba(31,24,18,0.07)]">
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
    <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.44fr_1.56fr]">
      <aside className="grid gap-4 self-start lg:sticky lg:top-8">
        <div className="rounded-[1.7rem] border border-stone-200/70 bg-white/94 p-6 shadow-[0_18px_48px_rgba(31,24,18,0.06)]">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
            Progress
          </p>
          <p className="mt-4 text-4xl font-semibold text-stone-950">
            {answeredCount}
            <span className="text-lg text-stone-400"> / {questions.length}</span>
          </p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#c2410c)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            当前在第 {currentIndex + 1} 题。可以点击左侧题号回到任意题目修改答案。
          </p>
        </div>

        <div className="rounded-[1.7rem] border border-stone-200/70 bg-white/94 p-5 shadow-[0_18px_48px_rgba(31,24,18,0.06)]">
          <div className="grid grid-cols-4 gap-2">
            {questions.map((question, index) => {
              const answered = Boolean(answers[question.id]);
              const current = index === currentIndex;

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => jumpToQuestion(index)}
                  className={`rounded-2xl border px-0 py-3 text-sm font-medium transition duration-200 ${
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

      <div className="rounded-[1.95rem] border border-stone-200/70 bg-white/96 p-8 shadow-[0_18px_48px_rgba(31,24,18,0.06)]">
        <div className="min-h-[13rem]">
          <h2 className="font-serif text-3xl leading-tight text-stone-950 lg:text-4xl">
            {currentQuestion.question}
          </h2>
          <p className="mt-5 text-sm leading-7 text-stone-600">
            请选择你对这句话的认同程度。这里没有标准答案，只看你平时更自然的判断倾向。
          </p>
        </div>

        <div className="mt-8 grid gap-3">
          {AGREEMENT_OPTIONS.map((option) => {
            const selected = answers[currentQuestion.id] === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => recordAnswer(currentQuestion.id, option.value)}
                className={`rounded-[1.55rem] border px-5 py-4 text-left transition duration-200 ${
                  selected
                    ? `border-stone-900 bg-gradient-to-r ${optionToneMap[option.value]} scale-[1.01] shadow-[0_14px_34px_rgba(31,24,18,0.10)]`
                    : "border-stone-200 bg-stone-50/80 text-stone-700 hover:-translate-y-0.5 hover:border-stone-400 hover:bg-white hover:shadow-[0_12px_26px_rgba(31,24,18,0.06)] active:translate-y-0"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-medium">{option.label}</span>
                  <span className="text-sm opacity-70">
                    {(option.ratio * 100).toFixed(0)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={movePrevious}
            disabled={currentIndex === 0 || isSubmitting}
            className="rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-500 hover:bg-white hover:text-stone-950 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一题
          </button>
          <button
            type="button"
            onClick={submitQuiz}
            disabled={!allAnswered || isSubmitting}
            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition duration-200 hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-[0_10px_24px_rgba(28,25,23,0.18)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-100 disabled:shadow-none"
          >
            {isSubmitting ? "正在生成结果..." : "提交结果"}
          </button>
        </div>
      </div>
    </section>
  );
}
