# ismism-test

这是一个以 `主义主义` 相关资料为主的数据仓库，当前内容主要包括：

- 一个层级化的 JSON 数据文件：`data/ism.json`
- 一组配套视频文稿文本：`data/ism-video-script/`

当前仓库中未包含可直接运行的前端、后端或构建脚本，因此更适合被视为一个数据样本仓库或内容整理仓库。

## 仓库结构

```text
.
├─ data/
│  ├─ ism.json
│  └─ ism-video-script/
├─ LICENSE
└─ README.md
```

## 数据概览

### `data/ism.json`

`ism.json` 是这个仓库的核心文件。它使用编号路径作为键，组织了一棵 4 层结构的思想分类树。

- 总键数：341
- 其中说明性字段：`introduction` 1 个
- 实际节点数：340
- 层级分布：
  - 第 1 层：4 个节点
  - 第 2 层：16 个节点
  - 第 3 层：64 个节点
  - 第 4 层：256 个节点

每个节点通常包含以下字段：

```json
{
  "ch_name": "科学独断论",
  "en_name": "Scientific Dogmatism",
  "axis_list": [
    "场域论1 科学化的宇宙",
    "本体论1 科学实在",
    "认识论1 科学秩序的表象化",
    "目的论1 秩序的永恒统御(无脑循环)"
  ],
  "feature_list": [
    "①对“知识就是力量”的误解。",
    "②对生存的志趣、自由、偶然的否定。",
    "③庸俗版的“永恒轮回”。"
  ]
}
```

编号键采用类似下面的形式：

- `1`
- `1-1`
- `1-1-1`
- `1-1-1-1`

这表示节点在树中的层级路径。可以直接按 `-` 分割键名来重建树结构。

### `introduction`

`ism.json` 中还包含一个 `introduction` 字段，用数组形式保存介绍性 HTML/文本片段，内容主要用于说明“主义主义魔方”的概念、使用方式和背景说明。

### `data/ism-video-script/`

该目录下目前包含 33 份 UTF-8 文本文件，总大小约 919 KB。文件名通常带有：

- 标题
- 层级编号，例如 `(3-3-3)`、`(4-4-4-4)`
- 平台或导出标记

这些文本可以视为部分节点的配套讲稿、字幕稿或内容整理稿。

## 完整度说明

当前数据并非所有节点都已补全。

- 127 个节点的 `en_name` 为空
- 127 个节点的 `feature_list` 为空

这意味着仓库里既有已经整理完成的条目，也有仍处于占位状态的条目。

## 适用场景

这个仓库适合用于：

- 构建“主义主义”主题的可视化页面或知识图谱
- 做层级化思想分类实验
- 将节点数据映射到网页、卡片、图数据库或搜索系统
- 对照视频文稿进行内容补全、校对或结构化抽取

## 读取示例

### Python

```python
import json
from pathlib import Path

data = json.loads(Path("data/ism.json").read_text(encoding="utf-8"))

introduction = data["introduction"]
nodes = {k: v for k, v in data.items() if k != "introduction"}

print(len(nodes))  # 340
print(nodes["1-1-1-1"]["ch_name"])  # 科学独断论
```

### JavaScript

```js
import fs from "node:fs";

const raw = fs.readFileSync("data/ism.json", "utf8");
const data = JSON.parse(raw);

const { introduction, ...nodes } = data;

console.log(Object.keys(nodes).length); // 340
console.log(nodes["1-1-1-1"].ch_name); // 科学独断论
```

## 后续可以补充的内容

如果后续准备把这个仓库发展成正式项目，建议优先补上：

- 数据来源与整理规则
- 字段定义文档
- 节点与视频文稿之间的映射关系
- 一个最小可运行的展示页面或数据查询脚本
- 数据更新方式与版本约定

## License

本仓库当前包含 [LICENSE](LICENSE) 文件。使用前建议结合原始内容来源、文稿来源及实际用途进一步确认版权与转载边界。
