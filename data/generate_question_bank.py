import argparse
import json
import math
import os
import random
import re
import time
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(path=None):
        if not path:
            return False
        env_path = Path(path)
        if not env_path.exists():
            return False
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)
        return True


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
INPUT_JSON_PATH = BASE_DIR / "ismism-sum-enhanced.json"
OVERVIEW_PATH = BASE_DIR / "overview.txt"
DEFAULT_OUTPUT_PATH = BASE_DIR / "ismism-question-bank.json"
REQUIRED_SAMPLE_KEYS = ("1", "2", "3", "4")
QUESTION_TYPES = ("abstract", "personal", "art")
DIMENSION_CONFIG = (
    ("场域", "field", ("abstract",) * 3 + ("personal",) * 3 + ("art",) * 2),
    ("本体", "ontology", ("abstract",) * 3 + ("personal",) * 3 + ("art",) * 2),
    ("认识", "phenomenon", ("abstract",) * 3 + ("personal",) * 3 + ("art",) * 2),
    ("目的", "purpose", ("abstract",) * 3 + ("personal",) * 3 + ("art",) * 2),
)
DEFAULT_OPTIONS = [
    "非常同意",
    "比较同意",
    "比较不同意",
    "非常不同意",
]
BANNED_TERMS = (
    "秩序",
    "冲突",
    "中心",
    "虚无",
    "场域",
    "本体",
    "认识",
    "现象",
    "目的",
    "主义",
    "你是否认为",
    "你觉得自己",
)
QUESTION_STYLE_MARKERS = (
    "？",
    "?",
    "你觉得",
    "你是否",
)


def clean_json_string(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def get_llm_client():
    try:
        from openai import AzureOpenAI, OpenAI
    except ImportError:
        print("请先安装依赖: pip install openai python-dotenv")
        raise SystemExit(1)

    load_dotenv(PROJECT_ROOT / ".env")

    api_key = os.getenv("SILICONCLOUD_API_KEY")
    base_url = os.getenv("SILICONCLOUD_BASE_URL")
    model = os.getenv("SILICONCLOUD_MODEL")
    if api_key and base_url and model:
        return OpenAI(api_key=api_key, base_url=base_url), model

    api_key = os.getenv("OPENROUTER_API_KEY")
    base_url = os.getenv("OPENROUTER_BASE_URL")
    model = (
        os.getenv("GEMINI_MODEL")
        or os.getenv("CLAUDE_MODEL")
        or os.getenv("GROK_MODEL")
    )
    if api_key and base_url and model:
        headers = {
            "HTTP-Referer": os.getenv("OPENROUTER_HTTP_REFERER", ""),
            "X-Title": os.getenv("OPENROUTER_APP_TITLE", ""),
        }
        return (
            OpenAI(api_key=api_key, base_url=base_url, default_headers=headers),
            model,
        )

    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    model = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    if api_key and endpoint and model:
        api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
        return (
            AzureOpenAI(
                api_key=api_key,
                azure_endpoint=endpoint,
                api_version=api_version,
            ),
            model,
        )

    raise ValueError("未找到可用的 LLM 配置，请检查项目根目录 .env。")


def parse_key(key: str):
    return tuple(int(part) for part in key.split("-"))


def evenly_sample_items(item_map: dict, sample_size: int, seed: int) -> list[dict]:
    if sample_size < len(REQUIRED_SAMPLE_KEYS):
        raise ValueError("sample_size 不能小于必须包含的顶层 key 数量。")

    ordered_keys = sorted(item_map.keys(), key=parse_key)
    required_set = set(REQUIRED_SAMPLE_KEYS)
    chosen_keys = list(REQUIRED_SAMPLE_KEYS)
    remaining_keys = [key for key in ordered_keys if key not in required_set]
    extra_needed = sample_size - len(chosen_keys)

    if extra_needed > len(remaining_keys):
        raise ValueError("可供抽样的条目不足。")

    rng = random.Random(seed)
    if extra_needed:
        bucket_size = len(remaining_keys) / extra_needed
        extra_keys = []
        for index in range(extra_needed):
            start = int(math.floor(index * bucket_size))
            end = int(math.floor((index + 1) * bucket_size))
            bucket = remaining_keys[start : max(start + 1, end)]
            extra_keys.append(rng.choice(bucket))
        chosen_keys.extend(extra_keys)

    sampled = []
    for key in sorted(set(chosen_keys), key=parse_key):
        item = item_map[key]
        sampled.append(
            {
                "id": key,
                "ch_name": item.get("ch_name", ""),
                "axis_list": item.get("axis_list", []),
                "feature_list": item.get("feature_list", []),
                "example_people": item.get("example_people", ""),
                "simple_story": item.get("simple_story", ""),
            }
        )

    if len(sampled) != sample_size:
        raise RuntimeError("抽样结果数量异常，请检查采样算法。")

    return sampled


def build_prompt(
    overview_text: str,
    sampled_items: list[dict],
    dimension_cn: str,
    dimension_key: str,
    question_type: str,
) -> str:
    type_rules = {
        "abstract": "从宏大、抽象、社会或政治结构的角度出题，但不要写得像政治学术语堆砌。",
        "personal": "从个人工作、协作、学习、职业选择或日常决策场景出题，要具体、有趣、像真实人会遇到的处境。",
        "art": "从哲学、文学、戏剧、电影或经典虚构人物出题，优先使用广为人知的故事、角色或情节。",
    }
    dimension_rules = {
        "field": "这题要侧重一个人如何理解自己所处世界的整体背景、结构张力与规则环境。",
        "ontology": "这题要侧重一个人到底把什么当成真正有分量、真正决定事情的存在。",
        "phenomenon": "这题要侧重一个人如何经验、理解、感受和解释现实，而不是现实本身是什么。",
        "purpose": "这题要侧重一个人行动最终朝向什么、为什么值得行动、应该把力气投向哪里。",
    }
    prompt_payload = {
        "dimension": dimension_cn,
        "dimension_key": dimension_key,
        "type": question_type,
        "sampled_items": sampled_items,
    }

    return f"""
你正在为一个“哲学倾向测试网站”写题目。题目必须是判断题式的陈述句，供用户按四级同意度作答。

你会收到两类材料：
1. 整体背景说明 `overview.txt`
2. 从 `ismism-sum-enhanced.json` 中均匀抽出来的 15 个参考条目

你的任务：
基于这些材料，只生成 1 道题。

必须满足：
1. 题目必须是一个中文陈述句，长度控制在 18 到 42 字之间。
2. 题目要能测出用户真实思考习惯，不要直接询问用户对某个抽象标签的态度。
3. 不要直接出现这些词：秩序、冲突、中心、虚无、场域、本体、认识、现象、目的、主义。
4. 不要写成教科书式定义，不要像问卷模板，不要僵硬。
5. 题目里不要出现“你是否认为”“你觉得自己”等明显问卷口头禅。
6. `personal` 类型要像真实工作或生活情境；`art` 类型要明确依托具体人物、故事、桥段或著名作品。
7. 可以借鉴参考条目的思想张力，但不要照抄任何一句原文。
8. 输出必须是合法 JSON，不要输出 Markdown，不要解释。

当前题目要求：
- 维度：{dimension_cn}
- 维度说明：{dimension_rules[dimension_key]}
- 类型：{question_type}
- 类型说明：{type_rules[question_type]}

统一作答选项已经固定为：
["非常同意", "比较同意", "比较不同意", "非常不同意"]

请输出这个 JSON 对象，且只能包含这 4 个键：
{{
  "question": "一个陈述句",
  "dimension": "{dimension_cn}",
  "type": "{question_type}",
  "option_style": "agreement"
}}

【overview.txt 全文】
{overview_text}

【本次参考条目】
{json.dumps(prompt_payload, ensure_ascii=False, indent=2)}
""".strip()


def looks_like_question(question: str) -> bool:
    normalized = question.strip().rstrip("。！；")
    if any(marker in normalized for marker in QUESTION_STYLE_MARKERS):
        return True
    return bool(re.search(r"(吗|么|呢)$", normalized))


def request_question(client, model: str, prompt: str, retries: int = 3) -> dict:
    messages = [
        {
            "role": "system",
            "content": (
                "你是一个擅长哲学测验设计的中文助理。"
                "你必须严格输出 JSON 对象，不能包含 Markdown、解释或额外文字。"
            ),
        },
        {"role": "user", "content": prompt},
    ]

    last_error = None
    for attempt in range(1, retries + 1):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.95,
                max_tokens=220,
                timeout=120,
            )
            content = response.choices[0].message.content or ""
            result = json.loads(clean_json_string(content))
            question = (result.get("question") or "").strip()
            dimension = (result.get("dimension") or "").strip()
            question_type = (result.get("type") or "").strip()
            if not question:
                raise ValueError("模型返回缺少 question。")
            if any(term in question for term in BANNED_TERMS):
                raise ValueError(f"题目包含禁用词: {question}")
            if looks_like_question(question):
                raise ValueError(f"题目不是陈述句: {question}")
            if not 18 <= len(question) <= 42:
                raise ValueError(f"题目长度不符合约束: {len(question)}")
            if dimension not in [item[0] for item in DIMENSION_CONFIG]:
                raise ValueError(f"模型返回 dimension 异常: {dimension}")
            if question_type not in QUESTION_TYPES:
                raise ValueError(f"模型返回 type 异常: {question_type}")
            return result
        except Exception as error:  # noqa: BLE001
            last_error = error
            print(f"请求失败，第 {attempt} 次重试: {error}")
            time.sleep(2)

    raise RuntimeError(f"连续请求失败: {last_error}")


def load_existing_questions(output_path: Path) -> dict:
    if not output_path.exists():
        return {}
    return json.loads(output_path.read_text(encoding="utf-8"))


def sort_question_bank(question_bank: dict) -> dict:
    return {key: question_bank[key] for key in sorted(question_bank)}


def build_question_specs() -> list[dict]:
    specs = []
    counter = 1
    for round_index, (dimension_cn, dimension_key, question_types) in enumerate(
        DIMENSION_CONFIG, start=1
    ):
        for within_round, question_type in enumerate(question_types, start=1):
            specs.append(
                {
                    "id": f"{counter:02d}",
                    "round": round_index,
                    "index_in_round": within_round,
                    "dimension": dimension_cn,
                    "dimension_key": dimension_key,
                    "type": question_type,
                }
            )
            counter += 1
    return specs


def validate_question_bank(question_bank: dict):
    expected_count = sum(len(config[2]) for config in DIMENSION_CONFIG)
    if len(question_bank) != expected_count:
        raise ValueError(
            f"题库数量不正确，期望 {expected_count} 题，实际 {len(question_bank)} 题。"
        )

    for question_id, item in sorted(question_bank.items()):
        required_keys = {"question", "dimension", "type", "options"}
        missing_keys = required_keys - set(item.keys())
        if missing_keys:
            raise ValueError(f"{question_id} 缺少字段: {sorted(missing_keys)}")
        if item["dimension"] not in [config[0] for config in DIMENSION_CONFIG]:
            raise ValueError(f"{question_id} 的 dimension 非法。")
        if item["type"] not in QUESTION_TYPES:
            raise ValueError(f"{question_id} 的 type 非法。")
        if item["options"] != DEFAULT_OPTIONS:
            raise ValueError(f"{question_id} 的 options 不符合统一四级量表。")
        if any(term in item["question"] for term in BANNED_TERMS):
            raise ValueError(f"{question_id} 包含禁用词。")
        if looks_like_question(item["question"]):
            raise ValueError(f"{question_id} 不是陈述句。")


def main():
    parser = argparse.ArgumentParser(description="生成 ismism 哲学测试题库。")
    parser.add_argument(
        "--input",
        default=str(INPUT_JSON_PATH),
        help="输入的 ismism-sum-enhanced.json 路径。",
    )
    parser.add_argument(
        "--overview",
        default=str(OVERVIEW_PATH),
        help="overview.txt 路径。",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT_PATH),
        help="输出题库 JSON 路径。",
    )
    parser.add_argument(
        "--sample-size",
        type=int,
        default=15,
        help="每次请求抽取的参考条目数量。",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="基础随机种子，会和题号叠加使用。",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只打印首题 prompt 预览，不请求 LLM。",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    overview_path = Path(args.overview)
    output_path = Path(args.output)

    item_map = json.loads(input_path.read_text(encoding="utf-8"))
    overview_text = overview_path.read_text(encoding="utf-8")
    specs = build_question_specs()

    if args.dry_run:
        sample = evenly_sample_items(item_map, args.sample_size, args.seed + 1)
        prompt = build_prompt(
            overview_text,
            sample,
            specs[0]["dimension"],
            specs[0]["dimension_key"],
            specs[0]["type"],
        )
        print(prompt)
        return

    client, model = get_llm_client()
    existing_questions = load_existing_questions(output_path)

    print(f"使用模型: {model}")
    print(f"输出路径: {output_path}")

    for spec in specs:
        question_id = spec["id"]
        if question_id in existing_questions:
            print(f"跳过 {question_id}，已存在。")
            continue

        sampled_items = evenly_sample_items(
            item_map=item_map,
            sample_size=args.sample_size,
            seed=args.seed + int(question_id),
        )
        prompt = build_prompt(
            overview_text=overview_text,
            sampled_items=sampled_items,
            dimension_cn=spec["dimension"],
            dimension_key=spec["dimension_key"],
            question_type=spec["type"],
        )
        print(
            f"生成 {question_id} | round {spec['round']} | "
            f"{spec['dimension']} | {spec['type']}"
        )
        result = request_question(client, model, prompt)
        existing_questions[question_id] = {
            "question": result["question"].strip(),
            "dimension": spec["dimension"],
            "type": spec["type"],
            "options": DEFAULT_OPTIONS,
            "round": spec["round"],
            "sampled_item_ids": [item["id"] for item in sampled_items],
        }
        existing_questions = sort_question_bank(existing_questions)

        output_path.write_text(
            json.dumps(existing_questions, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        time.sleep(1)

    existing_questions = sort_question_bank(existing_questions)
    validate_question_bank(existing_questions)
    output_path.write_text(
        json.dumps(existing_questions, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"题库生成完成，共 {len(existing_questions)} 题。")


if __name__ == "__main__":
    main()
