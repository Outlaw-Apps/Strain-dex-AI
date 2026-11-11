import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const config = JSON.parse(readFileSync(new URL("./appwrite.json", import.meta.url), "utf8"));

test("correcting a Git root preserves function permissions and runtime settings", async () => {
  const { updateFunctionConfig } = await import("./function-config.mjs");
  const current = {
    name: "AI import", runtime: "node-22", execute: ["team:admins"],
    scopes: ["rows.read", "rows.write"], enabled: true, logging: true,
    timeout: 15, commands: "npm install", providerRootDirectory: "",
    providerRepositoryId: "123", installationId: "installation",
  };
  let stored = { ...current };
  const api = {
    get: async () => stored,
    update: async (settings) => {
      // Appwrite defaults omitted permissions to empty during an update.
      stored = { ...stored, ...settings, execute: settings.execute ?? [], scopes: settings.scopes ?? [] };
      return stored;
    },
  };
  await updateFunctionConfig(api, "ai-strain-import", "appwrite/functions/ai-strain-import");
  assert.deepEqual(stored, {
    ...current, functionId: "ai-strain-import",
    providerRootDirectory: "appwrite/functions/ai-strain-import", commands: "npm ci",
  });
});

for (const fn of config.functions) {
  test(`${fn.$id}: Git root contains the configured entrypoint and package`, () => {
    const gitRoot = resolve(root, fn.providerRootDirectory || ".");
    assert.ok(existsSync(resolve(gitRoot, fn.entrypoint)), `${fn.$id}: missing ${fn.entrypoint}`);
    assert.ok(existsSync(resolve(gitRoot, "package.json")), `${fn.$id}: missing package.json`);
    assert.equal(gitRoot, resolve(root, "appwrite", fn.path));
  });

  test(`${fn.$id}: entrypoint loads with its deployed dependencies`, async () => {
    const functionRoot = resolve(root, "appwrite", fn.path);
    // Prevent the repo-root SDK from hiding an incompatible function dependency.
    assert.ok(existsSync(resolve(functionRoot, "node_modules/node-appwrite/package.json")),
      `Run npm ci --prefix appwrite/${fn.path} before this test`);
    const module = await import(pathToFileURL(resolve(functionRoot, fn.entrypoint)).href);
    assert.equal(typeof module.default, "function");
  });
}

for (const provider of [
  { baseUrl: "https://api.x.ai/v1", path: "/stt", model: "grok-voice-transcribe-2.0" },
  { baseUrl: "https://api.openai.com/v1", path: "/audio/transcriptions", model: "whisper-1" },
  { baseUrl: "https://api.groq.com/openai/v1", path: "/audio/transcriptions", model: "whisper-large-v3-turbo", override: true },
]) {
  test(`voice transcription uses the correct endpoint and model for ${provider.baseUrl}`, async (t) => {
    const savedEnv = { ...process.env };
    t.after(() => {
      for (const key of ["AI_API_KEY", "AI_BASE_URL", "AI_TRANSCRIBE_MODEL"]) {
        if (savedEnv[key] === undefined) delete process.env[key];
        else process.env[key] = savedEnv[key];
      }
    });
    process.env.AI_API_KEY = "test-key";
    process.env.AI_BASE_URL = provider.baseUrl;
    delete process.env.AI_TRANSCRIBE_MODEL;
    if (provider.override) process.env.AI_TRANSCRIBE_MODEL = provider.model;

    const calls = [];
    t.mock.method(globalThis, "fetch", async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ text: " Blue Dream " }), {
        headers: { "content-type": "application/json" },
      });
    });
    const { default: transcribe } = await import("./functions/voice-search-transcribe/src/main.js");
    const response = await transcribe({
      req: { bodyJson: { audio: Buffer.alloc(2048).toString("base64") } },
      res: { json: (body, status = 200) => ({ body, status }) },
      error: (message) => assert.fail(message),
    });

    assert.deepEqual(response, { body: { text: "Blue Dream" }, status: 200 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${provider.baseUrl}${provider.path}`);
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.body.get("model"), provider.model);
    assert.equal(calls[0].options.body.get("file").size, 2048);
  });
}
