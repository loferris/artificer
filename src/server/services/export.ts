// Export service for converting conversations to various formats
// Supports: Markdown, Notion, Obsidian, Google Docs, and more

export interface ExportOptions {
  format: 'markdown' | 'notion' | 'obsidian' | 'google-docs' | 'json' | 'html';
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  includeCosts?: boolean;
  groupByConversation?: boolean;
  template?: string;
}

export interface ExportResult {
  // For single file exports (markdown, json)
  content?: string;
  // For multi-file exports (obsidian)
  files?: { [filename: string]: string };
  // For structured exports (notion)
  data?: any[];
}

export interface ConversationExport {
  id: string;
  title: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
  messages: MessageExport[];
  metadata: {
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface MessageExport {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens?: number;
  cost?: number;
  createdAt: Date;
  parentId?: string;
}

export class ExportService {
  /**
   * Export conversations to Markdown format
   */
  static async exportToMarkdown(
    conversations: ConversationExport[],
    options: ExportOptions = { format: 'markdown' },
  ): Promise<ExportResult> {
    let content = '';

    if (options.includeMetadata) {
      content += `# Chat Export\n\n`;
      content += `**Export Date:** ${new Date().toISOString()}\n`;
      content += `**Total Conversations:** ${conversations.length}\n\n`;
    }

    for (const conv of conversations) {
      content += `## ${conv.title || 'Untitled Conversation'}\n\n`;

      if (options.includeMetadata) {
        content += `**Model:** ${conv.model}\n`;
        content += `**Created:** ${conv.createdAt.toISOString()}\n`;
        content += `**Messages:** ${conv.metadata.totalMessages}\n`;
        content += `**Tokens:** ${conv.metadata.totalTokens}\n`;
        content += `**Cost:** $${conv.metadata.totalCost.toFixed(6)}\n\n`;
      }

      for (const message of conv.messages) {
        const timestamp = options.includeTimestamps
          ? ` *(${message.createdAt.toISOString()})*`
          : '';

        const cost = options.includeCosts && message.cost ? ` *[$${message.cost.toFixed(6)}]*` : '';

        content += `### ${message.role === 'user' ? '👤 User' : '🤖 Assistant'}${timestamp}${cost}\n\n`;
        content += `${message.content}\n\n`;
      }

      content += '---\n\n';
    }

    return { content };
  }

  /**
   * Export conversations to Obsidian format with proper linking
   */
  static async exportToObsidian(
    conversations: ConversationExport[],
    options: ExportOptions = { format: 'obsidian' },
  ): Promise<ExportResult> {
    const files: { [filename: string]: string } = {};

    // Create index file
    let indexContent = `# Chat Conversations\n\n`;
    indexContent += `**Export Date:** ${new Date().toISOString()}\n\n`;

    for (const conv of conversations) {
      const filename = this.sanitizeFilename(conv.title || `conversation-${conv.id}`);
      const link = `[[${filename}]]`;

      indexContent += `- ${link} - ${conv.model} (${conv.metadata.totalMessages} messages)\n`;

      // Create individual conversation file
      let convContent = `# ${conv.title || 'Untitled Conversation'}\n\n`;
      convContent += `**Model:** ${conv.model}\n`;
      convContent += `**Created:** ${conv.createdAt.toISOString()}\n`;
      convContent += `**Messages:** ${conv.metadata.totalMessages}\n`;
      convContent += `**Tokens:** ${conv.metadata.totalTokens}\n`;
      convContent += `**Cost:** $${conv.metadata.totalCost.toFixed(6)}\n\n`;

      if (conv.metadata.systemPrompt) {
        convContent += `## System Prompt\n\n${conv.metadata.systemPrompt}\n\n`;
      }

      convContent += `## Messages\n\n`;

      for (const message of conv.messages) {
        const timestamp = options.includeTimestamps
          ? ` *(${message.createdAt.toISOString()})*`
          : '';

        convContent += `### ${message.role === 'user' ? '👤 User' : '🤖 Assistant'}${timestamp}\n\n`;
        convContent += `${message.content}\n\n`;
      }

      files[`${filename}.md`] = convContent;
    }

    files['Chat Conversations.md'] = indexContent;
    return { files };
  }

  /**
   * Export conversations to Notion format (JSON for Notion API)
   */
  static async exportToNotion(
    conversations: ConversationExport[],
    options: ExportOptions = { format: 'notion' },
  ): Promise<ExportResult> {
    const notionPages = [];

    for (const conv of conversations) {
      const page = {
        parent: { database_id: 'YOUR_DATABASE_ID' }, // To be configured
        properties: {
          title: {
            title: [
              {
                text: {
                  content: conv.title || 'Untitled Conversation',
                },
              },
            ],
          },
          model: {
            select: {
              name: conv.model,
            },
          },
          created: {
            date: {
              start: conv.createdAt.toISOString(),
            },
          },
          messages: {
            number: conv.metadata.totalMessages,
          },
          tokens: {
            number: conv.metadata.totalTokens,
          },
          cost: {
            number: conv.metadata.totalCost,
          },
        },
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: 'Messages' } }],
            },
          },
        ],
      };

      // Add messages as blocks
      for (const message of conv.messages) {
        page.children.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `${message.role === 'user' ? '👤 User' : '🤖 Assistant'}`,
                },
              },
            ],
          },
        } as any);

        page.children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: message.content } }],
          },
        } as any);
      }

      notionPages.push(page);
    }

    return { data: notionPages };
  }

  /**
   * Export conversations to Google Docs format (HTML for Google Docs API)
   */
  static async exportToGoogleDocs(
    conversations: ConversationExport[],
    options: ExportOptions = { format: 'google-docs' },
  ): Promise<ExportResult> {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chat Export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .conversation { margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .message { margin: 20px 0; padding: 15px; border-radius: 8px; }
          .user { background-color: #e3f2fd; }
          .assistant { background-color: #f3e5f5; }
          .metadata { background-color: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Chat Export</h1>
        <p><strong>Export Date:</strong> ${new Date().toISOString()}</p>
        <p><strong>Total Conversations:</strong> ${conversations.length}</p>
    `;

    for (const conv of conversations) {
      html += `
        <div class="conversation">
          <h2>${conv.title || 'Untitled Conversation'}</h2>
          <div class="metadata">
            <p><strong>Model:</strong> ${conv.model}</p>
            <p><strong>Created:</strong> ${conv.createdAt.toISOString()}</p>
            <p><strong>Messages:</strong> ${conv.metadata.totalMessages}</p>
            <p><strong>Tokens:</strong> ${conv.metadata.totalTokens}</p>
            <p><strong>Cost:</strong> $${conv.metadata.totalCost.toFixed(6)}</p>
          </div>
      `;

      for (const message of conv.messages) {
        const timestamp = options.includeTimestamps
          ? ` <em>(${message.createdAt.toISOString()})</em>`
          : '';

        html += `
          <div class="message ${message.role}">
            <h3>${message.role === 'user' ? '👤 User' : '🤖 Assistant'}${timestamp}</h3>
            <p>${message.content}</p>
          </div>
        `;
      }

      html += `</div>`;
    }

    html += `</body></html>`;
    return { content: html };
  }

  /**
   * Export conversations to JSON format
   */
  static async exportToJSON(
    conversations: ConversationExport[],
    options: ExportOptions = { format: 'json' },
  ): Promise<ExportResult> {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      conversations: conversations.map((conv) => ({
        ...conv,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        messages: conv.messages.map((msg) => ({
          ...msg,
          createdAt: msg.createdAt.toISOString(),
        })),
      })),
    };

    return { content: JSON.stringify(exportData, null, 2) };
  }

  /**
   * Sanitize filename for file system
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }
}
