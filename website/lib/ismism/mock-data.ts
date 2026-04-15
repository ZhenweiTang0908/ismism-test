import type { DimensionKey, IsmCatalogEntry, QuestionType, QuizQuestion } from "@/lib/ismism/types";
import { DIMENSION_LABELS, QUESTION_TYPE_WEIGHTS } from "@/lib/ismism/types";

type MockQuestionSeed = {
  id: string;
  question: string;
  dimension: DimensionKey;
  type: QuestionType;
};

const MOCK_QUESTION_SEEDS: MockQuestionSeed[] = [
  {
    id: "mock-field-abstract-01",
    question: "社会中的规则常常先于个人选择而存在，人更多是在里面寻找落脚点。",
    dimension: "field",
    type: "abstract",
  },
  {
    id: "mock-field-abstract-02",
    question: "一种制度能长期维持，往往不是因为每个人都认同它，而是因为它先把位置分配好了。",
    dimension: "field",
    type: "abstract",
  },
  {
    id: "mock-field-abstract-03",
    question: "比起个体动机，我更关注一件事背后那套让人不得不配合的整体环境。",
    dimension: "field",
    type: "abstract",
  },
  {
    id: "mock-field-personal-01",
    question: "进入新团队时，我通常先摸清默认规则，再决定要不要表达不同意见。",
    dimension: "field",
    type: "personal",
  },
  {
    id: "mock-field-personal-02",
    question: "面对不熟悉的组织，我会先判断权力和流程如何运转，而不是先展示个人风格。",
    dimension: "field",
    type: "personal",
  },
  {
    id: "mock-field-personal-03",
    question: "一个项目推进不顺时，我第一反应是去看结构卡在哪里，而不是先怪某个人不努力。",
    dimension: "field",
    type: "personal",
  },
  {
    id: "mock-field-art-01",
    question: "《1984》里令人恐惧的，不只是独裁者本人，而是整套让人无法跳出的生活布置。",
    dimension: "field",
    type: "art",
  },
  {
    id: "mock-field-art-02",
    question: "在《寄生虫》里，真正主导人物命运的不是单次选择，而是他们所处的社会格局。",
    dimension: "field",
    type: "art",
  },
  {
    id: "mock-ontology-abstract-01",
    question: "决定事情走向的，常常不是口头价值，而是谁真正掌握资源、位置和行动能力。",
    dimension: "ontology",
    type: "abstract",
  },
  {
    id: "mock-ontology-abstract-02",
    question: "看待现实问题时，我更相信那些能产生后果的力量，而不是漂亮的解释。",
    dimension: "ontology",
    type: "abstract",
  },
  {
    id: "mock-ontology-abstract-03",
    question: "真正有分量的存在，不一定最显眼，但一定会在关键时刻决定局面。",
    dimension: "ontology",
    type: "abstract",
  },
  {
    id: "mock-ontology-personal-01",
    question: "做选择时，我会先盘点自己真正握在手里的东西，再考虑理想叙事是否动听。",
    dimension: "ontology",
    type: "personal",
  },
  {
    id: "mock-ontology-personal-02",
    question: "合作里如果承诺和实际资源冲突，我会默认资源比承诺更真实。",
    dimension: "ontology",
    type: "personal",
  },
  {
    id: "mock-ontology-personal-03",
    question: "判断一个人是否可靠时，我更看他持续做出的行动，而不是他怎样描述自己。",
    dimension: "ontology",
    type: "personal",
  },
  {
    id: "mock-ontology-art-01",
    question: "《教父》真正说明问题的，不是家族宣言，而是谁在关键时刻拥有决定他人生死的能力。",
    dimension: "ontology",
    type: "art",
  },
  {
    id: "mock-ontology-art-02",
    question: "哈姆雷特之所以陷入困局，不只是因为他想太多，更因为他始终没有稳稳抓住改变局面的力量。",
    dimension: "ontology",
    type: "art",
  },
  {
    id: "mock-phenomenon-abstract-01",
    question: "同一件事会呈现成什么样，往往取决于观察者用什么方式去理解它。",
    dimension: "phenomenon",
    type: "abstract",
  },
  {
    id: "mock-phenomenon-abstract-02",
    question: "我们接触到的现实，常常已经混入了叙事、情绪和角度，而不是裸露的事实本身。",
    dimension: "phenomenon",
    type: "abstract",
  },
  {
    id: "mock-phenomenon-abstract-03",
    question: "理解一个现象时，我会默认经验本身带着滤镜，而不是透明地反映真实。",
    dimension: "phenomenon",
    type: "abstract",
  },
  {
    id: "mock-phenomenon-personal-01",
    question: "和人发生分歧时，我常先想彼此是不是站在不同的理解框架里。",
    dimension: "phenomenon",
    type: "personal",
  },
  {
    id: "mock-phenomenon-personal-02",
    question: "压力大的时候，我会怀疑自己眼前看到的问题，是否已经被情绪放大过。",
    dimension: "phenomenon",
    type: "personal",
  },
  {
    id: "mock-phenomenon-personal-03",
    question: "复盘一次失败时，我会同时检查事实经过和自己当时是怎样感受到它的。",
    dimension: "phenomenon",
    type: "personal",
  },
  {
    id: "mock-phenomenon-art-01",
    question: "《罗生门》最重要的不是找唯一真相，而是看见真相总被不同人的经验方式切开。",
    dimension: "phenomenon",
    type: "art",
  },
  {
    id: "mock-phenomenon-art-02",
    question: "《盗梦空间》迷人的地方，在于它让人分不清所见是现实、记忆还是被构造出的感受。",
    dimension: "phenomenon",
    type: "art",
  },
];

export const MOCK_QUESTIONS: QuizQuestion[] = MOCK_QUESTION_SEEDS.map((item) => ({
  ...item,
  dimensionLabel: DIMENSION_LABELS[item.dimension],
  weight: QUESTION_TYPE_WEIGHTS[item.type],
  source: "mock",
}));

export const FALLBACK_ISM_INFO: Record<string, IsmCatalogEntry> = {
  "1-1-1": {
    ch_name: "经验实在倾向",
    feature_list: [
      "更容易把世界看成可被识别与适应的稳定结构。",
      "更看重资源、秩序与可验证的存在。",
      "更相信经验能较直接地接触到真实。",
    ],
    simple_story:
      "你会先确认世界是怎么摆放好的，再判断自己在哪里、手里有什么、眼前看到的东西是否足够可靠。",
  },
  "2-2-2": {
    ch_name: "结构解释倾向",
    feature_list: [
      "会主动看到规则背后的层级与剩余部分。",
      "更相信深层结构和关系网络在起作用。",
      "会警惕表象与真实之间存在中介。",
    ],
    simple_story:
      "你不会直接相信事情的表面，而是倾向去追问看不见的结构、代价和解释框架。",
  },
  "3-3-3": {
    ch_name: "主体反思倾向",
    feature_list: [
      "把立场、意识与自我反思放到很中心的位置。",
      "更在乎主体如何确认真正重要之物。",
      "强调体验与意义是如何被构造出来的。",
    ],
    simple_story:
      "你更像是在不断校准自己的位置：世界是什么，要靠主体如何介入、如何理解、如何承担来决定。",
  },
  "4-4-4": {
    ch_name: "实践生成倾向",
    feature_list: [
      "倾向把世界看成可被改造的动态场域。",
      "认为存在体现在行动、关系和生成过程里。",
      "会对裂缝、不确定性和变化中的真实更敏感。",
    ],
    simple_story:
      "你不满足于接受现成秩序，而更关注怎样在行动中把世界推向新的形态。",
  },
};
