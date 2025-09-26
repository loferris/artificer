import { ContentType, ContentSegment, ParsedStreamChunk } from './types';

export class StreamParser {
  private buffer = '';
  private currentSegments: ContentSegment[] = [];
  private inCodeBlock = false;
  private inList = false;
  private codeBlockLanguage = '';

  /**
   * Parse a new chunk of content and return segments
   */
  parseChunk(chunk: string): ParsedStreamChunk {
    this.buffer += chunk;
    const newSegments = this.extractSegments();

    return {
      segments: newSegments,
      buffer: this.buffer,
      isComplete: false, // Will be set by calling code when stream ends
    };
  }

  /**
   * Finalize parsing when stream is complete
   */
  finalize(): ParsedStreamChunk {
    // Process any remaining buffer content
    if (this.buffer.trim()) {
      const finalSegment: ContentSegment = {
        type: this.detectContentType(this.buffer),
        content: this.buffer,
        isComplete: true,
      };
      this.currentSegments.push(finalSegment);
      this.buffer = '';
    }

    const result = {
      segments: this.currentSegments,
      buffer: '',
      isComplete: true,
    };

    this.reset();
    return result;
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.buffer = '';
    this.currentSegments = [];
    this.inCodeBlock = false;
    this.inList = false;
    this.codeBlockLanguage = '';
  }

  private extractSegments(): ContentSegment[] {
    const segments: ContentSegment[] = [];
    const lines = this.buffer.split('\n');
    let processedLines = 0;
    let currentSegment = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isLastLine = i === lines.length - 1;

      // Code block detection
      if (line.startsWith('```')) {
        if (this.inCodeBlock) {
          // End of code block
          currentSegment += line + '\n';
          segments.push({
            type: ContentType.CODE_BLOCK,
            content: currentSegment.trim(),
            isComplete: true,
            metadata: { language: this.codeBlockLanguage },
          });
          currentSegment = '';
          this.inCodeBlock = false;
          this.codeBlockLanguage = '';
          processedLines = i + 1;
        } else {
          // Start of code block
          if (currentSegment.trim()) {
            segments.push({
              type: this.detectContentType(currentSegment),
              content: currentSegment.trim(),
              isComplete: true,
            });
          }
          this.inCodeBlock = true;
          this.codeBlockLanguage = line.slice(3).trim();
          currentSegment = line + '\n';
          processedLines = i + 1;
        }
        continue;
      }

      if (this.inCodeBlock) {
        currentSegment += line + (isLastLine ? '' : '\n');
        if (isLastLine) {
          // Don't emit incomplete code blocks
          break;
        }
        continue;
      }

      // Header detection
      if (line.match(/^#{1,6}\s/)) {
        if (currentSegment.trim()) {
          segments.push({
            type: this.detectContentType(currentSegment),
            content: currentSegment.trim(),
            isComplete: true,
          });
          currentSegment = '';
        }
        segments.push({
          type: ContentType.HEADER,
          content: line,
          isComplete: true,
          metadata: { level: line.match(/^#+/)?.[0].length || 1 },
        });
        processedLines = i + 1;
        continue;
      }

      // List detection - be more conservative about what constitutes a list
      const isListItem = line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/);
      const isPotentialDialogue =
        line.match(/^\s*-\s*["'""]/) || // Starts with dash + quote
        line.match(/^\s*-\s*[A-Z][a-z]/) || // Starts with dash + capital + lowercase (dialogue)
        line.match(/^\s*-\s*\w+:/) || // Starts with dash + word + colon (speaker:)
        line.match(/^\s*-\s*\*\*/) || // Starts with dash + markdown bold
        line.match(/^\s*-\s*.{50,}/); // Long lines are likely dialogue, not list items

      if (isListItem && !isPotentialDialogue) {
        if (!this.inList) {
          // Start of new list
          if (currentSegment.trim()) {
            segments.push({
              type: this.detectContentType(currentSegment),
              content: currentSegment.trim(),
              isComplete: true,
            });
            currentSegment = '';
          }
          this.inList = true;
        }
        currentSegment += line + '\n';

        // Check if next line continues the list
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const nextIsListItem = nextLine.match(/^\s*[-*+]\s/) || nextLine.match(/^\s*\d+\.\s/);
          const nextIsEmpty = nextLine.trim() === '';

          if (!nextIsListItem && !nextIsEmpty) {
            // End of list
            segments.push({
              type: ContentType.LIST,
              content: currentSegment.trim(),
              isComplete: true,
              metadata: {
                listType: line.match(/^\s*\d+\./) ? 'ordered' : 'unordered',
              },
            });
            currentSegment = '';
            this.inList = false;
            processedLines = i + 1;
          }
        } else if (isLastLine) {
          // End of buffer during list - don't emit yet
          break;
        }
        continue;
      } else if (this.inList && line.trim() === '') {
        // Empty line in list - continue
        currentSegment += line + '\n';
        continue;
      } else if (this.inList) {
        // End of list
        segments.push({
          type: ContentType.LIST,
          content: currentSegment.trim(),
          isComplete: true,
          metadata: { listType: 'unordered' }, // Default
        });
        currentSegment = line + '\n';
        this.inList = false;
        processedLines = i + 1;
        continue;
      }

      // Regular text - don't emit until we have a natural break or completion
      currentSegment += line + (isLastLine ? '' : '\n');

      // For text, emit segments on sentence boundaries or substantial content
      if (!isLastLine && line.trim() !== '') {
        const trimmed = currentSegment.trim();
        // Emit on sentence endings or when we have substantial content
        if (trimmed.match(/[.!?]\s*$/) || trimmed.length > 100) {
          segments.push({
            type: ContentType.TEXT,
            content: trimmed,
            isComplete: true,
          });
          currentSegment = '';
          processedLines = i + 1;
        }
      }
    }

    // Update buffer to only contain unprocessed content
    if (processedLines > 0) {
      this.buffer = lines.slice(processedLines).join('\n');
    }

    return segments;
  }

  private detectContentType(content: string): ContentType {
    const trimmed = content.trim();

    if (trimmed.startsWith('```')) return ContentType.CODE_BLOCK;
    if (trimmed.match(/^#{1,6}\s/)) return ContentType.HEADER;
    if (trimmed.match(/^\s*[-*+]\s/) || trimmed.match(/^\s*\d+\.\s/)) return ContentType.LIST;

    return ContentType.TEXT;
  }
}
