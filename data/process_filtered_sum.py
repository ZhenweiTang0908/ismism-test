import json
import os
import time
import re
from dotenv import load_dotenv

# 确保已经安装 openai 和 python-dotenv
try:
    from openai import OpenAI
except ImportError:
    print("请先在虚拟环境中运行: pip install openai python-dotenv")
    exit(1)

def clean_json_string(s):
    """清理返回格式可能是 markdown 包含的代码块包裹"""
    s = s.strip()
    s = re.sub(r'^```json\s*', '', s, flags=re.IGNORECASE)
    s = re.sub(r'^```\s*', '', s)
    s = re.sub(r'\s*```$', '', s)
    return s.strip()

def get_fallback_client():
    """根据优先级使用系统中的API：SiliconCloud > OpenRouter > Azure"""
    # 1. 尝试 SiliconCloud
    api_key = os.getenv("SILICONCLOUD_API_KEY")
    base_url = os.getenv("SILICONCLOUD_BASE_URL")
    model = os.getenv("SILICONCLOUD_MODEL")
    
    if api_key and base_url and model:
        return OpenAI(api_key=api_key, base_url=base_url), model
        
    # 2. 尝试 OpenRouter
    api_key = os.getenv("OPENROUTER_API_KEY")
    base_url = os.getenv("OPENROUTER_BASE_URL")
    model = os.getenv("GEMINI_MODEL") or os.getenv("CLAUDE_MODEL") or os.getenv("GROK_MODEL")
    
    if api_key and base_url and model:
        return OpenAI(
            api_key=api_key, 
            base_url=base_url, 
            default_headers={"HTTP-Referer": os.getenv("OPENROUTER_HTTP_REFERER", ""), "X-Title": os.getenv("OPENROUTER_APP_TITLE", "")}
        ), model
        
    # 3. 尝试 Azure OpenAI
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    base_url = os.getenv("AZURE_OPENAI_ENDPOINT")
    model = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    
    if api_key and base_url and model:
        from openai import AzureOpenAI
        return AzureOpenAI(
            api_key=api_key,
            azure_endpoint=base_url,
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
        ), model

    raise ValueError("未在 .env 文件中找到有效的 LLM 配置。")

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    
    # 载入上级目录的.env文件
    env_path = os.path.join(project_root, '.env')
    load_dotenv(env_path)
    
    client, model = get_fallback_client()
    
    filtered_json_path = os.path.join(current_dir, 'ismism-sum-filtered.json')
    overview_path = os.path.join(current_dir, 'overview.txt')
    output_path = os.path.join(current_dir, 'ismism-sum-enhanced.json')
    
    if not os.path.exists(filtered_json_path):
        print(f"找不到输入的JSON文件: {filtered_json_path}")
        return
        
    if not os.path.exists(overview_path):
        print(f"找不到背景介绍文件片段: {overview_path}")
        return
    
    with open(overview_path, 'r', encoding='utf-8') as f:
        overview_text = f.read()
        
    with open(filtered_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print(f"开始处理，载入数据项数目: {len(data)}")
    print(f"正使用模型: {model}")
    
    for key, item in data.items():
        print(f"\n---> 正在处理项: {key} - {item.get('ch_name', '未命名')}")
        
        # 增量处理支持断点续传
        if "example_people" in item and "simple_story" in item and item["example_people"]:
            print(f"跳过 {key}，该项已包含 'example_people' 字段。")
            continue
            
        # 按照要求忽略 en_name
        filtered_item = {k: v for k, v in item.items() if k != "en_name"}
        item_str = json.dumps(filtered_item, ensure_ascii=False, indent=2)
        
        prompt = f"""
你将获得一份关于哲学立场的背景材料文本《overview.txt》，以及其中某个具体的哲学立场（项目）的数据。
请根据背景材料，结合该项自带的维度以及特征信息，生成并补充以下两个字段：
1. "example_people": 这种哲学的代表人物，写一个即可（如果是通俗的立场或者民间立场，可以不具名某一类人或虚构的典型代表，只需点出其代表性）。
2. "simple_story": 用一个简单的叙事（不一定是故事）通俗易懂地解释这个行为可能对应的想法、日常生活或者可能会做出的事情，帮助普通人理解这种哲学立场的实际表现。

【背景材料 - 文本概览】
{overview_text}

【当前需要处理的哲学立场项】
{item_str}

要求：
1. 请直接输出合法的 JSON 格式对象文本，不要包含类似 ` ```json ` 等其他多余内容。
2. JSON 对象必须且仅包含两个键："example_people", "simple_story"。键名保留英文。
"""

        messages = [
            {"role": "system", "content": "你是一个精通哲学的助理。你必须提供严格合法的 JSON 对象，不带有任何Markdown格式以及开场白。"},
            {"role": "user", "content": prompt}
        ]
        
        success = False
        for attempt in range(3):
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.7
                )
                
                raw_content = response.choices[0].message.content
                clean_content = clean_json_string(raw_content)
                result = json.loads(clean_content)
                
                item["example_people"] = result.get("example_people", "")
                item["simple_story"] = result.get("simple_story", "")
                success = True
                print(f"成功 -> 代表人物: {item['example_people']}")
                break
            except json.JSONDecodeError:
                print(f"第 {attempt + 1} 次尝试解析 JSON 出错，返回的内容为: {raw_content}")
                time.sleep(2)
            except Exception as e:
                print(f"第 {attempt + 1} 次尝试请求 API 出错: {e}")
                time.sleep(3)
        
        if not success:
            print(f"项 {key} 多次请求失败，跳过此条...")
            
        # 每次成功处理一项都写盘，安全保险
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        # 休眠，避免触发速率限制 (可根据需要调整时间)
        time.sleep(1)
        
    print(f"\n全部处理完成！增强版文件已保存至: {output_path}")

if __name__ == "__main__":
    main()
