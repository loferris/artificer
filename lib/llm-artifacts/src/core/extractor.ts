/**
 * Artifact extraction utilities
 *
 * Extracts artifacts from LLM responses and converts them to structured data
 */

import type {
  Artifact,
  ArtifactType,
  CodeLanguage,
  ArtifactExtractionOptions,
} from './types';

/**
 * Extractor for pulling artifacts out of LLM responses
 */
export class ArtifactExtractor {
  private generateId(): string {
    return `artifact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Extract all artifacts from a text response
   */
  extract(
    text: string,
    options: ArtifactExtractionOptions = {}
  ): Artifact[] {
    const {
      format = 'xml',
      autoDetectType = true,
      generateIds = true,
      conversationId,
      messageId,
    } = options;

    const artifacts: Artifact[] = [];

    // Try each extraction method
    if (format === 'xml' || autoDetectType) {
      artifacts.push(...this.extractXmlArtifacts(text, conversationId, messageId));
    }

    if (format === 'json' || autoDetectType) {
      artifacts.push(...this.extractJsonArtifacts(text, conversationId, messageId));
    }

    if (format === 'markdown' || autoDetectType) {
      artifacts.push(...this.extractMarkdownArtifacts(text, conversationId, messageId));
    }

    // Fallback: extract plain code blocks if no explicit artifacts found
    if (artifacts.length === 0 && autoDetectType) {
      artifacts.push(...this.extractCodeBlocks(text, conversationId, messageId));
    }

    // Generate IDs if needed
    if (generateIds) {
      artifacts.forEach((artifact) => {
        if (!artifact.id) {
          artifact.id = this.generateId();
        }
      });
    }

    // Deduplicate by content
    return this.deduplicateArtifacts(artifacts);
  }

  /**
   * Extract XML-style artifacts
   * Example: <artifact type="code" language="typescript" title="Example">...</artifact>
   */
  private extractXmlArtifacts(
    text: string,
    conversationId?: string,
    messageId?: string
  ): Artifact[] {
    const pattern =
      /<artifact\s+([^>]+)>([\s\S]*?)<\/artifact>/gi;
    const artifacts: Artifact[] = [];

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const attributes = this.parseXmlAttributes(match[1]);
      const content = match[2].trim();

      if (!attributes.type) continue;

      artifacts.push({
        id: attributes.id || this.generateId(),
        type: attributes.type as ArtifactType,
        content,
        title: attributes.title,
        description: attributes.description,
        language: attributes.language as CodeLanguage,
        filename: attributes.filename,
        fileExtension: this.inferFileExtension(
          attributes.type as ArtifactType,
          attributes.language,
          attributes.filename
        ),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        conversationId,
        messageId,
        metadata: {},
      });
    }

    return artifacts;
  }

  /**
   * Extract JSON-style artifacts
   * Example: ```artifact:{"type":"code","language":"typescript"}...```
   */
  private extractJsonArtifacts(
    text: string,
    conversationId?: string,
    messageId?: string
  ): Artifact[] {
    const pattern = /```artifact:(\{[^`\n]+\})\n([\s\S]*?)```/gi;
    const artifacts: Artifact[] = [];

    let match;
    while ((match = pattern.exec(text)) !== null) {
      try {
        const metadata = JSON.parse(match[1]);
        const content = match[2].trim();

        if (!metadata.type) continue;

        artifacts.push({
          id: metadata.id || this.generateId(),
          type: metadata.type as ArtifactType,
          content,
          title: metadata.title,
          description: metadata.description,
          language: metadata.language as CodeLanguage,
          filename: metadata.filename,
          fileExtension: this.inferFileExtension(
            metadata.type,
            metadata.language,
            metadata.filename
          ),
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          conversationId,
          messageId,
          metadata: { ...metadata },
        });
      } catch (error) {
        // Invalid JSON, skip
        continue;
      }
    }

    return artifacts;
  }

  /**
   * Extract markdown-style artifacts
   * Example:
   * ### Artifact: Code - filename.ts
   * ```typescript
   * ...
   * ```
   */
  private extractMarkdownArtifacts(
    text: string,
    conversationId?: string,
    messageId?: string
  ): Artifact[] {
    const pattern =
      /###?\s+Artifact:\s+(\w+)(?:\s+-\s+(.+?))?(?:\n|$)([\s\S]*?)(?=###?\s+Artifact:|$)/gi;
    const artifacts: Artifact[] = [];

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const type = match[1].toLowerCase() as ArtifactType;
      const filename = match[2]?.trim();
      const contentBlock = match[3].trim();

      // Extract code block if present
      const codeBlockMatch = contentBlock.match(/```(\w+)?\n([\s\S]*?)```/);
      const content = codeBlockMatch ? codeBlockMatch[2].trim() : contentBlock;
      const language = codeBlockMatch?.[1] as CodeLanguage | undefined;

      artifacts.push({
        id: this.generateId(),
        type,
        content,
        filename,
        language,
        fileExtension: this.inferFileExtension(type, language, filename),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        conversationId,
        messageId,
        metadata: {},
      });
    }

    return artifacts;
  }

  /**
   * Extract plain code blocks as artifacts
   * (fallback when no explicit artifact markers are present)
   */
  private extractCodeBlocks(
    text: string,
    conversationId?: string,
    messageId?: string
  ): Artifact[] {
    const pattern = /```(\w+)?\n([\s\S]*?)```/g;
    const artifacts: Artifact[] = [];

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const language = match[1]?.toLowerCase() as CodeLanguage | undefined;
      const content = match[2].trim();

      // Skip very short code blocks (likely examples, not artifacts)
      if (content.length < 50) continue;

      const type = this.inferTypeFromLanguage(language);

      artifacts.push({
        id: this.generateId(),
        type,
        content,
        language,
        fileExtension: this.inferFileExtension(type, language),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        conversationId,
        messageId,
        metadata: {},
      });
    }

    return artifacts;
  }

  /**
   * Parse XML-style attributes
   */
  private parseXmlAttributes(attributeString: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const pattern = /(\w+)=["']([^"']+)["']/g;

    let match;
    while ((match = pattern.exec(attributeString)) !== null) {
      attributes[match[1]] = match[2];
    }

    return attributes;
  }

  /**
   * Infer artifact type from code language
   */
  private inferTypeFromLanguage(language?: string): ArtifactType {
    if (!language) return 'code';

    const lower = language.toLowerCase();

    if (lower === 'mermaid') return 'mermaid';
    if (lower === 'html') return 'html';
    if (lower === 'svg') return 'svg';
    if (lower === 'json') return 'json';
    if (lower === 'yaml' || lower === 'yml') return 'yaml';
    if (lower === 'markdown' || lower === 'md') return 'markdown';
    if (lower === 'csv') return 'csv';

    return 'code';
  }

  /**
   * Infer file extension from artifact metadata
   */
  private inferFileExtension(
    type: ArtifactType,
    language?: CodeLanguage | string,
    filename?: string
  ): string {
    // Extract from filename if present
    if (filename) {
      const ext = filename.split('.').pop();
      if (ext && ext !== filename) return ext;
    }

    // Infer from language
    if (language) {
      const langMap: Record<string, string> = {
        typescript: 'ts',
        javascript: 'js',
        python: 'py',
        java: 'java',
        rust: 'rs',
        go: 'go',
        cpp: 'cpp',
        c: 'c',
        csharp: 'cs',
        ruby: 'rb',
        php: 'php',
        swift: 'swift',
        kotlin: 'kt',
        sql: 'sql',
        bash: 'sh',
        shell: 'sh',
        powershell: 'ps1',
      };
      if (langMap[language.toLowerCase()]) {
        return langMap[language.toLowerCase()];
      }
    }

    // Infer from type
    const typeMap: Record<ArtifactType, string> = {
      code: 'txt',
      markdown: 'md',
      mermaid: 'mmd',
      html: 'html',
      svg: 'svg',
      json: 'json',
      yaml: 'yml',
      text: 'txt',
      csv: 'csv',
      'react-component': 'tsx',
    };

    return typeMap[type] || 'txt';
  }

  /**
   * Remove duplicate artifacts (same content)
   */
  private deduplicateArtifacts(artifacts: Artifact[]): Artifact[] {
    const seen = new Set<string>();
    return artifacts.filter((artifact) => {
      const key = `${artifact.type}:${artifact.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
