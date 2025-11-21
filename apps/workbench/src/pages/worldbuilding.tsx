import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { trpc } from '../lib/trpc/client';
import { StreamingMessage } from '@/components/worldbuilder/chat/StreamingMessage';
import { OperationsList } from '@/components/worldbuilder/operations/OperationsList';
import { ValidationPanel } from '@/components/worldbuilder/validation/ValidationPanel';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { parseOperationsFromText, type Operation } from '@artificer/worldbuilder';
import { cn } from '@artificer/ui';
import { clientLogger } from '../utils/clientLogger';

interface WorldbuildingSession {
  conversationId: string;
  userMessage: string;
  aiResponse: string;
  operations: Operation[];
  validationResults: Array<{
    id: string;
    severity: 'error' | 'warning' | 'info';
    validator: string;
    message: string;
    suggestion?: string;
    entityName?: string;
  }>;
  isStreaming: boolean;
}

export default function WorldbuildingPage() {
  const [inputText, setInputText] = useState('');
  const [sessions, setSessions] = useState<WorldbuildingSession[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // tRPC mutations
  const createConversationMutation = trpc.conversations.create.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  // Initialize conversation on mount
  const createConversationRef = useRef(createConversationMutation);
  useEffect(() => {
    const initConversation = async () => {
      try {
        const result = await createConversationRef.current.mutateAsync({
          title: 'Worldbuilding Session',
          projectId: undefined,
        });
        setCurrentConversationId(result.id);
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    };

    initConversation();
  }, []);

  const validateOperations = (operations: Operation[]) => {
    const validationResults: WorldbuildingSession['validationResults'] = [];
    const entityNames = new Set<string>();
    const entities = new Map<string, Operation>();

    // Track all entities
    operations.forEach(op => {
      if (op.entityName) {
        // Check for duplicate names
        if (entityNames.has(op.entityName.toLowerCase())) {
          validationResults.push({
            id: `dup-${op.id}`,
            severity: 'warning',
            validator: 'Entity Validator',
            message: `Duplicate entity name detected: "${op.entityName}"`,
            suggestion: 'Use unique names for each entity',
            entityName: op.entityName,
          });
        }
        entityNames.add(op.entityName.toLowerCase());

        if (op.intent === 'CREATE_ENTITY') {
          entities.set(op.entityName.toLowerCase(), op);
        }
      }
    });

    // Validate relationships
    operations.forEach(op => {
      if (op.intent === 'DEFINE_RELATIONSHIP' && op.targetEntity) {
        if (!entities.has(op.targetEntity.toLowerCase())) {
          validationResults.push({
            id: `rel-${op.id}`,
            severity: 'error',
            validator: 'Relationship Validator',
            message: `Relationship target "${op.targetEntity}" not found in world`,
            suggestion: `Create entity "${op.targetEntity}" first, or update the relationship`,
            entityName: op.entityName,
          });
        }
      }
    });

    // Check for missing attributes
    operations.forEach(op => {
      if (op.intent === 'CREATE_ENTITY' && (!op.attributes || Object.keys(op.attributes).length === 0)) {
        validationResults.push({
          id: `attr-${op.id}`,
          severity: 'info',
          validator: 'Attribute Validator',
          message: `Entity "${op.entityName}" has no attributes defined`,
          suggestion: 'Add descriptive attributes to make the entity more detailed',
          entityName: op.entityName,
        });
      }
    });

    return validationResults;
  };

  const handleWorldbuild = async () => {
    if (!inputText.trim() || !currentConversationId) return;

    clientLogger.userAction('worldbuilding-start', {
      textLength: inputText.length,
      sessionCount: sessions.length,
    }, 'WorldbuildingPage');

    setIsProcessing(true);

    try {
      // Create a new session with streaming state
      const newSession: WorldbuildingSession = {
        conversationId: currentConversationId,
        userMessage: inputText,
        aiResponse: '',
        operations: [],
        validationResults: [],
        isStreaming: true,
      };

      setSessions(prev => [...prev, newSession]);
      const sessionIndex = sessions.length;

      // Send message to AI
      const result = await sendMessageMutation.mutateAsync({
        conversationId: currentConversationId,
        content: `You are a worldbuilding assistant. Parse the user's request and respond with the worldbuilding details, then list operations in this format:

OPERATIONS:
- CREATE_ENTITY: [entity_type] "[name]" with attributes: [key=value, ...]
- DEFINE_RELATIONSHIP: "[entity1]" [relationship_type] "[entity2]"
- ADD_ATTRIBUTE: "[entity]" [key=value]

User request: ${inputText}`,
      });

      // Update session with complete response
      setSessions(prev => {
        const updated = [...prev];
        updated[sessionIndex] = {
          ...updated[sessionIndex],
          aiResponse: result.content,
          isStreaming: false,
        };
        return updated;
      });

      // Parse operations from AI response
      const operations = parseOperationsFromText(result.content);

      // Run validation
      const validationResults = validateOperations(operations);

      // Update session with operations and validation
      setSessions(prev => {
        const updated = [...prev];
        updated[sessionIndex] = {
          ...updated[sessionIndex],
          operations,
          validationResults,
        };
        return updated;
      });

      // Clear input
      setInputText('');

      clientLogger.info('Worldbuilding completed', {
        operationCount: operations.length,
        validationCount: validationResults.length,
      }, 'WorldbuildingPage');
    } catch (error) {
      clientLogger.error('Worldbuilding failed', error as Error, {
        textLength: inputText.length,
      }, 'WorldbuildingPage');

      // Mark streaming as failed
      setSessions(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].isStreaming = false;
        }
        return updated;
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    clientLogger.userAction('worldbuilding-reset', {
      sessionCount: sessions.length,
    }, 'WorldbuildingPage');

    setSessions([]);
    setInputText('');
    // Create new conversation
    createConversationMutation.mutateAsync({
      title: 'Worldbuilding Session',
      projectId: undefined,
    }).then(result => {
      setCurrentConversationId(result.id);
    }).catch(error => {
      clientLogger.error('Failed to create new conversation', error as Error, {}, 'WorldbuildingPage');
    });
  };

  const examplePrompts = [
    "Create a brave knight named Cerelle and her wise mentor Alaric. They share a strong bond.",
    "Create a mysterious tower called The Spire and a forbidden forest named Darkwood nearby.",
    "Add a legendary sword called Dawnbreaker to Cerelle's inventory with magical properties.",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Worldbuilding - Artificer Workbench</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🏰 AI Worldbuilding
          </h1>
          <p className="text-gray-600 mt-2">
            Create and manage your fictional world with AI-powered worldbuilding operations
          </p>
        </div>

        {/* Input Section */}
        {sessions.length === 0 && (
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-lg font-semibold">What would you like to create?</h2>
              <p className="text-sm text-gray-600 mt-1">
                Describe characters, locations, items, or relationships you want to add to your world
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Example Prompts */}
              <div>
                <div className="block text-sm font-medium text-gray-700 mb-2">
                  Example Prompts
                </div>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputText(prompt)}
                      className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
                    >
                      {prompt.slice(0, 50)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div>
                <label htmlFor="worldbuilding-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Worldbuilding Request
                </label>
                <textarea
                  id="worldbuilding-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={4}
                  placeholder="Example: Create a knight named Cerelle who is brave but conflicted..."
                  disabled={isProcessing}
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleWorldbuild}
                  disabled={!inputText.trim() || isProcessing || !currentConversationId}
                  className="px-6"
                >
                  {isProcessing ? 'Creating...' : 'Create World Elements'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sessions */}
        {sessions.length > 0 && (
          <div className="space-y-6">
            {sessions.map((session, idx) => (
              <div key={idx} className="space-y-4">
                {/* User Message */}
                <StreamingMessage
                  content={session.userMessage}
                  status="complete"
                  messageRole="user"
                />

                {/* AI Response */}
                <StreamingMessage
                  content={session.aiResponse}
                  status={session.isStreaming ? 'streaming' : 'complete'}
                  messageRole="assistant"
                />

                {/* Operations */}
                {session.operations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span>🔧</span>
                      <span>Worldbuilding Operations</span>
                      <span className="text-sm font-normal text-gray-600">
                        ({session.operations.length} operations)
                      </span>
                    </h3>
                    <OperationsList
                      operations={session.operations}
                      format="timeline"
                      showValidation
                      onOperationClick={(op) => console.log('Operation:', op)}
                    />
                  </div>
                )}

                {/* Validation Results */}
                {session.validationResults.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>Validation Results</span>
                    </h3>
                    <ValidationPanel
                      results={session.validationResults}
                      groupBy="severity"
                      showFixButtons={false}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Continue or Reset */}
            <Card className="bg-white border-2 border-dashed">
              <CardContent className="py-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="continue-input" className="block text-sm font-medium text-gray-700 mb-2">
                      Continue Building Your World
                    </label>
                    <textarea
                      id="continue-input"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                      placeholder="Add more elements to your world..."
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleReset}>
                      Start New World
                    </Button>
                    <Button
                      onClick={handleWorldbuild}
                      disabled={!inputText.trim() || isProcessing}
                    >
                      {isProcessing ? 'Creating...' : 'Add to World'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
