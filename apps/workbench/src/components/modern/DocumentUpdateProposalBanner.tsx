/**
 * Banner component that appears in the chat when a document update is proposed
 */

import React from 'react';
import { DocumentDiffViewer } from './DocumentDiffViewer';
import type { DocumentUpdateProposal } from '../../hooks/useDocumentUpdate';

interface DocumentUpdateProposalBannerProps {
  proposal: DocumentUpdateProposal | null;
  onApply: () => Promise<void>;
  onReject: () => void;
  isApplying: boolean;
}

export const DocumentUpdateProposalBanner: React.FC<DocumentUpdateProposalBannerProps> = ({
  proposal,
  onApply,
  onReject,
  isApplying,
}) => {
  if (!proposal) {
    return null;
  }

  return (
    <div className="mb-4 animate-slideIn">
      <DocumentDiffViewer
        original={proposal.originalContent}
        proposed={proposal.proposedContent}
        filename={proposal.documentName}
        reason={proposal.reason}
        onApply={onApply}
        onReject={onReject}
        isApplying={isApplying}
      />

      {/* Change Summary */}
      {proposal.changeSummary && (
        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            📝 Summary of Changes
          </h4>
          <div className="text-sm text-blue-800 whitespace-pre-wrap">
            {proposal.changeSummary}
          </div>
        </div>
      )}
    </div>
  );
};
