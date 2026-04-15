import json
import os

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    ism_file = os.path.join(current_dir, 'ism.json')
    processed_file = os.path.join(current_dir, 'ism_processed.json')
    output_file = os.path.join(current_dir, 'ismism-sum.json')
    
    # 检查两个文件是否存在
    if not os.path.exists(ism_file):
        print(f"文件不存在: {ism_file}")
        return
    if not os.path.exists(processed_file):
        print(f"文件不存在: {processed_file}")
        return
        
    # 读取原始的 ism.json
    with open(ism_file, 'r', encoding='utf-8') as f:
        ism_data = json.load(f)
        
    # 读取刚才生成处理后的 ism_processed.json
    with open(processed_file, 'r', encoding='utf-8') as f:
        processed_data = json.load(f)
        
    print(f"原始数据条目数: {len(ism_data)}")
    print(f"新处理的数据条目数: {len(processed_data)}")
        
    # 合并数据。以原有的 ism_data 为基础，用 processed_data 里的覆盖或新增
    for key, val in processed_data.items():
        if key in ism_data:
            # 如果仅仅是补充，可以更细致地进行合并，比如保留原来的名字等，这里用 update 进行属性覆盖
            ism_data[key].update(val)
        else:
            ism_data[key] = val
            
    # 为了让生成的 JSON 更加美观有序，我们可以尝试对 key 进行一定的排序，但要保留 introduction
    # introduction 我们通常希望放在开头或结尾
    # 这里直接按照插入顺序/字典更新导出
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(ism_data, f, ensure_ascii=False, indent=2)
        
    print(f"合并完成！新的数据已经保存至: {output_file}")
    print(f"合并后的总条目数: {len(ism_data)}")

if __name__ == '__main__':
    main()
