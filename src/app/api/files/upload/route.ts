import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
]);

function isTextFile(mimeType: string): boolean {
  return TEXT_MIME_TYPES.has(mimeType) || mimeType.startsWith("text/");
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;
  const nodeId = formData.get("nodeId") as string | null;

  if (!file || !projectId || !nodeId) {
    return NextResponse.json(
      { error: "Missing file, projectId, or nodeId" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 10MB)" },
      { status: 400 }
    );
  }

  const storagePath = `${projectId}/${nodeId}/${file.name}`;
  const admin = createAdminClient();

  // Upload file to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("project-files")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Extract text content for text files
  let contentText: string | null = null;
  let contentPreview = "";
  if (isTextFile(file.type)) {
    contentText = await file.text();
    contentPreview = contentText.slice(0, 200);
  }

  // Insert file metadata
  const { error: metaError } = await admin.from("files").insert({
    node_id: nodeId,
    project_id: projectId,
    storage_path: storagePath,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    content_text: contentText,
    created_by: user.id,
  });

  if (metaError) {
    // Clean up uploaded file if metadata insert fails
    await admin.storage.from("project-files").remove([storagePath]);
    return NextResponse.json(
      { error: `Metadata insert failed: ${metaError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    storagePath,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    contentPreview,
    contentText,
  });
}
