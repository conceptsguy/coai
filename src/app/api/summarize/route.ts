import { generateText } from "ai";
import { getModel } from "@/lib/ai/providers";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, title } = (await req.json()) as {
    messages: Array<{ role: string; content: string }>;
    title: string;
  };

  // Use a cheap/fast model for summarization
  const model = getModel("anthropic", "claude-haiku-4-5-20251001");

  const { text } = await generateText({
    model,
    system: `You are a concise summarizer. Given a chat conversation, produce a brief summary that captures:
- The main topic(s) being discussed
- Key decisions, conclusions, or insights reached
- Any open questions or next steps
- The general direction/intent of the conversation

Keep the summary under 300 words. Write in present tense. Be specific about content, not meta-commentary.`,
    prompt: `Chat title: "${title}"

Conversation:
${messages
  .filter((m) => m.role !== "system")
  .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
  .join("\n\n")}

Provide a concise summary of this conversation:`,
  });

  return Response.json({ summary: text });
}
