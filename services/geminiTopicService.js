import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY 
});

export async function generateAITopic(language = "Java") {
  const domains = [
    "System Design & Cloud Architecture",
    "Operating Systems & Concurrency",
    "Computer Networks & Protocols",
    "Data Structures & Low-Level Mechanics",
    "Database Internals & Optimization",
    "Production Incident Debugging & STLC"
  ];
  const chosenDomain = domains[Math.floor(Math.random() * domains.length)];

  const prompt = `Generate a realistic, impromptu technical interview prompt for a software engineer.
Target Language: ${language}
Domain: ${chosenDomain}
Include a mix of core CS theory, modern architectural trade-offs, or real-world debugging scenarios.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            domain: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            prompt_guide: { type: Type.STRING },
            key_research_points: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["id", "title", "domain", "prompt_guide", "key_research_points"]
        }
      }
    });

    const parsed = JSON.parse(response.text);
    return {
      id: parsed.id || `AI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: parsed.title,
      domain: parsed.domain || chosenDomain,
      difficulty: parsed.difficulty || 'Advanced',
      prompt_guide: parsed.prompt_guide,
      key_research_points: parsed.key_research_points,
      isAI: true
    };
  } catch (error) {
    console.warn("Gemini API call failed, falling back to local JSON dataset:", error);
    return null; // Triggers fallback to local dataset
  }
}
