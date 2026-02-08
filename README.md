# AI Changelog Generator

An AI-powered changelog generator for developer tools: point it at a Git repo and a time range, and get **Changes**, **Impact**, and **Risks** generated from the diff using an LLM. Edit the draft, then publish to a public changelog page.

## Features

- **Developer tool** (`/app`): Repo URL + date range (presets like "Last 20 days" or custom) → Fetch changes → Generate draft (title, Changes, Impact, Potential risks) → Edit → Publish.
- **Public changelog** (`/changelog`): List of published releases; each release shows date range, Changes, and Impact.
- **Backend**: GitHub Compare API for commits/diffs; filter & budget patches; NVIDIA Nemotron 3 Nano 30B A3B (NIM) for structured JSON output.

## How to run

```bash
cd changelog-ai
cp .env.example .env
# Edit .env and set NVIDIA_API_KEY (free at https://build.nvidia.com/explore/discover)
npm install
npm run dev
```

- **Home:** [http://localhost:3000](http://localhost:3000)
- **Developer tool:** [http://localhost:3000/app](http://localhost:3000/app)
- **Changelog:** [http://localhost:3000/changelog](http://localhost:3000/changelog)

For submission, include how to run the app and a short screen recording (e.g. 30 seconds) of the flow.

## Environment

| Variable         | Required           | Description                                                                                                                      |
| ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `NVIDIA_API_KEY` | Yes (for generate) | NVIDIA NIM API key for Nemotron 3 Nano 30B A3B. Get a free key at [build.nvidia.com](https://build.nvidia.com/explore/discover). |

## Backend flow

1. **Git diff** – `/api/compare`: GitHub Compare API (with optional date-range resolution and pagination) returns commits and file patches for the range.
2. **Filter & budget** – `diffFilter`: Keep only files with patches; optionally ignore docs/tests/lockfiles; sort by change count; take up to 12 files and 22k chars of patch text.
3. **LLM** – `/api/generate`: One prompt (repo, range, commit titles, selected patches) → NVIDIA Nemotron 3 Nano 30B A3B (NIM) → JSON: `title`, `changes`, `impact`, `risks`.
4. **Storage** – `/api/releases`: Published drafts are appended to `data/releases.json` (JSON file on disk). Changelog pages read from it via `lib/releases.ts` or the API. In practical application, we use a database such as Supabase to store the changelog data.

## AI / tools

- **LLM:** [NVIDIA Nemotron 3 Nano 30B A3B](https://build.nvidia.com/nvidia/nemotron-3-nano-30b-a3b) via NVIDIA NIM (`https://integrate.api.nvidia.com/v1/chat/completions`), OpenAI-compatible API.
- I have used ChatGPT to brainstorm ideas and Cursor as coding assistant.

## Technical and product decisions

<!-- Add your notes here: why you made the technical and product decisions that you made. -->

Main idea to add "Risks" section is to help the developers be aware of the potential risks of the changes.
This will help the developers to debug any issues that may arise from the changes.
In future implementation, we can add more detailed analysis of the risks. We can also add a "Debugging" section to trace the issues and fix them.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [NVIDIA NIM Nemotron 3 Nano](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-nano-30b-a3b)
