import { generateText } from "ai";
import { getModel } from "@/lib/ai/providers";

export const maxDuration = 15;

export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: Array<{ role: string; content: string }>;
  };

  const model = getModel("anthropic", "claude-haiku-4-5-20251001");

  const { text } = await generateText({
    model,
    system:
      "Generate a short (3-6 word) title for the following conversation. Return only the title text, no quotes or punctuation wrapping.",
    prompt: messages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
      .join("\n\n"),
  });

  return Response.json({ title: text.trim() });
}
