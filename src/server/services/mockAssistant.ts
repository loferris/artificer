import { AssistantService, Message } from './types';

export class MockAssistant implements AssistantService {
  async getResponse(userMessage: string, _conversationHistory?: Message[]): Promise<string> {
    const responses = [
      `I understand you said: "${userMessage}". What else would you like to discuss?`,
      `Regarding "${userMessage}", I'd suggest considering multiple perspectives.`,
      `Thanks for sharing: "${userMessage}". How can I assist you further?`,
      `"${userMessage}" - that's interesting! Could you elaborate?`,
      `I've processed your input: "${userMessage}". What would you like to explore next?`,
      `Based on "${userMessage}", here's what I think...`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}
