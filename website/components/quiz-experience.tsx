"use client";

import { startTransition, useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Typewriter } from "./typewriter";
import { getLocaleCopy } from "@/lib/i18n";

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

type Phase = "intro" | "quiz" | "profile" | "result";

type QuizExperienceProps = {
  questions: QuizQuestion[];
  enhancedCatalog: Record<string, IsmCatalogEntry>;
  lang?: string;
};

type BatterySnapshot = {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
};

type NetworkSnapshot = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

type NavigatorWithExtras = Navigator & {
  getBattery?: () => Promise<BatterySnapshot>;
  connection?: NetworkSnapshot;
  deviceMemory?: number;
};

const optionIdleMap: Record<ChoiceValue, string> = {
  "1": "border-rose-200/60 bg-rose-50/40 text-stone-700 hover:border-rose-300 hover:bg-rose-50 hover:shadow-[0_12px_26px_rgba(225,29,72,0.06)]",
  "2": "border-amber-200/60 bg-amber-50/40 text-stone-700 hover:border-amber-300 hover:bg-amber-50 hover:shadow-[0_12px_26px_rgba(245,158,11,0.06)]",
  "3": "border-violet-200/60 bg-violet-50/40 text-stone-700 hover:border-violet-300 hover:bg-violet-50 hover:shadow-[0_12px_26px_rgba(139,92,246,0.06)]",
  "4": "border-teal-200/60 bg-teal-50/40 text-stone-700 hover:border-teal-300 hover:bg-teal-50 hover:shadow-[0_12px_26px_rgba(20,184,166,0.06)]",
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

const splitExamplePeople = (value: string, fallbackName: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/^([^，：:]+)[，：:]\s*(.+)$/);

  if (!match) {
    return {
      name: trimmed || fallbackName,
      description: "",
    };
  }

  return {
    name: match[1]?.trim() ?? trimmed,
    description: match[2]?.trim() ?? "",
  };
};

const requestAiInterpretation = async (result: QuizResult, lang?: string) => {
  const response = await fetch("/api/quiz/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ result, lang }),
  });

  const payload = (await response.json()) as Partial<QuizResultAiInterpretationResponse> & {
    error?: string;
  };

  if (!response.ok || !payload.interpretation) {
    throw new Error(payload.error || getLocaleCopy(lang).errors.ai);
  }

  return payload.interpretation;
};

const requestPreviewResult = async (accessKey: string, coreCode: string, lang?: string) => {
  const response = await fetch("/api/quiz/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessKey, coreCode, lang }),
  });

  const payload = (await response.json()) as SubmitQuizResponse & {
    error?: string;
  };

  if (!response.ok || !payload.result) {
    throw new Error(payload.error || getLocaleCopy(lang).errors.preview);
  }

  return payload;
};

export default function QuizExperience({ questions, enhancedCatalog, lang }: QuizExperienceProps) {
  const copy = getLocaleCopy(lang);
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
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [startTime] = useState(Date.now());

  // ---------- 额外的用户信息采集（无需授权） ----------
  const [clickCount, setClickCount] = useState(0);
  const [keyPressCount, setKeyPressCount] = useState(0);
  const maxScrollRef = useRef(0);
  const [visibilityTime, setVisibilityTime] = useState(0);
  const visibilityStartRef = useRef<number | null>(null);
  const [batteryInfo, setBatteryInfo] = useState<BatterySnapshot | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkSnapshot | null>(null);
  const [performanceInfo, setPerformanceInfo] = useState<Record<string, number> | null>(null);
  const [fingerprint, setFingerprint] = useState<string>("");

  // 收集点击、键盘、滚动、可见性、性能等信息
  useEffect(() => {
    const handleClick = () => setClickCount((c) => c + 1);
    const handleKey = () => setKeyPressCount((c) => c + 1);
    const handleScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      if (y > maxScrollRef.current) maxScrollRef.current = y;
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        visibilityStartRef.current = Date.now();
      } else if (visibilityStartRef.current !== null) {
        setVisibilityTime((t) => t + (Date.now() - visibilityStartRef.current!));
        visibilityStartRef.current = null;
      }
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll);
    document.addEventListener("visibilitychange", handleVisibility);
    // 初始可见性计时
    if (document.visibilityState === "visible") visibilityStartRef.current = Date.now();

    // 收集电池信息（如果支持）
    const navigatorWithExtras = navigator as NavigatorWithExtras;
    if (navigatorWithExtras.getBattery) {
      navigatorWithExtras.getBattery().then((bat) => setBatteryInfo({
        charging: bat.charging,
        level: bat.level,
        chargingTime: bat.chargingTime,
        dischargingTime: bat.dischargingTime,
      }));
    }
    // 网络信息
    if (navigatorWithExtras.connection) {
      const conn = navigatorWithExtras.connection;
      setNetworkInfo({
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData,
      });
    }
    // 性能时间戳（简化版）
    if (window.performance && window.performance.timing) {
      const t = window.performance.timing;
      setPerformanceInfo({
        navigationStart: t.navigationStart,
        fetchStart: t.fetchStart,
        domContentLoadedEventEnd: t.domContentLoadedEventEnd,
        loadEventEnd: t.loadEventEnd,
      });
    }
    // 简易指纹（canvas）
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("ismism", 2, 15);
        const dataURL = canvas.toDataURL();
        setFingerprint(dataURL);
      }
    } catch {
      // ignore
    }

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const currentQuestion = questions[currentIndex];
  const currentQuestionNumber = currentIndex + 1;
  const answeredCount = Object.values(answers).filter((choices) => choices.length > 0).length;
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
    ? splitExamplePeople(response.result.info.examplePeople, copy.catalog.noRepresentative)
    : { name: copy.catalog.noRepresentative, description: "" };

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

  const openProfileStep = () => {
    if (!allAnswered) {
      setError(copy.errors.incomplete);
      return;
    }

    setError("");
    setPhase("profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const jumpToQuestion = (index: number) => {
    if (isSubmitting) {
      return;
    }

    setError("");
    setCurrentIndex(index);
  };

  const openPreviewResult = async () => {
    const accessKey = window.prompt(lang === "en" ? "Enter the preview access key" : "请输入测试密钥");
    if (accessKey === null) {
      return;
    }

    const coreCode = window.prompt(lang === "en" ? "Enter a result code, such as 1-1-1" : "请输入结果代码，例如 1-1-1");
    if (coreCode === null) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const payload = await requestPreviewResult(accessKey, coreCode, lang);

      startTransition(() => {
        setResponse(payload);
        setPhase("result");
      });
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : copy.errors.preview,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitQuiz = async () => {
    if (!allAnswered) {
      setError(copy.errors.incomplete);
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
          lang,
          clientData: {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            timeSpentMs: Date.now() - startTime,
            language: navigator.language,
            platform: navigator.platform,
            timezoneOffset: new Date().getTimezoneOffset(),
            colorDepth: window.screen.colorDepth,
            deviceMemory: (navigator as NavigatorWithExtras).deviceMemory,
            hardwareConcurrency: navigator.hardwareConcurrency,
            touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            // 额外信息
            clickCount,
            keyPressCount,
            maxScrollDepth: maxScrollRef.current,
            visibilityTimeMs: visibilityTime,
            batteryInfo,
            networkInfo,
            performanceInfo,
            fingerprint,
            languages: navigator.languages,
            cookies: typeof document !== 'undefined' ? document.cookie : undefined,
          }
        }),
      });

      const payload = (await submission.json()) as SubmitQuizResponse & {
        error?: string;
      };

      if (!submission.ok || !payload.result) {
        throw new Error(payload.error || copy.errors.submit);
      }

      startTransition(() => {
        setResponse(payload);
        setPhase("result");
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : copy.errors.submit,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const recordAnswer = (questionId: string, value: ChoiceValue) => {
    if (isSubmitting) {
      return;
    }

    const currentChoices = answers[questionId] || [];
    let nextChoices: ChoiceValue[];

    if (currentChoices.includes(value)) {
      // 如果已选中，则取消选择
      nextChoices = currentChoices.filter((v) => v !== value);
    } else if (currentChoices.length < 2) {
      // 如果未选中且少于2个，则添加选择
      nextChoices = [...currentChoices, value];
    } else {
      // 已选满2个，替换第一个（保持最多选2个）
      nextChoices = [currentChoices[1], value];
    }

    const nextAnswers = {
      ...answers,
      [questionId]: nextChoices,
    };

    setAnswers(nextAnswers);
    setError("");

    if (currentIndex < questions.length - 1 && nextChoices.length === 2) {
      // 选满2个后自动跳转到下一题
      window.setTimeout(() => {
        setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
      }, 120);
    }
  };

  const downloadShareCard = async () => {
    if (!response?.result) return;
    setIsSharing(true);
    setShareError("");
    try {
      const r = response.result;
      const dims = Object.fromEntries(
        r.dimensionResults.map((d) => [d.key, d])
      );
      const params = new URLSearchParams({
        code: r.coreCode,
        name: r.name,
        ...(r.englishName ? { en: r.englishName } : {}),
        ep: examplePeopleDisplay.name,
        story: r.info.simpleStory || "",
        ...(aiInterpretation?.simpleExplanation ? { ai: aiInterpretation.simpleExplanation } : {}),
        uname: profile.name || "",
        rate: String(r.matchRate),
        fd: String(dims.field?.digit ?? ""),
        fm: dims.field?.marker ?? "",
        od: String(dims.ontology?.digit ?? ""),
        om: dims.ontology?.marker ?? "",
        pd: String(dims.phenomenon?.digit ?? ""),
        pm: dims.phenomenon?.marker ?? "",
      });
      const url = `/api/share-card?${params.toString()}`;

      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error(lang === "en" ? "The result image could not be generated." : "图片生成失败");
      const blob = await imgRes.blob();
      const fileName = `ismism-${r.coreCode}.png`;

      // 移动端优先用 Web Share API
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare?.({ files: [new File([blob], fileName, { type: "image/png" })] })
      ) {
        await navigator.share({
          files: [new File([blob], fileName, { type: "image/png" })],
          title: lang === "en"
            ? `My philosophical tendency: ${r.coreCode} ${r.name}`
            : `我的哲学倾向：${r.coreCode} ${r.name}`,
        });
      } else {
        // 桌面端：直接下载
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(objectUrl);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setShareError(lang === "en" ? "The result image could not be saved. Please try again." : "图片保存失败，请重试。");
      }
    } finally {
      setIsSharing(false);
    }
  };

  const retryAiInterpretation = async () => {
    if (!response?.result) {
      return;
    }

    setAiError("");
    setIsGeneratingAiInterpretation(true);

    try {
      const interpretation = await requestAiInterpretation(response.result, lang);
      setAiInterpretation(interpretation);
    } catch (interpretationError) {
      setAiError(
        interpretationError instanceof Error
          ? interpretationError.message
          : copy.errors.ai,
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
        const interpretation = await requestAiInterpretation(response.result, lang);
        if (!cancelled) {
          setAiInterpretation(interpretation);
        }
      } catch (interpretationError) {
        if (!cancelled) {
          setAiError(
            interpretationError instanceof Error
              ? interpretationError.message
              : copy.errors.ai,
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
  }, [copy.errors.ai, lang, phase, response?.result]);

  if (phase === "result" && response) {
    const fieldDigit = response.result.dimensionResults.find((r) => r.key === "field")?.digit;
    const getTendencyGradient = (digit?: number) => {
      switch (digit) {
        case 1: return "from-rose-100/60 via-white/70 to-pink-100/60";
        case 2: return "from-amber-100/60 via-white/70 to-orange-100/60";
        case 3: return "from-violet-100/60 via-white/70 to-purple-100/60";
        case 4: return "from-teal-100/60 via-white/70 to-emerald-100/60";
        default: return "from-stone-100/60 via-white/70 to-stone-100/60";
      }
    };
    const bgGradient = getTendencyGradient(fieldDigit);

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <section className="grid w-full gap-4 sm:gap-5">
        <article className={`overflow-hidden rounded-[1.6rem] border border-white/50 bg-gradient-to-br ${bgGradient} backdrop-blur-2xl p-5 shadow-[0_24px_72px_rgba(31,24,18,0.08)] sm:rounded-[2rem] sm:p-7`}>
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-stone-500">{copy.result.label}</p>
              <div className="mt-4 flex items-baseline gap-6">
                <h2 className="font-serif text-[clamp(3.8rem,10vw,6.8rem)] font-semibold leading-none tracking-[-0.05em] bg-[linear-gradient(135deg,#1c1917,#0f766e_45%,#7c3aed)] bg-clip-text text-transparent">
                  {response.result.coreCode}
                </h2>
                <div className="flex flex-col border-l border-stone-200 pl-6">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">{copy.result.matchRate}</span>
                  <span className="mt-1 font-serif text-3xl font-bold text-stone-800">
                    {response.result.matchRate}<span className="text-lg ml-0.5 text-stone-400">%</span>
                  </span>
                </div>
              </div>
              <p className="mt-4 text-[1.85rem] font-semibold leading-tight text-stone-950 sm:text-[2.4rem]">
                {response.result.name}
              </p>
              {response.result.englishName ? (
                <p className="mt-2 text-sm uppercase tracking-[0.2em] text-stone-500">
                  {response.result.englishName}
                </p>
              ) : null}
              
              <div className="mt-8 text-sm text-stone-500">
                {copy.result.scoreLegend}
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
                        {copy.dimensions[item.key]}
                      </p>
                      <p className="mt-1.5 text-[12px] text-stone-400">
                        {item.key === "field"
                          ? copy.dimensionCaptions.field
                          : item.key === "ontology"
                            ? copy.dimensionCaptions.ontology
                            : copy.dimensionCaptions.phenomenon}
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
          <h3 className="font-serif text-2xl font-semibold text-stone-950">{copy.result.firstDimension}</h3>
          <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
            {copy.result.firstDimensionDescription}
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
            {copy.result.firstDimensionOptions.map((item, index) => {
              const digit = (index + 1) as 1 | 2 | 3 | 4;
              const isSelected =
                digit ===
                response.result.dimensionResults.find((r) => r.key === "field")?.digit;
              return (
                <div
                  key={digit}
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
                      {digit}
                    </span>
                    <span className="font-semibold text-base sm:text-lg">{item.title}</span>
                  </div>
                  <p
                    className={`mt-4 text-[13px] leading-6 sm:text-sm sm:leading-7 ${
                      isSelected ? "text-stone-300" : "text-stone-600"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.8rem] sm:p-7">
          <h3 className="font-serif text-2xl font-semibold text-stone-950">{copy.result.example}</h3>
          <p className="mt-4 text-[15px] leading-8 text-stone-700">
            {response.result.info.simpleStory}
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(43,33,23,0.05)] sm:rounded-[1.8rem] sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-serif text-2xl font-semibold text-stone-950">{copy.result.aiInterpretation}</h3>
            {isGeneratingAiInterpretation ? (
              <span className="text-sm text-stone-500">{copy.result.generating}</span>
            ) : null}
          </div>

          {aiInterpretation ? (
            <div className="mt-5 grid gap-4">
              <article className="rounded-[1.2rem] border border-stone-200 bg-stone-50/70 p-4">
                <p className="text-base font-semibold text-stone-900">{copy.result.simpleExplanation}</p>
                <div className="mt-2 text-[15px] leading-8 text-stone-700">
                  {aiInterpretation.simpleExplanation.split('\n').map((paragraph, index) => (
                    <div key={index} className="mb-2 last:mb-0">
                      <Typewriter text={paragraph} delay={index * 0.8} speed={0.03} />
                    </div>
                  ))}
                </div>
              </article>

              <div className="grid gap-3 md:grid-cols-3">
                {aiInterpretation.dimensionInterpretations.map((item, index) => (
                  <article
                    key={item.key}
                    className={`rounded-[1.4rem] border p-6 shadow-sm ${dimensionToneMap[item.key].panel}`}
                  >
                    <p className="text-2xl font-bold text-stone-900 mb-2">
                      {item.label}: {copy.dimensionCaptions[item.key]}
                    </p>
                    <div className="mb-4">
                      <span className="text-xl font-semibold text-stone-700">
                        {item.marker || copy.result.analyzing}
                      </span>
                    </div>
                    <div className="text-[15px] leading-8 text-stone-700 min-h-[4rem]">
                      <Typewriter text={item.explanation} delay={2.5 + index * 1.5} speed={0.03} />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {!aiInterpretation && isGeneratingAiInterpretation ? (
            <div className="mt-5 rounded-[1.2rem] border border-stone-200 bg-stone-50/70 p-4 text-sm leading-7 text-stone-600">
              {copy.result.aiWaiting}
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
                {copy.result.retryAi}
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
            {copy.result.retake}
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-full rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-500 hover:bg-white hover:text-stone-950 active:translate-y-0 sm:w-auto"
          >
            {copy.result.backToTop}
          </button>
          <button
            type="button"
            onClick={() => setIsOtherIsmsModalOpen(true)}
            className="w-full rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900 active:translate-y-0 sm:w-auto"
          >
            {copy.intro.otherIsms}
          </button>
          <button
            type="button"
            onClick={downloadShareCard}
            disabled={isSharing}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-teal-300 bg-gradient-to-r from-teal-50 to-emerald-50 px-5 py-3 text-sm font-medium text-teal-800 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-400 hover:from-teal-100 hover:to-emerald-100 hover:shadow-[0_10px_24px_rgba(15,118,110,0.14)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSharing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {copy.result.savingCard}
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {copy.result.saveCard}
              </>
            )}
          </button>
        </div>
        {shareError ? (
          <p className="text-sm text-red-600">{shareError}</p>
        ) : null}

        <div className="mt-2 rounded-[1.4rem] border border-amber-200/70 bg-amber-50/60 px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-600">{copy.intro.declaration}</p>
          <p className="text-[13px] leading-6 text-stone-600">
            {copy.intro.declarationBody}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-stone-600">{copy.intro.declarationInvite}</p>
        </div>

        <div className="rounded-[1.4rem] border border-stone-200/60 bg-stone-50/60 px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{copy.intro.references}</p>
          <ul className="grid gap-1.5">
            <li className="flex items-start gap-2 text-[13px] text-stone-600">
              <span className="mt-0.5 shrink-0 text-stone-400">▸</span>
              <span>
                {copy.intro.originalAuthor}
                <a
                  href="https://www.bilibili.com/video/BV1JT4y1K7dp/?spm_id_from=333.337.search-card.all.click"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-700 underline-offset-2 transition hover:text-teal-900 hover:underline"
                >
                  {copy.intro.originalVideo}
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2 text-[13px] text-stone-600">
              <span className="mt-0.5 shrink-0 text-stone-400">▸</span>
              <span>
                {copy.intro.ismismCube}
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
                <h3 className="font-serif text-xl font-bold text-stone-900">{copy.catalog.listTitle}</h3>
                <p className="mt-0.5 text-xs text-stone-400">
                  {copy.catalog.listDescription(Object.keys(enhancedCatalog).filter((k) => /^[1-4]-[1-4]-[1-4]$/.test(k)).length)}
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
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400 sm:px-6">{copy.catalog.code}</th>
                    <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">{copy.catalog.name}</th>
                    <th className="hidden px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400 sm:table-cell">{copy.catalog.representative}</th>
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
                              {entry.ch_name || copy.catalog.unnamed}
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
                              {copy.catalog.view}
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
                    {copy.catalog.representativePrefix}{enhancedCatalog[selectedOtherIsmCode].example_people}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-3">
                <button
                  onClick={() => setIsIsmDetailOpen(false)}
                  className="rounded-full bg-stone-100 p-2 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
                  title={copy.catalog.backToList}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => { setIsIsmDetailOpen(false); setIsOtherIsmsModalOpen(false); }}
                  className="rounded-full bg-stone-100 p-2 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700"
                  title={copy.catalog.close}
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
                    <h5 className="text-sm font-semibold text-teal-800">{copy.catalog.example}</h5>
                  </div>
                  <p className="text-[14px] leading-7 text-stone-600">
                    {enhancedCatalog[selectedOtherIsmCode].simple_story}
                  </p>
                </div>
              ) : (
                <div className="rounded-[1.3rem] border border-stone-100 bg-stone-50 p-5">
                    <p className="text-sm text-stone-400">{copy.catalog.noExample}</p>
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
                    <h5 className="text-sm font-semibold text-stone-800">{copy.catalog.coreFeatures}</h5>
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
      </motion.div>
    );
  }

  if (phase === "profile") {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto grid w-full max-w-xl gap-4 sm:gap-5"
      >
        <div className="rounded-[1.7rem] border border-stone-200/70 bg-[linear-gradient(145deg,rgba(240,253,250,0.94),rgba(255,255,255,0.98)_52%,rgba(255,247,237,0.9))] p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[2rem] sm:p-8">
          <div className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            {answeredCount} / {questions.length}
          </div>
          <h2 className="mt-4 font-serif text-3xl font-semibold text-stone-950 sm:text-4xl">
            {copy.profile.title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-700 sm:text-base">
            {copy.profile.description}
          </p>

          <div className="mt-7 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-600">{copy.profile.nickname}</span>
              <input
                value={profile.name}
                onChange={(event) => updateName(event.target.value)}
                maxLength={120}
                className="rounded-2xl border border-stone-200 bg-white/90 px-4 py-3 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100/70"
                placeholder={copy.profile.nicknamePlaceholder}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-600">{copy.profile.message}</span>
              <textarea
                value={profile.message}
                onChange={(event) => updateMessage(event.target.value)}
                maxLength={2000}
                rows={5}
                className="resize-y rounded-2xl border border-stone-200 bg-white/90 px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100/70"
                placeholder={copy.profile.messagePlaceholder}
              />
            </label>
          </div>

          {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setError("");
                setPhase("quiz");
              }}
              disabled={isSubmitting}
              className="w-full rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-500 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {copy.profile.back}
            </button>
            <button
              type="button"
              onClick={submitQuiz}
              disabled={isSubmitting}
              className="w-full rounded-full bg-stone-950 px-6 py-3 text-sm font-medium text-stone-50 transition duration-200 hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-[0_10px_24px_rgba(28,25,23,0.18)] disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto"
            >
              {isSubmitting ? copy.quiz.submitting : copy.quiz.submit}
            </button>
          </div>
        </div>
      </motion.section>
    );
  }

  if (phase === "intro") {
    return (
      <section className="mx-auto grid w-full max-w-5xl gap-4 sm:gap-5">
        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[1.6rem] border border-stone-200/70 bg-[linear-gradient(145deg,rgba(15,118,110,0.08),rgba(255,255,255,0.96)_28%,rgba(255,247,237,0.88))] p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.9rem] sm:p-8">
            <h3 className="font-serif text-2xl font-semibold text-stone-950 sm:text-3xl">
              {copy.intro.start}
            </h3>
            <p className="mt-3 text-sm leading-7 text-stone-800">
              {copy.intro.maxChoices}
            </p>

            <button
              type="button"
              onClick={() => {
                setError("");
                setPhase("quiz");
              }}
              disabled={isSubmitting}
              className="mt-6 w-full rounded-full bg-[linear-gradient(90deg,#0f766e,#14b8a6)] px-5 py-4 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,118,110,0.28)] active:translate-y-0"
            >
              {copy.intro.startButton}
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-stone-200/70 bg-white/94 p-5 shadow-[0_18px_60px_rgba(31,24,18,0.07)] sm:rounded-[1.9rem] sm:p-8">
            <h3 className="font-serif text-2xl font-semibold text-stone-950 sm:text-3xl">
              {copy.intro.whatItMeasures}
            </h3>
            <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
              {copy.intro.description}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-[1rem] border border-amber-300/70 bg-gradient-to-br from-amber-50 to-yellow-100/70 p-4 sm:p-5">
                <div className="font-semibold text-amber-900">{copy.dimensions.field}</div>
                <div className="mt-2 text-[13px] text-amber-700 sm:mt-3 sm:text-sm">{copy.dimensionCaptions.field}</div>
              </div>
              <div className="rounded-[1rem] border border-teal-300/70 bg-gradient-to-br from-teal-50 to-emerald-100/70 p-4 sm:p-5">
                <div className="font-semibold text-teal-900">{copy.dimensions.ontology}</div>
                <div className="mt-2 text-[13px] text-teal-700 sm:mt-3 sm:text-sm">{copy.dimensionCaptions.ontology}</div>
              </div>
              <div className="rounded-[1rem] border border-violet-300/70 bg-gradient-to-br from-violet-50 to-purple-100/70 p-4 sm:p-5">
                <div className="font-semibold text-violet-900">{copy.dimensions.phenomenon}</div>
                <div className="mt-2 text-[13px] text-violet-700 sm:mt-3 sm:text-sm">{copy.dimensionCaptions.phenomenon}</div>
              </div>
            </div>

            <p className="mt-6 text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
              {copy.intro.scoreDescription}
            </p>

            <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-[1rem] border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-100/60 p-3 sm:p-5">
                <div className="font-serif text-3xl text-rose-700 sm:text-4xl">1</div>
                <div className="mt-3 font-semibold text-stone-900 sm:mt-4">{copy.digitMarkers["1"].title}</div>
                <div className="mt-1 text-[12px] text-stone-500 sm:mt-2 sm:text-sm">{copy.digitMarkers["1"].caption}</div>
              </div>
              <div className="rounded-[1rem] border border-amber-200 bg-gradient-to-br from-amber-50 to yellow-100/60 p-3 sm:p-5">
                <div className="font-serif text-3xl text-amber-700 sm:text-4xl">2</div>
                <div className="mt-3 font-semibold text-stone-900 sm:mt-4">{copy.digitMarkers["2"].title}</div>
                <div className="mt-1 text-[12px] text-stone-500 sm:mt-2 sm:text-sm">{copy.digitMarkers["2"].caption}</div>
              </div>
              <div className="rounded-[1rem] border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-100/60 p-3 sm:p-5">
                <div className="font-serif text-3xl text-violet-700 sm:text-4xl">3</div>
                <div className="mt-3 font-semibold text-stone-900 sm:mt-4">{copy.digitMarkers["3"].title}</div>
                <div className="mt-1 text-[12px] text-stone-500 sm:mt-2 sm:text-sm">{copy.digitMarkers["3"].caption}</div>
              </div>
              <div className="rounded-[1rem] border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-100/60 p-3 sm:p-5">
                <div className="font-serif text-3xl text-teal-700 sm:text-4xl">4</div>
                <div className="mt-3 font-semibold text-stone-900 sm:mt-4">{copy.digitMarkers["4"].title}</div>
                <div className="mt-1 text-[12px] text-stone-500 sm:mt-2 sm:text-sm">{copy.digitMarkers["4"].caption}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-amber-200/70 bg-amber-50/60 px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-600">{copy.intro.declaration}</p>
          <p className="text-[13px] leading-6 text-stone-600">
            {copy.intro.declarationBody}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-stone-600">{copy.intro.declarationInvite}</p>
        </div>

        <div className="rounded-[1.4rem] border border-stone-200/60 bg-stone-50/60 px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{copy.intro.references}</p>
          <ul className="grid gap-1.5">
            <li className="flex items-start gap-2 text-[13px] text-stone-600">
              <span className="mt-0.5 shrink-0 text-stone-400">▸</span>
              <span>
                {copy.intro.originalAuthor}
                <a
                  href="https://www.bilibili.com/video/BV1JT4y1K7dp/?spm_id_from=333.337.search-card.all.click"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-700 underline-offset-2 transition hover:text-teal-900 hover:underline"
                >
                  {copy.intro.originalVideo}
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2 text-[13px] text-stone-600">
              <span className="mt-0.5 shrink-0 text-stone-400">▸</span>
              <span>
                {copy.intro.ismismCube}
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

        <div className="flex flex-col items-end gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setIsOtherIsmsModalOpen(true)}
            className="rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-sm text-stone-600 transition duration-200 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900"
          >
            {copy.intro.otherIsms}
          </button>
          <button
            type="button"
            onClick={openPreviewResult}
            disabled={isSubmitting}
            className="rounded-full border border-stone-300 bg-white/80 px-4 py-2 text-sm text-stone-600 transition duration-200 hover:border-stone-500 hover:bg-white hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? copy.intro.openingPreview : copy.intro.previewButton}
          </button>
        </div>

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
                  <h3 className="font-serif text-xl font-bold text-stone-900">{copy.catalog.listTitle}</h3>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {copy.catalog.listDescription(Object.keys(enhancedCatalog).filter((k) => /^[1-4]-[1-4]-[1-4]$/.test(k)).length)}
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
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400 sm:px-6">{copy.catalog.code}</th>
                      <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">{copy.catalog.name}</th>
                      <th className="hidden px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400 sm:table-cell">{copy.catalog.representative}</th>
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
                                {entry.ch_name || copy.catalog.unnamed}
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
                                {copy.catalog.view}
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
                      {copy.catalog.representativePrefix}{enhancedCatalog[selectedOtherIsmCode].example_people}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-3">
                  <button
                    onClick={() => setIsIsmDetailOpen(false)}
                    className="rounded-full bg-stone-100 p-2 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
                    title={copy.catalog.backToList}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { setIsIsmDetailOpen(false); setIsOtherIsmsModalOpen(false); }}
                    className="rounded-full bg-stone-100 p-2 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700"
                    title={copy.catalog.close}
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
                      <h5 className="text-sm font-semibold text-teal-800">{copy.catalog.example}</h5>
                    </div>
                    <p className="text-[14px] leading-7 text-stone-600">
                      {enhancedCatalog[selectedOtherIsmCode].simple_story}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[1.3rem] border border-stone-100 bg-stone-50 p-5">
                    <p className="text-sm text-stone-400">{copy.catalog.noExample}</p>
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
                      <h5 className="text-sm font-semibold text-stone-800">{copy.catalog.coreFeatures}</h5>
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
            {copy.quiz.question(currentQuestionNumber, remainingCount)}
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
            {copy.quiz.questionLabel(currentQuestionNumber)}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${dimensionToneMap[currentQuestion.dimension].badge}`}
          >
            {currentQuestion.dimensionLabel}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div>
              <h2 className="mt-5 text-balance font-serif text-2xl leading-tight text-stone-950 sm:text-3xl lg:text-[2.55rem]">
                {currentQuestion.question}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:mt-5 sm:text-base">
                {copy.quiz.maxChoices}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:mt-8">
              {shuffledOptions.map((option) => {
                const selected = (answers[currentQuestion.id] || []).includes(option.value);

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
          </motion.div>
        </AnimatePresence>

        {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={movePrevious}
            disabled={currentIndex === 0 || isSubmitting}
            className="w-full rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-500 hover:bg-white hover:text-stone-950 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {copy.quiz.previous}
          </button>
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((index) => Math.min(index + 1, questions.length - 1))}
              disabled={isSubmitting}
              className="w-full rounded-full border border-teal-300 bg-gradient-to-r from-teal-50 to-emerald-50 px-5 py-3 text-sm font-medium text-teal-800 transition duration-200 hover:-translate-y-0.5 hover:border-teal-400 hover:from-teal-100 hover:to-emerald-100 hover:shadow-[0_10px_24px_rgba(15,118,110,0.14)] active:translate-y-0 sm:w-auto"
            >
              {copy.quiz.next}
            </button>
          ) : (
            <button
              type="button"
              onClick={openProfileStep}
              disabled={!allAnswered || isSubmitting}
              className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition duration-200 hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-[0_10px_24px_rgba(28,25,23,0.18)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-100 disabled:shadow-none sm:w-auto"
            >
              {copy.quiz.finish}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
