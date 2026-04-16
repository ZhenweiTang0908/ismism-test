import { getEnhancedIsmCatalog } from "@/lib/ismism/data";
import { buildQuizResultFromCoreCode } from "@/lib/ismism/scoring";

const getPreviewSecretKey = () => process.env.ANY_ANSWER_SECRET_KEY?.trim() ?? "";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      accessKey?: unknown;
      coreCode?: unknown;
    };

    const configuredSecretKey = getPreviewSecretKey();
    if (!configuredSecretKey) {
      return Response.json(
        {
          error: "未配置 ANY_ANSWER_SECRET_KEY，无法使用测试入口。",
        },
        { status: 500 },
      );
    }

    const accessKey =
      typeof payload.accessKey === "string" ? payload.accessKey.trim() : "";

    if (!accessKey || accessKey !== configuredSecretKey) {
      return Response.json(
        {
          error: "密钥不正确。",
        },
        { status: 401 },
      );
    }

    const coreCode = typeof payload.coreCode === "string" ? payload.coreCode : "";
    const enhancedCatalog = await getEnhancedIsmCatalog();
    const result = buildQuizResultFromCoreCode({
      coreCode,
      enhancedCatalog,
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
        error: error instanceof Error ? error.message : "预览结果生成失败。",
      },
      { status: 500 },
    );
  }
}
