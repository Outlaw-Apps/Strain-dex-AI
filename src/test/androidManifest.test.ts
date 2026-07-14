import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Android microphone configuration", () => {
  it("requests permission to record audio for voice search", () => {
    const manifest = readFileSync(
      resolve(process.cwd(), "android/app/src/main/AndroidManifest.xml"),
      "utf8",
    );

    expect(manifest).toContain(
      '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
    );
  });
});
