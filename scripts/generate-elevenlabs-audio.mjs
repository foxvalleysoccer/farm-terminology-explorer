import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";

if (!apiKey) {
  throw new Error("Set ELEVENLABS_API_KEY before running this script.");
}

const audioDir = path.join(process.cwd(), "public", "audio");
const generatedDir = path.join(audioDir, "generated");
const segmentsPath = path.join(audioDir, "segments.json");
const manifestPath = path.join(audioDir, "manifest.json");

const segments = JSON.parse(await readFile(segmentsPath, "utf8"));
await mkdir(generatedDir, { recursive: true });

let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  manifest = {};
}

function safeFileName(id) {
  return id.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
}

for (const segment of segments) {
  const fileName = `${safeFileName(segment.id)}.mp3`;
  const publicPath = `/audio/generated/${fileName}`;
  const filePath = path.join(generatedDir, fileName);

  if (manifest[segment.id] === publicPath) {
    console.log(`Skipping ${segment.id}; already in manifest.`);
    continue;
  }

  console.log(`Generating ${segment.id}`);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: segment.text,
        model_id: modelId,
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.8,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs request failed for ${segment.id}: ${response.status} ${errorText}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, audio);
  manifest[segment.id] = publicPath;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`Wrote ElevenLabs manifest to ${manifestPath}`);
