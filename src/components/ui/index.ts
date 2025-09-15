/**
 * Shared UI Primitives - Centralized Design System
 * 
 * Exports all shared UI primitive components for consistent styling
 * across terminal and chat modes throughout the application.
 */

// Button primitives
export {
  Button,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  GhostButton,
  IconButton,
  ButtonGroup,
  type ButtonProps,
  type ButtonGroupProps,
} from './Button';

// Input primitives  
export {
  Input,
  TerminalInput,
  ChatInput,
  InputGroup,
  type InputProps,
  type InputGroupProps,
} from './Input';

// Loading primitives
export {
  LoadingSpinner,
  ProcessingSpinner,
  LoadingDots,
  LoadingBars,
  LoadingOverlay,
  LoadingState,
  type LoadingSpinnerProps,
  type LoadingOverlayProps,
  type LoadingStateProps,
} from './LoadingSpinner';

// Error display primitives
export {
  ErrorDisplay,
  ErrorMessage,
  WarningMessage,
  InfoMessage,
  TerminalError,
  ErrorBanner,
  ErrorModal,
  ErrorBoundaryDisplay,
  type ErrorDisplayProps,
  type ErrorBoundaryDisplayProps,
} from './ErrorDisplay';

// Message bubble primitives
export {
  MessageBubble,
  UserMessage,
  AssistantMessage,
  SystemMessage,
  MessageList,
  type MessageBubbleProps,
  type MessageListProps,
} from './MessageBubble';