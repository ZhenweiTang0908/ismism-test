import json
import os

input_file = os.path.join("data", "ismism-sum.json")
output_file = os.path.join("data", "ismism-sum-filtered.json")

with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)

new_data = {}
for key, value in data.items():
    parts = key.split('-')
    if len(parts) == 2 or len(parts) == 4:
        continue
    new_data[key] = value

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(new_data, f, ensure_ascii=False, indent=2)

print(f"Processed {len(data)} items. Remaining {len(new_data)} items. Saved to {output_file}")
