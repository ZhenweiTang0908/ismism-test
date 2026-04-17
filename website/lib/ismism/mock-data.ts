import type { IsmCatalogEntry } from "@/lib/ismism/types";

export const FALLBACK_ISM_INFO: Record<string, IsmCatalogEntry> = {
  "1-1-1": {
    ch_name: "经验现实倾向",
    feature_list: [
      "更关注稳定规则与可验证事实。",
      "偏好先看现实约束，再谈理想目标。",
      "处理问题时倾向先确认边界条件。",
    ],
    simple_story:
      "你通常会先弄清楚事情“现在是怎么运作的”，再决定如何行动。",
  },
  "2-2-2": {
    ch_name: "结构解释倾向",
    feature_list: [
      "擅长从关系与机制层面理解问题。",
      "会主动追问规则背后的分配逻辑。",
      "对表面叙事保持谨慎。",
    ],
    simple_story:
      "你不太满足于“发生了什么”，更在意“为什么会这样发生”。",
  },
  "3-3-3": {
    ch_name: "主体反思倾向",
    feature_list: [
      "强调视角、经验与意义建构。",
      "会关注理解者自身在判断中的位置。",
      "倾向在多种解释之间进行反思。",
    ],
    simple_story:
      "你会同时考虑事实与体验，关注“这件事对人意味着什么”。",
  },
  "4-4-4": {
    ch_name: "实践生成倾向",
    feature_list: [
      "更关注行动与变化过程。",
      "认为现实会在实践中被重组。",
      "对不确定性与新方案接受度较高。",
    ],
    simple_story:
      "你往往把问题看成可以通过持续行动逐步改造的过程。",
  },
};
