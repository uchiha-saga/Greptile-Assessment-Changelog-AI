/**
 * NVIDIA NIM (Nemotron 3 Nano 30B A3B) chat completions client.
 * API: https://integrate.api.nvidia.com/v1/chat/completions (OpenAI-compatible)
 */

const NIM_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL_ID = "nvidia/nemotron-3-nano-30b-a3b";

export type ChangelogDraft = {
  title: string;
  changes: string[];
  impact: string[];
  risks: string[];
};

export async function generateChangelog(
  prompt: string,
  apiKey: string
): Promise<ChangelogDraft> {
  const res = await fetch(NIM_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NVIDIA NIM error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw =
    data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!raw) throw new Error("Empty response from LLM");

  return parseChangelogResponse(raw);
}

/** Parse LLM output into { title, changes, impact, risks }. Handles JSON and ```json blocks. */
function parseChangelogResponse(raw: string): ChangelogDraft {
  let jsonStr = raw;
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) jsonStr = codeBlock[1].trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error("LLM did not return valid JSON. Raw: " + raw.slice(0, 200));
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM response is not an object");
  }

  const o = parsed as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title : "Release";
  const changes = arrayOfStrings(o.changes);
  const impact = arrayOfStrings(o.impact);
  const risks = arrayOfStrings(o.risks);

  return { title, changes, impact, risks };
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}
