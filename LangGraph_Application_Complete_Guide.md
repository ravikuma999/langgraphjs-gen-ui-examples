# LangGraph Generative UI Application - Complete Guide

## Table of Contents
1. [Application Overview](#application-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Complete Application Flow](#complete-application-flow)
4. [Component Breakdown](#component-breakdown)
5. [How to Build a Similar Application](#how-to-build-a-similar-application)
6. [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)

---

## Application Overview

This is a **LangGraph-based AI agent application** that demonstrates **Generative UI** - a paradigm where AI agents can dynamically generate and render custom React components based on the conversation context. The application serves as a backend API that can be used with the Agent Chat UI frontend.

### Key Features
- **Multi-Agent System**: Supervisor agent routes to specialized sub-agents
- **Generative UI**: Agents can render custom React components dynamically
- **Tool Calling**: Agents use tools to fetch data and perform actions
- **Human-in-the-Loop**: Support for interrupts and user approvals
- **Streaming**: Real-time streaming of responses and UI components

---

## Architecture & Technology Stack

### Backend Stack
- **LangGraph.js**: State machine framework for building AI agents
- **LangChain**: LLM orchestration and tool calling
- **Node.js 20+**: Runtime environment
- **TypeScript**: Type safety
- **Express/Hono**: HTTP server (via LangGraph API)

### LLM Providers
- **OpenAI** (GPT-4o-mini): Primary chat and tool calling
- **Google Gemini 2.0 Flash**: Router decision making
- **Anthropic Claude**: Email agent (optional)

### Frontend (Agent Chat UI)
- **React**: UI framework
- **@assistant-ui/react**: Chat UI components
- **Tailwind CSS**: Styling
- **Radix UI**: Component primitives

### Key Libraries
- `@langchain/langgraph`: Core graph framework
- `@langchain/langgraph-sdk`: SDK for UI integration
- `@langchain/langgraph-cli`: Development server
- `zod`: Schema validation

---

## Complete Application Flow

### 1. Application Startup Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Startup                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Run: pnpm agent                                          │
│     - Executes: langgraphjs dev --no-browser                │
│     - Starts LangGraph development server                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Server Initialization                                    │
│     - Reads langgraph.json configuration                    │
│     - Loads graph definitions from src/agent/                │
│     - Registers UI components from src/agent-uis/           │
│     - Starts HTTP server on port 2024                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Server Ready                                             │
│     - API: http://localhost:2024                            │
│     - Studio UI: https://smith.langchain.com/studio        │
│     - Workers: 10 worker processes started                  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Request Flow (User Message → Response)

```
┌─────────────────────────────────────────────────────────────┐
│                    User Sends Message                        │
│              (via Agent Chat UI Frontend)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  HTTP POST /threads/{thread_id}/runs                        │
│  Body: { input: { messages: [...] } }                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  LangGraph API Receives Request                              │
│  - Creates/updates thread state                              │
│  - Determines which graph to use (agent/chat/email_agent)   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Graph Execution Starts                                      │
│  - Loads graph definition                                     │
│  - Initializes state with messages                          │
│  - Begins node execution                                     │
└─────────────────────────────────────────────────────────────┘
```

### 3. Supervisor Agent Flow (Main Agent)

```
┌─────────────────────────────────────────────────────────────┐
│                    Supervisor Graph                          │
│              (Graph ID: "agent")                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  START Node                                                  │
│  - Entry point of the graph                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Router Node                                                 │
│  - Receives: Full conversation history                      │
│  - Uses: Gemini 2.0 Flash with tool calling                 │
│  - Analyzes: User's intent and context                      │
│  - Decides: Which sub-agent to route to                      │
│                                                              │
│  Available Routes:                                          │
│  • stockbroker    - Stock trading operations                │
│  • tripPlanner    - Travel planning                          │
│  • openCode       - Code generation                         │
│  • orderPizza     - Pizza ordering                           │
│  • writerAgent    - Text document writing                   │
│  • generalInput   - General conversation                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Conditional Routing                                         │
│  - Based on router decision, routes to one of:              │
│    → stockbroker Graph                                       │
│    → tripPlanner Graph                                       │
│    → openCode Graph                                          │
│    → orderPizza Graph                                        │
│    → writerAgent Graph                                       │
│    → generalInput Node                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Sub-Agent Execution                                         │
│  - Executes specialized agent logic                          │
│  - May call tools, generate UI, or both                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  END Node                                                    │
│  - Returns final state with messages and UI components      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Response Sent to Frontend                                   │
│  - Streams messages and UI updates                          │
│  - Frontend renders components dynamically                  │
└─────────────────────────────────────────────────────────────┘
```

### 4. Stockbroker Agent Flow (Example)

```
┌─────────────────────────────────────────────────────────────┐
│              Stockbroker Sub-Agent                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  START → Agent Node                                          │
│  - Receives: User message (e.g., "What's AAPL price?")     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  LLM with Tool Binding                                       │
│  - Model: GPT-4o-mini                                        │
│  - Tools Available:                                         │
│    1. stock-price: Get stock price                          │
│    2. portfolio: Get user portfolio                          │
│    3. buy-stock: Buy stock shares                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Tool Call Detection                                         │
│  - LLM decides to call: stock-price tool                    │
│  - Extracts: { ticker: "AAPL" }                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Tool Execution                                              │
│  - Fetches data from Financial Datasets API                 │
│  - Gets: Current price, 1-day prices, 30-day prices        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Generative UI Push                                          │
│  - Uses: typedUi<ComponentMap>(config)                       │
│  - Pushes: { name: "stock-price", props: {...} }           │
│  - Component: StockPrice React component                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Response Returned                                           │
│  - messages: [AI message about stock]                        │
│  - ui: [{ name: "stock-price", props: {...} }]              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend Rendering                                           │
│  - Agent Chat UI receives response                          │
│  - Renders: StockPrice component with chart                 │
│  - Displays: Price data, charts, interactive elements       │
└─────────────────────────────────────────────────────────────┘
```

### 5. Trip Planner Agent Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Trip Planner Sub-Agent                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  START → Conditional Routing                                  │
│  - Checks: Does state have tripDetails?                     │
│  - Routes to: classify OR extraction                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Extraction Node (if no tripDetails)                         │
│  - Uses LLM to extract from user message:                   │
│    • location (required)                                     │
│    • startDate (optional)                                    │
│    • endDate (optional)                                      │
│    • numberOfGuests (optional)                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Classify Node                                               │
│  - Determines: What user wants?                             │
│  - Options: "accommodations" or "restaurants"                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Call Tools Node                                             │
│  - Calls appropriate tool:                                   │
│    • get-accommodations: Fetches hotels/places              │
│    • get-restaurants: Fetches restaurants                   │
│  - Generates UI component:                                   │
│    • AccommodationsList or RestaurantsList                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  END → Response with UI Component                            │
└─────────────────────────────────────────────────────────────┘
```

### 6. Email Agent Flow (Human-in-the-Loop)

```
┌─────────────────────────────────────────────────────────────┐
│              Email Agent (Graph ID: "email_agent")           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Write Email Node                                            │
│  - Extracts: recipient, subject, body from user message     │
│  - Generates: Email draft                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Interrupt Node                                              │
│  - Throws: HumanInterrupt exception                          │
│  - Schema: Standardized interrupt format                    │
│  - Pauses: Graph execution                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend: HITL UI Rendered                                   │
│  - Agent Chat UI detects interrupt                          │
│  - Shows: Email preview with actions:                       │
│    • Accept: Send as-is                                     │
│    • Edit: Modify fields                                    │
│    • Respond: Provide feedback                              │
│    • Ignore: Cancel                                         │
│    • Mark as resolved: Skip                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  User Action → Graph Resumes                                 │
│  - If Accept/Edit: Send email node executes                 │
│  - If Respond: Rewrite email node executes                  │
│  - If Ignore/Resolved: Graph ends                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Backend Components

#### 1. Graph Definitions (`src/agent/`)

**Supervisor Agent** (`supervisor/index.ts`)
- Main orchestrator
- Routes to sub-agents
- Handles general queries

**Stockbroker Agent** (`stockbroker/`)
- Tools: stock-price, portfolio, buy-stock
- UI Components: StockPrice, PortfolioView, BuyStock

**Trip Planner Agent** (`trip-planner/`)
- Tools: get-accommodations, get-restaurants
- UI Components: AccommodationsList, RestaurantsList

**Open Code Agent** (`open-code/`)
- Generates code plans and implementations
- UI Components: Plan, ProposedChange

**Email Agent** (`email-agent/`)
- Writes and sends emails
- Implements Human-in-the-Loop

**Chat Agent** (`chat-agent/`)
- Simple conversational agent
- No tools or UI components

**Pizza Orderer** (`pizza-orderer/`)
- Demonstrates tool calling
- No custom UI components

**Writer Agent** (`writer-agent/`)
- Generates text documents
- UI Component: Writer (streaming artifact)

#### 2. UI Components (`src/agent-uis/`)

**Component Map** (`index.tsx`)
- Maps component names to React components
- Used by `typedUi` for type-safe UI generation

**Stockbroker Components**
- `stock-price/index.tsx`: Stock price chart and data
- `portfolio-view/index.tsx`: Portfolio visualization
- `buy-stock/index.tsx`: Stock purchase interface

**Trip Planner Components**
- `accommodations-list/index.tsx`: Hotel/accommodation list
- `restaurants-list/index.tsx`: Restaurant recommendations

**Open Code Components**
- `plan/index.tsx`: Code generation plan
- `proposed-change/index.tsx`: Code diff viewer

**Writer Component**
- `writer/index.tsx`: Streaming text document viewer

### Frontend Components (Agent Chat UI)

The frontend is a separate application that connects to this backend. It provides:
- Chat interface
- Message rendering
- Dynamic component rendering
- Tool call visualization
- Human-in-the-Loop UI

---

## How to Build a Similar Application

### Prerequisites

1. **Node.js 20+** installed
2. **pnpm** package manager
3. **API Keys**:
   - OpenAI API key
   - Google GenAI API key
   - (Optional) Anthropic, Financial Datasets

### Step 1: Project Setup

```bash
# Create new project
mkdir my-langgraph-app
cd my-langgraph-app

# Initialize package.json
pnpm init

# Install core dependencies
pnpm add @langchain/langgraph @langchain/langgraph-cli @langchain/core
pnpm add @langchain/openai @langchain/google-genai
pnpm add @langchain/langgraph-sdk zod
pnpm add -D typescript @types/node
```

### Step 2: Create Project Structure

```
my-langgraph-app/
├── src/
│   ├── agent/
│   │   ├── my-agent/
│   │   │   ├── index.ts          # Graph definition
│   │   │   ├── nodes/
│   │   │   │   └── tools.ts      # Tool calling logic
│   │   │   └── types.ts          # State types
│   │   └── types.ts              # Shared types
│   └── agent-uis/
│       └── index.tsx              # UI component map
├── langgraph.json                # Configuration
├── package.json
└── tsconfig.json
```

### Step 3: Create langgraph.json

```json
{
  "node_version": "20",
  "graphs": {
    "my_agent": "./src/agent/my-agent/index.ts:graph"
  },
  "ui": {
    "my_agent": "./src/agent-uis/index.tsx"
  },
  "env": ".env"
}
```

### Step 4: Define Your Agent Graph

**src/agent/my-agent/types.ts**
```typescript
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { z } from "zod";

export const MyAgentAnnotation = Annotation.Root({
  messages: MessagesAnnotation.spec["messages"],
  ui: Annotation<Array<{ name: string; props: unknown }>>(),
});

export type MyAgentState = typeof MyAgentAnnotation.State;
export type MyAgentUpdate = Promise<typeof MyAgentAnnotation.Update>;
```

**src/agent/my-agent/index.ts**
```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { MyAgentAnnotation } from "./types";
import { callTools } from "./nodes/tools";

const builder = new StateGraph(MyAgentAnnotation)
  .addNode("agent", callTools)
  .addEdge(START, "agent")
  .addEdge("agent", END);

export const graph = builder.compile();
graph.name = "My Agent";
```

### Step 5: Implement Tool Calling

**src/agent/my-agent/nodes/tools.ts**
```typescript
import { ChatOpenAI } from "@langchain/openai";
import { typedUi } from "@langchain/langgraph-sdk/react-ui/server";
import { z } from "zod";
import { MyAgentState, MyAgentUpdate } from "../types";
import type ComponentMap from "../../../agent-uis/index";

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

const myToolSchema = z.object({
  query: z.string().describe("The user's query"),
});

const MY_TOOLS = [
  {
    name: "my-tool",
    description: "A tool to do something",
    schema: myToolSchema,
  },
];

export async function callTools(
  state: MyAgentState,
  config: LangGraphRunnableConfig,
): Promise<MyAgentUpdate> {
  const ui = typedUi<typeof ComponentMap>(config);

  const message = await llm.bindTools(MY_TOOLS).invoke([
    {
      role: "system",
      content: "You are a helpful assistant.",
    },
    ...state.messages,
  ]);

  // Check for tool calls
  const toolCall = message.tool_calls?.find(
    (tc) => tc.name === "my-tool"
  );

  if (toolCall) {
    // Execute tool logic
    const result = await executeMyTool(toolCall.args.query);

    // Push UI component
    ui.push(
      {
        name: "my-component",
        props: { data: result },
      },
      { message }
    );
  }

  return {
    messages: [message],
    ui: ui.items,
  };
}

async function executeMyTool(query: string) {
  // Your tool logic here
  return { result: `Processed: ${query}` };
}
```

### Step 6: Create UI Components

**src/agent-uis/index.tsx**
```typescript
import MyComponent from "./my-component";

const ComponentMap = {
  "my-component": MyComponent,
} as const;

export default ComponentMap;
```

**src/agent-uis/my-component/index.tsx**
```typescript
interface MyComponentProps {
  data: { result: string };
}

export default function MyComponent({ data }: MyComponentProps) {
  return (
    <div className="p-4 border rounded">
      <h3>My Component</h3>
      <p>{data.result}</p>
    </div>
  );
}
```

### Step 7: Environment Setup

**.env**
```
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
```

### Step 8: Run the Application

```bash
# Start the server
pnpm agent

# Or add to package.json:
# "agent": "langgraphjs dev --no-browser"
```

### Step 9: Connect Frontend

Use the [Agent Chat UI](https://github.com/langchain-ai/agent-chat-ui) or build your own frontend that:
1. Connects to `http://localhost:2024`
2. Sends messages via `/threads/{thread_id}/runs`
3. Receives streaming responses
4. Renders UI components dynamically

---

## Step-by-Step Implementation Guide

### Phase 1: Basic Agent (Week 1)

**Day 1-2: Setup**
- Set up project structure
- Install dependencies
- Create basic graph

**Day 3-4: Simple Chat**
- Implement basic chat agent
- Test with Agent Chat UI
- Verify message flow

**Day 5-7: Add Tools**
- Add one simple tool
- Implement tool calling
- Test tool execution

### Phase 2: Generative UI (Week 2)

**Day 1-3: First UI Component**
- Create simple React component
- Register in component map
- Push from agent
- Verify rendering

**Day 4-5: Data Integration**
- Connect to external API
- Fetch real data
- Pass to UI component

**Day 6-7: Multiple Components**
- Create 2-3 different components
- Implement routing logic
- Test different scenarios

### Phase 3: Advanced Features (Week 3-4)

**Week 3: Multi-Agent System**
- Implement supervisor pattern
- Create sub-agents
- Implement routing logic
- Test agent switching

**Week 4: Human-in-the-Loop**
- Implement interrupts
- Create HITL UI
- Test approval flows
- Handle user feedback

### Phase 4: Production Ready (Week 5-6)

**Week 5: Error Handling**
- Add error boundaries
- Implement retry logic
- Add logging
- Handle edge cases

**Week 6: Deployment**
- Set up production config
- Deploy to cloud
- Set up monitoring
- Performance optimization

---

## Key Concepts Explained

### 1. StateGraph

A state machine where:
- **Nodes**: Functions that process state
- **Edges**: Transitions between nodes
- **State**: Shared data structure
- **Conditional Edges**: Dynamic routing based on state

### 2. Generative UI

The ability for agents to:
- Dynamically create UI components
- Pass data to components
- Render components in chat interface
- Update components based on user interaction

### 3. Tool Calling

Agents can:
- Call external APIs
- Perform computations
- Access databases
- Trigger actions
- Return structured data

### 4. Human-in-the-Loop

Agents can:
- Pause execution
- Request user input
- Wait for approval
- Resume based on user action

### 5. Streaming

Real-time updates:
- Messages stream as generated
- UI components appear incrementally
- Tool results stream in
- Better user experience

---

## Best Practices

### 1. Graph Design
- Keep graphs focused and single-purpose
- Use supervisor pattern for complex systems
- Minimize state complexity
- Use conditional edges wisely

### 2. Tool Design
- Tools should be idempotent when possible
- Return structured data
- Handle errors gracefully
- Document tool schemas clearly

### 3. UI Components
- Keep components focused
- Make components reusable
- Handle loading states
- Provide error states

### 4. State Management
- Use TypeScript for type safety
- Validate state with Zod
- Keep state minimal
- Use annotations properly

### 5. Error Handling
- Catch errors at node level
- Provide meaningful error messages
- Log errors appropriately
- Handle edge cases

---

## Common Patterns

### Pattern 1: Router → Sub-Agent

```typescript
const builder = new StateGraph(Annotation)
  .addNode("router", router)
  .addNode("agent1", agent1Graph)
  .addNode("agent2", agent2Graph)
  .addConditionalEdges("router", route, ["agent1", "agent2"]);
```

### Pattern 2: Tool → UI Component

```typescript
const toolCall = message.tool_calls?.find(...);
if (toolCall) {
  const data = await executeTool(toolCall.args);
  ui.push({ name: "component", props: data }, { message });
}
```

### Pattern 3: Interrupt → Resume

```typescript
// In agent node
if (needsApproval) {
  throw new HumanInterrupt({ ... });
}

// After user action
await graph.updateState(threadId, { action: "accept" });
```

---

## Troubleshooting

### Issue: Graph not executing
- Check `langgraph.json` paths
- Verify graph exports
- Check server logs

### Issue: UI components not rendering
- Verify component map registration
- Check component name matches
- Verify props structure

### Issue: Tool calls failing
- Check API keys
- Verify tool schemas
- Check network connectivity
- Review error logs

### Issue: State not updating
- Verify state annotation
- Check node return values
- Review state structure

---

## Resources

### Documentation
- [LangGraph.js Docs](https://langchain-ai.github.io/langgraphjs/)
- [LangChain Docs](https://js.langchain.com/)
- [Agent Chat UI](https://github.com/langchain-ai/agent-chat-ui)

### Examples
- This repository
- LangGraph examples
- LangChain cookbook

### Community
- LangChain Discord
- GitHub Discussions
- Stack Overflow

---

## Conclusion

This application demonstrates a powerful pattern for building AI agents with dynamic UI generation. The key is understanding:
1. How graphs orchestrate agent behavior
2. How tools enable external actions
3. How UI components provide rich interactions
4. How the frontend and backend communicate

Start simple, iterate, and gradually add complexity. The modular architecture makes it easy to extend and maintain.

Good luck building your own LangGraph application!




