import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

// 使用 Node.js runtime，避免 edge runtime 在 dev 下的 fetch 问题
export const runtime = "nodejs";

const SITE_URL = "newnewtown.tech";

const dimConfig = {
  field: {
    label: "场域",
    subtitle: "世界是什么样",
    bg: "#fef9eb",
    border: "#fcd34d",
    labelColor: "#92400e",
    digitColor: "#d97706",
  },
  ontology: {
    label: "本体",
    subtitle: "事物怎么存在",
    bg: "#f0fdf9",
    border: "#5eead4",
    labelColor: "#0f766e",
    digitColor: "#0d9488",
  },
  phenomenon: {
    label: "认识",
    subtitle: "怎么认识世界",
    bg: "#f5f3ff",
    border: "#c4b5fd",
    labelColor: "#6d28d9",
    digitColor: "#7c3aed",
  },
} as const;

// 尝试从本地读取字体文件（Next.js 在 public 目录下）
async function loadLocalFont(): Promise<ArrayBuffer | null> {
  try {
    // 尝试读取项目内的字体文件
    const fontPath = path.join(process.cwd(), "public", "fonts", "NotoSerifSC-Bold.woff");
    const buf = await readFile(fontPath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const code = searchParams.get("code") ?? "?-?-?";
    const name = searchParams.get("name") ?? "未知主义";
    const englishName = searchParams.get("en") ?? "";
    const examplePeople = searchParams.get("ep") ?? "";
    const story = searchParams.get("story") ?? "";
    const userName = searchParams.get("uname") ?? "";
    const fd = searchParams.get("fd") ?? "?";
    const fm = searchParams.get("fm") ?? "—";
    const od = searchParams.get("od") ?? "?";
    const om = searchParams.get("om") ?? "—";
    const pd = searchParams.get("pd") ?? "?";
    const pm = searchParams.get("pm") ?? "—";

    const dims = [
      { key: "field" as const, digit: fd, marker: fm },
      { key: "ontology" as const, digit: od, marker: om },
      { key: "phenomenon" as const, digit: pd, marker: pm },
    ];

    const fontData = await loadLocalFont();

    return new ImageResponse(
      (
        <div
          style={{
            width: 900,
            height: 500,
            background:
              "linear-gradient(145deg, #faf8f5 0%, #fff7ed 55%, #f0fdf9 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "40px 48px",
            fontFamily: fontData ? "'Noto Serif SC', serif" : "serif",
            position: "relative",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {/* 装饰圆 - 右上 */}
          <div
            style={{
              position: "absolute",
              top: -80,
              right: -80,
              width: 320,
              height: 320,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(13,148,136,0.13) 0%, transparent 70%)",
            }}
          />
          {/* 装饰圆 - 左下 */}
          <div
            style={{
              position: "absolute",
              bottom: -100,
              left: -60,
              width: 300,
              height: 300,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%)",
            }}
          />

          {/* 顶部标签 + 网址 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {userName ? (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#44403c",
                  }}
                >
                  {userName}
                </span>
              ) : null}
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "#a8a29e",
                  fontFamily: "sans-serif",
                }}
              >
                {userName ? "的哲学倾向" : "测试结果"}
              </span>
            </div>
            <span
              style={{
                fontSize: 12,
                color: "#d6d3d1",
                fontFamily: "sans-serif",
                letterSpacing: "0.06em",
              }}
            >
              {SITE_URL}
            </span>
          </div>

          {/* 中间主体 */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 40,
              flex: 1,
              marginTop: 24,
            }}
          >
            {/* 左：代码 + 名称 + 人物 + 例子 */}
            <div
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
            >
              <div
                style={{
                  fontSize: 82,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  color: "#1c1917",
                }}
              >
                {code}
              </div>

              {/* 渐变分隔线 */}
              <div
                style={{
                  marginTop: 14,
                  width: 44,
                  height: 4,
                  borderRadius: 9999,
                  background: "linear-gradient(90deg, #f59e0b, #14b8a6)",
                }}
              />

              <div
                style={{
                  marginTop: 12,
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#1c1917",
                  lineHeight: 1.2,
                }}
              >
                {name}
              </div>

              {englishName ? (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#a8a29e",
                    fontFamily: "sans-serif",
                  }}
                >
                  {englishName}
                </div>
              ) : null}

              {/* 典型人物 */}
              {examplePeople ? (
                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span style={{ fontSize: 11, color: "#78716c", fontWeight: 600 }}>典型人物</span>
                  <span style={{ fontSize: 16, color: "#44403c", marginTop: 2, fontWeight: 700 }}>{examplePeople}</span>
                </div>
              ) : null}

              {/* 一个例子 */}
              {story ? (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 14px",
                    background: "rgba(255, 255, 255, 0.4)",
                    borderRadius: 14,
                    border: "1px solid rgba(28, 25, 23, 0.06)",
                    display: "flex",
                    flexDirection: "column",
                    maxWidth: 420,
                  }}
                >
                  <span style={{ fontSize: 10, color: "#0f766e", fontWeight: 700, marginBottom: 4 }}>一个例子</span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#57534e",
                      lineHeight: 1.6,
                    }}
                  >
                    {story.length > 120 ? story.slice(0, 117) + "..." : story}
                  </span>
                </div>
              ) : null}
            </div>

            {/* 右：三个维度卡片 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minWidth: 280,
                marginTop: 8,
              }}
            >
              {dims.map(({ key, digit, marker }) => {
                const cfg = dimConfig[key];
                return (
                  <div
                    key={key}
                    style={{
                      background: cfg.bg,
                      border: `1.5px solid ${cfg.border}`,
                      borderRadius: 16,
                      padding: "14px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: cfg.labelColor,
                          fontFamily: "sans-serif",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {cfg.label} · {cfg.subtitle}
                      </span>
                      <span
                        style={{
                          fontSize: 19,
                          fontWeight: 700,
                          color: cfg.labelColor,
                          marginTop: 4,
                        }}
                      >
                        {marker}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 38,
                        fontWeight: 800,
                        color: cfg.digitColor,
                        fontFamily: "sans-serif",
                        lineHeight: 1,
                        opacity: 0.85,
                      }}
                    >
                      {digit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 底部说明 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 16,
              borderTop: "1px solid rgba(168,162,158,0.18)",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "#a8a29e",
                fontFamily: "sans-serif",
              }}
            >
              1=秩序 · 2=冲突 · 3=调和 · 4=虚无
            </span>
            <span
              style={{
                fontSize: 12,
                color: "#a8a29e",
                fontFamily: "sans-serif",
              }}
            >
              测一测你的哲学倾向
            </span>
          </div>
        </div>
      ),
      {
        width: 900,
        height: 500,
        fonts: fontData
          ? [
              {
                name: "Noto Serif SC",
                data: fontData,
                style: "normal",
                weight: 700,
              },
            ]
          : [],
      },
    );
  } catch (err) {
    console.error("[share-card] error:", err);
    return new Response("图片生成失败", { status: 500 });
  }
}
