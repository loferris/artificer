/**
 * LLM prompts for document update operations
 */

import { encoding_for_model } from 'tiktoken';

export interface DocumentUpdateContext {
  documentName: string;
  documentContent: string;
  conversationContext: string;
  userRequest: string;
}

/**
 * Truncate text to fit within token limit
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const encoder = encoding_for_model('gpt-4o');
  const tokens = encoder.encode(text);

  if (tokens.length <= maxTokens) {
    encoder.free();
    return text;
  }

  const truncatedTokens = tokens.slice(0, maxTokens);
  const truncated = new TextDecoder().decode(encoder.decode(truncatedTokens));
  encoder.free();

  return truncated + '\n\n[... content truncated to fit token limit ...]';
}

/**
 * Estimate token count for text
 */
function estimateTokens(text: string): number {
  const encoder = encoding_for_model('gpt-4o');
  const tokens = encoder.encode(text);
  const count = tokens.length;
  encoder.free();
  return count;
}

/**
 * Prompt for generating updated document content based on conversation
 */
export function buildDocumentUpdatePrompt(context: DocumentUpdateContext): string {
  const maxContentTokens = 6000; // Leave room for response (max ~8k context for most models)
  const maxConversationTokens = 2000;

  // Validate and truncate if needed
  let documentContent = context.documentContent;
  let conversationContext = context.conversationContext;

  const contentTokens = estimateTokens(documentContent);
  const conversationTokens = estimateTokens(conversationContext);

  if (contentTokens > maxContentTokens) {
    documentContent = truncateToTokens(documentContent, maxContentTokens);
  }

  if (conversationTokens > maxConversationTokens) {
    conversationContext = truncateToTokens(conversationContext, maxConversationTokens);
  }

  return `You are a document editor helping to update project documentation based on a conversation.

CURRENT DOCUMENT: ${context.documentName}
---
${documentContent}
---

RECENT CONVERSATION:
${conversationContext}

USER REQUEST:
${context.userRequest}

TASK:
Generate an updated version of the document that incorporates relevant information from the conversation.

GUIDELINES:
1. Preserve the original document structure and formatting
2. Maintain the tone and style of the original document
3. Only update sections that are relevant to the conversation
4. Add new information where appropriate, but don't remove existing content unless asked
5. If adding new sections, place them logically within the existing structure
6. Preserve code examples, links, and technical details
7. Ensure markdown formatting is correct

OUTPUT:
Return ONLY the complete updated document content, no explanations or preamble.`;
}

/**
 * Prompt for determining if a document should be updated
 */
export function buildDocumentUpdateDecisionPrompt(
  userMessage: string,
  projectDocuments: Array<{ id: string; filename: string; content: string }>
): string {
  const docList = projectDocuments
    .map((doc, i) => `${i + 1}. ${doc.filename} (ID: ${doc.id})`)
    .join('\n');

  return `Analyze if any project documents should be updated based on the user's message.

USER MESSAGE:
"${userMessage}"

AVAILABLE DOCUMENTS:
${docList}

TASK:
Determine if the user is requesting to update any documents, or if the conversation contains information that should be reflected in project documentation.

Respond with a JSON object:
{
  "shouldUpdate": boolean,
  "documentId": string | null,
  "reason": string,
  "confidence": number (0-1)
}

EXAMPLES:
- "Update the README to include the new API endpoint" -> shouldUpdate: true
- "Add this function to the utils documentation" -> shouldUpdate: true
- "How do I use the API?" -> shouldUpdate: false
- "The installation steps are outdated, here's the new process..." -> shouldUpdate: true`;
}

/**
 * Prompt for generating a summary of changes made to a document
 */
export function buildChangeSummaryPrompt(
  originalContent: string,
  updatedContent: string
): string {
  return `Compare these two versions of a document and summarize the changes.

ORIGINAL VERSION:
---
${originalContent}
---

UPDATED VERSION:
---
${updatedContent}
---

TASK:
Provide a concise summary of what changed. Focus on:
1. New sections added
2. Modified content
3. Removed content (if any)
4. Structural changes

Format as a bulleted list with clear, actionable descriptions.`;
}

/**
 * Prompt for suggesting document improvements based on conversation
 */
export function buildDocumentImprovementPrompt(
  documentContent: string,
  conversationSummary: string
): string {
  return `Review this document and suggest improvements based on the recent conversation.

DOCUMENT CONTENT:
---
${documentContent}
---

CONVERSATION SUMMARY:
${conversationSummary}

TASK:
Suggest specific improvements to the document, such as:
1. Missing information that came up in conversation
2. Outdated content that needs updating
3. Unclear sections that need clarification
4. New sections that should be added

Return a JSON array of suggestions:
[
  {
    "section": "Section name",
    "issue": "What's wrong or missing",
    "suggestion": "Specific improvement to make",
    "priority": "high" | "medium" | "low"
  }
]`;
}
