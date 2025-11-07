/**
 * Manual OpenAPI 3.0 specification for AI Workflow Engine
 *
 * This provides REST API documentation without relying on auto-generation
 * from zod schemas, avoiding compatibility issues.
 */

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'AI Workflow Engine API',
    version: '1.0.0',
    description: 'API for conversation and project management with AI orchestration capabilities',
    contact: {
      name: 'API Support',
      url: 'https://github.com/yourusername/ai-workflow-engine'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    }
  ],
  tags: [
    { name: 'conversations', description: 'Conversation management' },
    { name: 'projects', description: 'Project management' },
    { name: 'health', description: 'Health checks' }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Check if the server is running',
        tags: ['health'],
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    mode: { type: 'string', enum: ['demo', 'database'] }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/': {
      post: {
        summary: 'tRPC Batch Endpoint',
        description: 'Execute tRPC procedures using JSON-RPC format. For detailed procedure documentation, see the tRPC endpoint reference.',
        tags: ['trpc'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  required: ['method', 'path'],
                  properties: {
                    method: {
                      type: 'string',
                      enum: ['query', 'mutation'],
                      description: 'Query for read operations, mutation for write operations'
                    },
                    path: {
                      type: 'string',
                      description: 'Procedure path (e.g., "conversations.list", "projects.create")',
                      example: 'conversations.list'
                    },
                    input: {
                      type: 'object',
                      description: 'Input parameters for the procedure'
                    }
                  }
                }
              },
              examples: {
                listConversations: {
                  summary: 'List all conversations',
                  value: {
                    '0': {
                      method: 'query',
                      path: 'conversations.list',
                      input: {}
                    }
                  }
                },
                createProject: {
                  summary: 'Create a new project',
                  value: {
                    '0': {
                      method: 'mutation',
                      path: 'projects.create',
                      input: {
                        name: 'My Project',
                        description: 'Project description'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      result: {
                        type: 'object',
                        properties: {
                          data: {
                            description: 'Result data from the procedure'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier' },
          title: { type: 'string', nullable: true, description: 'Conversation title' },
          model: { type: 'string', description: 'AI model used' },
          systemPrompt: { type: 'string', nullable: true },
          temperature: { type: 'number', nullable: true, minimum: 0, maximum: 2 },
          maxTokens: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          messages: {
            type: 'array',
            items: { $ref: '#/components/schemas/Message' }
          }
        }
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          role: { type: 'string', enum: ['user', 'assistant', 'system'] },
          content: { type: 'string' },
          tokens: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          parentId: { type: 'string', nullable: true }
        }
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          settings: { type: 'object', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          stats: {
            type: 'object',
            properties: {
              conversationCount: { type: 'number' },
              documentCount: { type: 'number' },
              knowledgeEntityCount: { type: 'number' },
              lastActivity: { type: 'string', format: 'date-time', nullable: true }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  }
};

/**
 * tRPC Procedure Reference
 *
 * Access these via the tRPC batch endpoint (POST /) with JSON-RPC format
 */
export const trpcProcedures = {
  conversations: {
    list: {
      method: 'query',
      description: 'Get all conversations with summary information',
      input: {},
      output: 'Array<ConversationListItem>'
    },
    create: {
      method: 'mutation',
      description: 'Create a new conversation',
      input: {
        title: 'string (optional)',
        model: 'string (optional)',
        systemPrompt: 'string (optional)',
        temperature: 'number (0-2, optional)',
        maxTokens: 'number (1-4000, optional)',
        projectId: 'string (optional)'
      },
      output: 'Conversation'
    },
    getById: {
      method: 'query',
      description: 'Get a conversation with all messages',
      input: { conversationId: 'string (required)' },
      output: 'Conversation'
    },
    update: {
      method: 'mutation',
      description: 'Update conversation metadata',
      input: {
        conversationId: 'string (required)',
        title: 'string (optional)',
        model: 'string (optional)',
        systemPrompt: 'string (optional)',
        temperature: 'number (optional)',
        maxTokens: 'number (optional)'
      },
      output: 'Conversation'
    },
    delete: {
      method: 'mutation',
      description: 'Delete a conversation and all its messages',
      input: { conversationId: 'string (required)' },
      output: '{ success: boolean }'
    }
  },
  projects: {
    list: {
      method: 'query',
      description: 'Get all projects with statistics',
      input: {},
      output: 'Array<ProjectWithStats>'
    },
    create: {
      method: 'mutation',
      description: 'Create a new project',
      input: {
        name: 'string (required)',
        description: 'string (optional)',
        settings: 'object (optional)'
      },
      output: 'Project'
    },
    getById: {
      method: 'query',
      description: 'Get project details',
      input: { id: 'string (required)' },
      output: 'Project'
    },
    update: {
      method: 'mutation',
      description: 'Update project',
      input: {
        id: 'string (required)',
        name: 'string (optional)',
        description: 'string (optional)',
        settings: 'object (optional)'
      },
      output: 'Project'
    },
    delete: {
      method: 'mutation',
      description: 'Delete project',
      input: { id: 'string (required)' },
      output: '{ success: boolean }'
    },
    associateConversation: {
      method: 'mutation',
      description: 'Link a conversation to a project',
      input: {
        projectId: 'string (required)',
        conversationId: 'string (required)'
      },
      output: 'Conversation'
    },
    getConversations: {
      method: 'query',
      description: 'Get all conversations in a project',
      input: { projectId: 'string (required)' },
      output: 'Array<Conversation>'
    }
  }
};
