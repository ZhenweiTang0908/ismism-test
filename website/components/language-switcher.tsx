"use client";

import { usePathname, useRouter } from "next/navigation";

export default function LanguageSwitcher({ currentLang }: { currentLang: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const nextLang = currentLang === "en" ? "zh" : "en";
    const newPath = pathname.replace(`/${currentLang}`, `/${nextLang}`);
    router.push(newPath);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="absolute top-4 right-4 z-10 flex h-8 items-center justify-center rounded-full border border-stone-200/70 bg-white/70 px-3 text-xs font-medium text-stone-600 shadow-sm backdrop-blur transition hover:bg-stone-50"
    >
      {currentLang === "en" ? "中 / EN" : "ZH / En"}
    </button>
  );
}
