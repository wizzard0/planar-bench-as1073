# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A benchmark that tests LLMs' ability to draw ASCII art representations of planar graphs. Models are given a graph as an edge list and asked to produce ASCII art in a code block. The output is then validated for correct nodes and edges (horizontal, vertical, diagonal).

## Commands

```bash
bun install                                    # install dependencies
bun run scenarios/run-scenario.ts <model> <count> [parallel_mod] [runner_id]  # run benchmark
ONE=44 bun run scenarios/run-scenario.ts <model>  # re-run a single task
bun test                                       # run tests
bun run stat/build-html.ts                     # generate HTML results page
tex/convert-figures.sh                         # convert SVG figures to PDF (needs rsvg-convert)
tex/build-arxiv-zip.sh                         # build paper PDF and arxiv zip (needs tectonic)
```

## Architecture

**Pipeline flow:** `run-scenario.ts` → `process-one.ts` → (generate response) → (validate) → (write stats)

- **`scenarios/`** — Entry points. `run-scenario.ts` iterates over graph indices, skipping already-completed runs. `process-one.ts` orchestrates a single graph: load → prompt → call API → validate → store result.

- **`graphs/`** — Graph data and loading. Planar graphs stored as graph6 format in `graphs/planar/{0-9}.g6` (sourced from ANU). `planar.ts` maps a sequential index to (vertex-count, graph-index-within-group). `load-edge-map.ts` decodes graph6 → adjacency matrix → edge map. `claude-parser.ts` handles the graph6 decoding.

- **`api/`** — Multi-provider API layer. `providers.ts` contains all model configurations (OpenAI, Anthropic, Google, DeepSeek, Groq, OpenRouter, Ollama, LM Studio, HuggingFace, xAI). `findModelConfig()` resolves a model name to its provider/URL/params. `generate-response.ts` and `generate-response-stream.ts` handle non-streaming and streaming calls. `generate-response-oai2.ts` handles OpenAI Responses API. API keys come from env vars (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, etc.).

- **`validation/`** — Response validation. `markdown.ts` extracts the last code block from model output. `parse-solution.ts` parses ASCII art into node coordinates and detects edges (horizontal `---`, vertical `|`, diagonal `/\`). `validation.ts` compares detected nodes/edges against the expected graph. `tasks.ts` defines the `Graph` type and prompt template.

- **`stat/`** — Results storage. `stat.ts` uses bun:sqlite to store results in `out/results.sqlite`. Each run records duration, model, validity, prompt, response, etc. `findRun()` checks for existing results to skip re-runs. `build-html.ts` generates a static HTML results page.

- **`out/`** — Output directory. Per-model markdown logs (`out/<model>.md`) and the SQLite database.

## Key Types

- `Graph` (`validation/tasks.ts`): `{ [node: string]: string[] }` — adjacency list where keys are single-letter node names
- `Provider` / `ModelConfig` (`api/providers.ts`): provider URL, env var for API key, model-specific params
- `SingleGraphRunResult` (`stat/stat.ts`): full result record written to SQLite

## Adding a New Model

Add an entry to the appropriate provider in `api/providers.ts`. The key is the CLI model name, the value is either a model ID string or an object with `model`, `postParams`, optional `headers`, `wait`, and `prefix`.
