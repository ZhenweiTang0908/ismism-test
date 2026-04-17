"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import type {
  AnswerMap,
  ChoiceValue,
  QuizResult,
  QuizResultAiInterpretation,
  QuizResultAiInterpretationResponse,
  QuizQuestion,
  IsmCatalogEntry,
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
  enhancedCatalog: Record<string, IsmCatalogEntry>;
};

const optionToneMap: Record<ChoiceValue, string> = {
  "1": "from-rose-100 to-pink-200 text-rose-900",
  "2": "from-amber-100 to-orange-200 text-amber-950",
  "3": "from-violet-100 to-purple-200 text-violet-900",
  "4": "from-teal-100 to-emerald-200 text-teal-950",
};

const optionIdleMap: Record<ChoiceValue, string> = {
  "1": "border-rose-200/60 bg-rose-50/40 text-stone-700 hover:border-rose-300 hover:bg-rose-50 hover:shadow-[0_12px_26px_rgba(225,29,72,0.06)]",
  "2": "border-amber-200/60 bg-amber-50/40 text-stone-700 hover:border-amber-300 hover:bg-amber-50 hover:shadow-[0_12px_26px_rgba(245,158,11,0.06)]",
  "3": "border-violet-200/60 bg-violet-50/40 text-stone-700 hover:border-violet-300 hover:bg-violet-50 hover:shadow-[0_12px_26px_rgba(139,92,246,0.06)]",
  "4": "border-teal-200/60 bg-teal-50/40 text-stone-700 hover:border-teal-300 hover:bg-teal-50 hover:shadow-[0_12px_26px_rgba(20,184,166,0.06)]",
};

const optionDotMap: Record<ChoiceValue, string> = {
  "1": "border-rose-400 bg-rose-400 text-white",
  "2": "border-amber-500 bg-amber-500 text-white",
  "3": "border-violet-500 bg-violet-500 text-white",
  "4": "border-teal-500 bg-teal-500 text-white",
};

const dimensionToneMap = {
  field: {
    badge: "border-amber-300 bg-amber-100 text-amber-800 font-semibold",
    panel:
      "border-amber-200 bg-[linear-gradient(145deg,rgba(255,247,205,0.95),rgba(255,255,255,0.9))]",
  },
  ontology: {
    badge: "border-teal-300 bg-teal-100 text-teal-800 font-semibold",
    panel:
      "border-teal-200 bg-[linear-gradient(145deg,rgba(204,251,241,0.95),rgba(255,255,255,0.9))]",
  },
  phenomenon: {
    badge: "border-violet-300 bg-violet-100 text-violet-800 font-semibold",
    panel:
      "border-violet-200 bg-[linear-gradient(145deg,rgba(237,233,254,0.95),rgba(255,255,255,0.9))]",
  },
} as const;

const conciseDimensionLabelMap = {
  field: "场域",
  ontology: "本体",
  phenomenon: "现象",
} as const;

const dimensionCaptionMap = {
  field: "世界怎样被组织",
  ontology: "什么算作关键存在",
  phenomenon: "现实如何向人显现",
} as const;

const splitExamplePeople = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/^([^，：:]+)[，：:]\s*(.+)$/);

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
    throw new Error(payload.error || "AI 解读生成失败，请稍后重试。");
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
    throw new Error(payload.error || "测试结果打开失败，请稍后重试。");
  }

  return payload;
};

export default function QuizExperience({ questions, enhancedCatalog }: QuizExperienceProps) {
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
  const [isOtherIsmsModalOpen, setIsOtherIsmsModalOpen] = useState(false);
  const [selectedOtherIsmCode, setSelectedOtherIsmCode] = useState<string>("1-1-1");
  const [isIsmDetailOpen, setIsIsmDetailOpen] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentQuestionNumber = currentIndex + 1;
  const answeredCount = Object.keys(answers).length;
  const remainingCount = questions.length - answeredCount;
  const progress = phase === "quiz" ? (answeredCount / questions.length) * 100 : 0;
  const allAnswered = answeredCount === questions.length;

  // 为每道题预先生成稳定的选项乱序（以题目 id 为种子，同一题回来顺序不变）
  const shuffledOptionsMap = useMemo(() => {
    const seededRandom = (seed: string) => {
      let h = 0;
      for (let i = 0; i < seed.length; i++) {
        h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
      }
      return () => {
        h ^= h << 13;
        h ^= h >> 17;
        h ^= h << 5;
        return ((h >>> 0) / 4294967296);
      };
    };

    const result: Record<string, QuizQuestion["options"][number][]> = {};
    for (const q of questions) {
      const rand = seededRandom(q.id);
      const shuffled = [...q.options].sort(() => rand() - 0.5);
      result[q.id] = shuffled;
    }
    return result;
  }, [questions]);

  const shuffledOptions = shuffledOptionsMap[currentQuestion?.id] ?? currentQuestion?.options ?? [];
  const examplePeopleDisplay = response?.result?.info.examplePeople
    ? splitExamplePeople(response.result.info.examplePeople)
    : { name: "暂无典型人物", description: "" };

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
          : "测试结果打开失败，请稍后重试。",
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
        throw new Error(payload.error || "生成结果失败，请稍后重试。");
      }

      startTransition(() => {
        setResponse(payload);
        setPhase("result");
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "生成结果失败，请稍后重试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const recordAnswer = (questionId: string, value: ChoiceValue) => {
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
          : "AI 解读生成失败，请稍后重试。",
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
              : "AI 解读生成失败，请稍后重试。",
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
      <>
        <section className="grid w-full gap-4 sm:gap-5">
        <article className="overflow-hidden rounded-[1.6rem] border border-stone-200/70 bg-[linear-gradient(135deg,rgba(255,252,248,0.98),rgba(255,247,237,0.92)_42%,rgba(240,253,250,0.88))] p-5 shadow-[0_24px_72px_rgba(31,24,18,0.08)] sm:rounded-[2rem] sm:p-7">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-stone-500">测试结果</p>
              <h2 className="mt-4 font-serif text-[clamp(3.8rem,10vw,6.8rem)] font-semibold leading-none tracking-[-0.05em] bg-[linear-gradient(135deg,#1c1917,#0f766e_45%,#7c3aed)] bg-clip-text text-transparent">
                {response.result.coreCode}
              </h2>
              <p className="mt-4 text-[1.85rem] font-semibold leading-tight text-stone-950 sm:text-[2.4rem]">
                {response.result.name}
              </p>
              {response.result.englishName ? (
                <p className="mt-2 text-sm uppercase tracking-[0.2em] text-stone-500">
                  {response.result.englishName}
                </p>
              ) : null}
              
              <div className="mt-8 text-sm text-stone-500">
                1=秩序 2=冲突 3=调和 4=虚无
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white/70 p-5 shadow-sm sm:w-[38rem] sm:p-6">
              <div className="mb-4 h-1 w-8 rounded-full bg-gradient-to-r from-amber-200 to-teal-300"></div>
              <h3 className="text-3xl font-bold text-stone-950 sm:text-[2.2rem]">{examplePeopleDisplay.name}</h3>
              {examplePeopleDisplay.description ? (
                <p className="mt-3 text-[15px] leading-relaxed text-stone-600 sm:text-base">
                  {examplePeopleDisplay.description}
                </p>
              ) : null}

              <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-4">
                {response.result.dimensionResults.map((item) => {
                  const cardColorMap = {
                    field: "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-100/60",
                    ontology: "border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-100/60",
                    phenomenon: "border-violet-200 bg-gradient-to-br from-violet-50 to-purple-100/60",
                  } as const;
                  const labelColorMap = {
                    field: "text-amber-800",
                    ontology: "text-teal-800",
                    phenomenon: "text-violet-800",
                  } as const;
                  const markerColorMap = {
                    field: "text-amber-900",
                    ontology: "text-teal-900",
                    phenomenon: "text-violet-900",
                  } as const;
                  return (
                    <div
                      key={item.key}
                      className={`rounded-[1rem] border p-4 shadow-sm ${cardColorMap[item.key]}`}
                    >
                      <p className={`text-[15px] font-semibold ${labelColorMap[item.key]}`}>
                        {item.key === "phenomenon" ? "认识" : conciseDimensionLabelMap[item.key]}
                      </p>
                      <p className="mt-1.5 text-[12px] text-stone-400">
                        {item.key === "field"
                          ? "世界是什么样"
                          : item.key === "ontology"
                            ? "事物怎么存在"
                            : "怎么认识世界"}
                      </p>
                      <p className={`mt-4 text-[16px] font-bold sm:text-[1.1rem] ${markerColorMap[item.key]}`}>
                        {item.marker}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.8rem] sm:p-7">
          <h3 className="font-serif text-2xl font-semibold text-stone-950">第一个数字</h3>
          <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
            第一个数字是场域，也是这套结果里最先看的因素。它回答的其实是：你默认觉得世界背景是什么样。很多后面的判断，都会先被这个底色影响。
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              {
                digit: 1,
                title: "实在论",
                desc: "如果第一个数字更接近 1，你通常会先把世界理解成一个本来就存在的现实背景。对象、环境、外部条件和既有秩序先于个人而存在，人需要先面对它、认识它，再决定怎么行动。",
              },
              {
                digit: 2,
                title: "形而上学",
                desc: "如果第一个数字更接近 2，你往往不会停在表面现象，而会追问更底层的原则、结构和本质。你会觉得世界不是一堆散乱事件，而是有一套更深的安排在支撑它。",
              },
              {
                digit: 3,
                title: "观念论",
                desc: "如果第一个数字更接近 3，你更容易把世界看成离不开主体视角、意义和解释的背景。对你来说，世界不是一块完全独立的冷背景，它总会通过人的理解、意识和立场被组织起来。",
              },
              {
                digit: 4,
                title: "唯物主义",
                desc: "如果第一个数字更接近 4，你更容易把世界理解成一个需要进入其中、在关系和实践里把握的现实场。你会更在意具体条件、行动过程以及现实是怎样被改变的，而不是只停在抽象原则上。",
              },
            ].map((item) => {
              const isSelected =
                item.digit ===
                response.result.dimensionResults.find((r) => r.key === "field")?.digit;
              return (
                <div
                  key={item.digit}
                  className={`rounded-[1.2rem] p-4 sm:p-5 ${
                    isSelected
                      ? "bg-stone-950 text-white shadow-[0_14px_34px_rgba(31,24,18,0.15)]"
                      : "border border-stone-200 bg-white text-stone-950"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                        isSelected ? "bg-stone-800 text-stone-300" : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {item.digit}
                    </span>
                    <span className="font-semibold text-base sm:text-lg">{item.title}</span>
                  </div>
                  <p
                    className={`mt-4 text-[13px] leading-6 sm:text-sm sm:leading-7 ${
                      isSelected ? "text-stone-300" : "text-stone-600"
                    }`}
                  >
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.8rem] sm:p-7">
          <h3 className="font-serif text-2xl font-semibold text-stone-950">一个例子</h3>
          <p className="mt-4 text-[15px] leading-8 text-stone-700">
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
            <div className="mt-5 grid gap-4">
              <article className="rounded-[1.2rem] border border-stone-200 bg-stone-50/70 p-4">
                <p className="text-base font-semibold text-stone-900">通俗解释</p>
                <div className="mt-2 text-[15px] leading-8 text-stone-700">
                  {aiInterpretation.simpleExplanation.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-2 last:mb-0">{paragraph}</p>
                  ))}
                </div>
              </article>

              <div className="grid gap-3 md:grid-cols-3">
                {aiInterpretation.dimensionInterpretations.map((item) => (
                  <article
                    key={item.key}
                    className={`rounded-[1.2rem] border p-4 ${dimensionToneMap[item.key].panel}`}
                  >
                    <p className="text-sm text-stone-500">{dimensionCaptionMap[item.key]}</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-stone-900">{item.label} ({item.digit})</span>
                      <span className="text-sm font-medium text-stone-700">{item.title}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-stone-700">{item.explanation}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {!aiInterpretation && isGeneratingAiInterpretation ? (
            <div className="mt-5 rounded-[1.2rem] border border-stone-200 bg-stone-50/70 p-4 text-sm leading-7 text-stone-600">
              AI 正在生成可读版解释，请稍候。
            </div>
          ) : null}

          {!aiInterpretation && aiError ? (
            <div className="mt-5 rounded-[1.2rem] border border-red-200 bg-red-50/80 p-4">
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
          <button
            type="button"
            onClick={() => setIsOtherIsmsModalOpen(true)}
            className="w-full rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900 active:translate-y-0 sm:w-auto"
          >
            查看其他主义
          </button>
        </div>

        <div className="mt-2 rounded-[1.4rem] border border-stone-200/60 bg-stone-50/60 px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">参考信息</p>
          <ul className="grid gap-1.5">
            <li className="flex items-start gap-2 text-[13px] text-stone-600">
              <span className="mt-0.5 shrink-0 text-stone-400">▸</span>
              <span>
                原作者讲解：
                <a
                  href="https://www.bilibili.com/video/BV1JT4y1K7dp/?spm_id_from=333.337.search-card.all.click"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-700 underline-offset-2 transition hover:text-teal-900 hover:underline"
                >
                  【主义主义】哲学意识形态大全-总纲
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2 text-[13px] text-stone-600">
              <span className="mt-0.5 shrink-0 text-stone-400">▸</span>
              <span>
                主义主义魔方：
                <a
                  href="https://ismismtag.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-700 underline-offset-2 transition hover:text-teal-900 hover:underline"
                >
                  ismismtag.com
                </a>
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* 列表弹窗 */}
      {isOtherIsmsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-stone-900/60 p-4 backdrop-blur-md sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOtherIsmsModalOpen(false); }}
        >
          <div
            className="mt-4 w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-[0_24px_72px_rgba(0,0,0,0.22)] sm:mt-8"
            style={{ maxHeight: "calc(100vh - 4rem)" }}
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-7 sm:py-5">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900">全部主义列表</h3>
                <p className="mt-0.5 text-xs text-stone-400">
                  {Object.keys(enhancedCatalog).filter((k) => /^[1-4]-[1-4]-[1-4]$/.test(k)).length} 个主义，点击查看了解详情
                </p>
              </div>
              <button
                onClick={() => setIsOtherIsmsModalOpen(false)}
                className="rounded-full bg-stone-100 p-2 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 10rem)" }}>
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur-sm">
                  <tr className="border-b border-stone-100">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400 sm:px-6">代码</th>
                    <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">主义名称</th>
                    <th className="hidden px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400 sm:table-cell">代表人物</th>
                    <th className="px-4 py-3 sm:px-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {Object.entries(enhancedCatalog)
                    .filter(([key]) => /^[1-4]-[1-4]-[1-4]$/.test(key))
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, entry], idx) => {
                      const digits = key.split("-");
                      const dotColors = ["bg-amber-400", "bg-teal-400", "bg-violet-400"];
                      return (
                        <tr
                          key={key}
                          className={`transition-colors hover:bg-teal-50/40 ${
                            idx % 2 === 0 ? "bg-white" : "bg-stone-50/30"
                          }`}
                        >
                          <td className="px-4 py-3 sm:px-6">
                            <div className="flex items-center gap-1">
                              {digits.map((d, i) => (
                                <span
                                  key={i}
                                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${dotColors[i]}`}
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <span className="text-sm font-semibold text-stone-900">
                              {entry.ch_name || "未命名"}
                            </span>
                          </td>
                          <td className="hidden px-2 py-3 sm:table-cell">
                            <span className="text-sm text-stone-500">
                              {entry.example_people
                                ? entry.example_people.split(/[，,]/)[0]?.trim()
                                : "—"}
                            </span>
                          </td>
                          <td className="w-px px-4 py-3 text-right sm:px-6">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOtherIsmCode(key);
                                setIsIsmDetailOpen(true);
                              }}
                              className="whitespace-nowrap rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-100 hover:text-teal-900"
                            >
                              查看
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {isIsmDetailOpen && selectedOtherIsmCode && enhancedCatalog[selectedOtherIsmCode] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/70 p-4 backdrop-blur-md sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setIsIsmDetailOpen(false); }}
        >
          <div
            className="w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-[0_24px_72px_rgba(0,0,0,0.25)] sm:rounded-[2rem]"
            style={{ maxHeight: "calc(100vh - 2rem)" }}
          >
            <div className="flex items-start justify-between border-b border-stone-100 p-5 sm:p-7">
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  {selectedOtherIsmCode.split("-").map((d, i) => {
                    const colors = ["bg-amber-400", "bg-teal-400", "bg-violet-400"];
                    return (
                      <span key={i} className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white ${colors[i]}`}>
                        {d}
                      </span>
                    );
                  })}
                </div>
                <h4 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
                  {enhancedCatalog[selectedOtherIsmCode].ch_name}
                </h4>
                {enhancedCatalog[selectedOtherIsmCode].example_people && (
                  <p className="mt-1.5 text-sm text-stone-500">
                    代表人物：{enhancedCatalog[selectedOtherIsmCode].example_people}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-3">
                <button
                  onClick={() => setIsIsmDetailOpen(false)}
                  className="rounded-full bg-stone-100 p-2 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
                  title="返回列表"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => { setIsIsmDetailOpen(false); setIsOtherIsmsModalOpen(false); }}
                  className="rounded-full bg-stone-100 p-2 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700"
                  title="关闭"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:p-7">
              {enhancedCatalog[selectedOtherIsmCode].simple_story ? (
                <div className="rounded-[1.3rem] border border-teal-200/60 bg-[linear-gradient(145deg,rgba(204,251,241,0.35),rgba(255,255,255,0.9))] p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </span>
                    <h5 className="text-sm font-semibold text-teal-800">一个例子</h5>
                  </div>
                  <p className="text-[14px] leading-7 text-stone-600">
                    {enhancedCatalog[selectedOtherIsmCode].simple_story}
                  </p>
                </div>
              ) : (
                <div className="rounded-[1.3rem] border border-stone-100 bg-stone-50 p-5">
                  <p className="text-sm text-stone-400">暂无具体例子。</p>
                </div>
              )}

              {(enhancedCatalog[selectedOtherIsmCode].feature_list || []).length > 0 && (
                <div className="rounded-[1.3rem] border border-stone-100 bg-[linear-gradient(135deg,rgba(255,252,248,0.98),rgba(240,253,250,0.7))] p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-stone-50">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <h5 className="text-sm font-semibold text-stone-800">核心特征</h5>
                  </div>
                  <div className="grid gap-2">
                    {(enhancedCatalog[selectedOtherIsmCode].feature_list || []).map((feature, idx) => (
                      <div key={idx} className="flex gap-3 rounded-xl bg-white/70 p-3 shadow-sm">
                        <span className="mt-2 flex h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                        <span className="text-[14px] leading-7 text-stone-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  if (phase === "intro") {
    return (
      <section className="mx-auto grid w-full max-w-5xl gap-4 sm:gap-5">
        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[1.6rem] border border-stone-200/70 bg-[linear-gradient(145deg,rgba(15,118,110,0.08),rgba(255,255,255,0.96)_28%,rgba(255,247,237,0.88))] p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.9rem] sm:p-8">
            <h3 className="font-serif text-2xl font-semibold text-stone-950 sm:text-3xl">
              开始测试
            </h3>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              昵称和留言都可留空，直接开始即可。
            </p>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm text-stone-500">昵称（可选）</span>
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
                  placeholder="可留一句想法"
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
              开始答题
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-stone-200/70 bg-white/94 p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.9rem] sm:p-8">
            <h3 className="font-serif text-2xl font-semibold text-stone-950 sm:text-3xl">
              这个测试在测什么
            </h3>
            <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
              这是一个庸俗的哲学意识形态分类框架，会从场域、本体和现象三个维度评估你的意识形态倾向。
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-[1rem] border border-amber-300/70 bg-gradient-to-br from-amber-50 to-yellow-100/70 p-4 sm:p-5">
                <div className="font-semibold text-amber-900">场域</div>
                <div className="mt-2 text-[13px] text-amber-700 sm:mt-3 sm:text-sm">世界是什么样</div>
              </div>
              <div className="rounded-[1rem] border border-teal-300/70 bg-gradient-to-br from-teal-50 to-emerald-100/70 p-4 sm:p-5">
                <div className="font-semibold text-teal-900">本体</div>
                <div className="mt-2 text-[13px] text-teal-700 sm:mt-3 sm:text-sm">自我如何存在</div>
              </div>
              <div className="rounded-[1rem] border border-violet-300/70 bg-gradient-to-br from-violet-50 to-purple-100/70 p-4 sm:p-5">
                <div className="font-semibold text-violet-900">现象</div>
                <div className="mt-2 text-[13px] text-violet-700 sm:mt-3 sm:text-sm">如何认识世界</div>
              </div>
            </div>

            <p className="mt-6 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
              每个维度会填入一个 1-4 的数字，代表你在这个维度上的倾向。最后会根据这三个数字进行分析。
            </p>

            <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-[1rem] border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-100/60 p-3 sm:p-5">
                <div className="font-serif text-3xl text-rose-700 sm:text-4xl">1</div>
                <div className="mt-3 font-semibold text-stone-900 sm:mt-4">秩序</div>
                <div className="mt-1 text-[12px] text-stone-500 sm:mt-2 sm:text-sm">规则先在</div>
              </div>
              <div className="rounded-[1rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-100/60 p-3 sm:p-5">
                <div className="font-serif text-3xl text-amber-700 sm:text-4xl">2</div>
                <div className="mt-3 font-semibold text-stone-900 sm:mt-4">冲突</div>
                <div className="mt-1 text-[12px] text-stone-500 sm:mt-2 sm:text-sm">结构张力</div>
              </div>
              <div className="rounded-[1rem] border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-100/60 p-3 sm:p-5">
                <div className="font-serif text-3xl text-violet-700 sm:text-4xl">3</div>
                <div className="mt-3 font-semibold text-stone-900 sm:mt-4">调和</div>
                <div className="mt-1 text-[12px] text-stone-500 sm:mt-2 sm:text-sm">主体参与</div>
              </div>
              <div className="rounded-[1rem] border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-100/60 p-3 sm:p-5">
                <div className="font-serif text-3xl text-teal-700 sm:text-4xl">4</div>
                <div className="mt-3 font-semibold text-stone-900 sm:mt-4">虚无</div>
                <div className="mt-1 text-[12px] text-stone-500 sm:mt-2 sm:text-sm">生成变化</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-stone-200/60 bg-stone-50/60 px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">参考信息</p>
          <ul className="grid gap-1.5">
            <li className="flex items-start gap-2 text-[13px] text-stone-600">
              <span className="mt-0.5 shrink-0 text-stone-400">▸</span>
              <span>
                原作者讲解：
                <a
                  href="https://www.bilibili.com/video/BV1JT4y1K7dp/?spm_id_from=333.337.search-card.all.click"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-700 underline-offset-2 transition hover:text-teal-900 hover:underline"
                >
                  【主义主义】哲学意识形态大全-总纲
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2 text-[13px] text-stone-600">
              <span className="mt-0.5 shrink-0 text-stone-400">▸</span>
              <span>
                主义主义魔方：
                <a
                  href="https://ismismtag.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-700 underline-offset-2 transition hover:text-teal-900 hover:underline"
                >
                  ismismtag.com
                </a>
              </span>
            </li>
          </ul>
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

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-100/80 sm:mt-5">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#14b8a6_40%,#8b5cf6_75%,#f43f5e)]"
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

        <div>
          <h2 className="mt-5 text-balance font-serif text-2xl leading-tight text-stone-950 sm:text-3xl lg:text-[2.55rem]">
            {currentQuestion.question}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:mt-5 sm:text-base">
            请选择最贴近你真实想法的选项。这里没有标准答案，只看你平时更自然的判断倾向。
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:mt-8">
          {shuffledOptions.map((option) => {
            const selected = answers[currentQuestion.id] === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => recordAnswer(currentQuestion.id, option.value)}
                className={`rounded-[1.35rem] border px-4 py-4 text-left transition duration-200 active:translate-y-0 sm:rounded-[1.65rem] sm:px-5 sm:py-[1.125rem] ${
                  selected
                    ? "border-teal-400 bg-gradient-to-r from-teal-100 to-emerald-200 text-teal-950 scale-[1.01] shadow-[0_14px_34px_rgba(15,118,110,0.18)]"
                    : `hover:-translate-y-0.5 ${optionIdleMap[option.value]}`
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                      selected
                        ? "border-teal-600 bg-teal-600 text-white"
                        : "border-stone-300 bg-white text-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    ✓
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
