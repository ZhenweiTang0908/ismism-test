# ismism-test

`ismism-test` is a philosophy-oriented quiz project built around the classification system behind `主义主义`.

The repository has two practical goals:

1. Turn a large, hierarchical philosophical taxonomy into structured machine-readable data.
2. Use that data to power a web quiz that places a respondent near a specific ideological or philosophical position inside that taxonomy.

This is not a psychometric instrument in the scientific sense. It is better understood as a structured interpretive test: it takes a philosophical framework, turns it into a question set, and maps a user back into that framework.

## What The Test Is For

The test is designed to answer a simple question:

Which philosophical tendency does a person seem closest to, given how they describe the world, existence, and lived experience?

In practice, the site is meant to:

- give users a readable entry point into the `主义主义` framework
- translate abstract positions into everyday judgments and scenarios
- connect a short quiz result to a richer catalog entry with labels, features, and examples
- make a dense classification system easier to browse than reading raw source material

The current website implementation focuses on three dimensions:

- `Field`
- `Ontology`
- `Phenomenon`

The full conceptual system also includes `Purpose`, but the current quiz flow on the website produces a three-part result code and then looks up the matching entry in the catalog.

## How The Test Operates

At a high level, the test works in four stages:

1. A curated question bank presents short agreement-based statements.
2. The respondent answers those statements in the web interface.
3. The application converts the answer pattern into a compact result code across the tested dimensions.
4. That code is used to retrieve a matching catalog entry, which is then shown with its Chinese name, English name, axis notes, feature summary, example figure, and plain-language story.

The important point is that the quiz does not invent results on the fly. It uses a predefined catalog and predefined questions. The final result is a lookup into an existing taxonomy rather than a free-form LLM judgment at runtime.

## The Core Principle

The framework behind the test assumes that a philosophical position can be described by answering a small set of recurring questions:

- What kind of background world or structural field does one assume?
- What counts as truly real or foundational?
- How does reality appear to a subject?
- What kind of action or direction does this understanding imply?

In the source framework, these are the four major dimensions:

- `Field`
- `Ontology`
- `Phenomenon`
- `Purpose`

The framework then combines those dimensions with four recurring structural motifs:

- `Order`
- `Conflict`
- `Center`
- `Nothingness`

The result is a grid-like philosophical taxonomy. In the project data, that taxonomy is represented as numbered paths such as `1`, `1-1`, `1-1-1`, and `1-1-1-1`, which together form a four-level tree.

The quiz is therefore based on a simple idea:

Instead of asking users to identify as “realist”, “idealist”, or “materialist” directly, ask them to react to statements that indirectly reveal how they interpret structure, reality, and experience. Then place them near the corresponding node in the taxonomy.

## Reading `overview.txt`

[overview.txt](E:\Code\ismism\ismism-test\data\overview.txt) is the project’s conceptual bridge document. It is not raw source data, and it is not code. Its job is to explain the internal logic of the framework in plain prose so the rest of the pipeline can stay coherent.

It does five important things.

First, it explains the four-dimensional model. The text argues that a philosophical stance is not just one opinion but a structured answer to four linked questions about world, being, experience, and action.

Second, it defines the meaning of the four dimensions:

- `Field` means the background system in which things happen. It is broader than “world” and emphasizes structure, relation, and context.
- `Ontology` means what really counts as existing. It asks what is fundamental rather than merely visible.
- `Phenomenon` means how reality appears to a subject. It focuses on experience, perception, and interpretation.
- `Purpose` means where action is directed. It turns understanding into orientation and practice.

Third, it introduces the four recurring elements used across the system:

- `Order` is associated with stability, repetition, regulation, and closure.
- `Conflict` is treated as contradiction, tension, and the driver of change.
- `Center` is tied to subjectivity, selfhood, and the organizing role of consciousness.
- `Nothingness` is described as negation, breakdown, openness, and the space from which new meaning can emerge.

Fourth, it uses those combinations to explain four large philosophical tendencies in the framework’s own language:

- `Realism` is presented as a stance centered on order and stable structure.
- `Metaphysics` is presented as a deeper inquiry into how existence emerges beyond surface order.
- `Idealism` is presented as a stance that privileges subjectivity and the organizing role of consciousness.
- `Materialism` is treated as the most practice-oriented position, emphasizing material processes, labor, contradiction, and transformation.

Fifth, it gives a “server/computer” metaphor to make the abstract model easier to grasp:

- realism treats the world like a self-consistent rule system
- metaphysics asks what stands behind the system
- idealism centers the operator or consciousness
- materialism focuses on the concrete operation itself rather than a hidden controller

In short, `overview.txt` is the interpretive key for the whole repository. It tells you how the taxonomy is supposed to be read, how the categories relate to one another, and what kind of distinctions the generated quiz questions are meant to capture.

## Part 1: Data Processing

Part 1 of the project is the offline data-building pipeline in [data](E:\Code\ismism\ismism-test\data).

Its purpose is to transform long-form source material into a structured catalog and then into a reusable question bank.

### Inputs

The pipeline starts from three kinds of material:

- [ism.json](E:\Code\ismism\ismism-test\data\ism.json): the base hierarchical taxonomy
- [ism-video-script](E:\Code\ismism\ismism-test\data\ism-video-script): transcript-like text files tied to specific nodes
- [overview.txt](E:\Code\ismism\ismism-test\data\overview.txt): the framework explanation used to keep later generation aligned

### Processing Steps

1. [process_scripts.py](E:\Code\ismism\ismism-test\data\process_scripts.py) reads the transcript files and uses an LLM with structured output to extract normalized node data such as ID, names, axis summaries, and feature summaries. The output is `ism_processed.json`.
2. [merge_scripts.py](E:\Code\ismism\ismism-test\data\merge_scripts.py) merges those extracted entries back into the base taxonomy and writes `ismism-sum.json`.
3. [filter.py](E:\Code\ismism\ismism-test\data\filter.py) removes selected levels from the merged taxonomy to create a filtered set used for later generation. The output is `ismism-sum-filtered.json`.
4. [process_filtered_sum.py](E:\Code\ismism\ismism-test\data\process_filtered_sum.py) combines the filtered catalog with `overview.txt` and asks an LLM to enrich each item with two human-facing fields: an example figure and a simple explanatory story. The output is `ismism-sum-enhanced.json`.
5. [generate_question_bank.py](E:\Code\ismism\ismism-test\data\generate_question_bank.py) uses the enhanced catalog plus `overview.txt` to generate the quiz question bank. It samples reference items, constrains question style, and writes `ismism-question-bank.json`.

### Why This Processing Exists

Without Part 1, the website would only have a raw classification tree. That is not enough for an interactive test.

Part 1 makes the later product possible by turning raw philosophical material into:

- a cleaner catalog
- richer explanatory entries
- reusable question prompts
- a stable lookup table for quiz results

This is the layer that converts source material into application-ready data.

## Part 2: Website

The deployable web app lives in [website](E:\Code\ismism\ismism-test\website).

At runtime, the site uses prebuilt JSON files rather than generating philosophical content from scratch. The website:

- loads the question bank
- presents the quiz
- computes the result code
- looks up the matching catalog entry
- stores submissions through the API layer when configured

This separation is deliberate. Data generation happens offline in Part 1; quiz delivery happens online in Part 2.

## Repository Layout

```text
.
├─ data/      # offline processing pipeline and generated datasets
├─ llm/       # shared LLM helpers for structured generation
├─ website/   # Next.js app that serves the quiz
├─ LICENSE
├─ README.md
└─ requirements.txt
```

## Running The Website

From `website/`:

```bash
npm install
npm run dev
```

For Vercel deployment, set the project root directory to `website`.

## License

This repository includes a [LICENSE](LICENSE) file. Because the project also depends on processed source material and transcript-derived content, you should verify content provenance and reuse boundaries before redistribution.
