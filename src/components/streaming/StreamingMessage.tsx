import React, { useState, useEffect, useRef } from 'react';
import { StreamParser } from '../../lib/streaming/StreamParser';
import { ContentRenderer } from '../../lib/streaming/ContentRenderer';
import { ContentSegment } from '../../lib/streaming/types';

interface StreamingMessageProps {
  content: string;
  isComplete: boolean;
  className?: string;
}

/**
 * Main streaming message component that handles content-aware rendering
 */
export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  content,
  isComplete,
  className = '',
}) => {
  const [segments, setSegments] = useState<ContentSegment[]>([]);
  const parserRef = useRef(new StreamParser());
  const previousContentRef = useRef('');

  useEffect(() => {
    if (isComplete) {
      // When complete, parse the entire content normally
      const parser = new StreamParser();
      const parsed = parser.parseChunk(content);
      const finalParsed = parser.finalize();
      const allSegments = [...parsed.segments, ...finalParsed.segments];
      setSegments(allSegments);
    } else {
      // While streaming, treat everything as streaming text for word-by-word display
      const streamingSegment = {
        type: 'text' as any,
        content,
        isComplete: false,
      };
      setSegments([streamingSegment]);
    }
  }, [content, isComplete]);

  // Reset when content changes completely (new message)
  useEffect(() => {
    if (content.length < previousContentRef.current.length) {
      // Content got shorter, likely a new message
      parserRef.current.reset();
      setSegments([]);
      previousContentRef.current = '';
    }
  }, [content]);

  return (
    <div className={`streaming-message ${className}`}>
      {segments.map((segment, index) => (
        <ContentRenderer
          key={`${segment.type}-${index}`}
          segment={segment}
          isStreaming={!isComplete}
        />
      ))}
      {!isComplete && segments.length === 0 && (
        <span className='animate-pulse text-gray-500'>Thinking...</span>
      )}
    </div>
  );
};
