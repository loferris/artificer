/**
 * Artifact detection utilities
 *
 * Detects the presence of artifacts in LLM responses using pattern matching
 */

import type { ArtifactDetectionResult, ArtifactType } from './types';

/**
 * Detector for identifying artifacts in LLM responses
 */
export class ArtifactDetector {
  /**
   * Detect artifacts in a text response
   */
  detect(text: string): ArtifactDetectionResult {
    const detections = {
      xml: this.detectXmlArtifacts(text),
      json: this.detectJsonArtifacts(text),
      markdown: this.detectMarkdownArtifacts(text),
      code: this.detectCodeBlocks(text),
    };

    // Aggregate results
    const hasArtifacts = Object.values(detections).some((d) => d.count > 0);
    const totalCount = Object.values(detections).reduce(
      (sum, d) => sum + d.count,
      0
    );
    const allTypes = new Set<ArtifactType>();
    Object.values(detections).forEach((d) => {
      d.types.forEach((t) => allTypes.add(t));
    });

    // Calculate confidence based on detection quality
    const confidence = this.calculateConfidence(detections, text);

    return {
      hasArtifacts,
      count: totalCount,
      types: Array.from(allTypes),
      confidence,
    };
  }

  /**
   * Detect XML-style artifact markers
   * Example: <artifact type="code" language="typescript">...</artifact>
   */
  private detectXmlArtifacts(text: string): {
    count: number;
    types: ArtifactType[];
  } {
    const xmlPattern =
      /<artifact\s+(?:[^>]*\s+)?type=["']([^"']+)["'][^>]*>([\s\S]*?)<\/artifact>/gi;
    const matches = Array.from(text.matchAll(xmlPattern));

    const types = matches
      .map((m) => m[1] as ArtifactType)
      .filter((t) => this.isValidArtifactType(t));

    return {
      count: matches.length,
      types: Array.from(new Set(types)),
    };
  }

  /**
   * Detect JSON-style artifact markers
   * Example: ```artifact:{"type":"code","language":"typescript"}...```
   */
  private detectJsonArtifacts(text: string): {
    count: number;
    types: ArtifactType[];
  } {
    const jsonPattern = /```artifact:(\{[^`]+\})\n([\s\S]*?)```/gi;
    const matches = Array.from(text.matchAll(jsonPattern));

    const types: ArtifactType[] = [];
    for (const match of matches) {
      try {
        const metadata = JSON.parse(match[1]);
        if (metadata.type && this.isValidArtifactType(metadata.type)) {
          types.push(metadata.type as ArtifactType);
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    return {
      count: matches.length,
      types: Array.from(new Set(types)),
    };
  }

  /**
   * Detect markdown-style artifact markers
   * Example: ### Artifact: Code - filename.ts
   */
  private detectMarkdownArtifacts(text: string): {
    count: number;
    types: ArtifactType[];
  } {
    const markdownPattern =
      /###?\s+Artifact:\s+(\w+)(?:\s+-\s+(.+?))?(?:\n|$)/gi;
    const matches = Array.from(text.matchAll(markdownPattern));

    const types = matches
      .map((m) => m[1].toLowerCase() as ArtifactType)
      .filter((t) => this.isValidArtifactType(t));

    return {
      count: matches.length,
      types: Array.from(new Set(types)),
    };
  }

  /**
   * Detect code blocks that might be artifacts
   */
  private detectCodeBlocks(text: string): {
    count: number;
    types: ArtifactType[];
  } {
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    const matches = Array.from(text.matchAll(codeBlockPattern));

    const types: ArtifactType[] = [];
    for (const match of matches) {
      const language = match[1]?.toLowerCase();
      const content = match[2];

      // Heuristics to determine artifact type from code block
      if (language === 'mermaid') {
        types.push('mermaid');
      } else if (language === 'html') {
        types.push('html');
      } else if (language === 'svg') {
        types.push('svg');
      } else if (language === 'json') {
        types.push('json');
      } else if (language === 'yaml' || language === 'yml') {
        types.push('yaml');
      } else if (language === 'markdown' || language === 'md') {
        types.push('markdown');
      } else if (language === 'csv') {
        types.push('csv');
      } else if (language && content.length > 100) {
        // Longer code blocks are likely intentional artifacts
        types.push('code');
      }
    }

    return {
      count: matches.length,
      types: Array.from(new Set(types)),
    };
  }

  /**
   * Calculate confidence score for detection
   */
  private calculateConfidence(
    detections: Record<string, { count: number; types: ArtifactType[] }>,
    text: string
  ): number {
    let confidence = 0;

    // XML markers are most reliable (high confidence)
    if (detections.xml.count > 0) {
      confidence = Math.max(confidence, 0.95);
    }

    // JSON markers are reliable (medium-high confidence)
    if (detections.json.count > 0) {
      confidence = Math.max(confidence, 0.85);
    }

    // Markdown markers are less reliable (medium confidence)
    if (detections.markdown.count > 0) {
      confidence = Math.max(confidence, 0.7);
    }

    // Code blocks alone are least reliable (lower confidence)
    if (
      detections.code.count > 0 &&
      detections.xml.count === 0 &&
      detections.json.count === 0 &&
      detections.markdown.count === 0
    ) {
      // Check for strong indicators
      const hasLongCodeBlocks = /```\w+\n[\s\S]{200,}```/.test(text);
      const hasMultipleCodeBlocks = (text.match(/```/g) || []).length >= 4; // At least 2 blocks

      if (hasLongCodeBlocks || hasMultipleCodeBlocks) {
        confidence = Math.max(confidence, 0.6);
      } else {
        confidence = Math.max(confidence, 0.4);
      }
    }

    return confidence;
  }

  /**
   * Check if a string is a valid artifact type
   */
  private isValidArtifactType(type: string): boolean {
    const validTypes: ArtifactType[] = [
      'code',
      'markdown',
      'mermaid',
      'html',
      'svg',
      'json',
      'yaml',
      'text',
      'csv',
      'react-component',
    ];
    return validTypes.includes(type as ArtifactType);
  }

  /**
   * Check if text likely contains artifact-worthy content
   * (useful for auto-suggesting artifact creation)
   */
  suggestArtifactCreation(text: string): boolean {
    // Long code blocks
    if (/```\w+\n[\s\S]{300,}```/.test(text)) {
      return true;
    }

    // Multiple substantial code blocks
    const codeBlocks = text.match(/```\w+\n[\s\S]{100,}```/g);
    if (codeBlocks && codeBlocks.length >= 2) {
      return true;
    }

    // Mermaid diagrams
    if (/```mermaid\n[\s\S]+```/.test(text)) {
      return true;
    }

    // SVG content
    if (/<svg[\s\S]+<\/svg>/i.test(text)) {
      return true;
    }

    // Substantial HTML
    if (/<html[\s\S]{200,}<\/html>/i.test(text)) {
      return true;
    }

    return false;
  }
}
