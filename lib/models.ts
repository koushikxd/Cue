import { createGroq } from "@ai-sdk/groq";
import { customProvider } from "ai";

export type Model =
  | "llama-3.1-8b"
  | "llama-3.3-70b"
  | "llama-4-scout"
  | "qwen3-32b";

export function createLLM(apiKey: string) {
  const groq = createGroq({ apiKey });

  return customProvider({
    languageModels: {
      "llama-3.1-8b": groq("llama-3.1-8b-instant"),
      "llama-3.3-70b": groq("llama-3.3-70b-versatile"),
      "llama-4-scout": groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      "qwen3-32b": groq("qwen/qwen3-32b"),
    },
  });
}

export const modelOptions: { id: Model; name: string }[] = [
  { id: "llama-3.1-8b", name: "Llama 3.1 8B" },
  { id: "llama-3.3-70b", name: "Llama 3.3 70B" },
  { id: "llama-4-scout", name: "Llama 4 Scout" },
  { id: "qwen3-32b", name: "Qwen 3 32B" },
];
