/**
 * voice-search-transcribe — execute: users.
 * Body (JSON): { audio: string (base64), contentType?: string, filename?: string }
 * Returns: { text: string }
 *
 * Required env vars:
 *   AI_API_KEY — OpenAI (or OpenAI-compatible) API key
 *   AI_BASE_URL (optional, default "https://api.openai.com/v1")
 *   AI_TRANSCRIBE_MODEL (optional, default "whisper-1")
 */
export default async ({ req, res, error }) => {
  try {
    const AI_API_KEY = process.env.AI_API_KEY;
    if (!AI_API_KEY) {
      return res.json({ error: "AI provider not configured (AI_API_KEY missing)" }, 500);
    }
    const AI_BASE_URL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const isXai = new URL(AI_BASE_URL).hostname === "api.x.ai";
    const MODEL = process.env.AI_TRANSCRIBE_MODEL || (isXai ? "grok-voice-transcribe-2.0" : "whisper-1");
    const transcribeUrl = `${AI_BASE_URL}${isXai ? "/stt" : "/audio/transcriptions"}`;

    const body =
      req.bodyJson && typeof req.bodyJson === "object" && Object.keys(req.bodyJson).length
        ? req.bodyJson
        : JSON.parse(req.bodyText || "{}");

    const audio = typeof body.audio === "string" ? body.audio : "";
    if (!audio) {
      return res.json({ error: "Missing audio data." }, 400);
    }
    const bytes = Buffer.from(audio, "base64");
    if (bytes.length < 2048) {
      return res.json({ error: "Recording is empty or too short — try again." }, 400);
    }
    if (bytes.length > 25 * 1024 * 1024) {
      return res.json({ error: "Recording too large." }, 413);
    }

    const upstream = new FormData();
    upstream.append("model", MODEL);
    upstream.append(
      "file",
      new Blob([bytes], { type: body.contentType || "audio/wav" }),
      body.filename || "recording.wav",
    );

    const aiRes = await fetch(transcribeUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_API_KEY}` },
      body: upstream,
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => "");
      error(`Transcription failed [${aiRes.status}]: ${detail}`);
      return res.json(
        { error: "Transcription failed", status: aiRes.status, details: detail },
        aiRes.status,
      );
    }

    const data = await aiRes.json();
    return res.json({ text: (data.text ?? "").trim() });
  } catch (e) {
    error(`voice-search-transcribe error: ${e?.message ?? e}`);
    return res.json({ error: e?.message ?? "Unknown error" }, 500);
  }
};
