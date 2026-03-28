import { streamText } from "ai";
import { getModel } from "@/lib/ai/providers";
import type { ModelProvider, ConnectedContext } from "@/types/canvas";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();

  const { messages, provider, modelId, connectedContexts } = body as {
    messages: Array<{
      role: "user" | "assistant" | "system";
      parts?: Array<{ type: string; text?: string }>;
    }>;
    provider: ModelProvider;
    modelId: string;
    connectedContexts?: ConnectedContext[];
  };

  if (!provider || !modelId) {
    return new Response(
      JSON.stringify({ error: "Missing provider or modelId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Convert UIMessage parts format to simple content strings
  const convertedMessages = messages.map((msg) => ({
    role: msg.role,
    content:
      msg.parts
        ?.filter((p) => p.type === "text" && p.text)
        .map((p) => p.text!)
        .join("") ?? "",
  }));

  // Build system prompt with connected context
  let systemPrompt: string | undefined;
  if (connectedContexts && connectedContexts.length > 0) {
    const contextBlocks = connectedContexts
      .map(
        (ctx) =>
          `## Connected Chat: "${ctx.sourceTitle}"\n${ctx.summary}`
      )
      .join("\n\n---\n\n");

    systemPrompt = `You are participating in a collaborative AI canvas where multiple chat threads exist and can be connected to share context.

The following are summaries from chat threads that have been connected to this conversation. Use this context to inform your responses — reference relevant points, build on ideas, and be aware of what has been discussed elsewhere. If the user's question relates to something covered in a connected chat, weave that context into your answer naturally.

${contextBlocks}

---
Use this connected context to provide more informed, contextually aware responses. You don't need to mention the connected chats explicitly unless it's relevant to do so.`;
  }

  const model = getModel(provider, modelId);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: convertedMessages,
  });

  return result.toUIMessageStreamResponse();
}
