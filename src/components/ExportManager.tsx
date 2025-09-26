/**
 * Export manager component - handles all export functionality
 *
 * Extracts export logic from main page component to provide
 * reusable export functionality across the application.
 */

import { trpc } from '../lib/trpc/client';
import { clientLogger } from '../utils/clientLogger';

export interface ExportManagerProps {
  currentConversationId: string | null;
  onStatusMessage?: (message: string) => void;
}

export function useExportManager({ currentConversationId, onStatusMessage }: ExportManagerProps) {
  const utils = trpc.useUtils();

  /**
   * Triggers a file download with the provided content
   */
  const triggerDownload = (
    content: string,
    format: 'markdown' | 'json',
    scope: 'current' | 'all',
  ) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const extension = format === 'markdown' ? 'md' : 'json';
    const filename = `conversations_${scope}_${timestamp}.${extension}`;

    const mimeType = format === 'markdown' ? 'text/markdown' : 'application/json';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Exports the current conversation
   */
  const exportCurrent = async (format: 'markdown' | 'json' = 'markdown') => {
    if (!currentConversationId) {
      onStatusMessage?.('No conversation to export.');
      return;
    }

    onStatusMessage?.(`Exporting current conversation as ${format}...`);

    try {
      const result = await utils.export.exportConversation.fetch({
        conversationId: currentConversationId,
        format,
        includeMetadata: true,
        includeTimestamps: true,
        includeCosts: true,
      });

      if (result) {
        // Handle different export result types
        const exportResult = result.data; // Extract the actual ExportResult
        let downloadData: string;
        if (exportResult.content) {
          // Single file exports (markdown, json, html)
          downloadData = exportResult.content;
        } else if (exportResult.files) {
          // Multi-file exports (obsidian) - create a zip or concatenate
          downloadData = Object.entries(exportResult.files)
            .map(([filename, content]) => `--- ${filename} ---\n${content}`)
            .join('\n\n');
        } else if (exportResult.data) {
          // Structured exports (notion) - stringify
          downloadData = Array.isArray(exportResult.data)
            ? JSON.stringify(exportResult.data, null, 2)
            : String(exportResult.data);
        } else {
          downloadData = 'No content available';
        }

        triggerDownload(downloadData, format, 'current');
        onStatusMessage?.('Export complete.');
      } else {
        onStatusMessage?.('Export failed: No data received.');
      }
    } catch (error) {
      clientLogger.error(
        'Export current failed',
        error as Error,
        {
          conversationId: currentConversationId,
          format,
        },
        'ExportManager',
      );
      onStatusMessage?.('Export failed: ' + (error as Error).message);
    }
  };

  /**
   * Exports all conversations
   */
  const exportAll = async (format: 'markdown' | 'json' = 'markdown') => {
    onStatusMessage?.(`Exporting all conversations as ${format}...`);

    try {
      const result = await utils.export.exportAll.fetch({
        format,
        includeMetadata: true,
        includeTimestamps: true,
        includeCosts: true,
        groupByConversation: true,
      });

      if (result) {
        // Handle different export result types
        const exportResult = result.data; // Extract the actual ExportResult
        let downloadData: string;
        if (exportResult.content) {
          // Single file exports (markdown, json, html)
          downloadData = exportResult.content;
        } else if (exportResult.files) {
          // Multi-file exports (obsidian) - create a zip or concatenate
          downloadData = Object.entries(exportResult.files)
            .map(([filename, content]) => `--- ${filename} ---\n${content}`)
            .join('\n\n');
        } else if (exportResult.data) {
          // Structured exports (notion) - stringify
          downloadData = Array.isArray(exportResult.data)
            ? JSON.stringify(exportResult.data, null, 2)
            : String(exportResult.data);
        } else {
          downloadData = 'No content available';
        }

        triggerDownload(downloadData, format, 'all');
        onStatusMessage?.('Export complete.');
      } else {
        onStatusMessage?.('Export failed: No data received.');
      }
    } catch (error) {
      clientLogger.error(
        'Export all failed',
        error as Error,
        {
          format,
        },
        'ExportManager',
      );
      onStatusMessage?.('Export failed: ' + (error as Error).message);
    }
  };

  return {
    exportCurrent,
    exportAll,
    isExporting: false, // We handle loading state manually
    exportError: null, // We handle errors manually
  };
}

/**
 * Export manager component for declarative usage
 */
export interface ExportManagerComponentProps extends ExportManagerProps {
  children: (exportManager: ReturnType<typeof useExportManager>) => React.ReactNode;
}

export function ExportManager({ children, ...props }: ExportManagerComponentProps) {
  const exportManager = useExportManager(props);
  return <>{children(exportManager)}</>;
}
