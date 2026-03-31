import { generateText } from "ai";
import { getModel } from "@/lib/ai/providers";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 15;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, includeDescription } = (await req.json()) as {
    messages: Array<{ role: string; content: string }>;
    includeDescription?: boolean;
  };

  const model = getModel("anthropic", "claude-haiku-4-5-20251001");

  const conversationText = messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n\n");

  if (includeDescription) {
    const { text } = await generateText({
      model,
      system:
        "Based on the following conversation, generate a JSON object with two fields:\n" +
        '- "title": a short (3-6 word) project title\n' +
        '- "description": a single sentence describing what this project is about\n' +
        "Return ONLY the JSON object, no markdown formatting.",
      prompt: conversationText,
    });

    try {
      const parsed = JSON.parse(text.trim());
      return Response.json({
        title: parsed.title ?? "",
        description: parsed.description ?? "",
      });
    } catch {
      return Response.json({ title: text.trim(), description: "" });
    }
  }

  const { text } = await generateText({
    model,
    system:
      "Generate a short (3-6 word) title for the following conversation. Return only the title text, no quotes or punctuation wrapping.",
    prompt: conversationText,
  });

  return Response.json({ title: text.trim() });
}
