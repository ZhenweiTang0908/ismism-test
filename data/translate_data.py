import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

BASE_DIR = Path(__file__).resolve().parent
WEBSITE_DATA_DIR = BASE_DIR.parent / "website" / "data"

load_dotenv(BASE_DIR.parent / ".env")

def get_client():
    api_key = os.getenv("SILICONCLOUD_API_KEY")
    base_url = os.getenv("SILICONCLOUD_BASE_URL")
    model = os.getenv("SILICONCLOUD_MODEL")
    if api_key and base_url and model:
        return OpenAI(api_key=api_key, base_url=base_url), model
    raise ValueError("Missing SILICONCLOUD_API_KEY or other config")

def translate_text(client, model, text: str, context: str = "") -> str:
    if not text.strip():
        return text
    prompt = f"Translate the following Chinese text to natural, fluent English. It is related to philosophical and ideological concepts. {context}\n\nOriginal Text:\n{text}"
    for _ in range(3):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a professional translator specializing in philosophy and psychology."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Translation failed, retrying... Error: {e}")
            time.sleep(2)
    raise RuntimeError(f"Failed to translate: {text}")

def translate_sum_enhanced(client, model):
    print("Translating ismism-sum-enhanced.json...")
    input_path = WEBSITE_DATA_DIR / "ismism-sum-enhanced.json"
    output_path = WEBSITE_DATA_DIR / "ismism-sum-enhanced-en.json"
    
    if not input_path.exists():
        print(f"Skipping: {input_path} not found")
        return

    data = json.loads(input_path.read_text(encoding="utf-8"))
    out_data = {}
    
    if output_path.exists():
        out_data = json.loads(output_path.read_text(encoding="utf-8"))

    for key, item in data.items():
        if key in out_data:
            continue
            
        print(f"Translating item {key}: {item.get('ch_name')}")
        # Translate fields
        new_item = dict(item)
        
        if item.get("en_name"):
            new_item["ch_name"] = item["en_name"] # Replace ch_name with en_name for EN version
        else:
            new_item["ch_name"] = translate_text(client, model, item.get("ch_name", ""), "This is a title of a philosophical concept.")
            
        if "axis_list" in item:
            new_item["axis_list"] = [translate_text(client, model, ax, "This is an axis label.") for ax in item["axis_list"]]
            
        if "feature_list" in item:
            new_item["feature_list"] = [translate_text(client, model, f, "This is a feature description.") for f in item["feature_list"]]
            
        if "example_people" in item:
            new_item["example_people"] = translate_text(client, model, item["example_people"], "This describes an example person or archetype.")
            
        if "simple_story" in item:
            new_item["simple_story"] = translate_text(client, model, item["simple_story"], "This is a short illustrative story.")
            
        out_data[key] = new_item
        # Save intermediate
        output_path.write_text(json.dumps(out_data, ensure_ascii=False, indent=2), encoding="utf-8")
        time.sleep(0.5)

def translate_question_bank(client, model):
    print("Translating ismism-question-bank.json...")
    input_path = WEBSITE_DATA_DIR / "ismism-question-bank.json"
    output_path = WEBSITE_DATA_DIR / "ismism-question-bank-en.json"
    
    if not input_path.exists():
        print(f"Skipping: {input_path} not found")
        return

    data = json.loads(input_path.read_text(encoding="utf-8"))
    out_data = {}

    if output_path.exists():
        out_data = json.loads(output_path.read_text(encoding="utf-8"))

    for key, item in data.items():
        if key in out_data:
            continue
            
        print(f"Translating question {key}")
        new_item = dict(item)
        new_item["question"] = translate_text(client, model, item["question"], "This is a personality/philosophy test question.")
        
        new_options = []
        for opt in item["options"]:
            new_opt = dict(opt)
            new_opt["label"] = translate_text(client, model, opt["label"], "This is an answer option.")
            new_options.append(new_opt)
        new_item["options"] = new_options
        
        out_data[key] = new_item
        output_path.write_text(json.dumps(out_data, ensure_ascii=False, indent=2), encoding="utf-8")
        time.sleep(0.5)

def translate_overview(client, model):
    print("Translating overview.txt...")
    input_path = WEBSITE_DATA_DIR / "overview.txt"
    output_path = WEBSITE_DATA_DIR / "overview-en.txt"
    
    if not input_path.exists() or output_path.exists():
        return

    text = input_path.read_text(encoding="utf-8")
    
    print("Translating overview chunk by chunk (simple chunking by double newline)...")
    chunks = text.split("\n\n")
    translated_chunks = []
    for i, chunk in enumerate(chunks):
        if not chunk.strip():
            translated_chunks.append(chunk)
            continue
        print(f"Translating overview chunk {i+1}/{len(chunks)}")
        translated_chunks.append(translate_text(client, model, chunk))
        time.sleep(0.5)
        
    output_path.write_text("\n\n".join(translated_chunks), encoding="utf-8")


if __name__ == "__main__":
    client, model = get_client()
    translate_question_bank(client, model)
    translate_sum_enhanced(client, model)
    translate_overview(client, model)
    print("All translations complete!")
