import os
import json
import glob
import sys
from pydantic import BaseModel, Field

# 确保能导入项目根目录的 llm 模块
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from llm import call_structured

class IsmEntry(BaseModel):
    id: str = Field(description="主义的编号ID，例如 '3-3-1', '1-1-1' 等。需根据文本或文件名中的括号内容进行提取。")
    ch_name: str = Field(description="该主义的中文名称，例如 '存在主义'。")
    en_name: str = Field(description="该主义的英文名称。")
    axis_list: list[str] = Field(description="场域论、本体论、认识论、目的论等属性列表，例如 '场域论3 xxx'、'本体论1 xxx'。")
    feature_list: list[str] = Field(description="该主义的3到4个核心特征，每个特征请以带圆圈的数字（如①、②、③）开头。")

def parse_text_file(filepath: str, filename: str) -> dict:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    system_prompt = (
        "你是一个哲学和结构主义分类学领域的专家。你需要根据提供的视频转录文本，"
        "提取并总结出结构化的数据，表示该内容对应的『主义』。提取的数据将用于生成一份JSON图谱。\n"
        "要求：\n"
        "1. 提取编号ID（如 3-3-1）、中文名（ch_name）、英文名（en_name，如果没有请结合常识翻译）、"
        "axis_list（包括场域论、本体论、认识论、目的论及其内容摘要）、"
        "feature_list（3-4个核心摘要点，用①②③格式开头）。\n"
        "2. 不要遗漏ID，通常包含在标题或文件名中的括号内。\n"
        "3. 保持客观准确的哲学用语。"
    )

    user_input = f"文件名：{filename}\n\n转录文本：\n{content}"

    try:
        result = call_structured(system_prompt, user_input, IsmEntry, temperature=0.2)
        if result:
            return {
                "id": result.id,
                "data": {
                    "ch_name": result.ch_name,
                    "en_name": result.en_name,
                    "axis_list": result.axis_list,
                    "feature_list": result.feature_list
                }
            }
    except Exception as e:
        print(f"Error calling LLM for {filename}: {e}")
    return None

def main():
    input_dir = os.path.join(current_dir, 'ism-video-script')
    output_file = os.path.join(current_dir, 'ism_processed.json')
    
    txt_files = glob.glob(os.path.join(input_dir, '*.txt'))
    
    final_output = {}
    
    print(f"Found {len(txt_files)} text files. Starting processing...")
    
    # Process files
    for file_path in sorted(txt_files):
        filename = os.path.basename(file_path)
        
        # 跳过标记为原文的纯备份文件
        if "原文" in filename:
            print(f"Skipping {filename}")
            continue
            
        print(f"Processing {filename}...")
        parsed = parse_text_file(file_path, filename)
        if parsed and parsed.get("id"):
            final_output[parsed["id"]] = parsed["data"]
            print(f"Successfully processed {parsed['id']} - {parsed['data']['ch_name']}")
        else:
            print(f"Failed to process or parse {filename}")
            
    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)
        
    print(f"All done! Results saved to {output_file}")

if __name__ == "__main__":
    main()
