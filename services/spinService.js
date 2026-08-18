import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAITopic } from "./geminiTopicService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localTopicsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../cs_interview_topics_500.json"), "utf8")
);

export async function handleTopicSpin(selectedLanguage, seenTopicIds = []) {
  // Strategy: 40% chance for real-time AI generation, 60% curated local dataset
  const shouldTryAI = Math.random() < 0.4;

  if (shouldTryAI) {
    const aiTopic = await generateAITopic(selectedLanguage);
    if (aiTopic) {
      return aiTopic;
    }
  }

  // Local Dataset Fallback: Filter unrepeated topics matching the selected language or "All"
  let eligibleTopics = localTopicsData.topics.filter(
    (t) =>
      (t.applicable_languages.includes("All") ||
        t.applicable_languages.includes(selectedLanguage)) &&
      !seenTopicIds.includes(t.id)
  );

  // If all eligible topics have been seen, reset and pick from full pool
  if (eligibleTopics.length === 0) {
    eligibleTopics = localTopicsData.topics.filter(
      (t) =>
        t.applicable_languages.includes("All") ||
        t.applicable_languages.includes(selectedLanguage)
    );
  }

  const randomIndex = Math.floor(Math.random() * eligibleTopics.length);
  return {
    ...eligibleTopics[randomIndex],
    isAI: false
  };
}
