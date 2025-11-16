# MCP (Model Context Protocol) Integration Guide

This guide explains the MCP scaffolding added to the Chain Orchestrator for future tool use integration.

## 🎯 Overview

The Chain Orchestrator now has **type-safe scaffolding** for MCP tool detection and routing. While full MCP execution isn't implemented yet, the foundation is in place for:

1. **Tool requirement detection** - Analyze queries to detect needed tools
2. **Tool-aware routing** - Route to models with strong tool-use capabilities
3. **MCP context management** - Track available MCP servers and tools

## 📦 What's Been Added

### 1. Type Definitions (`types.ts`)

```typescript
// MCP tool types
export type MCPToolType =
  | 'filesystem'      // File operations
  | 'search'          // Web search
  | 'database'        // Database queries
  | 'git'             // Git operations
  | 'shell'           // Shell commands
  | 'browser'         // Browser automation
  | 'code-analysis'   // Code parsing
  | 'calculator'      // Math computations
  | 'api'             // External APIs
  | 'custom';         // Custom tools

// Tool capability
export interface MCPToolCapability {
  type: MCPToolType;
  name: string;
  description: string;
  requiredParams?: string[];
  cost?: number;
  latency?: number;
}

// MCP server
export interface MCPServer {
  id: string;
  name: string;
  enabled: boolean;
  tools: MCPToolCapability[];
  healthStatus?: 'healthy' | 'degraded' | 'down';
}

// MCP context
export interface MCPContext {
  servers: MCPServer[];
  enabledTools: MCPToolType[];
  toolPreferences?: {
    preferredSearch?: string;
    maxCostPerTool?: number;
    timeoutMs?: number;
  };
}

// Tool requirement (detected from query)
export interface ToolRequirement {
  toolType: MCPToolType;
  confidence: number;      // 0-1
  reasoning: string;
  priority: 'required' | 'optional' | 'nice-to-have';
  estimatedCalls?: number;
}

// Extended analysis with tools
export interface AnalysisResultWithTools extends AnalysisResult {
  toolRequirements?: ToolRequirement[];
  requiresMCP?: boolean;
  toolComplexity?: number;  // 1-10 scale
}
```

### 2. New Capabilities

Added to `RequiredCapability` enum:
- `'tool-use'` - Requires basic tool/function calling
- `'multi-tool'` - Requires orchestrating multiple tools

### 3. Tool Detection (`AnalyzerAgent`)

```typescript
// New method: analyzeWithToolDetection()
const analysis = await analyzer.analyzeWithToolDetection(
  message,
  history,
  openRouterFetch,
  mcpContext  // Optional MCP context
);

// Returns:
{
  ...baseAnalysis,
  toolRequirements: [
    {
      toolType: 'search',
      confidence: 0.8,
      reasoning: 'Query requests current information',
      priority: 'required',
      estimatedCalls: 1
    }
  ],
  requiresMCP: true,
  toolComplexity: 3
}
```

**Pattern-Based Detection:**
- Search: "find latest news", "search for", "look up"
- Filesystem: "read file", "write to directory", "list files"
- Git: "commit changes", "create branch", "git status"
- Database: "query database", "SELECT", "INSERT"
- Shell: "run command", "npm install", "execute"
- Browser: "screenshot", "navigate to", "click button"
- Code Analysis: "parse code", "analyze AST"
- Calculator: "calculate", "compute", "solve equation"

### 4. Tool-Aware Routing (`RouterAgent`)

**Model Metadata Extended:**
```typescript
interface ModelMetadata {
  // ... existing fields
  toolUseScore?: number;        // 0-10 rating
  supportedToolTypes?: string[]; // Tool types this model excels at
}
```

**Tool Use Scores:**
- DeepSeek Chat: 5 (basic)
- Claude Haiku: 7 (good)
- GPT-4o Mini: 7 (good)
- Claude Sonnet: **9 (excellent)** ⭐
- GPT-4o: **9 (excellent)** ⭐
- Claude Opus: **9 (excellent)** ⭐
- O1 Preview: 8 (good, optimized for reasoning)

**Routing Logic:**
```typescript
if (analysis.capabilities.includes('tool-use')) {
  // Prefer models with high tool-use scores
  // Route to mid/expensive tier for better tool support
  tier = complexity >= 7 ? 'expensive' : 'mid';
}
```

## 🚀 Usage Examples

###Example 1: Search Query

```typescript
const mcpContext = {
  servers: [{
    id: 'brave-search',
    name: 'Brave Search',
    enabled: true,
    tools: [{ type: 'search', name: 'brave-search', ... }]
  }],
  enabledTools: ['search'],
};

const analysis = await analyzer.analyzeWithToolDetection(
  "What's the latest news on AI?",
  [],
  openRouterFetch,
  mcpContext
);

// Result:
{
  complexity: 5,
  category: 'research',
  capabilities: ['knowledge', 'tool-use'],  // tool-use added!
  toolRequirements: [{
    toolType: 'search',
    confidence: 0.8,
    reasoning: 'Query requests current information or web search',
    priority: 'required',
    estimatedCalls: 1
  }],
  requiresMCP: true,
  toolComplexity: 3
}

// Router will select Claude Sonnet or GPT-4o (high tool-use score)
```

### Example 2: File Operations

```typescript
const mcpContext = {
  servers: [{
    id: 'filesystem',
    enabled: true,
    tools: [{ type: 'filesystem', ... }]
  }],
  enabledTools: ['filesystem', 'git'],
};

const analysis = await analyzer.analyzeWithToolDetection(
  "Read all TypeScript files in src/ and create a summary",
  [],
  openRouterFetch,
  mcpContext
);

// Result:
{
  complexity: 7,
  category: 'code',
  capabilities: ['reasoning', 'knowledge', 'multi-tool'],  // multi-tool!
  toolRequirements: [
    {
      toolType: 'filesystem',
      confidence: 0.9,
      priority: 'required',
      estimatedCalls: 5  // Multiple files
    }
  ],
  requiresMCP: true,
  toolComplexity: 6  // Higher complexity for multiple operations
}

// Router will select expensive tier model (Claude Opus/Sonnet)
```

### Example 3: No Tools Needed

```typescript
const analysis = await analyzer.analyzeWithToolDetection(
  "Explain how async/await works",
  [],
  openRouterFetch,
  undefined  // No MCP context
);

// Result:
{
  complexity: 4,
  category: 'chat',
  capabilities: ['reasoning', 'knowledge'],  // No tool-use
  requiresMCP: false,  // No tools needed
}

// Router will use cheap/mid tier model (no tool overhead)
```

## 🔌 Integration Points

### Current (Ready for MCP)

1. **Type System**: All MCP types defined and documented
2. **Tool Detection**: Pattern-based detection implemented
3. **Routing Awareness**: Models tagged with tool-use scores
4. **Backward Compatible**: All MCP features are optional

### Future (When MCP is Connected)

1. **MCP Server Discovery**:
```typescript
const mcpContext = await discoverMCPServers();
// Auto-detect available servers and tools
```

2. **Tool Execution**:
```typescript
const result = await executeWithTools(plan, toolRequirements);
// Actually call MCP tools during execution
```

3. **Tool Call Streaming**:
```typescript
yield { message: '🔍 Searching web for latest info...' };
yield { message: '📁 Reading project files...' };
yield { message: '✨ Synthesizing results...' };
```

4. **Tool Validation**:
```typescript
// Validate tool usage in ValidatorAgent
validation.toolUsageCorrect = checkToolOutputs(execution);
```

## 📊 Tool Complexity Calculation

```typescript
calculateToolComplexity(toolRequirements):
  - 0 tools → complexity 0
  - 1 tool → complexity 3
  - Multiple tools → 5 + (required tools × 1) + (total calls × 0.5)
  - Max: 10
```

**Examples:**
- 1 search call → 3
- 2 filesystem calls → 5 + 1 + 1 = 7
- Search + git + filesystem (5 files) → 5 + 3 + 2.5 = 10

## 🎨 Streaming with MCP (Future)

```typescript
yield { message: '🔍 Analyzing query...', progress: 0.1 };
yield { message: '🔧 Detected tool needs: search, filesystem', progress: 0.2 };
yield { message: '✅ MCP servers available', progress: 0.25 };
yield { message: '🎯 Routing to claude-sonnet (tool-capable)', progress: 0.3 };
yield { message: '🔍 Searching web...', progress: 0.4 };  // Tool call
yield { message: '📁 Reading files...', progress: 0.5 };   // Tool call
yield { message: '✨ Synthesizing results...', progress: 0.7 };
yield { message: '✅ Complete!', progress: 1.0 };
```

## 🛠️ Configuration (Future)

Add to `.env.example`:
```bash
# MCP Integration
MCP_ENABLED=true
MCP_SERVERS=brave-search,filesystem,git
MCP_TIMEOUT_MS=30000
MCP_MAX_COST_PER_TOOL=0.01

# Preferred tools
MCP_PREFERRED_SEARCH=brave-search
MCP_ENABLE_SHELL=false  # Security: disable shell by default
```

## 🔐 Security Considerations

**Current Pattern Detection:**
- Shell commands marked as `priority: 'optional'` (risky)
- No actual tool execution yet (safe)

**Future Tool Execution:**
- ⚠️ Validate tool calls before execution
- ⚠️ Sandbox shell/filesystem operations
- ⚠️ Require explicit user consent for destructive operations
- ⚠️ Implement tool usage limits (rate limiting, cost caps)

## 📝 Next Steps to Full MCP Integration

1. **Connect MCP Servers**
   - Implement MCP protocol client
   - Auto-discover available servers
   - Health check monitoring

2. **Tool Execution**
   - Execute tool calls during orchestration
   - Handle tool responses
   - Error handling and retries

3. **LLM-Based Detection**
   - Replace pattern matching with LLM analysis
   - More accurate tool requirement detection
   - Support for complex multi-tool workflows

4. **Tool Chain Optimization**
   - Parallel tool execution where possible
   - Cache tool results
   - Smart retry logic

5. **Validation**
   - Verify tool outputs are used correctly
   - Check for hallucinated tool calls
   - Validate tool call parameters

## 🎯 Benefits of This Approach

✅ **Type-Safe**: All MCP types defined upfront
✅ **Backward Compatible**: Existing code unchanged
✅ **Future-Proof**: Easy to add MCP execution later
✅ **Tool-Aware Routing**: Already routes to tool-capable models
✅ **Pattern Detection**: Basic tool detection works now
✅ **Incremental**: Can add features one at a time

## 📚 Related Files

- `types.ts` - All MCP type definitions
- `agents/AnalyzerAgent.ts` - Tool detection logic
- `agents/RouterAgent.ts` - Tool-aware routing
- `ChainOrchestrator.ts` - Future integration point

---

**Status**: Scaffolding complete, ready for MCP server integration!
