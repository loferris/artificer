# Document Update Integration Guide

This guide shows how to integrate the autonomous document update feature into the chat interface.

## Overview

The system can now:
1. ✅ Detect when users want to update documents
2. ✅ Generate updated document content using LLM
3. ✅ Show a visual diff of proposed changes
4. ✅ Apply changes on user approval
5. ✅ Regenerate embeddings automatically

## Architecture

```
User Message
    ↓
shouldSuggestUpdate() - Quick keyword check
    ↓
proposeUpdate() - LLM analyzes conversation & generates update
    ↓
DocumentDiffViewer - Shows changes with split/unified view
    ↓
applyProposal() - Updates document in database
    ↓
Auto-regenerate embeddings
```

## Integration Steps

### Step 1: Add the Hook to Your Chat Component

```tsx
// src/pages/index.tsx or wherever your chat logic lives
import { useDocumentUpdate } from '../hooks/useDocumentUpdate';
import { DocumentUpdateProposalBanner } from '../components/modern/DocumentUpdateProposalBanner';

export function ChatPage() {
  // ... existing chat hooks

  const documentUpdate = useDocumentUpdate();
  const { data: projectDocuments } = trpc.projects.getDocuments.useQuery(
    { projectId: currentProjectId || '' },
    { enabled: !!currentProjectId }
  );

  // ... rest of your component
}
```

### Step 2: Check for Update Intent After Messages

```tsx
const handleSendMessage = async (content: string) => {
  // Send the message as normal
  await chat.sendMessage(content);

  // Check if this might be a document update request
  if (documentUpdate.shouldSuggestUpdate(content) && projectDocuments?.documents) {
    // Find the most relevant document (simple example - you can make this smarter)
    const targetDoc = projectDocuments.documents[0]; // or use semantic search

    if (targetDoc) {
      // Get recent conversation context (last 5 messages)
      const recentMessages = chat.messages.slice(-5);
      const conversationContext = recentMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n\n');

      // Propose the update
      await documentUpdate.proposeUpdate(
        targetDoc.id,
        conversationContext,
        content
      );
    }
  }
};
```

### Step 3: Display the Proposal Banner

Add this to your chat view, above the message list:

```tsx
<div className="flex-1 overflow-hidden bg-white p-4">
  {/* Document Update Proposal */}
  {documentUpdate.currentProposal && (
    <DocumentUpdateProposalBanner
      proposal={documentUpdate.currentProposal}
      onApply={async () => {
        const success = await documentUpdate.applyProposal();
        if (success) {
          // Show success message
          toast.success('Document updated successfully!');
        }
      }}
      onReject={documentUpdate.rejectProposal}
      isApplying={documentUpdate.isApplying}
    />
  )}

  {/* Regular message list */}
  <MessageList messages={messages} />
</div>
```

### Step 4: Add Loading States

```tsx
{documentUpdate.isGenerating && (
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
    <div className="flex items-center space-x-3">
      <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      <span className="text-blue-800">
        Analyzing conversation and generating document update...
      </span>
    </div>
  </div>
)}
```

## Advanced: Smarter Document Selection

Instead of just picking the first document, use semantic search or user hints:

```tsx
// Option 1: Ask the LLM which document to update
const analyzeIntent = async (message: string, docs: Document[]) => {
  const updateService = new DocumentUpdateService();
  const decision = await updateService.analyzeUpdateIntent(message, docs);

  if (decision.shouldUpdate && decision.documentId) {
    const targetDoc = docs.find(d => d.id === decision.documentId);
    if (targetDoc) {
      await documentUpdate.proposeUpdate(
        targetDoc.id,
        conversationContext,
        message
      );
    }
  }
};

// Option 2: Use semantic search to find relevant document
const findRelevantDocument = async (message: string) => {
  const results = await trpc.projects.searchDocuments.query({
    projectId: currentProjectId!,
    query: message,
    limit: 1,
  });

  return results.results[0];
};
```

## Example User Flows

### Flow 1: Explicit Update Request

```
User: "Update the README to include the new installation steps"
  ↓
System: [Detects update intent]
  ↓
System: [Finds README.md in project]
  ↓
System: [Generates updated content]
  ↓
UI: Shows diff with proposed changes
  ↓
User: Clicks "Apply Changes"
  ↓
System: Updates document & regenerates embeddings
```

### Flow 2: Implicit Update from Conversation

```
User: "The API endpoint is now /v2/users instead of /api/users"
  ↓
Assistant: "I've noted that. Would you like me to update the API documentation?"
  ↓
User: "Yes, please"
  ↓
System: [Generates update proposal]
  ↓
UI: Shows diff
  ↓
User: Reviews and applies
```

### Flow 3: Batch Updates

```
User: "Update all docs to reflect the new authentication method"
  ↓
System: [Finds all relevant docs]
  ↓
UI: Shows queue of proposed updates
  ↓
User: Reviews each and applies/rejects
```

## API Reference

### `useDocumentUpdate` Hook

```typescript
const {
  // State
  currentProposal,     // Current update proposal or null
  isGenerating,        // True while generating proposal
  isApplying,          // True while applying changes

  // Actions
  proposeUpdate,       // (docId, context, request) => Promise<Proposal>
  applyProposal,       // () => Promise<boolean>
  rejectProposal,      // () => void
  shouldSuggestUpdate, // (message) => boolean
} = useDocumentUpdate();
```

### tRPC Endpoints

```typescript
// Get a specific document
trpc.projects.getDocument.useQuery({ documentId: string })

// Propose update
trpc.projects.proposeDocumentUpdate.useMutation({
  documentId: string,
  conversationContext: string,
  userRequest: string,
})

// Apply update
trpc.projects.updateDocument.useMutation({
  documentId: string,
  content: string,
  reason?: string,
})
```

## Environment Variables

```bash
# Required for document updates
OPENAI_API_KEY=sk-...
```

## Testing

```bash
# 1. Create a test project with a document
# 2. Start a conversation
# 3. Send: "Update the README to add a new section about testing"
# 4. Verify proposal appears
# 5. Click "Apply Changes"
# 6. Verify document is updated in database
# 7. Verify embeddings are regenerated
```

## Troubleshooting

### "Failed to generate proposal"
- Check OPENAI_API_KEY is set
- Check document exists and has content
- Check conversation context is not empty

### "Diff viewer shows no changes"
- LLM may have generated identical content
- Try being more specific in your request
- Check the original document content

### "Apply fails"
- Check database connection
- Check documentId is valid
- Check user has permission to update

## Future Enhancements

- [ ] Support for partial document updates (specific sections)
- [ ] Multi-document updates in one proposal
- [ ] Version history/rollback
- [ ] Approval workflow for team collaboration
- [ ] Automatic update suggestions based on conversation
- [ ] Integration with git for commit messages

## Example Implementation

See `src/pages/index.tsx` for a complete working example (coming soon).
