import QuizExperience from "@/components/quiz-experience";
import { getQuizQuestions } from "@/lib/ismism/data";

export default async function Home() {
  const questions = await getQuizQuestions();

  return (
    <main className="relative overflow-hidden px-4 py-6 text-stone-950 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(253,186,116,0.26),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(13,148,136,0.15),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(120,113,108,0.14),transparent_24%)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 sm:gap-6">
        <header className="rounded-[1.4rem] border border-stone-200/70 bg-white/70 px-4 py-4 shadow-[0_12px_32px_rgba(31,24,18,0.04)] backdrop-blur sm:px-6 sm:py-5">
          <h1 className="font-serif text-[clamp(2rem,6vw,3.4rem)] font-semibold leading-[1.02] text-stone-950">
            测一测你的
            <span className="bg-[linear-gradient(120deg,#0f766e,#c2410c)] bg-clip-text text-transparent">
              哲学倾向
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-700 sm:text-base sm:leading-8">
            24 道题，得到一组属于你的三位结果代码。
          </p>
        </header>

        <QuizExperience questions={questions} />
      </div>
    </main>
  );
}
