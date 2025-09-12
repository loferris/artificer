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
  className = ''
}) => {
  const [segments, setSegments] = useState<ContentSegment[]>([]);
  const parserRef = useRef(new StreamParser());
  const previousContentRef = useRef('');

  useEffect(() => {
    console.log('🎯 StreamingMessage processing content:', { 
      content, 
      isComplete,
      length: content.length,
      contentPreview: content.slice(0, 50) + (content.length > 50 ? '...' : '')
    });
    
    if (isComplete) {
      console.log('📚 Content complete - parsing segments');
      // When complete, parse the entire content normally
      const parser = new StreamParser();
      const parsed = parser.parseChunk(content);
      const finalParsed = parser.finalize();
      const allSegments = [...parsed.segments, ...finalParsed.segments];
      console.log('📝 Final parsed segments:', allSegments);
      setSegments(allSegments);
    } else {
      console.log('📡 Content streaming - creating text segment');
      // While streaming, treat everything as streaming text for word-by-word display
      const streamingSegment = {
        type: 'text' as any,
        content,
        isComplete: false
      };
      console.log('🎬 Created streaming segment:', streamingSegment);
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
        <span className="animate-pulse text-gray-500">Thinking...</span>
      )}
    </div>
  );
};