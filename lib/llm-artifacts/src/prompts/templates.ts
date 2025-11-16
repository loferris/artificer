/**
 * Prompt templates for instructing LLMs to create artifacts
 *
 * These templates help LLMs understand how to format their outputs
 * as structured artifacts that can be extracted and managed
 */

import type { ArtifactPromptConfig, ArtifactType } from '../core/types';

/**
 * Generate a system prompt that instructs the LLM to create artifacts
 */
export function buildArtifactSystemPrompt(
  config: ArtifactPromptConfig = {}
): string {
  const {
    enabledTypes,
    format = 'xml',
    requireTitles = false,
    suggestFilenames = true,
    customInstructions,
  } = config;

  const sections: string[] = [];

  // Introduction
  sections.push(`# Artifact Creation Instructions

When you create substantial code, documents, diagrams, or other content that users might want to save, edit, or reuse, you should format them as **artifacts**.

Artifacts are structured outputs that the system can extract, display, and manage separately from regular conversation messages.`);

  // When to create artifacts
  sections.push(`## When to Create Artifacts

Create an artifact when you:
- Write code files or substantial code snippets (>50 lines)
- Generate complete documents (markdown, HTML, etc.)
- Create diagrams (Mermaid, SVG)
- Produce structured data (JSON, YAML, CSV)
- Generate any content the user might want to save or edit

Do NOT create artifacts for:
- Short code examples or snippets (<50 lines)
- Explanatory text or conversational responses
- Lists or simple data`);

  // Format instructions
  if (format === 'xml') {
    sections.push(buildXmlFormatInstructions(enabledTypes, requireTitles, suggestFilenames));
  } else if (format === 'json') {
    sections.push(buildJsonFormatInstructions(enabledTypes, requireTitles, suggestFilenames));
  } else if (format === 'markdown') {
    sections.push(buildMarkdownFormatInstructions(enabledTypes, requireTitles, suggestFilenames));
  }

  // Artifact types
  sections.push(buildArtifactTypesReference(enabledTypes));

  // Custom instructions
  if (customInstructions) {
    sections.push(`## Additional Instructions\n\n${customInstructions}`);
  }

  // Best practices
  sections.push(`## Best Practices

- Always include a descriptive title for each artifact
- Suggest appropriate filenames when relevant
- Use clear, self-contained content (artifacts may be viewed independently)
- Update existing artifacts rather than creating duplicates when improving code
- Include comments in code artifacts to explain key sections`);

  return sections.join('\n\n');
}

/**
 * Build XML format instructions
 */
function buildXmlFormatInstructions(
  enabledTypes?: ArtifactType[],
  requireTitles?: boolean,
  suggestFilenames?: boolean
): string {
  const titleAttr = requireTitles ? ' title="..."' : ' title="..." (optional)';
  const filenameAttr = suggestFilenames ? ' filename="..."' : '';

  return `## Artifact Format

Use XML-style tags to mark artifacts:

\`\`\`
<artifact type="TYPE" language="LANGUAGE"${titleAttr}${filenameAttr}>
... content here ...
</artifact>
\`\`\`

**Required attributes:**
- \`type\`: The artifact type (see types below)

**Optional attributes:**
- \`language\`: Programming language for code artifacts
- \`title\`: Descriptive title for the artifact
- \`filename\`: Suggested filename with extension
- \`description\`: Brief description of the artifact

**Example:**

\`\`\`
<artifact type="code" language="typescript" title="User Authentication Service" filename="auth-service.ts">
export class AuthService {
  async login(email: string, password: string) {
    // Implementation here
  }
}
</artifact>
\`\`\``;
}

/**
 * Build JSON format instructions
 */
function buildJsonFormatInstructions(
  enabledTypes?: ArtifactType[],
  requireTitles?: boolean,
  suggestFilenames?: boolean
): string {
  return `## Artifact Format

Use code blocks with JSON metadata to mark artifacts:

\`\`\`
\`\`\`artifact:{"type":"TYPE","language":"LANGUAGE","title":"...","filename":"..."}
... content here ...
\`\`\`
\`\`\`

**Required fields:**
- \`type\`: The artifact type (see types below)

**Optional fields:**
- \`language\`: Programming language for code artifacts
- \`title\`: Descriptive title for the artifact
- \`filename\`: Suggested filename with extension
- \`description\`: Brief description of the artifact

**Example:**

\`\`\`
\`\`\`artifact:{"type":"code","language":"python","title":"Data Processor","filename":"processor.py"}
def process_data(data):
    # Implementation here
    return processed
\`\`\`
\`\`\``;
}

/**
 * Build Markdown format instructions
 */
function buildMarkdownFormatInstructions(
  enabledTypes?: ArtifactType[],
  requireTitles?: boolean,
  suggestFilenames?: boolean
): string {
  return `## Artifact Format

Use markdown headers to mark artifacts:

\`\`\`
### Artifact: TYPE - filename.ext

\`\`\`language
... content here ...
\`\`\`
\`\`\`

**Example:**

\`\`\`
### Artifact: Code - calculator.js

\`\`\`javascript
function calculate(a, b, operation) {
  switch (operation) {
    case '+': return a + b;
    case '-': return a - b;
    default: return 0;
  }
}
\`\`\`
\`\`\``;
}

/**
 * Build artifact types reference
 */
function buildArtifactTypesReference(enabledTypes?: ArtifactType[]): string {
  const allTypes: Array<{ type: ArtifactType; description: string; example: string }> = [
    {
      type: 'code',
      description: 'Source code files in any programming language',
      example: 'TypeScript classes, Python scripts, etc.',
    },
    {
      type: 'markdown',
      description: 'Markdown documents',
      example: 'README files, documentation, notes',
    },
    {
      type: 'mermaid',
      description: 'Mermaid diagrams',
      example: 'Flowcharts, sequence diagrams, class diagrams',
    },
    {
      type: 'html',
      description: 'HTML documents',
      example: 'Web pages, email templates',
    },
    {
      type: 'svg',
      description: 'SVG graphics',
      example: 'Icons, illustrations, diagrams',
    },
    {
      type: 'json',
      description: 'JSON data',
      example: 'Configuration files, API responses',
    },
    {
      type: 'yaml',
      description: 'YAML configuration',
      example: 'Config files, CI/CD pipelines',
    },
    {
      type: 'text',
      description: 'Plain text files',
      example: 'Logs, plain documentation',
    },
    {
      type: 'csv',
      description: 'CSV data',
      example: 'Data exports, spreadsheet data',
    },
  ];

  const types = enabledTypes
    ? allTypes.filter((t) => enabledTypes.includes(t.type))
    : allTypes;

  const typesList = types
    .map(
      (t) =>
        `- **\`${t.type}\`**: ${t.description}\n  - Example: ${t.example}`
    )
    .join('\n');

  return `## Supported Artifact Types

${typesList}`;
}

/**
 * Generate a user prompt for creating a specific artifact
 */
export function buildArtifactCreationPrompt(
  description: string,
  type?: ArtifactType,
  filename?: string
): string {
  const parts: string[] = [];

  parts.push(`Please create ${type ? `a ${type} artifact` : 'an artifact'} for: ${description}`);

  if (filename) {
    parts.push(`Filename: ${filename}`);
  }

  parts.push(
    `\nMake sure to format it as an artifact using the proper tags/markers.`
  );

  return parts.join('\n');
}

/**
 * Generate a prompt for updating an existing artifact
 */
export function buildArtifactUpdatePrompt(
  artifactTitle: string,
  changes: string
): string {
  return `Please update the artifact "${artifactTitle}" with the following changes:

${changes}

Provide the complete updated artifact using the proper artifact format.`;
}
