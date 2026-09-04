import QuizExperience from "@/components/quiz-experience";
import LanguageSwitcher from "@/components/language-switcher";
import { getEnhancedIsmCatalog, getQuizQuestions } from "@/lib/ismism/data";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang;
  const [questions, enhancedCatalog] = await Promise.all([
    getQuizQuestions(lang),
    getEnhancedIsmCatalog(lang),
  ]);

  return (
    <main className="relative overflow-hidden px-4 py-6 text-stone-950 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
      <LanguageSwitcher currentLang={lang} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(253,186,116,0.16),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(13,148,136,0.10),transparent_26%)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 sm:gap-6">
        <header className="rounded-[1.2rem] border border-stone-200/70 bg-white/80 px-4 py-4 shadow-[0_8px_24px_rgba(31,24,18,0.035)] backdrop-blur sm:px-6 sm:py-5">
          <h1 className="font-serif text-[clamp(2rem,6vw,3.4rem)] font-semibold leading-[1.02] text-stone-950">
            {lang === "en" ? "Explore your " : "测一测你的"}
            <span className="bg-[linear-gradient(120deg,#0f766e,#c2410c)] bg-clip-text text-transparent">
              {lang === "en" ? "philosophical tendency" : "哲学倾向"}
            </span>
          </h1>
        </header>

        <QuizExperience questions={questions} enhancedCatalog={enhancedCatalog} lang={lang} />
      </div>
    </main>
  );
}
