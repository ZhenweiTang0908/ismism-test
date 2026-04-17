# IsmIsm Test (主义主义)

> A deep assessment tool for exploring philosophical stances, thinking tendencies, and ideologies.
> 
> **Live Demo: [https://www.newnewtown.tech/](https://www.newnewtown.tech/)**

`ismism-test` is an interactive quiz project built on the "主义主义" (IsmIsm) philosophical taxonomy. It aims to transform dense philosophical classifications into structured, machine-readable data, helping users locate their own thinking patterns through relatable, life-oriented questions.

---

## ✨ Core Features

- 🧠 **AI-Powered Interpretation**: Uses an AI model with a "Life Observer" persona. It avoids academic jargon, using metaphors like ordering food or social media habits to deeply analyze your thinking logic.
- 🔬 **Scientific Accuracy Algorithm**: Implements the **Harmonic Mean** algorithm to calculate match rates, capturing internal contradictions and providing objective consistency analysis.
- 🖼️ **Elegant Share Cards**: Automatically generates beautiful result cards on the server, including code, representative figures, life examples, and accuracy percentages for easy sharing.
- 🗺️ **Multi-dimensional Analysis**: Deconstructs your worldview through three core dimensions: **Field**, **Ontology**, and **Phenomenon**.
- 📚 **Structured Taxonomy**: Converts a massive philosophical system into lightweight JSON data, supporting offline processing and online queries.

---

## 🛠️ Architecture

The project consists of two core parts:

### Part 1: Offline Data Pipeline
Located in the `data/` directory, responsible for transforming raw video scripts and classification tables into application-ready structured data:
1. **Extraction & Normalization**: Uses LLM to extract node features from scripts.
2. **Data Enhancement**: Generates representative figures and plain-language stories for each "ism".
3. **Question Bank Generation**: Automatically generates distinctive quiz questions based on the `overview.txt` logical framework.

### Part 2: Web Application
Located in the `website/` directory, built with a modern frontend stack:
- **Framework**: Next.js (App Router)
- **Runtime**: Node.js (for Image Generation)
- **Styling**: Vanilla CSS + Tailwind-like utilities
- **AI**: OpenAI API / SiliconCloud (DeepSeek/Llama)
- **Deployment**: Vercel

---

## 🚀 Getting Started

### Local Development
```bash
# Enter the website directory
cd website

# Install dependencies
npm install

# Start development server
npm run dev
```

### Deployment
- **Vercel**: Set the root directory to `website` for one-click deployment.
- **Environment Variables**: `SILICONCLOUD_API_KEY` is required to enable the AI interpretation feature.

---

## 📖 Core Principles

This assessment assumes that a person's philosophical stance can be revealed by answering several core questions:
- **Field**: What kind of background world do you assume? (Order, Conflict, Center, Nothingness)
- **Ontology**: What do you consider to be truly real?
- **Phenomenon**: How does reality appear to you?

The quiz does not fabricate results at runtime; it maps user response patterns to pre-defined nodes in the **IsmIsm Cube**.

---

## 🔗 References & Credits

- **Original Author's Explanation (Chinese)**: [【主义主义】哲学意识形态大全-总纲](https://www.bilibili.com/video/BV1JT4y1K7dp/)
- **IsmIsm Interactive Cube**: [ismismtag.com](https://ismismtag.com/)

---

## 📄 License

This repository includes a [LICENSE](LICENSE) file. Please verify the source and reuse boundaries of the original materials before redistribution or secondary development.
