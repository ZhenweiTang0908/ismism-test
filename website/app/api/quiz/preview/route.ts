import { getEnhancedIsmCatalog } from "@/lib/ismism/data";
import { buildQuizResultFromCoreCode } from "@/lib/ismism/scoring";
import { getLocaleCopy } from "@/lib/i18n";

const getPreviewSecretKey = () => process.env.ANY_ANSWER_SECRET_KEY?.trim() ?? "";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      accessKey?: unknown;
      coreCode?: unknown;
      lang?: unknown;
    };

    const lang = payload.lang === "en" ? "en" : "zh";
    const copy = getLocaleCopy(lang);

    const configuredSecretKey = getPreviewSecretKey();
    if (!configuredSecretKey) {
      return Response.json(
        {
          error: lang === "en"
            ? "ANY_ANSWER_SECRET_KEY is not configured, so preview mode is unavailable."
            : "未配置 ANY_ANSWER_SECRET_KEY，无法使用测试入口。",
        },
        { status: 500 },
      );
    }

    const accessKey =
      typeof payload.accessKey === "string" ? payload.accessKey.trim() : "";

    if (!accessKey || accessKey !== configuredSecretKey) {
      return Response.json({ error: copy.errors.invalidAccessKey },
        { status: 401 },
      );
    }

    const coreCode = typeof payload.coreCode === "string" ? payload.coreCode : "";
    const enhancedCatalog = await getEnhancedIsmCatalog(lang);
    const result = buildQuizResultFromCoreCode({
      coreCode,
      enhancedCatalog,
      lang,
    });

    return Response.json({
      result,
      storage: {
        ok: true,
        message: "preview",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : getLocaleCopy("zh").errors.previewUnavailable,
      },
      { status: 500 },
    );
  }
}
