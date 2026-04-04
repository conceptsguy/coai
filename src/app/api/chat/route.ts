import { streamText } from "ai";
import { getModel } from "@/lib/ai/providers";
import { createClient } from "@/lib/supabase/server";
import type { ModelProvider, ConnectedContext, SharedContextDoc } from "@/types/canvas";

export const maxDuration = 60;

function buildSharedContextBlock(sc: SharedContextDoc): string {
  const lines: string[] = [
    "## Project Context",
    "You are working within a shared cognitive workspace for a collaborative team.",
    "",
  ];

  if (sc.problemStatement) {
    lines.push(`**Problem Statement:** ${sc.problemStatement}`, "");
  }

  if (sc.constraintsAndGoals.length > 0) {
    lines.push("**Constraints & Goals:**");
    sc.constraintsAndGoals.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  if (sc.workstreams.length > 0) {
    const labels = sc.workstreams.map((w) => w.label).join(", ");
    lines.push(`**Active Workstreams:** ${labels}`, "");
  }

  if (sc.decisionsMade.length > 0) {
    lines.push("**Key Decisions Made:**");
    sc.decisionsMade.forEach((d) => lines.push(`- ${d.decision}`));
    lines.push("");
  }

  if (sc.tensionsAndOpenQuestions.filter((t) => t.status === "open").length > 0) {
    lines.push("**Open Questions & Tensions:**");
    sc.tensionsAndOpenQuestions
      .filter((t) => t.status === "open")
      .forEach((t) => lines.push(`- ${t.description}`));
    lines.push("");
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();

  const { messages, provider, modelId, connectedContexts, sharedContext } = body as {
    messages: Array<{
      role: "user" | "assistant" | "system";
      parts?: Array<{ type: string; text?: string }>;
    }>;
    provider: ModelProvider;
    modelId: string;
    connectedContexts?: ConnectedContext[];
    sharedContext?: SharedContextDoc;
  };

  if (!provider || !modelId) {
    return new Response(
      JSON.stringify({ error: "Missing provider or modelId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Convert UIMessage parts format to simple content strings, filtering out empty messages
  const convertedMessages = messages
    .map((msg) => ({
      role: msg.role,
      content:
        msg.parts
          ?.filter((p) => p.type === "text" && p.text)
          .map((p) => p.text!)
          .join("") ?? "",
    }))
    .filter((msg) => msg.content.trim() !== "");

  // Build system prompt
  const systemParts: string[] = [];

  // 1. Shared context block (project-level awareness)
  if (sharedContext) {
    systemParts.push(buildSharedContextBlock(sharedContext));
  }

  // 2. Edge-based connected context (ADR-0006 — composable with shared context)
  if (connectedContexts && connectedContexts.length > 0) {
    const contextBlocks = connectedContexts
      .map((ctx) => {
        if (ctx.sourceType === "file") {
          return `## Connected File: "${ctx.sourceTitle}"\nFile content:\n${ctx.fileContent ?? ctx.summary}`;
        }
        return `## Connected Chat: "${ctx.sourceTitle}"\n${ctx.summary}`;
      })
      .join("\n\n---\n\n");

    systemParts.push(
      `## Connected Thread Context\nThe following are summaries from chat threads and files connected to this conversation. Use this context to inform your responses — reference relevant points, build on ideas, and be aware of what has been discussed or documented elsewhere.\n\n${contextBlocks}`
    );
  }

  // 3. Closing instruction
  if (systemParts.length > 0) {
    systemParts.push(
      "---\nRespond helpfully and naturally. If you surface a new insight, decision, or tension that the whole team should know about, mention it clearly — the user can choose to share it with teammates."
    );
  }

  const systemPrompt = systemParts.length > 0
    ? systemParts.join("\n\n")
    : undefined;

  const model = getModel(provider, modelId);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: convertedMessages,
  });

  return result.toUIMessageStreamResponse();
}
