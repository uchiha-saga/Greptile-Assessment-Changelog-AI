import { NextResponse } from "next/server";
import { filterAndBudget } from "@/lib/diffFilter";
import { generateChangelog as callNemotron } from "@/lib/nemotron";


export async function POST(req: Request) {
  try {
    const { repo, base, head, ignoreNoise, commits, files } = await req.json();

    const { selected, droppedCount } = filterAndBudget(files, {
      ignoreNoise: !!ignoreNoise,
      maxFiles: 12,
      maxPatchChars: 22000,
    });

    const prompt = `
You are writing release notes for users of a developer tool.
Return ONLY valid JSON with keys: title, changes, impact, risks.

Rules:
- Bullet points must be concise and user-facing.
- Group related changes.
- Ignore purely formatting/lint changes unless they impact behavior.
- Provide 3-6 bullets per section (can be fewer).
- If no meaningful risks, return risks as [].

Context:
Repo: ${repo}
Range: ${base}...${head}

Commit titles:
${(commits ?? []).map((c: any) => `- ${c.message}`).join("\n")}

Selected file patches:
${selected.map((f: any) => `\n### ${f.filename}\n${f.patch}`).join("\n")}

Note: ${droppedCount} additional files with patches were omitted due to budget.
`;

    const apiKey = process.env.NVIDIA_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "NVIDIA_API_KEY is not set. Get a free key at https://build.nvidia.com/explore/discover" },
        { status: 400 }
      );
    }

    const out = await callNemotron(prompt, apiKey);

    if (!out || !Array.isArray(out.changes) || !Array.isArray(out.impact) || !Array.isArray(out.risks)) {
      throw new Error("LLM response invalid");
    }

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
