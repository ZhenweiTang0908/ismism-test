import QuizExperience from "@/components/quiz-experience";
import { getQuizQuestions } from "@/lib/ismism/data";

export default async function Home() {
  const questions = await getQuizQuestions();

  return (
    <main className="relative overflow-hidden px-4 py-6 text-stone-950 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(253,186,116,0.26),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(13,148,136,0.15),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(120,113,108,0.14),transparent_24%)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
        <header className="grid gap-3 sm:gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-stone-500 sm:text-sm sm:tracking-[0.38em]">
              Ismism Lab
            </p>
            <h1 className="mt-3 max-w-4xl text-balance font-serif text-[clamp(2.6rem,10vw,4.5rem)] font-semibold leading-[1.02] text-stone-950 sm:mt-4 sm:leading-[1.08] lg:text-7xl">
              测一测你的
              <span className="bg-[linear-gradient(120deg,#0f766e,#c2410c)] bg-clip-text text-transparent">
                哲学倾向
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-stone-700 sm:mt-4 sm:max-w-2xl sm:text-base sm:leading-8">
              24 道判断题，测出你在场域、本体、现象三条轴线上的哲学偏向。
            </p>
          </div>
        </header>

        <QuizExperience questions={questions} />
      </div>
    </main>
  );
}
