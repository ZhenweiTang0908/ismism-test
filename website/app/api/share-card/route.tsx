import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const SITE_URL = "newnewtown.tech";

// A more minimalist color palette
const dimConfig = {
  field: {
    label: "场域",
    subtitle: "世界是什么样",
    color: "#b45309",
    border: "rgba(180,83,9,0.15)",
    bg: "rgba(180,83,9,0.03)"
  },
  ontology: {
    label: "本体",
    subtitle: "事物怎么存在",
    color: "#0f766e",
    border: "rgba(15,118,110,0.15)",
    bg: "rgba(15,118,110,0.03)"
  },
  phenomenon: {
    label: "认识",
    subtitle: "怎么认识世界",
    color: "#6d28d9",
    border: "rgba(109,40,217,0.15)",
    bg: "rgba(109,40,217,0.03)"
  },
} as const;

async function loadLocalFont(): Promise<ArrayBuffer | null> {
  try {
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
    const aiText = searchParams.get("ai") ?? "";
    // Fallback to story if AI text isn't ready
    const story = searchParams.get("story") ?? "";
    const displayDesc = aiText || story;
    
    const userName = searchParams.get("uname") ?? "";
    const rate = searchParams.get("rate") ?? "0";
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
            width: 1800,
            height: 1000,
            backgroundColor: "#FDFBF7",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "80px 100px",
            fontFamily: fontData ? "'Noto Serif SC', serif" : "serif",
            position: "relative",
            boxSizing: "border-box",
          }}
        >
          {/* 顶部：UserName & 准确度 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              {userName && (
                <div style={{ fontSize: 36, fontWeight: 700, color: "#292524", letterSpacing: "0.05em" }}>
                  {userName}
                </div>
              )}
              <div style={{ fontSize: 24, letterSpacing: "0.2em", color: "#78716c", textTransform: "uppercase" }}>
                {userName ? "的哲学倾向分析" : "哲学倾向测试结果"}
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ fontSize: 22, color: "#78716c", letterSpacing: "0.1em" }}>匹配度</div>
              <div style={{ fontSize: 42, fontWeight: 700, color: "#292524" }}>{rate}%</div>
            </div>
          </div>

          {/* 主体内容 */}
          <div
            style={{
              display: "flex",
              flex: 1,
              marginTop: 60,
              marginBottom: 40,
              gap: 80,
            }}
          >
            {/* 左侧：主义名称与解读 */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1.2 }}>
              
              <div style={{ display: "flex", alignItems: "baseline", gap: 32 }}>
                <div style={{ fontSize: 100, fontWeight: 700, color: "#1c1917", letterSpacing: "-0.02em" }}>
                  {code}
                </div>
                <div style={{ fontSize: 72, fontWeight: 700, color: "#292524" }}>
                  {name}
                </div>
              </div>

              {englishName && (
                <div style={{ fontSize: 28, color: "#a8a29e", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 8 }}>
                  {englishName}
                </div>
              )}

              {/* 细线分隔 */}
              <div style={{ width: 120, height: 4, backgroundColor: "#d6d3d1", marginTop: 40, borderRadius: 2 }} />

              {/* AI 解读 / 故事 */}
              {displayDesc && (
                <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
                  <div style={{ fontSize: 22, color: "#a8a29e", fontWeight: 700, marginBottom: 16, letterSpacing: "0.1em" }}>
                    {aiText ? "AI 专属解读" : "典型特征"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {displayDesc.slice(0, 260).split('\n').filter(Boolean).map((line, i) => (
                      <div key={i} style={{ fontSize: 30, color: "#44403c", lineHeight: 1.6, fontWeight: 400 }}>
                        {line}
                      </div>
                    ))}
                    {displayDesc.length > 260 && (
                      <div style={{ fontSize: 30, color: "#44403c", lineHeight: 1.6, fontWeight: 400 }}>
                        ...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 典型人物 */}
              {examplePeople && (
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: "auto" }}>
                  <div style={{ fontSize: 22, color: "#a8a29e", letterSpacing: "0.1em" }}>代表人物</div>
                  <div style={{ fontSize: 28, color: "#44403c", fontWeight: 700 }}>{examplePeople}</div>
                </div>
              )}
            </div>

            {/* 右侧：维度分解（极简风格） */}
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              flex: 0.8,
              gap: 24,
              justifyContent: "center"
            }}>
              {dims.map(({ key, digit, marker }) => {
                const cfg = dimConfig[key];
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "40px 48px",
                      backgroundColor: cfg.bg,
                      border: `2px solid ${cfg.border}`,
                      borderRadius: 24,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 24, color: cfg.color, letterSpacing: "0.05em", opacity: 0.8 }}>
                        {cfg.label} · {cfg.subtitle}
                      </div>
                      <div style={{ fontSize: 42, fontWeight: 700, color: cfg.color }}>
                        {marker}
                      </div>
                    </div>
                    <div style={{ fontSize: 96, fontWeight: 700, color: cfg.color, opacity: 0.9 }}>
                      {digit}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 底部 Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 40,
              borderTop: "2px solid rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: 24, color: "#a8a29e", letterSpacing: "0.05em" }}>
              1=秩序 · 2=冲突 · 3=调和 · 4=虚无
            </div>
            <div style={{ fontSize: 26, color: "#78716c", fontWeight: 700, letterSpacing: "0.1em" }}>
              {SITE_URL}
            </div>
          </div>
        </div>
      ),
      {
        width: 1800,
        height: 1000,
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
      }
    );
  } catch (err) {
    console.error("[share-card] error:", err);
    return new Response("图片生成失败", { status: 500 });
  }
}
