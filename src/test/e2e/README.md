# End-to-End (E2E) Testing

This directory contains end-to-end tests that verify complete user workflows with real tRPC backend integration.

## Overview

E2E tests simulate real user interactions and verify that all components work together correctly. Unlike unit tests that test individual pieces in isolation, E2E tests ensure the entire system functions as expected.

## Test Structure

### `setup.ts`
- **MSW Server Setup**: Mock Service Worker configuration for API mocking
- **Mock Data**: Test data for conversations, messages, and usage stats
- **Helper Functions**: Utilities for simulating API delays, errors, and responses

### `Chat.e2e.test.tsx`
- **Complete User Workflows**: Full conversation creation and management flows
- **Error Handling & Recovery**: API failures, timeouts, and recovery scenarios
- **Performance & Edge Cases**: Large data sets, rapid interactions, concurrent operations
- **Data Synchronization**: Real-time updates, data consistency, and invalidation
- **User Experience & Accessibility**: Loading states, keyboard navigation, error messages

## Running E2E Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Run Once (CI/CD)
```bash
npm run test:e2e:run
```

### Interactive UI
```bash
npm run test:e2e:ui
```

## Test Categories

### 1. Complete User Workflows
Tests that verify entire user journeys from start to finish:
- Creating new conversations
- Sending messages
- Viewing conversation history
- Managing multiple conversations

### 2. Error Handling & Recovery
Tests that ensure the app handles failures gracefully:
- API failures and recovery
- Partial failures with graceful degradation
- Network timeouts and retries

### 3. Performance & Edge Cases
Tests that verify the app handles challenging scenarios:
- Large conversation lists (50+ conversations)
- Rapid user interactions
- Concurrent operations
- State consistency under load

### 4. Data Synchronization
Tests that verify data integrity:
- Real-time updates
- Data consistency across operations
- Proper invalidation and refresh
- Message and conversation synchronization

### 5. User Experience & Accessibility
Tests that ensure good UX:
- Loading and success feedback
- Keyboard navigation
- Screen reader support
- Clear error messages

## Mock Data

The E2E tests use realistic mock data to simulate real app behavior:

```typescript
export const mockConversations = [
  {
    id: 'conv-1',
    title: 'Test Conversation 1',
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  // ... more conversations
];

export const mockMessages = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Hello, how are you?',
    tokens: 6,
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  // ... more messages
];
```

## Helper Functions

### `setupDefaultMocks()`
Sets up standard mock responses for all tRPC endpoints.

### `simulateApiDelay(delay)`
Simulates network latency to test loading states and timeouts.

### `simulateApiError(endpoint)`
Simulates API failures to test error handling and recovery.

## Adding New E2E Tests

### 1. Test Structure
```typescript
describe('New Feature', () => {
  it('should work correctly', async () => {
    // Arrange: Set up test data and mocks
    // Act: Perform user actions
    // Assert: Verify expected outcomes
  });
});
```

### 2. Mock Data
Add new mock data to `setup.ts` if needed:
```typescript
export const newMockData = {
  // ... test data
};
```

### 3. Helper Functions
Create new helper functions in `setup.ts` for common operations:
```typescript
export const simulateNewScenario = () => {
  // ... implementation
};
```

## Best Practices

### 1. Realistic User Actions
- Use `userEvent` for realistic interactions
- Test complete workflows, not just individual actions
- Include error scenarios and edge cases

### 2. Proper Assertions
- Use `waitFor` for asynchronous operations
- Verify both positive and negative outcomes
- Check for proper error states and recovery

### 3. Test Isolation
- Reset mocks between tests
- Use `beforeEach` for common setup
- Avoid test interdependencies

### 4. Performance Considerations
- Test with realistic data volumes
- Verify efficient handling of large datasets
- Test concurrent operations and race conditions

## Troubleshooting

### Common Issues

1. **MSW Not Working**
   - Ensure `setup.ts` is properly imported
   - Check that MSW server is started in `beforeAll`

2. **Async Test Failures**
   - Use `waitFor` for asynchronous operations
   - Increase timeout for slow operations
   - Check for proper mock setup

3. **Mock Data Issues**
   - Verify mock data structure matches expected format
   - Check that mocks are reset between tests
   - Ensure proper error simulation

### Debug Mode

Run tests with verbose output:
```bash
npm run test:e2e -- --reporter=verbose
```

## Integration with CI/CD

E2E tests are designed to run in CI/CD environments:
- Use `npm run test:e2e:run` for non-interactive execution
- Tests have appropriate timeouts for CI environments
- Mock data is consistent across different environments

## Future Enhancements

Potential improvements for the E2E testing framework:
- **Visual Regression Testing**: Screenshot comparison for UI changes
- **Performance Testing**: Load testing and performance benchmarks
- **Cross-Browser Testing**: Test in multiple browsers
- **Mobile Testing**: Test responsive design and mobile interactions
- **Real Backend Integration**: Test against actual database and AI services
