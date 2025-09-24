import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ContentType, 
  ContentSegment, 
  StreamingStrategy, 
  DEFAULT_CONTENT_CONFIG 
} from './types';

interface ContentRendererProps {
  segment: ContentSegment;
  isStreaming: boolean;
}

/**
 * Renders a content segment based on its type and streaming strategy
 */
export const ContentRenderer: React.FC<ContentRendererProps> = ({ 
  segment, 
  isStreaming 
}) => {
  const config = DEFAULT_CONTENT_CONFIG[segment.type];
  
  switch (config.strategy) {
    case StreamingStrategy.WORD_BY_WORD:
      return <WordByWordRenderer segment={segment} isStreaming={isStreaming} />;
    case StreamingStrategy.BUFFERED:
      return <BufferedRenderer segment={segment} isStreaming={isStreaming} />;
    case StreamingStrategy.IMMEDIATE:
      return <ImmediateRenderer segment={segment} />;
    default:
      return <span>{segment.content}</span>;
  }
};

/**
 * Character-by-character streaming renderer for text content
 */
const WordByWordRenderer: React.FC<ContentRendererProps> = ({ 
  segment, 
  isStreaming 
}) => {
  const [displayedLength, setDisplayedLength] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevContentRef = useRef('');
  const hasRenderedMarkdown = useRef(false);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // If content is complete, prevent any further animation
    if (segment.isComplete) {
      hasRenderedMarkdown.current = true;
      return;
    }
    
    // If not streaming, return early
    if (!isStreaming) {
      return;
    }

    // If this is a completely new message, reset everything
    if (!segment.content.startsWith(prevContentRef.current)) {
      setDisplayedLength(0);
      prevContentRef.current = '';
      hasRenderedMarkdown.current = false;
    }

    // Start animating from current displayed length to full content length
    const startLength = displayedLength;
    const targetLength = segment.content.length;
    
    if (startLength < targetLength) {
      let currentLength = startLength;
      
      intervalRef.current = setInterval(() => {
        currentLength += 1;
        setDisplayedLength(currentLength);
        
        if (currentLength >= targetLength) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          prevContentRef.current = segment.content;
        }
      }, 5); // About 200 chars per second
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [segment.content, isStreaming, segment.isComplete, displayedLength]);

  const displayedText = segment.content.slice(0, displayedLength);

  // If content is complete, render as markdown (no re-animation)
  if (segment.isComplete) {
    return (
      <div className="max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          skipHtml={false}
          components={{
            // Customize code blocks to match our existing style
            code: ({ node, className, children, ...props }: any) => {
              const inline = !className?.includes('language-');
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              
              if (inline) {
                return (
                  <code className="bg-gray-800 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                );
              }
              
              return (
                <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 my-2">
                  {language && (
                    <div className="text-xs text-gray-500 mb-2 font-mono">{language}</div>
                  )}
                  <pre className="font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                    <code {...props}>{children}</code>
                  </pre>
                </div>
              );
            },
            // Customize paragraphs to avoid double spacing
            p: ({ children }) => <div className="mb-2">{children}</div>,
            // Customize lists
            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
            // Let ReactMarkdown handle headers with default processing, just add styling
            h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-white">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3 text-white">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2 text-white">{children}</h3>,
            h4: ({ children }) => <h4 className="text-base font-bold mt-3 mb-2 text-white">{children}</h4>,
            h5: ({ children }) => <h5 className="text-sm font-bold mt-2 mb-1 text-white">{children}</h5>,
            h6: ({ children }) => <h6 className="text-xs font-bold mt-2 mb-1 text-white">{children}</h6>,
            // Fix strong/bold text
            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
            em: ({ children }) => <em className="italic text-white">{children}</em>,
          }}
        >
          {segment.content}
        </ReactMarkdown>
      </div>
    );
  }

  // Otherwise, show the streaming animation
  return (
    <span className="whitespace-pre-wrap">
      {displayedText}
      {isStreaming && !segment.isComplete && displayedLength < segment.content.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
};

/**
 * Buffered renderer for code blocks and lists
 */
const BufferedRenderer: React.FC<ContentRendererProps> = ({ 
  segment, 
  isStreaming 
}) => {
  if (!segment.isComplete && isStreaming) {
    return <LoadingPlaceholder type={segment.type} />;
  }

  switch (segment.type) {
    case ContentType.CODE_BLOCK:
      return <CodeBlockRenderer segment={segment} />;
    case ContentType.LIST:
      return <ListRenderer segment={segment} />;
    default:
      return <span>{segment.content}</span>;
  }
};

/**
 * Immediate renderer for headers
 */
const ImmediateRenderer: React.FC<{ segment: ContentSegment }> = ({ segment }) => {
  if (segment.type === ContentType.HEADER) {
    return <HeaderRenderer segment={segment} />;
  }
  return <span>{segment.content}</span>;
};

/**
 * Loading placeholder for buffered content
 */
const LoadingPlaceholder: React.FC<{ type: ContentType }> = ({ type }) => {
  switch (type) {
    case ContentType.CODE_BLOCK:
      return (
        <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 my-2">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse delay-75"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse delay-150"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-1/2"></div>
          </div>
        </div>
      );
    case ContentType.LIST:
      return (
        <div className="my-2">
          <div className="flex items-start space-x-2 mb-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5 animate-pulse"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse flex-1"></div>
          </div>
          <div className="flex items-start space-x-2 mb-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5 animate-pulse delay-75"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse flex-1 w-4/5"></div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5 animate-pulse delay-150"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse flex-1 w-2/3"></div>
          </div>
        </div>
      );
    default:
      return <div className="animate-pulse">Loading...</div>;
  }
};

/**
 * Code block renderer with syntax highlighting placeholder
 */
const CodeBlockRenderer: React.FC<{ segment: ContentSegment }> = ({ segment }) => {
  const language = segment.metadata?.language || '';
  const code = segment.content.replace(/^```.*\n?/, '').replace(/```$/, '');

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 my-2">
      {language && (
        <div className="text-xs text-gray-500 mb-2 font-mono">{language}</div>
      )}
      <pre className="font-mono text-sm whitespace-pre-wrap overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/**
 * List renderer
 */
const ListRenderer: React.FC<{ segment: ContentSegment }> = ({ segment }) => {
  const isOrdered = segment.metadata?.listType === 'ordered';
  const ListTag = isOrdered ? 'ol' : 'ul';
  
  const items = segment.content
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.replace(/^\s*[-*+]\s|^\s*\d+\.\s/, ''));

  return (
    <ListTag className={`my-2 ${isOrdered ? 'list-decimal' : 'list-disc'} list-inside space-y-1`}>
      {items.map((item, index) => (
        <li key={index} className="text-gray-800 dark:text-gray-200">
          {item}
        </li>
      ))}
    </ListTag>
  );
};

/**
 * Header renderer
 */
const HeaderRenderer: React.FC<{ segment: ContentSegment }> = ({ segment }) => {
  const level = segment.metadata?.level || 1;
  const text = segment.content.replace(/^#+\s/, '');
  
  const classes = {
    1: 'text-2xl font-bold mt-6 mb-4',
    2: 'text-xl font-bold mt-5 mb-3',
    3: 'text-lg font-bold mt-4 mb-2',
    4: 'text-base font-bold mt-3 mb-2',
    5: 'text-sm font-bold mt-2 mb-1',
    6: 'text-xs font-bold mt-2 mb-1'
  };

  const Tag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
  
  return (
    <Tag className={classes[level as keyof typeof classes] || classes[6]}>
      {text}
    </Tag>
  );
};