import { Client, ID, InputFile, Storage, TablesDB } from "node-appwrite";

/**
 * generate-strain-image — execute: team:admins.
 * Body: { strainId: string }
 * Generates an image with an OpenAI-compatible Images API, uploads it to the
 * "strain-images" bucket and stores the public view URL on the strain row.
 *
 * Required env vars:
 *   APPWRITE_API_KEY — server API key with tablesDB + storage scope
 *   AI_API_KEY — OpenAI (or OpenAI-compatible) API key
 *   APPWRITE_DATABASE_ID (optional, default "straindex")
 *   APPWRITE_BUCKET_ID (optional, default "strain-images")
 *   AI_BASE_URL (optional, default "https://api.openai.com/v1")
 *   AI_IMAGE_MODEL (optional, default "gpt-image-1")
 */
export default async ({ req, res, log, error }) => {
  try {
    const AI_API_KEY = process.env.AI_API_KEY;
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");
    const AI_BASE_URL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const AI_IMAGE_MODEL = process.env.AI_IMAGE_MODEL || "gpt-image-1";

    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://cloud.appwrite.io/v1";
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const databaseId = process.env.APPWRITE_DATABASE_ID || "straindex";
    const bucketId = process.env.APPWRITE_BUCKET_ID || "strain-images";

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(process.env.APPWRITE_API_KEY);
    const tables = new TablesDB(client);
    const storage = new Storage(client);

    const body =
      req.bodyJson && typeof req.bodyJson === "object" && Object.keys(req.bodyJson).length
        ? req.bodyJson
        : JSON.parse(req.bodyText || "{}");
    const strainId = body.strainId;
    if (!strainId) return res.json({ error: "Missing strainId" }, 400);

    const strain = await tables
      .getRow({ databaseId, tableId: "strains", rowId: strainId })
      .catch(() => null);
    if (!strain) return res.json({ error: "Strain not found" }, 404);

    const prompt = `Generate a photorealistic close-up image of a cannabis bud of the "${strain.name}" strain. It's a ${strain.type} strain with ${strain.dominant_terpene} terpene. The bud should look frosty with trichomes, have realistic coloring appropriate for a ${strain.type} strain. Shot on macro lens, dark moody background with dramatic studio lighting. Ultra high resolution, 4K quality.`;

    log(`Generating image for: ${strain.name}`);

    const aiRes = await fetch(`${AI_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: AI_IMAGE_MODEL, prompt, size: "1024x1024" }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => "");
      error(`AI image error [${aiRes.status}]: ${detail}`);
      if (aiRes.status === 429) {
        return res.json({ error: "Rate limited. Please try again in a moment." }, 429);
      }
      if (aiRes.status === 402) {
        return res.json({ error: "AI credits exhausted. Please add funds." }, 402);
      }
      throw new Error(`AI image error [${aiRes.status}]: ${detail}`);
    }

    const aiData = await aiRes.json();
    let bytes;
    const b64 = aiData.data?.[0]?.b64_json;
    if (b64) {
      bytes = Buffer.from(b64, "base64");
    } else {
      const url = aiData.data?.[0]?.url;
      if (!url) throw new Error("No image generated");
      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error(`Image download failed [${imgRes.status}]`);
      bytes = Buffer.from(await imgRes.arrayBuffer());
    }

    const file = await storage.createFile({
      bucketId,
      fileId: ID.unique(),
      file: InputFile.fromBuffer(bytes, `${strainId}.png`),
    });

    const imageUrl = `${endpoint}/storage/buckets/${bucketId}/files/${file.$id}/view?project=${projectId}`;

    // Best-effort cleanup of the previous generated image, if it lives in our bucket.
    const prev = typeof strain.image_url === "string" ? strain.image_url : "";
    const prevMatch = prev.match(/\/storage\/buckets\/([^/]+)\/files\/([^/]+)\/view/);
    if (prevMatch && prevMatch[1] === bucketId) {
      await storage.deleteFile({ bucketId, fileId: prevMatch[2] }).catch(() => undefined);
    }

    await tables.updateRow({
      databaseId,
      tableId: "strains",
      rowId: strainId,
      data: { image_url: imageUrl },
    });

    log(`Image generated and saved for: ${strain.name}`);
    return res.json({ success: true, image_url: imageUrl });
  } catch (e) {
    error(`generate-strain-image error: ${e?.message ?? e}`);
    return res.json({ error: e?.message ?? "Unknown error" }, 500);
  }
};
