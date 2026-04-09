/**
 * LLM Service - Handles communication with Ollama, OpenAI, Gemini, LM Studio, and llama.cpp APIs.
 * LM Studio and llama.cpp both expose an OpenAI-compatible API, so they share the same code path.
 */
import type { LLMConfig } from "@/types/llm";

interface LLMResponse {
  content: string;
  model: string;
}

/** Providers that use the OpenAI-compatible /v1/chat/completions endpoint */
const OPENAI_COMPAT_PROVIDERS = ["openai", "lmstudio", "llamacpp"] as const;

function isOpenAICompat(provider: string): boolean {
  return (OPENAI_COMPAT_PROVIDERS as readonly string[]).includes(provider);
}

/**
 * Build the API URL based on provider
 */
function getCompletionUrl(config: LLMConfig): string {
  switch (config.provider) {
    case "ollama":
      return `${config.base_url}/api/chat`;
    case "openai":
      return `${config.base_url || "https://api.openai.com"}/v1/chat/completions`;
    case "lmstudio":
      return `${config.base_url || "http://localhost:1234"}/v1/chat/completions`;
    case "llamacpp":
      return `${config.base_url || "http://localhost:8080"}/v1/chat/completions`;
    case "gemini":
      return `${config.base_url || "https://generativelanguage.googleapis.com"}/v1beta/models/${config.model}:generateContent?key=${config.api_key}`;
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/**
 * Build the request body based on provider
 */
function buildRequestBody(
  config: LLMConfig,
  messages: Array<{ role: string; content: string }>,
  stream: boolean = false
): any {
  if (config.provider === "ollama") {
    return {
      model: config.model,
      messages,
      stream,
      options: {
        temperature: config.temperature,
        num_predict: config.max_tokens,
      },
    };
  }

  if (isOpenAICompat(config.provider)) {
    // OpenAI, LM Studio, and llama.cpp all use the same request format
    return {
      model: config.model,
      messages,
      stream,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
    };
  }

  if (config.provider === "gemini") {
    return {
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.max_tokens,
      },
    };
  }

  throw new Error(`Unknown provider: ${config.provider}`);
}

/**
 * Build request headers
 */
function buildHeaders(config: LLMConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // OpenAI needs a real key; LM Studio and llama.cpp accept any value or none
  if (isOpenAICompat(config.provider) && config.api_key) {
    headers["Authorization"] = `Bearer ${config.api_key}`;
  }
  return headers;
}

/**
 * Parse response based on provider
 */
function parseResponse(config: LLMConfig, data: any): string {
  if (config.provider === "ollama") {
    return data.message?.content || "";
  }
  if (isOpenAICompat(config.provider)) {
    return data.choices?.[0]?.message?.content || "";
  }
  if (config.provider === "gemini") {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  return "";
}

/**
 * Send a chat completion request (non-streaming)
 */
export async function chatCompletion(
  config: LLMConfig,
  messages: Array<{ role: string; content: string }>
): Promise<LLMResponse> {
  const url = getCompletionUrl(config);
  const body = buildRequestBody(config, messages, false);
  const headers = buildHeaders(config);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = parseResponse(config, data);

  return { content, model: config.model };
}

/**
 * Generate AI suggestions for a node's content
 */
export async function generateSuggestions(
  config: LLMConfig,
  nodeTitle: string,
  nodeContent: string
): Promise<string[]> {
  const systemPrompt = `You are a knowledge exploration assistant. Given a topic/note, suggest 3-5 short follow-up explorations. Each suggestion should be a brief phrase (5-10 words max) that would expand the user's understanding. Format: return ONLY a JSON array of strings, nothing else. Example: ["How neural networks learn patterns","Key differences from traditional ML","Real-world applications in healthcare"]`;

  const userPrompt = `Topic: ${nodeTitle}\n\nContent: ${nodeContent}\n\nSuggest explorations:`;

  try {
    const result = await chatCompletion(config, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    // Parse JSON array from response
    const match = result.content.match(/\[[\s\S]*?\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [];
  } catch (error) {
    console.error("Failed to generate suggestions:", error);
    return [];
  }
}

/**
 * Expand a topic - generate a new node's content from a suggestion
 */
export async function expandTopic(
  config: LLMConfig,
  parentTitle: string,
  parentContent: string,
  suggestion: string
): Promise<{ title: string; content: string }> {
  const systemPrompt = `You are a knowledge expansion assistant. Given a parent topic and a suggestion to explore, write a concise but informative explanation (2-4 paragraphs). Use markdown formatting. Be factual and educational.`;

  const userPrompt = `Parent topic: ${parentTitle}\nParent content: ${parentContent}\n\nExpand on: "${suggestion}"`;

  const result = await chatCompletion(config, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return {
    title: suggestion,
    content: result.content,
  };
}

/**
 * Summarize node content
 */
export async function summarizeContent(
  config: LLMConfig,
  title: string,
  content: string
): Promise<string> {
  const systemPrompt = `You are a concise summarizer. Summarize the given content in 2-3 sentences. Be clear and informative.`;

  const result = await chatCompletion(config, [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Title: ${title}\n\nContent: ${content}` },
  ]);

  return result.content;
}

/**
 * RAG-powered chat: answer a question using provided context nodes
 */
export async function ragChat(
  config: LLMConfig,
  question: string,
  contextNodes: Array<{ title: string; content: string; id: string }>,
  chatHistory: Array<{ role: string; content: string }>
): Promise<{ answer: string; referencedNodeIds: string[] }> {
  const contextText = contextNodes
    .map((n, i) => `[Node ${i + 1}: "${n.title}"]\n${n.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = `You are a knowledge assistant. Answer the user's question using ONLY the provided context from their knowledge graph. If the context doesn't contain enough information, say so. Reference specific nodes when relevant by mentioning their titles. Be concise and helpful. Use markdown formatting.

CONTEXT FROM KNOWLEDGE GRAPH:
${contextText}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-6), // Keep last 6 messages for context window
    { role: "user", content: question },
  ];

  const result = await chatCompletion(config, messages);

  // Find which nodes were referenced in the response
  const referencedNodeIds = contextNodes
    .filter((n) => result.content.toLowerCase().includes(n.title.toLowerCase()))
    .map((n) => n.id);

  return {
    answer: result.content,
    referencedNodeIds,
  };
}

/**
 * Time Capsule / Time Lapse: Given a topic, research all key events/processes
 * and return a chronological list of nodes with relationships.
 */
export interface TimeCapsuleEvent {
  title: string;
  date: string;        // approximate date/period
  content: string;     // markdown description
  connections: number[]; // indices of related events in the array
}

export async function generateTimeCapsule(
  config: LLMConfig,
  topic: string
): Promise<TimeCapsuleEvent[]> {
  const systemPrompt = `You are a historian and knowledge architect. Given a topic, research and create a chronological timeline of 8-15 key events/milestones/processes.

For each event, provide:
- title: short event name (5-10 words)
- date: approximate date or period (e.g. "1919", "1920-1923", "October 29, 1923")
- content: 2-3 paragraph markdown explanation of the event, its causes, and significance
- connections: array of indices (0-based) of OTHER events in this list that are directly related/caused by this event

IMPORTANT: Return ONLY a valid JSON array. No explanation text before or after. Each item must have exactly these 4 fields.

Example format:
[{"title":"Treaty of Sèvres","date":"August 10, 1920","content":"## Treaty of Sèvres\\n\\nThe Treaty of Sèvres was...","connections":[2,4]},...]`;

  const result = await chatCompletion(config, [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Create a detailed chronological timeline for: "${topic}"` },
  ]);

  // Extract JSON array from response
  const jsonMatch = result.content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse timeline data from LLM response");
  }

  const events: TimeCapsuleEvent[] = JSON.parse(jsonMatch[0]);

  // Validate structure
  return events.map((e, i) => ({
    title: e.title || `Event ${i + 1}`,
    date: e.date || "Unknown",
    content: e.content || "",
    connections: Array.isArray(e.connections) ? e.connections.filter((c) => c !== i && c >= 0 && c < events.length) : [],
  }));
}

/**
 * Enrich a node's content with media links (images, videos, etc.)
 * LLM generates markdown with embedded media URLs from known sources.
 */
export async function enrichWithMedia(
  config: LLMConfig,
  title: string,
  content: string
): Promise<string> {
  const systemPrompt = `You are a multimedia research assistant. Given a topic, enhance the existing content by adding relevant media links in markdown format.

Rules:
1. Keep ALL existing content intact - only ADD media at the end
2. Add a "## Media & Resources" section at the bottom
3. Include real, working URLs from Wikipedia Commons, YouTube, or other well-known sources
4. For images: use markdown image syntax ![description](url)
5. For YouTube videos: include the full youtube.com/watch?v= URL as a regular link
6. For audio/music: include direct links to audio files if available
7. For reference links: include Wikipedia or other encyclopedia links
8. Add 3-8 relevant media items
9. Only use URLs that are highly likely to be real and working

Example additions:
## Media & Resources

![Historical photograph](https://upload.wikimedia.org/wikipedia/commons/...)

[Watch documentary on YouTube](https://www.youtube.com/watch?v=...)

[Read more on Wikipedia](https://en.wikipedia.org/wiki/...)`;

  const result = await chatCompletion(config, [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Title: ${title}\n\nExisting content:\n${content}\n\nAdd relevant media and resources:` },
  ]);

  return result.content;
}

/**
 * Auto-enrich all nodes in a batch (used after Time Capsule)
 * Returns enriched content for each node
 */
export async function enrichNodeWithRelated(
  config: LLMConfig,
  nodeTitle: string,
  nodeContent: string,
  allNodeTitles: string[]
): Promise<{ relatedTitles: string[]; enrichedContent: string }> {
  const systemPrompt = `You are a knowledge connector and multimedia researcher. Given a topic and a list of other topics in the knowledge graph, do two things:

1. RELATED: Identify which of the listed topics are directly related to this one. Return their exact titles.
2. ENRICH: Add a "## Media & Resources" section with real image/video/Wikipedia links.

Return ONLY valid JSON in this exact format:
{"relatedTitles":["exact title 1","exact title 2"],"enrichedContent":"the original content + new media section in markdown"}`;

  const otherTopics = allNodeTitles.map((t, i) => `${i + 1}. ${t}`).join("\n");

  try {
    const result = await chatCompletion(config, [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Topic: ${nodeTitle}\n\nContent: ${nodeContent}\n\nOther topics in graph:\n${otherTopics}` },
    ]);

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        relatedTitles: Array.isArray(parsed.relatedTitles) ? parsed.relatedTitles : [],
        enrichedContent: parsed.enrichedContent || nodeContent,
      };
    }
  } catch (e) {
    console.error("Enrich failed:", e);
  }

  return { relatedTitles: [], enrichedContent: nodeContent };
}

/**
 * Discover NEW related topics that should be added as new nodes.
 * For each existing node, LLM suggests 1-3 new subtopics that don't already exist.
 * Also identifies connections to existing nodes and adds media.
 */
export interface DiscoveredTopic {
  title: string;
  content: string;       // markdown
  parentTitle: string;   // which existing node spawned this
  relatedExisting: string[]; // titles of existing nodes this connects to
}

export async function discoverAndExpand(
  config: LLMConfig,
  nodeTitle: string,
  nodeContent: string,
  allExistingTitles: string[]
): Promise<{
  newTopics: DiscoveredTopic[];
  existingRelations: string[]; // existing titles that relate to this node
  enrichedContent: string;     // original content + media section
}> {
  const existingList = allExistingTitles.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const systemPrompt = `You are a knowledge graph expansion engine. Given a node and a list of all existing nodes, do THREE things:

1. DISCOVER: Suggest 1-3 NEW topics that are closely related to this node but DON'T already exist in the graph. Each new topic should have a short title and 2-3 paragraph markdown content. These become new nodes.

2. CONNECT: Identify which EXISTING nodes (from the list) are directly related to this node.

3. ENRICH: Add a "## Media & Resources" section to the original content with real Wikipedia/YouTube/image links.

Return ONLY valid JSON:
{
  "newTopics": [
    {"title": "Short New Topic Title", "content": "## Title\\n\\nMarkdown content...", "relatedExisting": ["exact existing title 1"]}
  ],
  "existingRelations": ["exact existing title that relates"],
  "enrichedContent": "original content preserved + \\n\\n## Media & Resources\\n\\n..."
}

RULES:
- New topic titles must NOT match any existing title
- New topics should be genuinely useful expansions (subtopics, related concepts, key figures, consequences)
- Keep new topic content educational and factual
- For enrichedContent, keep ALL original text, only append media section
- Only suggest real, working media URLs from Wikipedia Commons, YouTube, etc.`;

  try {
    const result = await chatCompletion(config, [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Node: "${nodeTitle}"\n\nContent:\n${nodeContent}\n\nExisting nodes:\n${existingList}` },
    ]);

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      const newTopics: DiscoveredTopic[] = (parsed.newTopics || []).map((t: any) => ({
        title: t.title || "New Topic",
        content: t.content || "",
        parentTitle: nodeTitle,
        relatedExisting: Array.isArray(t.relatedExisting) ? t.relatedExisting : [],
      }));

      // Filter out topics that already exist
      const lowerExisting = new Set(allExistingTitles.map((t) => t.toLowerCase()));
      const filteredTopics = newTopics.filter(
        (t) => !lowerExisting.has(t.title.toLowerCase()) && t.title.length > 0 && t.content.length > 0
      );

      return {
        newTopics: filteredTopics,
        existingRelations: Array.isArray(parsed.existingRelations) ? parsed.existingRelations : [],
        enrichedContent: parsed.enrichedContent || nodeContent,
      };
    }
  } catch (e) {
    console.error("Discover failed:", e);
  }

  return { newTopics: [], existingRelations: [], enrichedContent: nodeContent };
}

/**
 * Test LLM connection
 */
export async function testConnection(config: LLMConfig): Promise<{ success: boolean; message: string }> {
  try {
    const result = await chatCompletion(config, [
      { role: "user", content: "Reply with exactly: CONNECTION_OK" },
    ]);
    return {
      success: result.content.includes("CONNECTION_OK"),
      message: result.content.includes("CONNECTION_OK")
        ? `Connected to ${config.provider} (${config.model})`
        : `Connected but unexpected response: ${result.content.substring(0, 50)}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Connection failed",
    };
  }
}
