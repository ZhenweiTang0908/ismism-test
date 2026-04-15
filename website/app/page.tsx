import QuizExperience from "@/components/quiz-experience";
import { getQuizQuestions } from "@/lib/ismism/data";

export default async function Home() {
  const questions = await getQuizQuestions();

  return (
    <main className="relative overflow-hidden px-4 py-8 text-stone-950 sm:px-6 lg:px-10 lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(253,186,116,0.26),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(13,148,136,0.15),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(120,113,108,0.14),transparent_24%)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="grid gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.38em] text-stone-500">
              Ismism Lab
            </p>
            <h1 className="mt-4 max-w-4xl font-serif text-5xl font-semibold leading-[1.08] text-stone-950 sm:text-6xl lg:text-7xl">
              测一测你在
              <span className="text-transparent bg-[linear-gradient(120deg,#0f766e,#c2410c)] bg-clip-text">
                哲学倾向
              </span>
              上更接近哪一种主义。
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-stone-700">
              24 个判断题，输出你的三位主义定位结果。
            </p>
          </div>
        </header>

        <QuizExperience questions={questions} />
      </div>
    </main>
  );
}
