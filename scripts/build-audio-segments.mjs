import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const pagePath = path.join(process.cwd(), "app", "page.tsx");
const outputPath = path.join(process.cwd(), "public", "audio", "segments.json");

const welcomeNarration =
  "Welcome to Farm Terminology Explorer. In this conservation officer training game, you will practice the language farmers use in real conversations. Visit crop, dairy, equipment, and conservation locations. Explore each scene, hear producer dialogue, answer quick checks, and collect terminology for later review.";

const mapDirectionsNarration =
  "Farm map. Choose a location to explore by selecting a location graphic on the map. Complete the crop farm, dairy farm, equipment yard, and conservation area visits in any order. Each visit opens an exploration scene with hotspots. Select each hotspot, listen to the producer dialogue, answer the knowledge check, and return to the map when the visit is complete. Completed locations stay available for review.";

function extractGameData(source) {
  const start = source.indexOf("const cropHotspots");
  const end = source.indexOf("const initialProgress");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not find game data block in app/page.tsx");
  }

  const dataSource = source
    .slice(start, end)
    .replace(/const (\w+): [^=]+ =/g, "const $1 =");

  return new Function(`${dataSource}; return { locations, finalQuestions };`)();
}

function choices(question) {
  return question.choices.map((choice) => choice.label).join(". ");
}

function pushSegment(segments, id, text) {
  segments.push({
    id,
    text: text.replace(/\s+/g, " ").trim(),
  });
}

const source = await readFile(pagePath, "utf8");
const { locations, finalQuestions } = extractGameData(source);
const segments = [];

pushSegment(segments, "welcome", welcomeNarration);
pushSegment(segments, "map", `${mapDirectionsNarration} 0 of 4 active visits are complete.`);

for (const location of locations) {
  pushSegment(
    segments,
    `location-${location.id}`,
    `${location.title}. Explore the scene. ${location.intro}. Available hotspots: ${location.hotspots
      .map((hotspot) => hotspot.label)
      .join(", ")}.`,
  );

  for (const hotspot of location.hotspots) {
    hotspot.dialogue.forEach((line, index) => {
      const finalLineWithQuestion = index === hotspot.dialogue.length - 1 && hotspot.question;
      pushSegment(
        segments,
        `hotspot-${location.id}-${hotspot.id}-${index}${finalLineWithQuestion ? "-check" : ""}`,
        finalLineWithQuestion
          ? `${line.speaker}: ${line.text} New terms added: ${hotspot.terms.join(", ")}. Knowledge check. ${hotspot.question.prompt} Choices: ${choices(hotspot.question)}.`
          : `${line.speaker}: ${line.text}`,
      );
    });

    if (hotspot.question) {
      pushSegment(segments, `feedback-${hotspot.question.id}-correct`, `Correct. ${hotspot.question.feedback}`);
      pushSegment(segments, `feedback-${hotspot.question.id}-review`, `Review this one. ${hotspot.question.feedback}`);
    }
  }

  pushSegment(
    segments,
    `challenge-${location.id}`,
    `${location.challenge.title}. ${location.challenge.setup}. Questions: ${location.challenge.questions
      .map((question) => `${question.prompt} Choices: ${choices(question)}`)
      .join(". ")}`,
  );

  for (const question of location.challenge.questions) {
    pushSegment(segments, `feedback-${question.id}-correct`, `Correct. ${question.feedback}`);
    pushSegment(segments, `feedback-${question.id}-review`, `Review this one. ${question.feedback}`);
  }

  if (location.wrapUp) {
    pushSegment(segments, `wrapup-${location.id}`, `${location.wrapUp.narration} ${location.wrapUp.matchPrompt}`);
  }
}

pushSegment(
  segments,
  "final",
  `Putting it all together. Conservation Professional Conversation Challenge. Recognize terms from multiple farm visits and choose a follow-up question that keeps the conversation productive. ${finalQuestions
    .map((question) => `${question.prompt} Choices: ${choices(question)}`)
    .join(". ")}`,
);

for (const question of finalQuestions) {
  pushSegment(segments, `feedback-${question.id}-correct`, `Correct. ${question.feedback}`);
  pushSegment(segments, `feedback-${question.id}-review`, `Review this one. ${question.feedback}`);
}

pushSegment(
  segments,
  "complete",
  "Training activity complete. Understanding farm terminology helps conservation professionals build rapport, ask better questions, and communicate more effectively with producers.",
);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(segments, null, 2)}\n`);
console.log(`Wrote ${segments.length} audio segments to ${outputPath}`);
