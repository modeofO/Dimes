file: ./content/docs/core/contributing.mdx
meta: {
  "title": "Contributing",
  "description": "Contributing to Daydreams."
}
        
## Contributing

To contribute to Daydreams, please review our development guidelines and
submission process.

If you are a developer and would like to contribute with code, please check out
our [GitHub repository](https://github.com/daydreamsai/daydreams) and open an
issue to discuss before opening a Pull Request.

## Star History

<a href="https://www.star-history.com/#daydreamsai/daydreams&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcSet="https://api.star-history.com/svg?repos=daydreamsai/daydreams&type=Date&theme=dark" />

    <source media="(prefers-color-scheme: light)" srcSet="https://api.star-history.com/svg?repos=daydreamsai/daydreams&type=Date" />

    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=daydreamsai/daydreams&type=Date" />
  </picture>
</a>


file: ./content/docs/core/first-agent.mdx
meta: {
  "title": "Your first agent",
  "description": "Build your first Daydreams agent."
}
        
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

## Overview

Daydreams is a framework for building autonomous AI agents. At its core, an
agent operates through a continuous cycle:

1. **Analyzes** incoming information (inputs)
2. **Reasons** about it using a Large Language Model (LLM)
3. **Decides** on the next steps - either generating a response (output) or
   performing a task (action)
4. **Feeds results** back into the agent's awareness, creating a continuous loop
   orchestrated by the LLM

This enables you to build agents that can interact with various systems like
blockchains, social media platforms, APIs, and more, all based on predefined
goals and contextual understanding.

## Installation

Install the core Daydreams packages:

<Tabs groupId="language" items={["pnpm", "npm", "bun", "yarn"]} persist>
  <Tab value="pnpm">pnpm add @daydreamsai/core @daydreamsai/cli</Tab>
  <Tab value="npm">npm install @daydreamsai/core @daydreamsai/cli</Tab>
  <Tab value="bun">bun add @daydreamsai/core @daydreamsai/cli</Tab>
  <Tab value="yarn">yarn add @daydreamsai/core @daydreamsai/cli</Tab>
</Tabs>

You'll also need an LLM provider SDK. For this guide, we'll use OpenAI:

<Tabs groupId="language" items={["pnpm", "npm", "bun", "yarn"]} persist>
  <Tab value="pnpm">pnpm add @ai-sdk/openai</Tab>
  <Tab value="npm">npm install @ai-sdk/openai</Tab>
  <Tab value="bun">bun add @ai-sdk/openai</Tab>
  <Tab value="yarn">yarn add @ai-sdk/openai</Tab>
</Tabs>

**Important:** Make sure you have an `OPENAI_API_KEY` environment variable set
before proceeding.

## Core Concepts

Daydreams is built around several key components that work together:

### Essential Components

* **[Agent Lifecycle](/docs/core/concepts/agent-lifecycle)** - The central
  orchestrator that runs the main loop
* **[Contexts](/docs/core/concepts/contexts)** - Manages state and memory for
  specific tasks or interactions (e.g., a chat session)
* **[Inputs](/docs/core/concepts/inputs)** - How agents receive information
  (e.g., CLI messages, API events)
* **[Outputs](/docs/core/concepts/outputs)** - How agents respond or send
  information (e.g., CLI responses, tweets)
* **[Actions](/docs/core/concepts/actions)** - Tasks agents can perform (e.g.,
  calling APIs, executing transactions)
* **[Memory](/docs/core/concepts/memory)** - How agents store and recall
  information (working memory, episodic memory)

For detailed information about these concepts, visit the
[Core Concepts](/docs/core/concepts/core) section.

## Your First Agent (CLI Echo Bot)

Let's build a simple agent that echoes back whatever you type in the command
line. This example demonstrates the basic structure and workflow of a Daydreams
agent.

### Step 1: Set up your project

```bash title="create-project.sh"
mkdir my-first-agent && cd my-first-agent
```

<Tabs groupId="language" items={["pnpm", "npm", "bun", "yarn"]} persist>
  <Tab value="pnpm">
    pnpm add @daydreamsai/core @daydreamsai/cli @ai-sdk/openai zod
  </Tab>

  <Tab value="npm">
    npm install @daydreamsai/core @daydreamsai/cli @ai-sdk/openai zod
  </Tab>

  <Tab value="bun">
    bun add @daydreamsai/core @daydreamsai/cli @ai-sdk/openai
  </Tab>

  <Tab value="yarn">
    yarn add @daydreamsai/core @daydreamsai/cli @ai-sdk/openai zod
  </Tab>
</Tabs>

### Step 2: Create your agent

Create a file named `agent.ts`:

```typescript title="agent.ts"
import { createDreams, context, input, output } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { openai } from "@ai-sdk/openai";
import * as z from "zod/v4";

// 1. Define the main context for our agent
const echoContext = context({
  type: "echo",
  // No specific arguments needed for this simple context
  schema: z.object({}),
  // Instructions that guide the LLM's behavior
  instructions:
    "You are a simple echo bot. Repeat the user's message back to them.",
});

// 2. Create the agent instance
const agent = createDreams({
  // Configure the LLM model to use
  model: openai("gpt-4o-mini"),
  // Include the CLI extension for input/output handling
  extensions: [cliExtension],
  // Register our custom context
  contexts: [echoContext],
});

// 3. Start the agent and run the context
async function main() {
  // Initialize the agent (sets up services like readline)
  await agent.start();

  console.log("Echo agent started. Type 'exit' to quit.");

  // Run our echo context
  // The cliExtension automatically handles console input/output
  await agent.run({
    context: echoContext,
    args: {}, // Empty object since our schema requires no arguments
  });

  // Agent stops when the input loop breaks (e.g., user types "exit")
  console.log("Agent stopped.");
}

// Start the application
main();
```

### Step 3: Run your agent

Ensure your `OPENAI_API_KEY` environment variable is set, then run:

```bash title="run-agent.sh"
node agent.ts
```

Your agent will start listening for input. Type any message and watch as the
agent echoes it back using the LLM and CLI handlers provided by the
`cliExtension`.

***

## Next Steps

Continue learning about Daydreams with these resources:

* **[Core Concepts](/docs/core/concepts/core)** - Deep dive into Daydreams
  architecture
* **[Advanced Features](/docs/core/advanced/introduction)** - More complex
  examples and advanced usage patterns


file: ./content/docs/core/index.mdx
meta: {
  "title": "About Daydreams",
  "description": "TypeScript framework for building autonomous AI agents with unified LLM provider support."
}
        
> ⚠️ **Warning**: This is alpha software under active development. Expect
> frequent breaking changes and bugs. The API is not yet stable.

## What is an AI Agent?

Think of an AI agent as a smart assistant that can:

* **Listen** for events (Discord messages, API calls, timers)
* **Think** about what to do (using AI models like GPT)
* **Take action** (call APIs, send responses, update databases)
* **Remember** what happened for future interactions

## Real Examples

Here are some agents you could build with Daydreams:

### Discord Weather Bot

```typescript title="weather-bot.ts"
// When someone says "what's the weather?"
// → Agent calls weather API
// → Agent responds: "It's 72°F and sunny in San Francisco"
```

### Trading Assistant

```typescript title="trading-bot.ts"
// When market conditions change
// → Agent analyzes data
// → Agent executes trades or sends alerts
```

### Customer Support Bot

```typescript title="support-bot.ts"
// When customer sends message
// → Agent checks knowledge base
// → Agent provides help or escalates to human
```

## How Daydreams Works

Daydreams provides the building blocks to create these agents:

* **Contexts** - Manage different conversation sessions or tasks
* **Inputs** - Listen for Discord messages, API calls, timers, etc.
* **Outputs** - Send responses via Discord, email, webhooks, etc.
* **Actions** - Call APIs, process data, perform calculations
* **Memory** - Remember conversations and learn from interactions

## Why Choose Daydreams?

* **TypeScript-first** - Full type safety and IntelliSense support
* **Model-agnostic** - Works with OpenAI, Anthropic, Groq, and any AI SDK
  provider
* **Production-ready** - Built-in memory management, error handling, and
  concurrency
* **Extensible** - Pre-built extensions for Discord, Twitter, Telegram, and more

## Get Started

Choose your path based on your experience:

### New to AI Agents?

1. **[Building Blocks](/docs/core/concepts/building-blocks)** - Understand the
   core components with simple examples
2. **[Your First Agent](/docs/core/first-agent)** - Build a working CLI echo bot
3. **[Agent Lifecycle](/docs/core/concepts/agent-lifecycle)** - Learn how agents
   think and act

### Ready to Build?

1. **[Installation](/docs/core/installation)** - Set up your development
   environment
2. **[Examples](/docs/tutorials/examples)** - See complete working agents
3. **[API Reference](/docs/api)** - Detailed documentation for all features

### Want to Understand the Architecture?

1. **[Core Concepts](/docs/core/concepts/core)** - Deep dive into the framework
   design
2. **[Advanced Features](/docs/core/advanced/introduction)** - Extensions,
   services, and customization


file: ./content/docs/core/installation.mdx
meta: {
  "title": "Installation",
  "description": "Set up Daydreams and configure your development environment."
}
        
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Step, Steps } from "fumadocs-ui/components/steps";

## Get an API key

* [Google Gemini](https://console.cloud.google.com/gemini) -> `GEMINI_API_KEY`
* [OpenAI](https://platform.openai.com/docs/api-reference) -> `OPENAI_API_KEY`
* [Anthropic](https://docs.anthropic.com/en/api/getting-started) ->
  `ANTHROPIC_API_KEY`
* [Groq](https://docs.groq.com/docs/api-reference) -> `GROQ_API_KEY`
* [OpenRouter](https://openrouter.ai/docs/api-reference) -> `OPENROUTER_API_KEY`
* Other providers are supported by
  [ai-sdk.dev](https://ai-sdk.dev/docs/foundations/providers-and-models)

## Installation

There are two ways to get started with Daydreams:

<Tabs groupId="install-method" items={["Easy", "Manual"]} persist>
  <Tab value="Easy">
    The quickest way to get started is using the create-agent command:

    <Steps>
      <Step>
        Run the create-agent command:

        ```bash title="create-agent.sh"
        npx @daydreamsai/create-agent my-agent
        ```

        This will:

        * Create a new directory for your agent
        * Set up package.json with necessary dependencies
        * Create an index.ts file with your selected extensions
        * Generate a .env.example file with required environment variables
        * Install all dependencies
      </Step>

      <Step>
        Choose your extensions when prompted (or use flags):

        ```bash title="create-agent-with-extensions.sh"
        # With specific extensions
        npx @daydreamsai/create-agent my-agent --twitter --discord --cli

        # With all extensions
        npx @daydreamsai/create-agent my-agent --all
        ```

        Available extensions:

        * `--cli`: Include CLI extension
        * `--twitter`: Include Twitter extension
        * `--discord`: Include Discord extension
        * `--telegram`: Include Telegram extension
        * `--all`: Include all extensions
      </Step>

      <Step>
        Configure your environment variables in the generated `.env` file and start
        building!
      </Step>
    </Steps>
  </Tab>

  <Tab value="Manual">
    For more control over your setup, you can install manually:

    <Steps>
      <Step>
        Initialize your project and install core packages:

        <Tabs groupId="language" items={["pnpm", "npm", "bun", "yarn"]} persist>
          <Tab value="pnpm">
            ```bash title="package-install.sh"
            pnpm init -y
            pnpm add typescript tsx @types/node @daydreamsai/core @daydreamsai/cli
            ```
          </Tab>

          <Tab value="npm">
            ```bash title="package-install.sh"
            npm init -y
            npm install typescript tsx @types/node @daydreamsai/core @daydreamsai/cli
            ```
          </Tab>

          <Tab value="bun">
            ```bash title="package-install.sh"
            bun init -y
            bun add typescript tsx @types/node @daydreamsai/core @daydreamsai/cli
            ```
          </Tab>

          <Tab value="yarn">
            ```bash title="package-install.sh"
            yarn init -y
            yarn add typescript tsx @types/node @daydreamsai/core @daydreamsai/cli
            ```
          </Tab>
        </Tabs>
      </Step>

      <Step>
        Install an LLM provider SDK:

        <Tabs groupId="language" items={["pnpm", "npm", "bun", "yarn"]} persist>
          <Tab value="pnpm">
            `bash title="package-install.sh" pnpm add @ai-sdk/openai `
          </Tab>

          <Tab value="npm">
            `bash title="package-install.sh" npm install @ai-sdk/openai `
          </Tab>

          <Tab value="bun">
            `bash title="package-install.sh" bun add @ai-sdk/openai `
          </Tab>

          <Tab value="yarn">
            `bash title="package-install.sh" yarn add @ai-sdk/openai `
          </Tab>
        </Tabs>

        Other supported providers from [ai-sdk.dev](https://ai-sdk.dev/):

        * `@ai-sdk/anthropic` for Claude
        * `@ai-sdk/google` for Gemini
        * And many more...
      </Step>

      <Step>
        Create your environment file:

        ```bash title="bash"
        # Create .env file
        cp .env.example .env
        ```

        Add your API keys:

        ```env title=".env"
        OPENAI_API_KEY=your_openai_api_key_here
        # ANTHROPIC_API_KEY=your_anthropic_api_key_here
        # GEMINI_API_KEY=your_gemini_api_key_here
        ```
      </Step>

      <Step>
        Create your first agent file (`index.ts`):

        ```typescript title="index.ts"
        import { createDreams, LogLevel } from "@daydreamsai/core";
        import { cliExtension } from "@daydreamsai/cli";
        import { openai } from "@ai-sdk/openai";

        const agent = createDreams({
          logLevel: LogLevel.DEBUG,
          model: openai("gpt-4o"),
          extensions: [cliExtension],
        });

        // Start the agent
        await agent.start();
        ```
      </Step>

      <Step>
        Add run scripts to your `package.json`:

        ```json title="package.json"
        {
          "scripts": {
            "dev": "tsx index.ts",
            "start": "node index.js"
          }
        }
        ```
      </Step>

      <Step>
        Run your agent:

        <Tabs groupId="language" items={["pnpm", "npm", "bun", "yarn"]} persist>
          <Tab value="pnpm">`bash title="run-dev.sh" pnpm dev `</Tab>
          <Tab value="npm">`bash title="run-dev.sh" npm run dev `</Tab>
          <Tab value="bun">`bash title="run-dev.sh" bun dev `</Tab>
          <Tab value="yarn">`bash title="run-dev.sh" yarn dev `</Tab>
        </Tabs>
      </Step>
    </Steps>
  </Tab>
</Tabs>

## Next Steps

Now you can start building your first agent! Check out the
[concepts](/docs/core/concepts/core) section to learn about the core building
blocks.


file: ./content/docs/tutorials/index.mdx
meta: {
  "title": "Daydreams Tutorials",
  "description": "Examples and Guides for building with Daydreams."
}
        
## Getting Started

This tutorial shows how to create a basic Daydreams chat agent that responds in
the terminal and remembers conversation history.

## Setup

1. **Install CLI & Create Project**

   ```bash title="create-new-agent.sh"
   npm install -g @daydreamsai/create-agent
   npx @daydreamsai/create-agent my-agent
   cd my-agent
   ```

2. **Configure API Key**

   ```bash title=".env-setup"
   cp .env.example .env
   # Edit .env and add your API key, e.g.:
   # GROQ_API_KEY=your_api_key_here
   ```

3. **Start Your Agent**

   ```bash title="start-agent.sh"
   npm start
   ```

   Your agent will run in the terminal, ready for chat.

## Core Agent Code

```typescript title="index.ts"
import { createGroq } from "@ai-sdk/groq";
import {
  createDreams,
  context,
  render,
  action,
  validateEnv,
} from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import * as z from "zod/v4";

// Validate environment variables
const env = validateEnv(
  z.object({
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  })
);

// Initialize Groq client
const groq = createGroq({
  apiKey: env.GROQ_API_KEY,
});

// Define memory type
type ChatMemory = {
  messages: Array<{ role: string; content: string }>;
};

// Create context with schema
const chatContext = context({
  type: "chat",
  schema: z.object({
    id: z.string(),
  }),

  key({ id }: { id: string }) {
    return id;
  },

  create(state) {
    return {
      id: state.args.id,
      messages: [],
    };
  },

  render({ memory }: { memory: ChatMemory }) {
    return render(
      `
Chat History:
{{#each messages}}
{{role}}: {{content}}
{{/each}}
        `,
      { messages: memory.messages }
    );
  },
});

const agent = createDreams({
  model: groq("deepseek-r1-distill-llama-70b"), // Example model
  extensions: [cliExtension],
  contexts: [chatContext],
});

async function main() {
  await agent.start({ id: "main-chat" });
  console.log("Agent started. You can now chat with it in the terminal.");
}

main();
```

### Review Concepts

* **[Building Blocks](/docs/core/concepts/building-blocks)** - Core components
  explained
* **[Agent Lifecycle](/docs/core/concepts/agent-lifecycle)** - How agents think
  and act
* **[Memory Systems](/docs/core/concepts/memory)** - Persistent and working
  memory


file: ./content/docs/core/concepts/actions.mdx
meta: {
  "title": "Actions",
  "description": "Define capabilities and interactions for your Daydreams agent."
}
        
## What is an Action?

An action is something your agent can **do** - like calling an API, saving data,
or performing calculations. Think of actions as giving your agent superpowers.

## Real Examples

Here are actions that make agents useful:

### Weather Action

```typescript title="weather-action.ts"
// Agent can check weather
const getWeather = action({
  name: "get-weather",
  description: "Gets current weather for a city",
  schema: z.object({
    city: z.string(),
  }),
  handler: async ({ city }) => {
    const response = await fetch(`https://api.weather.com/${city}`);
    return await response.json(); // { temperature: "72°F", condition: "sunny" }
  },
});
```

### Database Action

```typescript title="database-action.ts"
// Agent can save user preferences
const savePreference = action({
  name: "save-preference",
  description: "Saves a user preference",
  schema: z.object({
    userId: z.string(),
    key: z.string(),
    value: z.string(),
  }),
  handler: async ({ userId, key, value }) => {
    await database.save(userId, key, value);
    return { success: true, message: "Preference saved!" };
  },
});
```

### Email Action

```typescript title="email-action.ts"
// Agent can send emails
const sendEmail = action({
  name: "send-email",
  description: "Sends an email to a user",
  schema: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
  handler: async ({ to, subject, body }) => {
    await emailService.send({ to, subject, body });
    return { sent: true, timestamp: new Date().toISOString() };
  },
});
```

## The Problem Without Actions

Without actions, your agent can only **talk**:

```text title="limited-agent.txt"
User: "What's the weather in Boston?"
Agent: "I don't have access to weather data, but I imagine it might be nice!"
// ❌ Can't actually check weather
// ❌ Just makes stuff up
// ❌ Not helpful
```

## The Solution: Actions Give Agents Capabilities

With actions, your agent can **do things**:

```text title="capable-agent.txt"
User: "What's the weather in Boston?"
Agent: *calls getWeather action*
Agent: "It's 65°F and cloudy in Boston right now!"
// ✅ Actually checks real weather API
// ✅ Provides accurate information
// ✅ Actually useful
```

## How Actions Work in Your Agent

### 1. You Define What the Agent Can Do

```typescript title="define-actions.ts"
const agent = createDreams({
  model: openai("gpt-4o"),
  actions: [
    getWeather, // Agent can check weather
    savePreference, // Agent can save user data
    sendEmail, // Agent can send emails
  ],
});
```

### 2. The LLM Decides When to Use Them

When the agent thinks, it sees:

```text title="llm-prompt.txt"
Available actions:
- get-weather: Gets current weather for a city
- save-preference: Saves a user preference
- send-email: Sends an email to a user

User message: "Check weather in NYC and email it to john@example.com"
```

### 3. The LLM Calls Actions

The LLM responds with structured calls:

```xml title="llm-response.xml"
<response>
  <reasoning>I need to check weather first, then email the results</reasoning>

  <action_call name="get-weather">{"city": "NYC"}</action_call>
  <action_call name="send-email">{
    "to": "john@example.com",
    "subject": "NYC Weather",
    "body": "Current weather: {{calls[0].temperature}}, {{calls[0].condition}}"
  }</action_call>
</response>
```

### 4. Daydreams Executes Your Code

Daydreams automatically:

* Validates the arguments against your schema
* Runs your handler function
* Returns results to the LLM
* Handles errors gracefully

## Creating Your First Action

Here's a simple action that adds two numbers:

```typescript title="calculator-action.ts"
import { action } from "@daydreamsai/core";
import * as z from "zod/v4";

export const addNumbers = action({
  // Name the LLM uses to call this action
  name: "add-numbers",

  // Description helps LLM know when to use it
  description: "Adds two numbers together",

  // Schema defines what arguments are required
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),

  // Handler is your actual code that runs
  handler: async ({ a, b }) => {
    const result = a + b;
    return {
      sum: result,
      message: `${a} + ${b} = ${result}`,
    };
  },
});
```

Use it in your agent:

```typescript title="agent-with-calculator.ts"
const agent = createDreams({
  model: openai("gpt-4o"),
  actions: [addNumbers],
});

// Now when user asks "What's 5 + 3?", the agent will:
// 1. Call addNumbers action with {a: 5, b: 3}
// 2. Get back {sum: 8, message: "5 + 3 = 8"}
// 3. Respond: "5 + 3 = 8"
```

## Working with State and Memory

Actions can read and modify your agent's memory:

```typescript title="todo-actions.ts"
// Define what your context remembers
interface TodoMemory {
  tasks: { id: string; title: string; done: boolean }[];
}

const addTask = action({
  name: "add-task",
  description: "Adds a new task to the todo list",
  schema: z.object({
    title: z.string().describe("What the task is"),
  }),
  handler: async ({ title }, ctx) => {
    // Access context memory (automatically typed!)
    const memory = ctx.memory as TodoMemory;

    // Initialize if needed
    if (!memory.tasks) {
      memory.tasks = [];
    }

    // Add new task
    const newTask = {
      id: crypto.randomUUID(),
      title,
      done: false,
    };

    memory.tasks.push(newTask);

    // Changes are automatically saved
    return {
      success: true,
      taskId: newTask.id,
      message: `Added "${title}" to your todo list`,
    };
  },
});

const completeTask = action({
  name: "complete-task",
  description: "Marks a task as completed",
  schema: z.object({
    taskId: z.string().describe("ID of task to complete"),
  }),
  handler: async ({ taskId }, ctx) => {
    const memory = ctx.memory as TodoMemory;

    const task = memory.tasks?.find((t) => t.id === taskId);
    if (!task) {
      return { success: false, message: "Task not found" };
    }

    task.done = true;

    return {
      success: true,
      message: `Completed "${task.title}"`,
    };
  },
});
```

Now your agent can manage todo lists across conversations!

## External API Integration

Actions are perfect for calling external APIs:

```typescript title="external-api-action.ts"
const searchWikipedia = action({
  name: "search-wikipedia",
  description: "Searches Wikipedia for information",
  schema: z.object({
    query: z.string().describe("What to search for"),
    limit: z.number().optional().default(3).describe("Max results"),
  }),
  handler: async ({ query, limit }) => {
    try {
      const response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/search?q=${encodeURIComponent(
          query
        )}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        results: data.pages.map((page) => ({
          title: page.title,
          description: page.description,
          url: `https://en.wikipedia.org/wiki/${page.key}`,
        })),
        message: `Found ${data.pages.length} results for "${query}"`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to search Wikipedia for "${query}"`,
      };
    }
  },
});
```

## Best Practices

### 1. Use Clear Names and Descriptions

```typescript title="good-naming.ts"
// ✅ Good - clear what it does
const getUserProfile = action({
  name: "get-user-profile",
  description: "Gets detailed profile information for a user by their ID",
  // ...
});

// ❌ Bad - unclear purpose
const doStuff = action({
  name: "do-stuff",
  description: "Does some user stuff",
  // ...
});
```

### 2. Validate Input with Schemas

```typescript title="good-validation.ts"
// ✅ Good - specific validation
schema: z.object({
  email: z.string().email().describe("User's email address"),
  age: z.number().min(0).max(150).describe("User's age in years"),
  preferences: z
    .array(z.string())
    .optional()
    .describe("List of user preferences"),
});

// ❌ Bad - too loose
schema: z.object({
  data: z.any(),
});
```

### 3. Handle Errors Gracefully

```typescript title="error-handling.ts"
handler: async ({ userId }) => {
  try {
    const user = await database.getUser(userId);
    return { success: true, user };
  } catch (error) {
    // Log the error for debugging
    console.error("Failed to get user:", error);

    // Return structured error for the LLM
    return {
      success: false,
      error: "User not found",
      message: `Could not find user with ID ${userId}`,
    };
  }
};
```

### 4. Use async/await for I/O Operations

```typescript title="async-best-practice.ts"
// ✅ Good - properly handles async
handler: async ({ url }) => {
  const response = await fetch(url);
  const data = await response.json();
  return { data };
};

// ❌ Bad - doesn't wait for async operations
handler: ({ url }) => {
  fetch(url); // This returns a Promise that's ignored!
  return { status: "done" }; // Completes before fetch finishes
};
```

### 5. Check for Cancellation in Long Operations

```typescript title="cancellation-handling.ts"
handler: async ({ items }, ctx) => {
  for (let i = 0; i < items.length; i++) {
    // Check if the agent wants to cancel
    if (ctx.abortSignal?.aborted) {
      throw new Error("Operation cancelled");
    }

    await processItem(items[i]);
  }

  return { processed: items.length };
};
```

## Advanced: Context-Specific Actions

You can attach actions to specific contexts so they're only available in certain
situations:

```typescript title="context-specific.ts"
const chatContext = context({
  type: "chat",
  schema: z.object({ userId: z.string() }),
  create: () => ({ messages: [] }),
}).setActions([
  // These actions only available during chat
  action({
    name: "save-chat-preference",
    description: "Saves a preference for this chat user",
    schema: z.object({
      key: z.string(),
      value: z.string(),
    }),
    handler: async ({ key, value }, ctx) => {
      // ctx.memory is automatically typed as chat memory
      if (!ctx.memory.userPreferences) {
        ctx.memory.userPreferences = {};
      }
      ctx.memory.userPreferences[key] = value;
      return { saved: true };
    },
  }),
]);
```

## Key Takeaways

* **Actions give agents capabilities** - They can do things, not just talk
* **LLM chooses when to use them** - Based on names and descriptions you provide
* **Arguments are validated** - Zod schemas ensure type safety
* **State persists automatically** - Changes to memory are saved
* **Error handling is crucial** - Return structured success/error responses
* **async/await required** - For any I/O operations like API calls

Actions transform your agent from a chatbot into a capable assistant that can
actually get things done.


file: ./content/docs/core/concepts/agent-lifecycle.mdx
meta: {
  "title": "Agent Lifecycle",
  "description": "How Daydreams agents process information and execute tasks."
}
        
## Simple Overview

Think of an agent as following a simple loop:

1. **Something happens** (input arrives)
2. **Agent thinks** (uses LLM to decide what to do)
3. **Agent acts** (performs actions or sends responses)
4. **Agent remembers** (saves what happened)
5. **Repeat**

This loop continues as long as the agent is running, handling new inputs and
responding intelligently based on its context and memory.

## The Basic Flow

Here's what happens when your agent receives a Discord message:

```
Discord Message Arrives
         ↓
Agent loads chat context & memory
         ↓
Agent thinks: "What should I do?"
         ↓
Agent decides: "I'll check the weather and respond"
         ↓
Agent calls weather API (action)
         ↓
Agent sends Discord reply (output)
         ↓
Agent saves conversation to memory
```

***

## Detailed Technical Explanation

The core of the Daydreams framework is the agent's execution lifecycle. This
loop manages how an agent receives input, reasons with an LLM, performs actions,
and handles results. Understanding this flow is crucial for building and
debugging agents.

Let's trace the lifecycle of a typical request:

## 1. Input Reception

* **Source:** An external system (like Discord, Telegram, CLI, or an API) sends
  information to the agent. This is usually configured via an `extension`.
* **Listener:** An `input` definition within the agent or an extension listens
  for these events (e.g., a new message arrives).
* **Trigger:** When the external event occurs, the input listener is triggered.
* **Invocation:** The listener typically calls `agent.send(...)`, providing:
  * The target `context` definition (which part of the agent should handle
    this?).
  * `args` to identify the specific context instance (e.g., which chat
    session?).
  * The input `data` itself (e.g., the message content).

## 2. `agent.send` - Starting the Process

* **Log Input:** The framework logs the incoming information as an `InputRef` (a
  record of the input).
* **Initiate Run:** It then calls the internal `agent.run` method to start or
  continue the processing cycle for the specified context instance, passing the
  new `InputRef` along.

## 3. `agent.run` - Managing the Execution Cycle

* **Load/Create Context:** The framework finds the specific `ContextState` for
  the target instance (e.g., the state for chat session #123). If it's the first
  time interacting with this instance, it creates the state and its associated
  persistent memory (`ContextState.memory`). It also retrieves or creates the
  temporary `WorkingMemory` for this specific run.
* **Handle Concurrency:** It checks if this context instance is already
  processing another request. If so, the new input is usually added to the
  ongoing run. If not, it sets up a new run.
* **Setup Run Environment:** It prepares the environment for the LLM
  interaction, gathering all available `actions`, `outputs`, and relevant
  context information.
* **Start Step Loop:** It begins the main processing loop, which iterates
  through one or more reasoning steps until the interaction is complete.

## 4. Inside the Step Loop - Perception, Reasoning, Action

Each iteration (step) within the `agent.run` loop represents one turn of the
agent's core reasoning cycle:

* **Prepare State:** The agent gathers the latest information, including:
  * The current persistent state of the active `Context`(s) (via their `render`
    functions).
  * The history of the current interaction from `WorkingMemory` (processed
    inputs, outputs, action results from previous steps).
  - Any *new* unprocessed information (like the initial `InputRef` or results
    from actions completed in the previous step).
  - The list of currently available `actions` and `outputs`.
* **Generate Prompt:** This information is formatted into a structured prompt
  (using XML) for the LLM. The prompt clearly tells the LLM its instructions,
  what tools (actions/outputs) it has, the current state, and what new
  information needs attention. (See [Prompting](/docs/core/concepts/prompting)).
* **LLM Call:** The agent sends the complete prompt to the configured LLM.
* **Process LLM Response Stream:** As the LLM generates its response token by
  token:
  * The framework **streams** the response.
  * It **parses** the stream, looking for specific XML tags defined in the
    expected response structure (`<reasoning>`, `<action_call>`, `<output>`).
  * The LLM's thought process is extracted from `<reasoning>` tags and logged.
  * Instructions to perform actions (`<action_call>`) or send outputs
    (`<output>`) are identified.
* **Execute Actions & Outputs:**
  * For each identified `<action_call>`, the framework validates the arguments
    against the action's schema and schedules the action's `handler` function to
    run via the `TaskRunner`. (See [Actions](/docs/core/concepts/actions) and
    [Tasks](/docs/core/concepts/tasks)).
  - For each identified `<output>`, the framework validates the
    content/attributes and runs the output's `handler` function to send the
    information externally (e.g., post a message). (See
    [Outputs](/docs/core/concepts/outputs)).
* **Wait for Actions:** The agent waits for any critical asynchronous actions
  scheduled in this step to complete. Their results (`ActionResult`) are logged
  to `WorkingMemory`.
* **Check Completion:** The agent determines if the interaction is complete or
  if another reasoning step (another loop iteration) is needed based on defined
  conditions (`shouldContinue` hooks or remaining unprocessed logs).

## 5. Run Completion

* **Exit Loop:** Once the loop condition determines no further steps are needed,
  the loop exits.
* **Final Tasks:** Any final cleanup logic or `onRun` hooks defined in the
  context are executed.
* **Save State:** The final persistent state (`ContextState.memory`) of all
  involved contexts is saved to the `MemoryStore`.
* **Return Results:** The framework resolves the promise originally returned by
  `agent.send` or `agent.run`, providing the complete log (`chain`) of the
  interaction.

This detailed cycle illustrates how Daydreams agents iteratively perceive
(inputs, results), reason (LLM prompt/response), and act (outputs, actions),
using streaming and asynchronous task management to handle potentially complex
interactions efficiently.


file: ./content/docs/core/concepts/building-blocks.mdx
meta: {
  "title": "Building Blocks",
  "description": "The core components that make up a Daydreams agent."
}
        
Every Daydreams agent is built from four main building blocks. Think of them as
the essential parts that work together to create intelligent behavior.

## The Four Building Blocks

### 1. Inputs - How Your Agent Listens

Inputs are how your agent receives information from the outside world.

```typescript title="input-example.ts"
// Listen for Discord messages
const discordMessage = input({
  name: "discord-message",
  description: "Receives messages from Discord",
  // When a message arrives, this triggers the agent
});
```

**Examples:**

* A Discord message arrives
* A user types in the CLI
* An API webhook gets called
* A timer goes off

### 2. Outputs - How Your Agent Speaks

Outputs are how your agent sends information back to the world.

```typescript title="output-example.ts"
// Send a Discord message
const discordReply = output({
  name: "discord-reply",
  description: "Sends a message to Discord",
  // The agent can call this to respond
});
```

**Examples:**

* Posting a message to Discord
* Printing to the console
* Sending an email
* Making an API call

### 3. Actions - What Your Agent Can Do

Actions are tasks your agent can perform to interact with systems or gather
information.

```typescript title="action-example.ts"
// Check the weather
const getWeather = action({
  name: "get-weather",
  description: "Gets current weather for a location",
  schema: z.object({
    location: z.string(),
  }),
  handler: async ({ location }) => {
    // Call weather API and return result
    return { temperature: "72°F", condition: "sunny" };
  },
});
```

**Examples:**

* Calling a weather API
* Reading from a database
* Processing a file
* Making calculations

### 4. Contexts - Your Agent's Workspace

Contexts define different "workspaces" or "modes" for your agent. Each context
has its own memory and behavior.

```typescript title="context-example.ts"
// A chat session context
const chatContext = context({
  type: "chat",
  schema: z.object({
    userId: z.string(),
  }),
  // This context remembers chat history
  create: () => ({
    messages: [],
    userPreferences: {},
  }),
});
```

**Examples:**

* A chat session with a specific user
* Playing a specific game
* Processing a specific document
* Managing a specific project

## How They Work Together

Here's a simple flow showing how these building blocks connect:

1. **Input arrives** → "New Discord message from user123"
2. **Agent thinks** → "I should respond helpfully in this chat context"
3. **Agent acts** → Calls the `getWeather` action if needed
4. **Agent responds** → Uses an output to send a reply
5. **Context remembers** → Saves the conversation in chat context memory

## The React Mental Model

If you know React, think of it this way:

* **Contexts** = React components (manage state and behavior)
* **Actions** = Event handlers (respond to interactions)
* **Inputs/Outputs** = Props/callbacks (data in and out)
* **Agent** = React app (orchestrates everything)

## Next Steps

Now that you understand the building blocks, you can dive deeper into each one:

* **[Contexts](/docs/core/concepts/contexts)** - Learn how to manage state and
  memory
* **[Inputs](/docs/core/concepts/inputs)** - Set up ways for your agent to
  receive information
* **[Outputs](/docs/core/concepts/outputs)** - Configure how your agent responds
* **[Actions](/docs/core/concepts/actions)** - Define what your agent can do
* **[Agent Lifecycle](/docs/core/concepts/agent-lifecycle)** - Understand the
  complete execution flow


file: ./content/docs/core/concepts/contexts.mdx
meta: {
  "title": "Contexts",
  "description": "Managing state, memory, and behavior for agent interactions."
}
        
## What is a Context?

A context is like a **separate workspace** for your agent. Think of it like
having different tabs open in your browser - each tab has its own state and
remembers different things.

## Real Examples

Here are contexts that make agents stateful:

### Chat Context

```typescript title="chat-context.ts"
// Each user gets their own chat workspace
const chatContext = context({
  type: "chat",
  schema: z.object({
    userId: z.string(),
  }),
  create: () => ({
    messages: [],
    userPreferences: {},
    lastSeen: null,
  }),
  render: (state) => `
    Chat with ${state.args.userId}
    Recent messages: ${state.memory.messages.slice(-3).join("\n")}
  `,
});
```

### Game Context

```typescript title="game-context.ts"
// Each game session has its own state
const gameContext = context({
  type: "game",
  schema: z.object({
    gameId: z.string(),
  }),
  create: () => ({
    playerHealth: 100,
    level: 1,
    inventory: [],
    currentRoom: "start",
  }),
  render: (state) => `
    Game: ${state.args.gameId}
    Health: ${state.memory.playerHealth}
    Level: ${state.memory.level}
    Room: ${state.memory.currentRoom}
  `,
});
```

### Project Context

```typescript title="project-context.ts"
// Each project tracks its own progress
const projectContext = context({
  type: "project",
  schema: z.object({
    projectId: z.string(),
  }),
  create: () => ({
    tasks: [],
    status: "planning",
    teamMembers: [],
    deadlines: [],
  }),
  render: (state) => `
    Project: ${state.args.projectId}
    Status: ${state.memory.status}
    Tasks: ${state.memory.tasks.length} total
  `,
});
```

## The Problem: Agents Need to Remember Different Things

Without contexts, your agent mixes everything together:

```text title="confused-agent.txt"
User Alice: "My favorite color is blue"
User Bob: "What's Alice's favorite color?"
Agent: "Alice's favorite color is blue"
// ❌ Bob shouldn't see Alice's private info!

User in Game A: "Go north"
User in Game B: "What room am I in?"
Agent: "You went north" (from Game A!)
// ❌ Wrong game state mixed up!

Project Alpha discussion mixed with Project Beta tasks
// ❌ Complete chaos!
```

## The Solution: Contexts Separate Everything

With contexts, each conversation/session/game stays separate:

```text title="organized-agent.txt"
Alice's Chat Context:
- Alice: "My favorite color is blue"
- Agent remembers: Alice likes blue

Bob's Chat Context:
- Bob: "What's Alice's favorite color?"
- Agent: "I don't have information about Alice"
// ✅ Privacy maintained!

Game A Context:
- Player went north → remembers current room

Game B Context:
- Separate game state → different room
// ✅ No mixing of game states!
```

## How Contexts Work in Your Agent

### 1. You Define Different Context Types

```typescript title="define-contexts.ts"
const agent = createDreams({
  model: openai("gpt-4o"),
  contexts: [
    chatContext, // For user conversations
    gameContext, // For game sessions
    projectContext, // For project management
  ],
});
```

### 2. Inputs Route to Specific Context Instances

```typescript title="context-routing.ts"
// Discord input routes to chat contexts
discordInput.subscribe((send, agent) => {
  discord.on("message", (msg) => {
    // Each user gets their own chat context instance
    send(
      chatContext,
      { userId: msg.author.id },
      {
        content: msg.content,
      }
    );
  });
});

// Game input routes to game contexts
gameInput.subscribe((send, agent) => {
  gameServer.on("move", (event) => {
    // Each game gets its own context instance
    send(
      gameContext,
      { gameId: event.gameId },
      {
        action: event.action,
      }
    );
  });
});
```

### 3. Agent Maintains Separate Memory

```text title="context-instances.txt"
Chat Context Instances:
- chat:alice → { messages: [...], preferences: {...} }
- chat:bob   → { messages: [...], preferences: {...} }
- chat:carol → { messages: [...], preferences: {...} }

Game Context Instances:
- game:session1 → { health: 80, level: 3, room: "forest" }
- game:session2 → { health: 100, level: 1, room: "start" }
- game:session3 → { health: 45, level: 7, room: "dungeon" }

All completely separate!
```

## Creating Your First Context

Here's a simple todo list context:

```typescript title="todo-context.ts"
import { context } from "@daydreamsai/core";
import * as z from "zod/v4";

// Define what this context remembers
interface TodoMemory {
  tasks: { id: string; title: string; done: boolean }[];
  createdAt: string;
}

export const todoContext = context<TodoMemory>({
  // Type identifies this kind of context
  type: "todo",

  // Schema defines how to identify specific instances
  schema: z.object({
    listId: z.string().describe("Unique ID for this todo list"),
  }),

  // Create initial memory when first accessed
  create: () => ({
    tasks: [],
    createdAt: new Date().toISOString(),
  }),

  // How this context appears to the LLM
  render: (state) => {
    const { tasks } = state.memory;
    const pending = tasks.filter((t) => !t.done).length;
    const completed = tasks.filter((t) => t.done).length;

    return `
Todo List: ${state.args.listId}
Tasks: ${pending} pending, ${completed} completed

Recent tasks:
${tasks
  .slice(-5)
  .map((t) => `${t.done ? "✅" : "⏳"} ${t.title}`)
  .join("\n")}
    `;
  },

  // Instructions for the LLM when this context is active
  instructions:
    "Help the user manage their todo list. You can add, complete, and list tasks.",
});
```

Use it in your agent:

```typescript title="agent-with-todo.ts"
const agent = createDreams({
  model: openai("gpt-4o"),
  contexts: [todoContext],
});

// Now users can have separate todo lists:
// todo:work → Work tasks
// todo:personal → Personal tasks
// todo:shopping → Shopping list
// Each maintains separate state!
```

## Context Memory: What Gets Remembered

Context memory persists between conversations:

```typescript title="memory-example.ts"
// First conversation
User: "Add 'buy milk' to my shopping list"
Agent: → todoContext(listId: "shopping")
       → memory.tasks.push({id: "1", title: "buy milk", done: false})
       → "Added 'buy milk' to your shopping list"

// Later conversation (hours/days later)
User: "What's on my shopping list?"
Agent: → todoContext(listId: "shopping")
       → Loads saved memory: {tasks: [{title: "buy milk", done: false}]}
       → "You have 'buy milk' on your shopping list"

// ✅ Context remembered the task across conversations!
```

## Multiple Contexts in One Agent

Your agent can switch between different contexts:

```xml title="context-switching.xml"
<!-- User starts in chat context -->
<input type="discord:message" userId="alice">
  "Add 'finish project' to my work todo list"
</input>

<!-- Agent recognizes this needs todo context -->
<response>
  <reasoning>User wants to add a task to their work todo list. I should use the todo context.</reasoning>

  <!-- Switch to todo context -->
  <action_call name="add-task" context="todo" args='{"listId": "work"}'>
    {"title": "finish project"}
  </action_call>

  <!-- Respond back in chat context -->
  <output type="discord:message" channelId="123">
    Added "finish project" to your work todo list!
  </output>
</response>
```

## Advanced: Context-Specific Actions

You can attach actions that only work in certain contexts:

```typescript title="context-specific-actions.ts"
const todoContextWithActions = todoContext.setActions([
  action({
    name: "add-task",
    description: "Adds a new task to the todo list",
    schema: z.object({
      title: z.string(),
    }),
    handler: async ({ title }, ctx) => {
      // ctx.memory is automatically typed as TodoMemory!
      const newTask = {
        id: crypto.randomUUID(),
        title,
        done: false,
      };

      ctx.memory.tasks.push(newTask);

      return {
        success: true,
        taskId: newTask.id,
        message: `Added "${title}" to the list`,
      };
    },
  }),

  action({
    name: "complete-task",
    description: "Marks a task as completed",
    schema: z.object({
      taskId: z.string(),
    }),
    handler: async ({ taskId }, ctx) => {
      const task = ctx.memory.tasks.find((t) => t.id === taskId);
      if (!task) {
        return { success: false, message: "Task not found" };
      }

      task.done = true;

      return {
        success: true,
        message: `Completed "${task.title}"`,
      };
    },
  }),
]);
```

Now these actions only appear when the todo context is active!

## Context Lifecycle

Contexts have hooks for different stages:

```typescript title="context-lifecycle.ts"
const advancedContext = context({
  type: "advanced",
  schema: z.object({ sessionId: z.string() }),

  // Called when context instance is first created
  create: (state, agent) => {
    agent.logger.info(`Creating new session: ${state.key}`);
    return {
      startTime: Date.now(),
      interactions: 0,
    };
  },

  // Called before each LLM interaction
  onStep: async (ctx, agent) => {
    ctx.memory.interactions++;
  },

  // Called when a conversation/run completes
  onRun: async (ctx, agent) => {
    const duration = Date.now() - ctx.memory.startTime;
    agent.logger.info(`Session ${ctx.key} lasted ${duration}ms`);
  },

  // Called if there's an error
  onError: async (error, ctx, agent) => {
    agent.logger.error(`Error in session ${ctx.key}:`, error);
  },
});
```

## Best Practices

### 1. Design Clear Boundaries

```typescript title="good-context-design.ts"
// ✅ Good - clear, specific purpose
const userProfileContext = context({
  type: "user-profile",
  schema: z.object({ userId: z.string() }),
  // Manages user preferences, settings, history
});

const orderContext = context({
  type: "order",
  schema: z.object({ orderId: z.string() }),
  // Manages specific order state, items, shipping
});

// ❌ Bad - too broad, unclear purpose
const stuffContext = context({
  type: "stuff",
  schema: z.object({ id: z.string() }),
  // What does this manage? Everything? Nothing clear.
});
```

### 2. Keep Memory Structures Simple

```typescript title="good-memory-structure.ts"
// ✅ Good - clear, simple structure
interface ChatMemory {
  messages: Array<{
    sender: "user" | "agent";
    content: string;
    timestamp: number;
  }>;
  userPreferences: {
    language?: string;
    timezone?: string;
  };
}

// ❌ Bad - overly complex, nested
interface OverComplexMemory {
  data: {
    nested: {
      deeply: {
        structured: {
          confusing: {
            memory: any;
          };
        };
      };
    };
  };
}
```

### 3. Write Helpful Render Functions

```typescript title="good-render-function.ts"
// ✅ Good - concise, relevant information
render: (state) => `
  Shopping Cart: ${state.args.cartId}
  Items: ${state.memory.items.length}
  Total: $${state.memory.total.toFixed(2)}
  
  Recent items:
  ${state.memory.items
    .slice(-3)
    .map((item) => `- ${item.name} ($${item.price})`)
    .join("\n")}
`;

// ❌ Bad - too much information, overwhelming
render: (state) => JSON.stringify(state.memory, null, 2); // Dumps everything!
```

### 4. Use Descriptive Schema

```typescript title="good-schema.ts"
// ✅ Good - clear descriptions
schema: z.object({
  userId: z.string().uuid().describe("Unique identifier for the user"),
  sessionType: z
    .enum(["support", "sales", "general"])
    .describe("Type of support session"),
});

// ❌ Bad - no descriptions, unclear
schema: z.object({
  id: z.string(),
  type: z.string(),
});
```

## Key Takeaways

* **Contexts separate state** - Each conversation/session/game gets its own
  memory
* **Instance-based** - Same context type, different instances for different
  users/sessions
* **Memory persists** - State is saved between conversations automatically
* **LLM sees context** - Render function shows current state to the AI
* **Context-specific actions** - Attach actions that only work in certain
  contexts
* **Clear boundaries** - Design contexts around specific tasks or domains

Contexts are what make your agent stateful and able to maintain separate
conversations and tasks without mixing things up. They're the foundation for
building agents that can remember and manage complex, ongoing interactions.


file: ./content/docs/core/concepts/core.mdx
meta: {
  "title": "Introduction",
  "description": "Understand the fundamental building blocks of the Daydreams framework."
}
        
The Daydreams framework is designed around a set of core concepts that work
together to enable autonomous agent behavior. Understanding these concepts is
key to effectively building and customizing agents.

## Getting Started

If you're new to agent frameworks, start here:

1. **[Building Blocks](/docs/core/concepts/building-blocks)** - Learn the four
   main components (inputs, outputs, actions, contexts) with simple examples
2. **[Agent Lifecycle](/docs/core/concepts/agent-lifecycle)** - Understand how
   agents process information in a continuous loop

Once you understand the basics, dive deeper into each component:

## Core Architecture

A Daydreams agent consists of several key components:

### Contexts

Contexts are the foundation of a Daydreams agent. Similar to React components,
contexts manage state and rendering for your agent. Each context:

* Has a defined schema for initialization
* Maintains its own memory state
* Provides a rendering function that formats its state for the LLM

```ts title="context.ts"
const myContext = context({
  // Unique identifier for this context type
  type: "my-context",

  // Schema defining the arguments needed to initialize this context
  schema: z.object({
    id: z.string(),
  }),

  // Function to generate a unique key for this context instance
  key({ id }) {
    return id;
  },

  // Initialize the context's memory state
  create(state) {
    return {
      items: [],
      currentItem: null,
    };
  },

  // Format the context for the LLM
  render({ memory }) {
    return `
      Current Items: ${memory.items.join(", ")}
      Active Item: ${memory.currentItem || "None"}
    `;
  },
});
```

### Actions

Actions are functions that your agent can call to interact with its environment
or modify its state. They're similar to event handlers in React:

```ts title="action.ts"
action({
  name: "addItem",
  description: "Add a new item to the list",
  schema: z.object({
    item: z.string().describe("The item to add"),
  }),
  handler(call, ctx, agent) {
    // Access the context memory
    const contextMemory = ctx.agentMemory;

    // Update the state
    contextMemory.items.push(call.data.item);

    // Return a response
    return {
      message: `Added ${call.data.item} to the list`,
      items: contextMemory.items,
    };
  },
});
```

### Extensions

Extensions are pre-packaged bundles of inputs, outputs, and actions that add
specific capabilities to your agent. For example, the `cli` extension adds
terminal input/output capabilities.

## The React-like Mental Model

If you're familiar with React, you can think of Daydreams in similar terms:

* **Contexts** are like React components, managing state and rendering
* **Actions** are like event handlers, responding to inputs and updating state
* **Extensions** are like pre-built component libraries
* The agent itself is like a React application, orchestrating everything

This mental model makes it easy to reason about how your agent works and how to
structure complex behaviors.

***

## Detailed Component Documentation

This section provides a detailed explanation of each fundamental component:

* **[Building Blocks](/docs/core/concepts/building-blocks):** Simple
  introduction to the four main components with examples
* **[Agent Lifecycle](/docs/core/concepts/agent-lifecycle):** How an agent
  processes information, makes decisions, and executes tasks in a continuous
  loop.
* **[Contexts](/docs/core/concepts/contexts):** The mechanism for managing
  state, memory, and behavior for specific tasks or interactions.
* **[Actions](/docs/core/concepts/actions):** Definable tasks or capabilities
  that an agent can perform.
* **[Inputs](/docs/core/concepts/inputs):** How agents receive data and trigger
  processing cycles.
* **[Outputs](/docs/core/concepts/outputs):** How agents communicate results or
  send information to external systems.
* **[Memory](/docs/core/concepts/memory):** The different ways agents store,
  retrieve, and utilize information (Working, Episodic, Vector).
* **[Prompting](/docs/core/concepts/prompting):** How instructions and context
  are formatted for the LLM to guide its reasoning.
* **[Tasks](/docs/core/concepts/tasks):** The system for managing asynchronous
  operations and background tasks.
* **[Services & Extensions](/docs/core/advanced):** How to integrate external
  services and extend the framework's capabilities.

For beginners, start with [Building Blocks](/docs/core/concepts/building-blocks)
to understand the mental model, then explore these detailed pages as needed.


file: ./content/docs/core/concepts/inputs.mdx
meta: {
  "title": "Inputs",
  "description": "How Daydreams agents receive information and trigger processing."
}
        
## What is an Input?

An input is how your agent **listens** to the outside world. If outputs are how
your agent "speaks", inputs are how your agent "hears" things happening.

## Real Examples

Here are inputs that make agents responsive:

### Discord Messages

```typescript title="discord-input.ts"
// Agent listens for Discord messages
const discordMessage = input({
  type: "discord:message",
  schema: z.object({
    content: z.string(),
    userId: z.string(),
    channelId: z.string(),
  }),
  subscribe: (send, agent) => {
    discord.on("messageCreate", (message) => {
      send(
        chatContext,
        { channelId: message.channel.id },
        {
          content: message.content,
          userId: message.author.id,
          channelId: message.channel.id,
        }
      );
    });

    return () => discord.removeAllListeners("messageCreate");
  },
});
```

### CLI Commands

```typescript title="cli-input.ts"
// Agent listens for terminal input
const cliInput = input({
  type: "cli:input",
  schema: z.string(),
  subscribe: (send, agent) => {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.on("line", (input) => {
      send(cliContext, { sessionId: "cli" }, input);
    });

    return () => readline.close();
  },
});
```

### API Webhooks

```typescript title="webhook-input.ts"
// Agent listens for API webhooks
const webhookInput = input({
  type: "api:webhook",
  schema: z.object({
    event: z.string(),
    data: z.any(),
  }),
  subscribe: (send, agent) => {
    const server = express();

    server.post("/webhook", (req, res) => {
      send(
        webhookContext,
        { eventId: req.body.id },
        {
          event: req.body.event,
          data: req.body.data,
        }
      );
      res.status(200).send("OK");
    });

    const serverInstance = server.listen(3000);
    return () => serverInstance.close();
  },
});
```

## The Problem: Agents Need to Know When Things Happen

Without inputs, your agent can't react to anything:

```text title="deaf-agent.txt"
User sends Discord message: "Hey agent, what's the weather?"
Agent: *doesn't hear anything*
Agent: *sits idle, does nothing*
User: "Hello??"
Agent: *still nothing*
// ❌ Agent can't hear Discord messages
// ❌ No way to trigger the agent
// ❌ Completely unresponsive
```

## The Solution: Inputs Enable Listening

With inputs, your agent can hear and respond:

```text title="listening-agent.txt"
User sends Discord message: "Hey agent, what's the weather?"
Discord Input: *detects new message*
Agent: *wakes up and processes the message*
Agent: *calls weather API*
Agent: *responds via Discord output*
Discord: "It's 72°F and sunny in San Francisco!"
// ✅ Agent hears the message
// ✅ Automatically triggered to respond
// ✅ Completes the conversation
```

## How Inputs Work in Your Agent

### 1. You Define What the Agent Listens For

```typescript title="define-inputs.ts"
const agent = createDreams({
  model: openai("gpt-4o"),
  inputs: [
    discordMessage, // Agent listens to Discord
    cliInput, // Agent listens to terminal
    webhookInput, // Agent listens to webhooks
  ],
});
```

### 2. Inputs Watch for Events

When you start your agent, inputs begin listening:

```typescript title="listening-pattern.ts"
// Discord input starts watching for messages
discord.on("messageCreate", (message) => {
  // When message arrives, input sends it to agent
  send(chatContext, { channelId: message.channel.id }, messageData);
});

// CLI input starts watching for terminal input
readline.on("line", (input) => {
  // When user types, input sends it to agent
  send(cliContext, { sessionId: "cli" }, input);
});
```

### 3. Inputs Trigger the Agent

When an input detects something, it "sends" the data to your agent:

```text title="input-flow.txt"
1. Discord message arrives: "What's the weather?"
2. Discord input detects it
3. Input calls: send(chatContext, {channelId: "123"}, {content: "What's the weather?"})
4. Agent wakes up and starts thinking
5. Agent sees the message and decides what to do
6. Agent calls weather action and responds
```

## Creating Your First Input

Here's a simple input that listens for file changes:

```typescript title="file-watcher-input.ts"
import { input } from "@daydreamsai/core";
import * as z from "zod/v4";
import fs from "fs";

export const fileWatcher = input({
  // Type the agent uses to identify this input
  type: "file:watcher",

  // Schema defines what data the input provides
  schema: z.object({
    filename: z.string(),
    content: z.string(),
    event: z.enum(["created", "modified", "deleted"]),
  }),

  // Subscribe function starts listening
  subscribe: (send, agent) => {
    const watchDir = "./watched-files";

    // Watch for file changes
    const watcher = fs.watch(watchDir, (eventType, filename) => {
      if (filename) {
        const filepath = `${watchDir}/${filename}`;

        try {
          const content = fs.readFileSync(filepath, "utf8");

          // Send the file change to the agent
          send(
            fileContext,
            { filename },
            {
              filename,
              content,
              event: eventType === "rename" ? "created" : "modified",
            }
          );
        } catch (error) {
          // File might be deleted
          send(
            fileContext,
            { filename },
            {
              filename,
              content: "",
              event: "deleted",
            }
          );
        }
      }
    });

    // Return cleanup function
    return () => {
      watcher.close();
    };
  },
});
```

Use it in your agent:

```typescript title="agent-with-file-watcher.ts"
const agent = createDreams({
  model: openai("gpt-4o"),
  inputs: [fileWatcher],
});

// Now when files change in ./watched-files/:
// 1. File watcher detects the change
// 2. Input sends file data to agent
// 3. Agent can process and respond to file changes
```

## Working with Context Targeting

Inputs need to know which context should handle the incoming data:

```typescript title="context-targeting.ts"
const chatInput = input({
  type: "chat:message",
  schema: z.object({
    message: z.string(),
    userId: z.string(),
  }),
  subscribe: (send, agent) => {
    chatService.on("message", (data) => {
      // Target the specific chat context for this user
      send(
        chatContext,
        { userId: data.userId },
        {
          message: data.message,
          userId: data.userId,
        }
      );
    });

    return () => chatService.removeAllListeners("message");
  },
});
```

This creates separate context instances for each user:

* User "alice" gets context instance `chat:alice`
* User "bob" gets context instance `chat:bob`
* Each maintains separate conversation memory

## Real-Time vs Polling Inputs

### Real-Time (Event-Driven)

```typescript title="realtime-input.ts"
// ✅ Good - responds immediately
subscribe: (send, agent) => {
  websocket.on("message", (data) => {
    send(context, args, data);
  });

  return () => websocket.close();
};
```

### Polling (Check Periodically)

```typescript title="polling-input.ts"
// Sometimes necessary for APIs without webhooks
subscribe: (send, agent) => {
  const checkForUpdates = async () => {
    const newData = await api.getUpdates();
    if (newData.length > 0) {
      newData.forEach((item) => {
        send(context, { id: item.id }, item);
      });
    }
  };

  const interval = setInterval(checkForUpdates, 5000); // Every 5 seconds

  return () => clearInterval(interval);
};
```

## Multiple Inputs Working Together

Your agent can listen to multiple sources simultaneously:

```typescript title="multiple-inputs.ts"
const agent = createDreams({
  model: openai("gpt-4o"),
  inputs: [
    discordMessage, // Discord messages
    slackMessage, // Slack messages
    emailReceived, // New emails
    webhookReceived, // API webhooks
    fileChanged, // File system changes
    timerTick, // Scheduled events
  ],
});

// Agent now responds to any of these inputs automatically
```

## Error Handling and Validation

Always handle errors gracefully in your inputs:

```typescript title="error-handling-input.ts"
const robustInput = input({
  type: "api:events",
  schema: z.object({
    eventId: z.string(),
    data: z.any(),
  }),
  subscribe: (send, agent) => {
    api.on("event", (rawData) => {
      try {
        // Validate the data first
        const validData = {
          eventId: rawData.id,
          data: rawData.payload,
        };

        // Schema validation happens automatically
        send(eventContext, { eventId: rawData.id }, validData);
      } catch (error) {
        agent.logger.error("api:events", "Invalid event data", {
          rawData,
          error: error.message,
        });
        // Don't crash - just log and continue
      }
    });

    return () => api.removeAllListeners("event");
  },
});
```

## Best Practices

### 1. Use Clear Types and Schemas

```typescript title="good-input-definition.ts"
// ✅ Good - clear purpose and validation
const userMessage = input({
  type: "user:message",
  schema: z.object({
    content: z.string().min(1).max(2000),
    userId: z.string().uuid(),
    timestamp: z.number(),
  }),
  // ...
});

// ❌ Bad - unclear and unvalidated
const dataInput = input({
  type: "data",
  schema: z.any(),
  // ...
});
```

### 2. Always Return Cleanup Functions

```typescript title="cleanup-function.ts"
// ✅ Good - proper cleanup
subscribe: (send, agent) => {
  const listener = (data) => send(context, args, data);

  eventSource.addEventListener("event", listener);

  return () => {
    eventSource.removeEventListener("event", listener);
    eventSource.close();
  };
};

// ❌ Bad - no cleanup (memory leaks!)
subscribe: (send, agent) => {
  eventSource.addEventListener("event", (data) => {
    send(context, args, data);
  });

  return () => {}; // Nothing cleaned up!
};
```

### 3. Handle Connection Failures

```typescript title="reconnection-input.ts"
subscribe: (send, agent) => {
  let reconnectAttempts = 0;
  const maxReconnects = 5;

  const connect = () => {
    try {
      const connection = createConnection();

      connection.on("data", (data) => {
        reconnectAttempts = 0; // Reset on successful data
        send(context, args, data);
      });

      connection.on("error", () => {
        if (reconnectAttempts < maxReconnects) {
          reconnectAttempts++;
          setTimeout(connect, 1000 * reconnectAttempts);
        }
      });

      return connection;
    } catch (error) {
      agent.logger.error("connection failed", error);
    }
  };

  const connection = connect();

  return () => connection?.close();
};
```

### 4. Target the Right Context

```typescript title="context-routing.ts"
subscribe: (send, agent) => {
  service.on("event", (event) => {
    // Route to appropriate context based on event type
    if (event.type === "user_message") {
      send(chatContext, { userId: event.userId }, event.data);
    } else if (event.type === "system_alert") {
      send(alertContext, { alertId: event.id }, event.data);
    } else if (event.type === "game_move") {
      send(gameContext, { gameId: event.gameId }, event.data);
    }
  });

  return () => service.removeAllListeners("event");
};
```

## Key Takeaways

* **Inputs enable responsiveness** - Without them, agents can't hear anything
* **Subscribe pattern** - Watch external sources, call `send()` when data
  arrives
* **Context targeting** - Route inputs to appropriate context instances
* **Always cleanup** - Return functions to disconnect when agent stops
* **Validate data** - Use schemas to ensure incoming data is correct
* **Handle errors gracefully** - Don't let bad input data crash your agent

Inputs are what turn your agent from a one-time script into a responsive,
always-listening assistant that can react to the world in real-time.


file: ./content/docs/core/concepts/mcp.mdx
meta: {
  "title": "Model Context Protocol (MCP)",
  "description": "Connect your agent to any MCP server for expanded capabilities and context."
}
        
## What is MCP Integration?

**Model Context Protocol (MCP)** lets your agent connect to external services
and data sources through a standardized interface. Think of it like **adding
superpowers from other applications** to your agent.

Your agent becomes a **headless MCP client** that can:

* **Connect** to any MCP server (local or remote)
* **Access** their resources, tools, and prompts
* **Use** these capabilities seamlessly alongside your other actions
* **Scale** by connecting to multiple servers simultaneously

## Real Examples

Here's what MCP servers can provide to your agent:

### Database Explorer

```typescript title="sqlite-mcp-connection.ts"
// MCP server provides database access
// → Agent can query any SQLite database
// → No need to write database connection code

const result = await ctx.callAction("mcp.callTool", {
  serverId: "sqlite-explorer",
  name: "query",
  arguments: {
    sql: "SELECT * FROM users WHERE active = 1",
  },
});

// Returns: User data from the database
```

### Web Search Service

```typescript title="web-search-mcp.ts"
// MCP server provides web search capabilities
// → Agent can search the internet
// → Get real-time information

const result = await ctx.callAction("mcp.callTool", {
  serverId: "web-search",
  name: "search",
  arguments: {
    query: "latest OpenAI announcements",
    maxResults: 5,
  },
});

// Returns: Current search results
```

### File System Access

```typescript title="filesystem-mcp.ts"
// MCP server provides file system access
// → Agent can read/write files
// → Access local documents and data

const content = await ctx.callAction("mcp.readResource", {
  serverId: "filesystem",
  uri: "file:///project/README.md",
});

// Returns: File contents
```

## The Problem: Isolated Agent Capabilities

Without MCP, your agent is limited to what you explicitly code:

```typescript title="limited-agent-capabilities.ts"
// ❌ Without MCP - every capability needs custom implementation

// Want database access? Write database code
const db = new Database(connectionString);
const users = await db.query("SELECT * FROM users");

// Want web search? Build web scraping
const response = await fetch(`https://api.search.com/q=${query}`);
const results = await response.json();

// Want file access? Handle file I/O
const content = await fs.readFile(filepath, "utf-8");

// Want weather data? Build weather client
const weather = await fetch(`https://api.weather.com/${city}`);

// Problems:
// 🔧 Manual integration for every data source
// 🐛 Custom error handling for each service
// 📚 Learning different APIs for each capability
// 🔄 Maintaining multiple integrations
```

## The Solution: MCP Provides Universal Access

With MCP, your agent connects to any data source through one interface:

```typescript title="mcp-universal-access.ts"
// ✅ With MCP - universal interface for all capabilities

// Database access through MCP
const users = await ctx.callAction("mcp.callTool", {
  serverId: "database",
  name: "query",
  arguments: { sql: "SELECT * FROM users" },
});

// Web search through MCP
const searchResults = await ctx.callAction("mcp.callTool", {
  serverId: "search",
  name: "web-search",
  arguments: { query: "OpenAI news" },
});

// File access through MCP
const fileContent = await ctx.callAction("mcp.readResource", {
  serverId: "filesystem",
  uri: "file:///project/data.json",
});

// Weather data through MCP
const weather = await ctx.callAction("mcp.callTool", {
  serverId: "weather",
  name: "current-conditions",
  arguments: { city: "San Francisco" },
});

// Benefits:
// 🎯 Same interface for all data sources
// 🛡️ Consistent error handling
// 📖 One API pattern to learn
// ⚡ Pre-built server integrations
```

## How MCP Works with Daydreams

MCP integration happens through the **extension system**:

```typescript title="mcp-integration-flow.ts"
// 1. Add MCP extension to your agent
const agent = createDreams({
  extensions: [
    createMcpExtension([
      {
        id: "my-database",
        name: "SQLite Explorer",
        transport: {
          type: "stdio",
          command: "npx",
          args: ["@modelcontextprotocol/server-sqlite", "path/to/database.db"],
        },
      },
      {
        id: "web-search",
        name: "Search Service",
        transport: {
          type: "sse",
          serverUrl: "http://localhost:3001",
        },
      },
    ]),
  ],
});

// 2. Agent automatically gets MCP actions:
// - mcp.listServers
// - mcp.listTools
// - mcp.callTool
// - mcp.listResources
// - mcp.readResource
// - mcp.listPrompts
// - mcp.getPrompt

// 3. Use MCP capabilities in any action
const weatherAction = action({
  name: "get-weather",
  handler: async ({ city }, ctx) => {
    // Call MCP weather server
    const weather = await ctx.callAction("mcp.callTool", {
      serverId: "weather-service",
      name: "current",
      arguments: { location: city },
    });

    return `Weather in ${city}: ${weather.result.description}`;
  },
});
```

## MCP Transport Types

MCP supports two connection methods:

### Local Servers (stdio)

For servers running as separate processes:

```typescript title="stdio-transport.ts"
// Local MCP server via command line
{
  id: "sqlite-db",
  name: "SQLite Database",
  transport: {
    type: "stdio",
    command: "npx",
    args: ["@modelcontextprotocol/server-sqlite", "./data.db"]
  }
}

// Local Python MCP server
{
  id: "python-analysis",
  name: "Data Analysis Server",
  transport: {
    type: "stdio",
    command: "python",
    args: ["analysis_server.py"]
  }
}

// Local Node.js MCP server
{
  id: "file-system",
  name: "File System Access",
  transport: {
    type: "stdio",
    command: "node",
    args: ["filesystem-server.js"]
  }
}
```

### Remote Servers (SSE)

For servers running as web services:

```typescript title="sse-transport.ts"
// Remote MCP server via HTTP
{
  id: "cloud-search",
  name: "Cloud Search Service",
  transport: {
    type: "sse",
    serverUrl: "https://search-api.example.com"
  }
}

// Local development server
{
  id: "dev-database",
  name: "Development Database",
  transport: {
    type: "sse",
    serverUrl: "http://localhost:3001",
    sseEndpoint: "/events",      // Optional
    messageEndpoint: "/messages" // Optional
  }
}
```

## Working with MCP Capabilities

### Discover Available Tools

```typescript title="discover-mcp-tools.ts"
// List all connected MCP servers
const servers = await ctx.callAction("mcp.listServers", {});
console.log("Connected servers:", servers.servers);

// Discover tools on a specific server
const tools = await ctx.callAction("mcp.listTools", {
  serverId: "database-server",
});

console.log("Available tools:", tools.tools);
// Output: [
//   { name: "query", description: "Execute SQL query" },
//   { name: "schema", description: "Get table schema" },
//   { name: "insert", description: "Insert new record" }
// ]
```

### Use Server Tools

```typescript title="use-mcp-tools.ts"
// Execute a database query
const queryResult = await ctx.callAction("mcp.callTool", {
  serverId: "database-server",
  name: "query",
  arguments: {
    sql: "SELECT name, email FROM users WHERE active = 1 LIMIT 10",
  },
});

if (queryResult.error) {
  console.error("Query failed:", queryResult.error);
} else {
  console.log("Query results:", queryResult.result);
}

// Call a web search tool
const searchResult = await ctx.callAction("mcp.callTool", {
  serverId: "search-server",
  name: "web-search",
  arguments: {
    query: "Daydreams AI framework tutorial",
    maxResults: 5,
    safeSearch: true,
  },
});
```

### Access Server Resources

```typescript title="access-mcp-resources.ts"
// List available resources
const resources = await ctx.callAction("mcp.listResources", {
  serverId: "filesystem-server",
});

console.log("Available resources:", resources.resources);

// Read a specific resource
const fileContent = await ctx.callAction("mcp.readResource", {
  serverId: "filesystem-server",
  uri: "file:///project/config.json",
});

console.log("File content:", fileContent.resource.contents[0].text);

// Read a database schema resource
const schema = await ctx.callAction("mcp.readResource", {
  serverId: "database-server",
  uri: "schema://users",
});
```

### Use Server Prompts

```typescript title="use-mcp-prompts.ts"
// List available prompts
const prompts = await ctx.callAction("mcp.listPrompts", {
  serverId: "analysis-server",
});

// Get a specific prompt with arguments
const analysisPrompt = await ctx.callAction("mcp.getPrompt", {
  serverId: "analysis-server",
  name: "analyze-data",
  arguments: {
    dataType: "sales",
    timeframe: "last-quarter",
  },
});

// Use the prompt content with your LLM
const llmResponse = await generateText({
  model: openai("gpt-4"),
  prompt: analysisPrompt.prompt.messages[0].content.text,
});
```

## Real-World Examples

### Customer Support Agent

```typescript title="customer-support-with-mcp.ts"
const customerSupportAgent = createDreams({
  extensions: [
    createMcpExtension([
      {
        id: "crm-database",
        name: "Customer Database",
        transport: {
          type: "stdio",
          command: "npx",
          args: ["@company/crm-mcp-server"],
        },
      },
      {
        id: "knowledge-base",
        name: "Support Knowledge Base",
        transport: {
          type: "sse",
          serverUrl: "https://kb.company.com/mcp",
        },
      },
    ]),
  ],

  actions: [
    action({
      name: "handle-support-ticket",
      handler: async ({ ticketId, customerEmail }, ctx) => {
        // Get customer history from CRM
        const customerData = await ctx.callAction("mcp.callTool", {
          serverId: "crm-database",
          name: "get-customer",
          arguments: { email: customerEmail },
        });

        // Search knowledge base for solutions
        const solutions = await ctx.callAction("mcp.callTool", {
          serverId: "knowledge-base",
          name: "search-solutions",
          arguments: {
            query: customerData.result.lastIssueCategory,
            limit: 3,
          },
        });

        return {
          customer: customerData.result,
          suggestedSolutions: solutions.result,
          escalate:
            customerData.result.tier === "premium" &&
            solutions.result.length === 0,
        };
      },
    }),
  ],
});
```

### Trading Analytics Agent

```typescript title="trading-agent-with-mcp.ts"
const tradingAgent = createDreams({
  extensions: [
    createMcpExtension([
      {
        id: "market-data",
        name: "Market Data Provider",
        transport: {
          type: "sse",
          serverUrl: "wss://market-data.example.com/mcp",
        },
      },
      {
        id: "portfolio-db",
        name: "Portfolio Database",
        transport: {
          type: "stdio",
          command: "python",
          args: ["portfolio_server.py"],
        },
      },
    ]),
  ],

  actions: [
    action({
      name: "analyze-portfolio",
      handler: async ({ portfolioId }, ctx) => {
        // Get current portfolio positions
        const positions = await ctx.callAction("mcp.callTool", {
          serverId: "portfolio-db",
          name: "get-positions",
          arguments: { portfolioId },
        });

        // Get real-time market data for each position
        const marketData = await Promise.all(
          positions.result.map((position) =>
            ctx.callAction("mcp.callTool", {
              serverId: "market-data",
              name: "get-quote",
              arguments: { symbol: position.symbol },
            })
          )
        );

        // Calculate portfolio performance
        const analysis = {
          totalValue: 0,
          dayChange: 0,
          positions: positions.result.map((position, i) => ({
            ...position,
            currentPrice: marketData[i].result.price,
            dayChange: marketData[i].result.change,
          })),
        };

        return analysis;
      },
    }),
  ],
});
```

## Error Handling Best Practices

### Graceful Fallbacks

```typescript title="mcp-error-handling.ts"
const robustAction = action({
  name: "get-data-with-fallback",
  handler: async ({ query }, ctx) => {
    // Try primary MCP server first
    let result = await ctx.callAction("mcp.callTool", {
      serverId: "primary-search",
      name: "search",
      arguments: { query },
    });

    if (result.error) {
      console.warn("Primary search failed, trying backup:", result.error);

      // Fallback to secondary server
      result = await ctx.callAction("mcp.callTool", {
        serverId: "backup-search",
        name: "search",
        arguments: { query },
      });
    }

    if (result.error) {
      // Final fallback to local search
      return {
        results: [],
        source: "local-cache",
        message: "External search unavailable",
      };
    }

    return {
      results: result.result,
      source: result.error ? "backup" : "primary",
    };
  },
});
```

### Connection Monitoring

```typescript title="mcp-connection-monitoring.ts"
const monitorConnections = action({
  name: "check-mcp-health",
  handler: async (args, ctx) => {
    const servers = await ctx.callAction("mcp.listServers", {});

    const healthChecks = await Promise.all(
      servers.servers.map(async (server) => {
        try {
          // Try to list tools as a health check
          const tools = await ctx.callAction("mcp.listTools", {
            serverId: server.id,
          });

          return {
            serverId: server.id,
            name: server.name,
            status: tools.error ? "error" : "healthy",
            error: tools.error,
          };
        } catch (error) {
          return {
            serverId: server.id,
            name: server.name,
            status: "disconnected",
            error: error.message,
          };
        }
      })
    );

    return {
      timestamp: new Date().toISOString(),
      servers: healthChecks,
    };
  },
});
```

## Available MCP Servers

The MCP ecosystem includes servers for common use cases:

### Official Servers

```typescript title="official-mcp-servers.ts"
// SQLite database access
{
  id: "sqlite",
  name: "SQLite Database",
  transport: {
    type: "stdio",
    command: "npx",
    args: ["@modelcontextprotocol/server-sqlite", "./database.db"]
  }
}

// File system access
{
  id: "filesystem",
  name: "File System",
  transport: {
    type: "stdio",
    command: "npx",
    args: ["@modelcontextprotocol/server-filesystem", "./data"]
  }
}

// Git repository access
{
  id: "git",
  name: "Git Repository",
  transport: {
    type: "stdio",
    command: "npx",
    args: ["@modelcontextprotocol/server-git", "./repo"]
  }
}
```

### Community Servers

```typescript title="community-mcp-servers.ts"
// Web search capabilities
{
  id: "web-search",
  name: "Web Search",
  transport: {
    type: "stdio",
    command: "python",
    args: ["-m", "mcp_server_web_search"]
  }
}

// AWS services access
{
  id: "aws",
  name: "AWS Services",
  transport: {
    type: "stdio",
    command: "node",
    args: ["aws-mcp-server.js"]
  }
}
```

## Building Custom MCP Servers

You can create custom MCP servers for your specific needs:

```typescript title="custom-mcp-server.ts"
// Simple MCP server example
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

const server = new McpServer({
  name: "Custom Business Server",
  version: "1.0.0",
});

// Add a tool for business logic
server.tool(
  "calculate-roi",
  {
    investment: z.number(),
    returns: z.number(),
    timeframe: z.number(),
  },
  async ({ investment, returns, timeframe }) => {
    const roi = ((returns - investment) / investment) * 100;
    const annualizedRoi = roi / timeframe;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            roi: roi.toFixed(2),
            annualizedRoi: annualizedRoi.toFixed(2),
            profitable: roi > 0,
          }),
        },
      ],
    };
  }
);

// Add a resource for business data
server.resource("business-metrics", async () => ({
  contents: [
    {
      uri: "metrics://quarterly",
      text: JSON.stringify({
        revenue: 1000000,
        expenses: 750000,
        profit: 250000,
        customers: 5000,
      }),
    },
  ],
}));

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Best Practices

### 1. Server Organization

```typescript title="organize-mcp-servers.ts"
// ✅ Good - group related servers by purpose
const databaseServers = [
  {
    id: "user-db",
    name: "User Database",
    transport: {
      /* ... */
    },
  },
  {
    id: "analytics-db",
    name: "Analytics Database",
    transport: {
      /* ... */
    },
  },
];

const externalServers = [
  {
    id: "web-search",
    name: "Web Search",
    transport: {
      /* ... */
    },
  },
  {
    id: "weather",
    name: "Weather API",
    transport: {
      /* ... */
    },
  },
];

createMcpExtension([...databaseServers, ...externalServers]);

// ❌ Bad - unclear server purposes
createMcpExtension([
  {
    id: "server1",
    name: "Server",
    transport: {
      /* ... */
    },
  },
  {
    id: "server2",
    name: "Other Server",
    transport: {
      /* ... */
    },
  },
]);
```

### 2. Error Boundaries

```typescript title="mcp-error-boundaries.ts"
// ✅ Good - wrap MCP calls in try-catch
const safeAction = action({
  name: "safe-mcp-call",
  handler: async ({ query }, ctx) => {
    try {
      const result = await ctx.callAction("mcp.callTool", {
        serverId: "search-server",
        name: "search",
        arguments: { query },
      });

      if (result.error) {
        return { error: `Search failed: ${result.error}` };
      }

      return { data: result.result };
    } catch (error) {
      return { error: `Connection failed: ${error.message}` };
    }
  },
});
```

### 3. Resource Validation

```typescript title="mcp-resource-validation.ts"
// ✅ Good - validate MCP responses
const validateResponse = (mcpResult: any) => {
  if (mcpResult.error) {
    throw new Error(`MCP Error: ${mcpResult.error}`);
  }

  if (!mcpResult.result) {
    throw new Error("MCP returned no result");
  }

  return mcpResult.result;
};

const validatedAction = action({
  name: "validated-mcp-call",
  handler: async ({ id }, ctx) => {
    const result = await ctx.callAction("mcp.callTool", {
      serverId: "database",
      name: "get-user",
      arguments: { id },
    });

    const userData = validateResponse(result);

    // Now safe to use userData
    return { user: userData };
  },
});
```

## Next Steps

* **[Extensions vs Services](/docs/core/advanced/extensions-vs-services)** -
  When to use MCP vs other integration patterns
* **[Custom Extensions](/docs/core/advanced/extensions)** - Build your own
  integrations
* **[Examples](/docs/tutorials/examples)** - See complete MCP implementations

## Key Takeaways

* **Universal interface** - One API pattern for all external capabilities
* **Headless client** - Your agent connects to any MCP server seamlessly
* **Seamless integration** - MCP actions work like any other agent action
* **Multiple transports** - Support both local (stdio) and remote (SSE) servers
* **Ecosystem ready** - Connect to existing MCP servers or build custom ones

MCP transforms your agent from isolated code into a connected system that can
access any data source or service through a standardized protocol.


file: ./content/docs/core/concepts/memory.mdx
meta: {
  "title": "Memory",
  "description": "How Daydreams agents store, recall, and learn from information."
}
        
## What is Memory?

Memory is how your agent **remembers** things between conversations. Just like
you remember what you talked about yesterday, agents need memory to be helpful
over time.

## Real Examples

Here are different types of memory your agent uses:

### Short-Term Memory (This Conversation)

```typescript title="short-term-memory.ts"
// What happened in the current conversation
const workingMemory = {
  messages: [
    { user: "What's the weather?" },
    { agent: "Let me check..." },
    { action: "getWeather", result: "72°F, sunny" },
    { agent: "It's 72°F and sunny!" },
  ],
  // This gets cleared when conversation ends
};
```

### Long-Term Memory (Persistent Data)

```typescript title="long-term-memory.ts"
// What the agent remembers about you
const contextMemory = {
  userId: "alice",
  preferences: {
    favoriteColor: "blue",
    timezone: "America/New_York",
    wantsDetailedWeather: true,
  },
  chatHistory: [
    "Discussed weather preferences on 2024-01-15",
    "Helped with todo list on 2024-01-16",
  ],
  // This persists forever
};
```

### Experience Memory (Learning from Past)

```typescript title="experience-memory.ts"
// What the agent learned from previous interactions
const episodicMemory = [
  {
    situation: "User asked about weather in winter",
    action: "Provided temperature + suggested warm clothes",
    result: "User was happy and thanked me",
    lesson: "Winter weather queries benefit from clothing suggestions",
  },
  // Agent can recall and apply these lessons to new situations
];
```

## The Problem: Agents Without Memory Are Useless

Without memory, every conversation starts from scratch:

```text title="forgetful-agent.txt"
Day 1:
User: "My name is Alice and I like detailed weather reports"
Agent: "Nice to meet you Alice! I'll remember you like detailed weather."

Day 2:
User: "What's the weather?"
Agent: "Hi! I'm not sure who you are. What kind of weather info do you want?"
// ❌ Forgot everything about Alice
// ❌ Has to ask the same questions again
// ❌ Terrible user experience
```

## The Solution: Memory Makes Agents Smart

With memory, agents get better over time:

```text title="smart-agent.txt"
Day 1:
User: "My name is Alice and I like detailed weather reports"
Agent: "Nice to meet you Alice! I'll remember you like detailed weather."
→ Saves: { user: "Alice", preferences: { detailedWeather: true } }

Day 2:
User: "What's the weather?"
Agent: → Loads: { user: "Alice", preferences: { detailedWeather: true } }
Agent: "Hi Alice! It's 72°F and sunny with 15mph winds from the west,
       humidity at 45%, and clear skies expected all day."
// ✅ Remembered Alice and her preferences
// ✅ Provided detailed weather automatically
// ✅ Great user experience
```

## How Memory Works in Your Agent

### 1. Agent Automatically Saves Important Information

```typescript title="automatic-memory.ts"
// Your agent's context automatically saves important info
const chatContext = context({
  type: "chat",
  schema: z.object({ userId: z.string() }),

  create: () => ({
    preferences: {},
    chatHistory: [],
    firstMet: new Date().toISOString(),
  }),

  // This memory persists between conversations
});

// When user says: "I prefer metric units"
// Agent automatically saves: preferences.units = "metric"
// Next conversation: Agent uses metric units automatically
```

### 2. Different Types of Memory for Different Needs

```typescript title="memory-types.ts"
const agent = createDreams({
  model: openai("gpt-4o"),

  // Configure where memory gets saved
  memory: createMemory(
    // Long-term storage (user preferences, chat history)
    await createMongoMemoryStore({ uri: "mongodb://localhost:27017" }),

    // Experience storage (what worked well in the past)
    createChromaVectorStore("agent-experiences")
  ),

  // Enable automatic learning from conversations
  generateMemories: true,
});
```

### 3. Agent Recalls Relevant Memories

```text title="memory-recall.txt"
New user question: "How do I cook pasta?"

Agent thinks:
1. Check if I know this user (loads context memory)
2. Recall similar past conversations (searches experience memory)
3. Found: "Previous users liked step-by-step cooking instructions"
4. Respond with detailed cooking steps

Result: Agent gives better answer based on past experience!
```

## Setting Up Memory in Your Agent

Here's how to add memory to your agent:

### Basic Memory (In-Memory)

```typescript title="basic-memory.ts"
import {
  createDreams,
  createMemory,
  createMemoryStore,
} from "@daydreamsai/core";

const agent = createDreams({
  model: openai("gpt-4o"),

  // Basic memory - data lost when agent restarts
  memory: createMemory(
    createMemoryStore(), // Stores in RAM
    createVectorStore() // No persistent experience storage
  ),
});
```

### Persistent Memory (Database)

```typescript title="persistent-memory.ts"
import { createMongoMemoryStore } from "@daydreamsai/mongo";
import { createChromaVectorStore } from "@daydreamsai/chroma";

const agent = createDreams({
  model: openai("gpt-4o"),

  // Persistent memory - data survives restarts
  memory: createMemory(
    // Save to MongoDB
    await createMongoMemoryStore({
      uri: "mongodb://localhost:27017",
      dbName: "my-agent-memory",
    }),

    // Save experiences to ChromaDB for learning
    createChromaVectorStore("my-agent-experiences")
  ),

  // Enable automatic learning
  generateMemories: true,
});
```

## Working with Context Memory

Context memory is what your agent remembers about specific conversations:

```typescript title="context-memory-usage.ts"
const userProfileContext = context({
  type: "user-profile",
  schema: z.object({ userId: z.string() }),

  // Define what to remember about each user
  create: () => ({
    name: null,
    preferences: {
      language: "en",
      timezone: null,
      communicationStyle: "friendly",
    },
    chatSummary: [],
    lastSeen: null,
  }),

  // How this memory appears to the LLM
  render: (state) => `
User Profile: ${state.args.userId}
Name: ${state.memory.name || "Unknown"}
Preferences: ${JSON.stringify(state.memory.preferences)}
Last interaction: ${state.memory.lastSeen || "First time"}

Recent chat summary:
${state.memory.chatSummary.slice(-3).join("\n")}
  `,
});
```

### Actions Can Update Memory

```typescript title="memory-updating-action.ts"
const updatePreferenceAction = action({
  name: "update-user-preference",
  description: "Updates a user's preference",
  schema: z.object({
    key: z.string(),
    value: z.string(),
  }),

  handler: async ({ key, value }, ctx) => {
    // Update the user's memory
    ctx.memory.preferences[key] = value;
    ctx.memory.lastSeen = new Date().toISOString();

    // Memory automatically saves after this action
    return {
      success: true,
      message: `Updated ${key} to ${value}`,
    };
  },
});
```

## Experience Memory: Learning from the Past

Your agent can learn from previous conversations:

```typescript title="experience-learning.ts"
// Enable automatic experience generation
const agent = createDreams({
  model: openai("gpt-4o"),
  memory: createMemory(
    await createMongoMemoryStore({ uri: "mongodb://localhost:27017" }),
    createChromaVectorStore("experiences")
  ),

  // Agent automatically creates "episodes" from conversations
  generateMemories: true,

  // Optional: Export training data for fine-tuning
  exportTrainingData: true,
  trainingDataPath: "./agent-training.jsonl",
});

// Now when user asks: "How do I bake a cake?"
// Agent recalls: "I helped someone bake a cake before. They liked step-by-step instructions with temperatures."
// Agent provides: Detailed baking instructions with exact temperatures and times
```

## Memory in Action: Complete Example

Here's how all the memory types work together:

```typescript title="complete-memory-example.ts"
// 1. User starts conversation
User: "Hi, I'm Sarah. I'm learning to cook."

// 2. Agent creates/loads context memory
Context Memory: {
  name: null,  // Will be updated
  interests: [], // Will be updated
  skillLevel: null // Will be updated
}

// 3. Agent processes and updates memory
Action: updateUserProfile({
  name: "Sarah",
  interests: ["cooking"],
  skillLevel: "beginner"
})

// 4. Later conversation
User: "How do I make pasta?"

// 5. Agent loads Sarah's memory
Context Memory: {
  name: "Sarah",
  interests: ["cooking"],
  skillLevel: "beginner"  // Agent knows she's a beginner!
}

// 6. Agent recalls similar past experiences
Experience Memory: "When helping beginners with pasta, detailed steps work best"

// 7. Agent responds appropriately
Agent: "Hi Sarah! Since you're learning to cook, I'll give you detailed step-by-step pasta instructions..."

// ✅ Personalized response based on memory!
```

## Best Practices

### 1. Choose the Right Memory Storage

```typescript title="memory-storage-choice.ts"
// ✅ Good for development - simple setup
memory: createMemory(
  createMemoryStore(), // In-memory, lost on restart
  createVectorStore() // No learning capabilities
);

// ✅ Good for production - data persists
memory: createMemory(
  await createMongoMemoryStore({ uri: process.env.MONGODB_URI }),
  createChromaVectorStore("prod-experiences")
);
```

### 2. Design Clear Memory Structures

```typescript title="clear-memory-structure.ts"
// ✅ Good - clear, organized structure
interface UserMemory {
  profile: {
    name: string;
    email: string;
    joinDate: string;
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: boolean;
  };
  activityHistory: Array<{
    action: string;
    timestamp: string;
    result: string;
  }>;
}

// ❌ Bad - everything mixed together
interface MessyMemory {
  stuff: any;
  data: any;
  things: any;
}
```

### 3. Don't Store Too Much

```typescript title="memory-size-management.ts"
// ✅ Good - keep recent, relevant data
render: (state) => {
  const recentChats = state.memory.chatHistory.slice(-5); // Last 5 only
  const importantPrefs = {
    language: state.memory.preferences.language,
    timezone: state.memory.preferences.timezone,
  };

  return `Recent activity: ${recentChats.join("\n")}`;
};

// ❌ Bad - dump everything
render: (state) => JSON.stringify(state.memory); // Overwhelming!
```

### 4. Handle Memory Gracefully

```typescript title="graceful-memory-handling.ts"
handler: async ({ userId }, ctx) => {
  try {
    // Try to load user memory
    const userPrefs = ctx.memory.preferences || {};

    // Provide defaults if memory is empty
    const language = userPrefs.language || "en";
    const timezone = userPrefs.timezone || "UTC";

    return { language, timezone };
  } catch (error) {
    // Handle memory errors gracefully
    console.error("Memory error:", error);
    return { language: "en", timezone: "UTC" }; // Safe defaults
  }
};
```

## Memory Types Summary

| Memory Type           | Purpose               | Lifetime            | Example                                |
| --------------------- | --------------------- | ------------------- | -------------------------------------- |
| **Working Memory**    | Current conversation  | Single conversation | "User just asked about weather"        |
| **Context Memory**    | User/session data     | Persists forever    | "Alice prefers detailed weather"       |
| **Action Memory**     | Action-specific state | Persists forever    | "Weather API called 47 times today"    |
| **Experience Memory** | Learning from past    | Persists forever    | "Users like step-by-step cooking help" |

## Key Takeaways

* **Memory makes agents smart** - Without it, every conversation starts from
  scratch
* **Multiple memory types** - Short-term (conversation), long-term (user data),
  experience (learning)
* **Automatic persistence** - Agent saves important information without extra
  code
* **Experience learning** - Agent gets better over time by remembering what
  works
* **Choose storage wisely** - In-memory for development, database for production
* **Keep it organized** - Clear memory structures make agents more reliable

Memory transforms your agent from a stateless chatbot into an intelligent
assistant that learns, remembers, and gets better with every interaction.


file: ./content/docs/core/concepts/outputs.mdx
meta: {
  "title": "Outputs",
  "description": "How Daydreams agents send information and responses."
}
        
## What is an Output?

An output is how your agent **sends** information to the outside world. If
actions are what your agent can "do", outputs are how your agent "speaks" or
"responds".

## Real Examples

Here are outputs that make agents useful:

### Discord Message

```typescript title="discord-output.ts"
// Agent can send Discord messages
const discordMessage = output({
  type: "discord:message",
  description: "Sends a message to Discord",
  schema: z.string(),
  attributes: z.object({
    channelId: z.string(),
  }),
  handler: async (message, ctx) => {
    await discord.send(ctx.outputRef.params.channelId, message);
    return { sent: true };
  },
});
```

### Console Print

```typescript title="console-output.ts"
// Agent can print to console
const consolePrint = output({
  type: "console:print",
  description: "Prints a message to the console",
  schema: z.string(),
  handler: async (message) => {
    console.log(`Agent: ${message}`);
    return { printed: true };
  },
});
```

### Email Notification

```typescript title="email-output.ts"
// Agent can send emails
const emailOutput = output({
  type: "email:send",
  description: "Sends an email notification",
  schema: z.string(),
  attributes: z.object({
    to: z.string(),
    subject: z.string(),
  }),
  handler: async (body, ctx) => {
    const { to, subject } = ctx.outputRef.params;
    await emailService.send({ to, subject, body });
    return { emailSent: true };
  },
});
```

## The Problem: Agents Need to Communicate

Without outputs, your agent can think but can't communicate:

```text title="silent-agent.txt"
User: "Send me the weather report"
Agent: *calls weather API internally*
Agent: *knows it's 72°F and sunny*
Agent: *...but can't tell you!*
// ❌ Agent gets the data but you never see it
// ❌ No way to respond or communicate
// ❌ Useless to humans
```

## The Solution: Outputs Enable Communication

With outputs, your agent can respond properly:

```text title="communicating-agent.txt"
User: "Send me the weather report"
Agent: *calls weather API*
Agent: *gets weather data*
Agent: *uses discord:message output*
Discord: "It's 72°F and sunny in San Francisco!"
// ✅ Agent gets data AND tells you about it
// ✅ Complete conversation loop
// ✅ Actually useful
```

## How Outputs Work in Your Agent

### 1. You Define How the Agent Can Respond

```typescript title="define-outputs.ts"
const agent = createDreams({
  model: openai("gpt-4o"),
  outputs: [
    discordMessage, // Agent can send Discord messages
    consolePrint, // Agent can print to console
    emailOutput, // Agent can send emails
  ],
});
```

### 2. The LLM Decides When to Respond

When the agent thinks, it sees:

```text title="llm-sees-outputs.txt"
Available outputs:
- discord:message: Sends a message to Discord
- console:print: Prints a message to the console
- email:send: Sends an email notification

User asked: "Check weather and let me know via Discord"
```

### 3. The LLM Uses Outputs to Respond

The LLM responds with structured output calls:

```xml title="llm-uses-outputs.xml"
<response>
  <reasoning>User wants weather info via Discord. I'll get weather then send message.</reasoning>

  <action_call name="get-weather">{"city": "San Francisco"}</action_call>

  <output type="discord:message" channelId="123456789">
    Weather in San Francisco: {{calls[0].temperature}}, {{calls[0].condition}}
  </output>
</response>
```

### 4. Daydreams Sends the Output

Daydreams automatically:

* Validates the output format
* Runs your handler function
* Actually sends the Discord message
* Logs the result

## Creating Your First Output

Here's a simple output that saves messages to a file:

```typescript title="file-output.ts"
import { output } from "@daydreamsai/core";
import * as z from "zod/v4";
import fs from "fs/promises";

export const saveToFile = output({
  // Type the LLM uses to call this output
  type: "file:save",

  // Description helps LLM know when to use it
  description: "Saves a message to a text file",

  // Schema defines what content is expected
  schema: z.string().describe("The message to save"),

  // Attributes define extra parameters on the output tag
  attributes: z.object({
    filename: z.string().describe("Name of the file to save to"),
  }),

  // Handler is your actual code that runs
  handler: async (message, ctx) => {
    const { filename } = ctx.outputRef.params;

    await fs.writeFile(filename, message + "\n", { flag: "a" });

    return {
      saved: true,
      filename,
      message: `Saved message to ${filename}`,
    };
  },
});
```

Use it in your agent:

```typescript title="agent-with-file-output.ts"
const agent = createDreams({
  model: openai("gpt-4o"),
  outputs: [saveToFile],
});

// Now when the LLM wants to save something:
// <output type="file:save" filename="log.txt">This is my message</output>
// The message gets saved to log.txt
```

## Working with Context Memory

Outputs can read and update your agent's memory:

```typescript title="notification-output.ts"
// Define what your context remembers
interface ChatMemory {
  messagesSent: number;
  lastNotification?: string;
}

const notificationOutput = output({
  type: "notification:send",
  description: "Sends a notification to the user",
  schema: z.string(),
  attributes: z.object({
    priority: z.enum(["low", "medium", "high"]),
  }),
  handler: async (message, ctx) => {
    // Access context memory (automatically typed!)
    const memory = ctx.memory as ChatMemory;

    // Update statistics
    if (!memory.messagesSent) {
      memory.messagesSent = 0;
    }
    memory.messagesSent++;
    memory.lastNotification = message;

    // Send the actual notification
    const { priority } = ctx.outputRef.params;
    await notificationService.send({
      message,
      priority,
      userId: ctx.args.userId,
    });

    // Changes to memory are automatically saved
    return {
      sent: true,
      totalSent: memory.messagesSent,
      message: `Notification sent (total: ${memory.messagesSent})`,
    };
  },
});
```

## Outputs vs Actions: When to Use Which?

Understanding the difference is crucial:

### Use **Outputs** When:

* **Communicating results** to users or external systems
* **You don't need a response** back for the LLM to continue
* **Final step** in a conversation or workflow

```typescript title="output-example.ts"
// ✅ Good use of output - telling user the result
<output type="discord:message" channelId="123">
  Weather: 72°F, sunny. Have a great day!
</output>
```

### Use **Actions** When:

* **Getting data** the LLM needs for next steps
* **You need the result** for further reasoning
* **Middle step** in a complex workflow

```typescript title="action-example.ts"
// ✅ Good use of action - getting data for next step
<action_call name="get-weather">{"city": "San Francisco"}</action_call>
// LLM will use this result to decide what to tell the user
```

### Common Pattern: Actions → Outputs

```xml title="action-then-output.xml"
<response>
  <reasoning>I'll get weather data, then tell the user about it</reasoning>

  <!-- Action: Get data -->
  <action_call name="get-weather">{"city": "Boston"}</action_call>

  <!-- Output: Communicate result -->
  <output type="discord:message" channelId="123">
    Boston weather: {{calls[0].temperature}}, {{calls[0].condition}}
  </output>
</response>
```

## Advanced: Multiple Outputs

Your agent can send multiple outputs in one response:

```xml title="multiple-outputs.xml"
<response>
  <reasoning>I'll notify both Discord and email about this important update</reasoning>

  <output type="discord:message" channelId="123">
    🚨 Server maintenance starting in 10 minutes!
  </output>

  <output type="email:send" to="admin@company.com" subject="Maintenance Alert">
    Server maintenance is beginning in 10 minutes. All users have been notified via Discord.
  </output>
</response>
```

## External Service Integration

Outputs are perfect for integrating with external services:

```typescript title="slack-output.ts"
const slackMessage = output({
  type: "slack:message",
  description: "Sends a message to Slack",
  schema: z.string(),
  attributes: z.object({
    channel: z.string().describe("Slack channel name"),
    threadId: z.string().optional().describe("Thread ID for replies"),
  }),
  handler: async (message, ctx) => {
    try {
      const { channel, threadId } = ctx.outputRef.params;

      const result = await slackClient.chat.postMessage({
        channel,
        text: message,
        thread_ts: threadId,
      });

      return {
        success: true,
        messageId: result.ts,
        channel: result.channel,
        message: `Message sent to #${channel}`,
      };
    } catch (error) {
      console.error("Failed to send Slack message:", error);

      return {
        success: false,
        error: error.message,
        message: "Failed to send Slack message",
      };
    }
  },
});
```

## Best Practices

### 1. Use Clear Types and Descriptions

```typescript title="good-naming.ts"
// ✅ Good - clear what it does
const userNotification = output({
  type: "user:notification",
  description:
    "Sends a notification directly to the user via their preferred channel",
  // ...
});

// ❌ Bad - unclear purpose
const sendStuff = output({
  type: "send",
  description: "Sends something",
  // ...
});
```

### 2. Validate Input with Schemas

```typescript title="good-schemas.ts"
// ✅ Good - specific validation
schema: z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  urgency: z.enum(["low", "medium", "high"]),
});

// ❌ Bad - too loose
schema: z.any();
```

### 3. Handle Errors Gracefully

```typescript title="error-handling.ts"
handler: async (message, ctx) => {
  try {
    await sendMessage(message);
    return { sent: true };
  } catch (error) {
    // Log for debugging
    console.error("Failed to send message:", error);

    // Return structured error info
    return {
      sent: false,
      error: error.message,
      message: "Failed to send message - will retry later",
    };
  }
};
```

### 4. Use Async/Await for External Services

```typescript title="async-best-practice.ts"
// ✅ Good - properly handles async
handler: async (message, ctx) => {
  const result = await emailService.send(message);
  return { emailId: result.id };
};

// ❌ Bad - doesn't wait for async operations
handler: (message, ctx) => {
  emailService.send(message); // This returns a Promise that's ignored!
  return { status: "sent" }; // Completes before email actually sends
};
```

### 5. Provide Good Examples

```typescript title="good-examples.ts"
examples: [
  '<output type="discord:message" channelId="123456789">Hello everyone!</output>',
  '<output type="discord:message" channelId="987654321" replyToUserId="user123">Thanks for the question!</output>',
];
```

## Key Takeaways

* **Outputs enable communication** - Without them, agents can think but not
  respond
* **LLM chooses when to use them** - Based on types and descriptions you provide
* **Different from actions** - Outputs communicate results, actions get data
* **Content and attributes validated** - Zod schemas ensure correct format
* **Memory can be updated** - Track what was sent for future reference
* **Error handling is crucial** - External services can fail, handle gracefully

Outputs complete the conversation loop - they're how your intelligent agent
becomes a helpful communicator that users can actually interact with.


file: ./content/docs/core/concepts/prompting.mdx
meta: {
  "title": "Prompting",
  "description": "How Daydreams structures prompts to guide LLM reasoning and actions."
}
        
## What is a Prompt?

A prompt is the text you send to an AI model to tell it what to do. Think of it
like giving instructions to a smart assistant.

## Simple Prompts vs Agent Prompts

### Simple Prompt (ChatGPT style)

```text title="simple-prompt.txt"
User: What's the weather in New York?
Assistant: I don't have access to real-time weather data...
```

### Agent Prompt (what Daydreams creates)

```text title="agent-prompt.txt"
You are an AI agent that can:
- Call weather APIs
- Send Discord messages
- Remember conversation history

Current situation:
- User asked: "What's the weather in New York?"
- Available actions: getWeather, sendMessage
- Chat context: user123 in #general channel

Please respond with:
<action_call name="getWeather">{"city": "New York"}</action_call>
<output type="discord:message">It's 72°F and sunny in New York!</output>
```

## The Problem: LLMs Need Structure

Without structure, LLMs can't:

* Know what tools they have available
* Remember previous conversations
* Follow consistent output formats
* Handle complex multi-step tasks

**Example of what goes wrong:**

```text title="unstructured-problem.txt"
User: "Check weather and send to Discord"
LLM: "I'll check the weather for you!"
// ❌ Doesn't actually call any APIs
// ❌ Doesn't know how to send to Discord
// ❌ Just generates text
```

## The Solution: Structured Prompts

Daydreams automatically creates structured prompts that include:

1. **Available Tools** - What the agent can do
2. **Current State** - What's happening right now
3. **Response Format** - How to respond properly
4. **Context Memory** - What happened before

```text title="structured-solution.txt"
Available Actions:
- getWeather(city: string) - Gets current weather
- sendDiscord(message: string) - Sends Discord message

Current Context:
- User: user123
- Channel: #general
- Previous messages: [...]

New Input:
- "Check weather in Boston and send to Discord"

Respond with XML:
<action_call name="getWeather">{"city": "Boston"}</action_call>
<output type="discord:message">Weather in Boston: 65°F, cloudy</output>
```

## How Daydreams Builds Prompts

Every time your agent thinks, Daydreams automatically builds a prompt like this:

### 1. Instructions

```text title="instructions-section.txt"
You are an AI agent. Your job is to:
- Analyze new information
- Decide what actions to take
- Respond appropriately
```

### 2. Available Tools

```xml title="tools-section.xml"
<available-actions>
  <action name="getWeather">
    <description>Gets current weather for a city</description>
    <schema>{"type": "object", "properties": {"city": {"type": "string"}}}</schema>
  </action>
</available-actions>

<available-outputs>
  <output type="discord:message">
    <description>Sends a message to Discord</description>
    <schema>{"type": "string"}</schema>
  </output>
</available-outputs>
```

### 3. Current Context State

```xml title="context-section.xml"
<contexts>
  <context type="chat" key="user123">
    Previous messages:
    user123: Hi there!
    agent: Hello! How can I help?
    user123: What's the weather like?
  </context>
</contexts>
```

### 4. What Just Happened

```xml title="updates-section.xml"
<updates>
  <input type="discord:message" timestamp="2024-01-15T10:30:00Z">
    What's the weather in Boston?
  </input>
</updates>
```

### 5. Expected Response Format

```xml title="response-format.xml"
Respond with:
<response>
  <reasoning>Your thought process here</reasoning>
  <action_call name="actionName">{"argument": "value"}</action_call>
  <output type="outputType">Your response here</output>
</response>
```

## What the LLM Sees (Complete Example)

Here's what a complete prompt looks like:

```text title="complete-prompt.txt"
You are an AI agent. Analyze the updates and decide what to do.

<available-actions>
  <action name="getWeather">
    <description>Gets current weather for a city</description>
    <schema>{"type": "object", "properties": {"city": {"type": "string"}}}</schema>
  </action>
</available-actions>

<available-outputs>
  <output type="discord:message">
    <description>Sends a message to Discord</description>
    <schema>{"type": "string"}</schema>
  </output>
</available-outputs>

<contexts>
  <context type="chat" key="user123">
    user123: Hi there!
    agent: Hello! How can I help?
  </context>
</contexts>

<working-memory>
  <!-- Previous actions from this conversation -->
</working-memory>

<updates>
  <input type="discord:message" timestamp="2024-01-15T10:30:00Z">
    What's the weather in Boston?
  </input>
</updates>

Respond with:
<response>
  <reasoning>Your thought process</reasoning>
  <action_call name="actionName">{"arg": "value"}</action_call>
  <output type="outputType">Your message</output>
</response>
```

## LLM Response Example

The LLM responds with structured XML:

```xml title="llm-response.xml"
<response>
  <reasoning>
    The user is asking about weather in Boston. I should:
    1. Call the getWeather action to get current conditions
    2. Send the result to Discord
  </reasoning>

  <action_call name="getWeather">{"city": "Boston"}</action_call>
  <output type="discord:message">Checking the weather in Boston for you!</output>
</response>
```

Daydreams automatically:

* Parses the `<action_call>` and runs the weather API
* Parses the `<output>` and sends the Discord message
* Saves the `<reasoning>` for debugging

## Advanced Features

### Template References

LLMs can reference previous action results within the same response:

```xml title="template-example.xml"
<response>
  <reasoning>I'll get weather, then send a detailed message</reasoning>

  <action_call name="getWeather">{"city": "Boston"}</action_call>

  <output type="discord:message">
    Weather in Boston: {{calls[0].temperature}}°F, {{calls[0].condition}}
  </output>
</response>
```

The `{{calls[0].temperature}}` gets replaced with the actual weather data.

### Multi-Context Prompts

When multiple contexts are active:

```xml title="multi-context.xml"
<contexts>
  <context type="chat" key="user123">
    Chat history with user123...
  </context>

  <context type="game" key="session456">
    Current game state: level 5, health 80...
  </context>
</contexts>
```

## Key Benefits

* **Consistency** - All agents use the same reliable prompt structure
* **Clarity** - LLMs always know what tools they have and how to use them
* **Memory** - Context and conversation history included automatically
* **Debugging** - You can see exactly what the LLM was told
* **Extensibility** - Easy to add new actions and outputs

## Customizing Prompts

You can customize prompts in your contexts:

```typescript title="custom-instructions.ts"
const chatContext = context({
  type: "chat",
  schema: z.object({ userId: z.string() }),

  // Custom instructions for this context
  instructions: (state) =>
    `You are helping user ${state.args.userId}. Be friendly and helpful.`,

  // Custom context rendering
  render: (state) => `
    Chat with ${state.args.userId}
    Recent messages: ${state.memory.messages.slice(-3).join("\n")}
    User mood: ${state.memory.userMood || "neutral"}
  `,
});
```

## Key Takeaways

* **Prompts are automatically generated** - You don't write them manually
* **Structure enables capabilities** - Tools, memory, and context included
  automatically
* **LLMs respond with XML** - Parsed automatically into actions and outputs
* **Templates enable complex flows** - Reference previous results within
  responses
* **Customizable per context** - Add specific instructions and state rendering

The prompting system is what makes your agent intelligent - it provides the LLM
with everything needed to understand the situation and respond appropriately.


file: ./content/docs/core/concepts/tasks.mdx
meta: {
  "title": "Tasks",
  "description": "Managing asynchronous operations and concurrency."
}
        
## What is a Task?

A task is any operation that takes time to complete, like:

* Calling a weather API (might take 500ms)
* Saving data to a database (might take 200ms)
* Processing an image (might take 2 seconds)
* Sending an email (might take 1 second)

## The Problem

Imagine your agent needs to do 10 things at once:

```typescript title="problem-example.ts"
// User asks: "What's the weather in 5 cities?"
// Agent needs to call weather API 5 times
// Without task management:
await getWeather("New York"); // 500ms
await getWeather("London"); // 500ms
await getWeather("Tokyo"); // 500ms
await getWeather("Paris"); // 500ms
await getWeather("Sydney"); // 500ms
// Total: 2.5 seconds (slow!)
```

Even worse - what if your agent tries to make 100 API calls at once? The
external service might block you or your server might crash.

## The Solution: Task Management

Daydreams automatically manages these operations for you:

```typescript title="solution-example.ts"
// With task management:
// Runs 3 operations at the same time (concurrent)
// Queues the rest until the first ones finish
// Total: ~1 second (much faster!)

const results = await Promise.all([
  getWeather("New York"), // Starts immediately
  getWeather("London"), // Starts immediately
  getWeather("Tokyo"), // Starts immediately
  getWeather("Paris"), // Waits in queue
  getWeather("Sydney"), // Waits in queue
]);
```

## How It Works in Your Agent

When you write action handlers, this happens automatically:

```typescript title="weather-action.ts"
const weatherAction = action({
  name: "get-weather",
  description: "Get weather for a city",
  schema: z.object({
    city: z.string(),
  }),
  handler: async ({ city }) => {
    // This handler runs as a "task"
    // Daydreams automatically:
    // 1. Limits how many run at once (default: 3)
    // 2. Queues extras until slots open up
    // 3. Handles errors and retries

    const response = await fetch(`https://api.weather.com/${city}`);
    return await response.json();
  },
});
```

When your LLM calls this action multiple times:

```xml
<action_call name="get-weather">{"city": "New York"}</action_call>
<action_call name="get-weather">{"city": "London"}</action_call>
<action_call name="get-weather">{"city": "Tokyo"}</action_call>
<action_call name="get-weather">{"city": "Paris"}</action_call>
```

Daydreams automatically:

* Runs the first 3 immediately
* Queues "Paris" until one finishes
* Prevents your agent from overwhelming the weather API

## Configuring Task Limits

You can control how many tasks run simultaneously:

```typescript title="agent-config.ts"
import { createDreams, TaskRunner } from "@daydreamsai/core";

// Default: 3 tasks at once
const agent = createDreams({
  model: openai("gpt-4o"),
  extensions: [weatherExtension],
});

// Custom: 5 tasks at once (for faster APIs)
const fasterAgent = createDreams({
  model: openai("gpt-4o"),
  extensions: [weatherExtension],
  taskRunner: new TaskRunner(5),
});

// Custom: 1 task at once (for rate-limited APIs)
const slowAgent = createDreams({
  model: openai("gpt-4o"),
  extensions: [weatherExtension],
  taskRunner: new TaskRunner(1),
});
```

## Best Practices for Action Handlers

### 1. Use async/await Properly

```typescript title="good-handler.ts"
// ✅ Good - properly handles async operations
handler: async ({ userId }) => {
  const user = await database.getUser(userId);
  const preferences = await database.getPreferences(userId);
  return { user, preferences };
};

// ❌ Bad - doesn't wait for async operations
handler: ({ userId }) => {
  database.getUser(userId); // This returns a Promise!
  return { status: "done" }; // Completes before database call finishes
};
```

### 2. Handle Cancellation for Long Operations

```typescript title="cancellation-example.ts"
handler: async ({ largeDataset }, ctx) => {
  for (let i = 0; i < largeDataset.length; i++) {
    // Check if the agent wants to cancel this task
    if (ctx.abortSignal.aborted) {
      throw new Error("Operation cancelled");
    }

    await processItem(largeDataset[i]);
  }
};
```

### 3. Make Handlers Idempotent (for Retries)

```typescript title="idempotent-example.ts"
// ✅ Good - safe to run multiple times
handler: async ({ email, message }) => {
  // Check if email already sent
  const existing = await emailLog.findByKey(`${email}-${hash(message)}`);
  if (existing) {
    return { status: "already_sent", messageId: existing.messageId };
  }

  // Send email and log it
  const result = await emailService.send(email, message);
  await emailLog.create({
    email,
    messageHash: hash(message),
    messageId: result.id,
  });
  return { status: "sent", messageId: result.id };
};

// ❌ Bad - creates duplicate emails if retried
handler: async ({ email, message }) => {
  const result = await emailService.send(email, message);
  return { status: "sent", messageId: result.id };
};
```

## Advanced: Custom Task Types

Most users won't need this, but you can define custom task types:

```typescript title="custom-task.ts"
import { task } from "@daydreamsai/core";

const processVideoTask = task(
  "agent:video:process",
  async (params: { videoUrl: string }, ctx) => {
    ctx.debug("processVideo", "Starting video processing", params);

    // Long-running video processing
    const result = await videoProcessor.process(params.videoUrl);

    return { processedUrl: result.url, duration: result.duration };
  },
  {
    retry: 2, // Retry twice on failure
  }
);

// Use it in your agent
agent.taskRunner.enqueueTask(processVideoTask, { videoUrl: "https://..." });
```

## Key Takeaways

* **Tasks happen automatically** - Your action handlers become tasks
* **Concurrency is controlled** - Default limit is 3 simultaneous tasks
* **Queuing prevents overload** - Extra tasks wait their turn
* **Write async handlers properly** - Use `async/await` and handle cancellation
* **Configure based on your APIs** - Increase limit for fast APIs, decrease for
  rate-limited ones

The task system ensures your agent performs well without overwhelming external
services or consuming excessive resources.


file: ./content/docs/core/advanced/deep.mdx
meta: {
  "title": "Deep Research",
  "description": "This guide will walk you through creating an AI agent that can perform deep research using Daydreams."
}
        
You can find a deep-research example in the
[examples](https://github.com/daydreamsai/daydreams/tree/main/examples/deep-research)
directory.

Detailed tutorial coming soon!


file: ./content/docs/core/advanced/extensions-vs-services.mdx
meta: {
  "title": "Extensions vs Services",
  "description": "Understanding the difference between extensions and services in Daydreams."
}
        
## What Are Extensions and Services?

Think of building an agent like assembling a computer:

* **Services** are like **individual components** (hard drive, graphics card,
  RAM)
* **Extensions** are like **complete packages** (gaming bundle, productivity
  suite)

## Real Examples

### Services: Individual Components

```typescript title="database-service.ts"
// A service manages ONE specific thing
const databaseService = service({
  name: "database",

  // How to create the database connection
  register: (container) => {
    container.singleton("db", () => new Database(process.env.DB_URL));
  },

  // How to initialize it when agent starts
  boot: async (container) => {
    const db = container.resolve("db");
    await db.connect();
    console.log("Database connected!");
  },
});
```

### Extensions: Complete Packages

```typescript title="discord-extension.ts"
// An extension bundles EVERYTHING for a feature
const discordExtension = extension({
  name: "discord",

  // Services this extension needs
  services: [discordService], // Manages Discord client

  // All the Discord-related features
  contexts: { discord: discordContext },
  actions: [sendMessageAction, createChannelAction],
  inputs: { "discord:message": messageInput },
  outputs: { "discord:reply": replyOutput },
});
```

## The Problem: Managing Complexity

Without this separation, you'd have to set up everything manually:

```typescript title="manual-setup.ts"
// ❌ Without extensions/services - manual setup nightmare
const agent = createDreams({
  model: openai("gpt-4o"),

  // You'd have to manually configure EVERYTHING
  contexts: {
    discord: discordContext,
    twitter: twitterContext,
    database: databaseContext,
    // ... 50+ more contexts
  },

  actions: [
    sendDiscordMessage,
    createDiscordChannel,
    sendTweet,
    followUser,
    saveToDatabase,
    queryDatabase,
    // ... 100+ more actions
  ],

  // Plus manually manage all the connections, API clients, etc.
  // This becomes unmanageable quickly!
});
```

## The Solution: Organized Architecture

With extensions and services, it's clean and simple:

```typescript title="organized-setup.ts"
// ✅ With extensions/services - clean and simple
const agent = createDreams({
  model: openai("gpt-4o"),

  // Just add the features you want
  extensions: [
    discord, // Adds Discord support + client management
    twitter, // Adds Twitter support + API management
    mongoMemory, // Adds database memory + connection management
  ],

  // That's it! Each extension handles its own complexity
});
```

## How They Work Together

### Services Handle the "How"

Services manage the technical details of connecting to external systems:

```typescript title="discord-service.ts"
const discordService = service({
  name: "discord",

  // HOW to create the Discord client
  register: (container) => {
    container.singleton(
      "discordClient",
      () =>
        new Client({
          intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
          token: process.env.DISCORD_TOKEN,
        })
    );
  },

  // HOW to initialize it
  boot: async (container) => {
    const client = container.resolve("discordClient");
    await client.login();
    console.log("Discord client ready!");
  },
});
```

### Extensions Handle the "What"

Extensions bundle all the features users actually want:

```typescript title="discord-extension-complete.ts"
const discord = extension({
  name: "discord",

  // Use the service for client management
  services: [discordService],

  // WHAT the agent can do with Discord
  contexts: {
    discord: context({
      type: "discord",
      schema: z.object({ guildId: z.string(), channelId: z.string() }),

      create: () => ({
        messageHistory: [],
        memberCount: 0,
      }),

      render: (state) => `
Discord Server: ${state.args.guildId}
Channel: ${state.args.channelId}
Members: ${state.memory.memberCount}
Recent messages: ${state.memory.messageHistory.slice(-3).join("\n")}
      `,
    }),
  },

  actions: [
    action({
      name: "send-discord-message",
      description: "Send a message to a Discord channel",
      schema: z.object({
        channelId: z.string(),
        content: z.string(),
      }),

      handler: async ({ channelId, content }, ctx) => {
        const client = ctx.container.resolve("discordClient");
        const channel = await client.channels.fetch(channelId);
        await channel.send(content);
        return { sent: true, messageId: result.id };
      },
    }),
  ],

  inputs: {
    "discord:message": input({
      subscribe: (send, agent) => {
        const client = agent.container.resolve("discordClient");

        client.on("messageCreate", (message) => {
          if (message.author.bot) return;

          send({
            type: "discord:message",
            data: {
              content: message.content,
              author: message.author.username,
              channelId: message.channel.id,
              guildId: message.guild?.id,
            },
          });
        });
      },
    }),
  },

  outputs: {
    "discord:reply": output({
      schema: z.object({
        content: z.string(),
        channelId: z.string(),
      }),

      handler: async ({ content, channelId }, ctx) => {
        const client = ctx.container.resolve("discordClient");
        const channel = await client.channels.fetch(channelId);
        await channel.send(content);
      },
    }),
  },
});
```

## When to Use Each

### Create a Service When:

* Managing an external connection (database, API client)
* Sharing utilities across multiple features
* Handling lifecycle management (startup, shutdown)

```typescript title="when-to-use-service.ts"
// ✅ Good service examples
const redisService = service({
  /* manage Redis connection */
});
const loggerService = service({
  /* configure logging */
});
const webhookService = service({
  /* handle webhook server */
});
```

### Create an Extension When:

* Bundling a complete feature set
* Adding support for a new platform (Discord, Twitter, etc.)
* Packaging related actions/contexts/inputs/outputs

```typescript title="when-to-use-extension.ts"
// ✅ Good extension examples
const twitter = extension({
  /* everything for Twitter integration */
});
const tradingBot = extension({
  /* everything for trading features */
});
const gameEngine = extension({
  /* everything for game mechanics */
});
```

## Practical Example: Building a Trading Extension

Let's see how they work together in practice:

### 1. First, Create Services for External APIs

```typescript title="trading-services.ts"
const alpacaService = service({
  name: "alpaca",
  register: (container) => {
    container.singleton(
      "alpacaClient",
      () =>
        new AlpacaApi({
          key: process.env.ALPACA_KEY,
          secret: process.env.ALPACA_SECRET,
          paper: process.env.NODE_ENV !== "production",
        })
    );
  },
  boot: async (container) => {
    const client = container.resolve("alpacaClient");
    await client.authenticate();
  },
});

const marketDataService = service({
  name: "marketData",
  register: (container) => {
    container.singleton(
      "marketClient",
      () => new MarketDataClient(process.env.MARKET_DATA_KEY)
    );
  },
});
```

### 2. Then, Create Extension Using Those Services

```typescript title="trading-extension.ts"
const trading = extension({
  name: "trading",

  // Use the services we created
  services: [alpacaService, marketDataService],

  // Bundle all trading features
  contexts: {
    portfolio: portfolioContext,
    watchlist: watchlistContext,
  },

  actions: [buyStockAction, sellStockAction, getQuoteAction, setStopLossAction],

  inputs: {
    "market:price-alert": priceAlertInput,
    "market:news": newsInput,
  },

  outputs: {
    "trading:order-confirmation": orderOutput,
    "trading:alert": alertOutput,
  },
});
```

### 3. Use the Extension in Your Agent

```typescript title="trading-agent.ts"
const agent = createDreams({
  model: openai("gpt-4o"),

  // Just add the extension - everything works automatically!
  extensions: [trading],

  // Now your agent can trade stocks with full context awareness
});

// Agent can now:
// - Listen for price alerts (inputs)
// - Check portfolio status (contexts)
// - Execute trades (actions)
// - Send confirmations (outputs)
// - All using properly managed API connections (services)
```

## Architecture Summary

```text title="architecture-flow.txt"
Extension (trading)
├── Services (how to connect)
│   ├── alpacaService → manages trading API client
│   └── marketDataService → manages market data client
│
└── Features (what agent can do)
    ├── Contexts → portfolio, watchlist state
    ├── Actions → buy, sell, get quotes
    ├── Inputs → listen for price alerts
    └── Outputs → send trade confirmations

When you add the extension to your agent:
1. Services get registered and initialized automatically
2. All features become available to the LLM
3. API clients are properly managed and shared
4. Everything works together seamlessly
```

## Key Differences

| Aspect          | Service                     | Extension                          |
| --------------- | --------------------------- | ---------------------------------- |
| **Purpose**     | Manages infrastructure      | Provides features                  |
| **Contains**    | Connection logic, utilities | Actions, contexts, inputs, outputs |
| **Lifecycle**   | `register()` → `boot()`     | `install()` when added             |
| **Reusability** | Used by multiple extensions | Used by agents                     |
| **Analogy**     | Computer component          | Software package                   |

## Best Practices

### Service Design

```typescript title="good-service.ts"
// ✅ Good - focused on one responsibility
const databaseService = service({
  name: "database",
  register: (container) => {
    // Just database connection management
    container.singleton("db", () => new Database(process.env.DB_URL));
  },
});

// ❌ Bad - doing too many things
const everythingService = service({
  name: "everything",
  register: (container) => {
    // Don't mix database, API clients, loggers, etc.
    container.singleton("db", () => new Database(/* ... */));
    container.singleton("api", () => new ApiClient(/* ... */));
    container.singleton("logger", () => new Logger(/* ... */));
  },
});
```

### Extension Design

```typescript title="good-extension.ts"
// ✅ Good - cohesive feature set
const discord = extension({
  name: "discord",
  services: [discordService], // Only Discord-related services
  // All features work together for Discord integration
});

// ❌ Bad - unrelated features mixed together
const mixedExtension = extension({
  name: "mixed",
  services: [discordService, twitterService, databaseService],
  // Discord actions mixed with Twitter contexts - confusing!
});
```

## Next Steps

* **[Extensions Guide](/docs/core/advanced/extensions)** - Learn to build your
  own extensions
* **[Built-in Extensions](/docs/tutorials/examples)** - See real extension
  examples
* **[Service Patterns](/docs/core/advanced/services)** - Advanced service
  techniques

## Key Takeaways

* **Services manage "how"** - Connection setup, lifecycle, dependencies
* **Extensions manage "what"** - Features users actually want
* **Clean separation** - Infrastructure vs functionality
* **Easy composition** - Add extensions like LEGO blocks
* **Automatic management** - Framework handles the wiring

This architecture lets you build complex agents by combining simple, focused
pieces.


file: ./content/docs/core/advanced/extensions.mdx
meta: {
  "title": "Extensions",
  "description": "Building your own modular Daydreams extensions."
}
        
## What Are Extensions?

Extensions are **feature packages** for your agent. Think of them like apps on
your phone - each one adds specific capabilities without you having to build
everything from scratch.

## Real Examples

Here's what extensions look like in practice:

### Using Built-in Extensions

```typescript title="using-extensions.ts"
import { createDreams } from "@daydreamsai/core";
import { discord } from "@daydreamsai/discord";
import { twitter } from "@daydreamsai/twitter";

const agent = createDreams({
  model: openai("gpt-4o"),

  // Add extensions like installing apps
  extensions: [
    discord, // Now agent can read/send Discord messages
    twitter, // Now agent can read/send tweets
  ],
});

// That's it! Your agent now speaks Discord and Twitter
```

### What Each Extension Gives You

```typescript title="extension-features.ts"
// The Discord extension adds:
// ✅ Automatic Discord client connection
// ✅ Listen for Discord messages (inputs)
// ✅ Send Discord replies (outputs)
// ✅ Track conversation context (contexts)
// ✅ Discord-specific actions (ban, kick, etc.)

// The Twitter extension adds:
// ✅ Twitter API client management
// ✅ Listen for mentions/DMs (inputs)
// ✅ Send tweets/replies (outputs)
// ✅ Track follower context (contexts)
// ✅ Twitter actions (follow, like, retweet)
```

## The Problem: Building Everything From Scratch

Without extensions, you'd have to build every feature manually:

```typescript title="manual-agent-building.ts"
// ❌ Without extensions - hundreds of lines of setup code
const agent = createDreams({
  model: openai("gpt-4o"),

  // Manually define every context
  contexts: {
    discordGuild: context({
      /* Discord server context */
    }),
    discordChannel: context({
      /* Discord channel context */
    }),
    discordUser: context({
      /* Discord user context */
    }),
    twitterUser: context({
      /* Twitter user context */
    }),
    twitterThread: context({
      /* Twitter thread context */
    }),
    // ... 50+ more contexts
  },

  // Manually define every action
  actions: [
    action({ name: "send-discord-message" /* ... lots of code ... */ }),
    action({ name: "ban-discord-user" /* ... lots of code ... */ }),
    action({ name: "create-discord-channel" /* ... lots of code ... */ }),
    action({ name: "send-tweet" /* ... lots of code ... */ }),
    action({ name: "follow-twitter-user" /* ... lots of code ... */ }),
    // ... 100+ more actions
  ],

  // Manually set up all the inputs/outputs
  inputs: {
    "discord:message": input({
      /* Complex Discord API setup */
    }),
    "discord:reaction": input({
      /* More Discord API code */
    }),
    "twitter:mention": input({
      /* Complex Twitter API setup */
    }),
    // ... dozens more
  },

  // Plus manage all the API clients, authentication, etc.
  // This would be thousands of lines of code!
});
```

## The Solution: Extensions Package Everything

With extensions, complex features become simple one-liners:

```typescript title="simple-agent-building.ts"
// ✅ With extensions - clean and simple
const agent = createDreams({
  model: openai("gpt-4o"),

  extensions: [
    discord, // Hundreds of lines of Discord integration
    twitter, // Hundreds of lines of Twitter integration
  ],

  // Done! Everything just works
});
```

## Building Your First Extension

Let's build a simple weather extension step by step:

### 1. Define What Your Extension Does

```typescript title="weather-extension-plan.ts"
// Weather extension should provide:
// - Action to get current weather
// - Action to get weather forecast
// - Context to remember user's preferred location
// - Service to manage weather API client
```

### 2. Create the Service (API Management)

```typescript title="weather-service.ts"
import { service } from "@daydreamsai/core";

const weatherService = service({
  name: "weather",

  // How to create the weather API client
  register: (container) => {
    container.singleton("weatherClient", () => ({
      apiKey: process.env.WEATHER_API_KEY,
      baseUrl: "https://api.openweathermap.org/data/2.5",

      async getCurrentWeather(location: string) {
        const response = await fetch(
          `${this.baseUrl}/weather?q=${location}&appid=${this.apiKey}&units=metric`
        );
        return response.json();
      },

      async getForecast(location: string) {
        const response = await fetch(
          `${this.baseUrl}/forecast?q=${location}&appid=${this.apiKey}&units=metric`
        );
        return response.json();
      },
    }));
  },

  // Initialize when agent starts
  boot: async (container) => {
    const client = container.resolve("weatherClient");
    console.log("Weather service ready!");
  },
});
```

### 3. Create the Context (User Preferences)

```typescript title="weather-context.ts"
import { context } from "@daydreamsai/core";
import * as z from "zod/v4";

const weatherContext = context({
  type: "weather-preferences",
  schema: z.object({ userId: z.string() }),

  create: () => ({
    defaultLocation: null,
    units: "metric", // celsius by default
    lastChecked: null,
    favoriteLocations: [],
  }),

  render: (state) => `
User Weather Preferences:
- Default location: ${state.memory.defaultLocation || "Not set"}
- Units: ${state.memory.units}
- Favorite locations: ${state.memory.favoriteLocations.join(", ") || "None"}
- Last checked: ${state.memory.lastChecked || "Never"}
  `,
});
```

### 4. Create the Actions (What Agent Can Do)

```typescript title="weather-actions.ts"
import { action } from "@daydreamsai/core";
import * as z from "zod/v4";

const getCurrentWeatherAction = action({
  name: "get-current-weather",
  description: "Get the current weather for a location",
  schema: z.object({
    location: z.string().describe("City name, e.g., 'San Francisco, CA'"),
  }),

  handler: async ({ location }, ctx) => {
    const weatherClient = ctx.container.resolve("weatherClient");

    try {
      const weather = await weatherClient.getCurrentWeather(location);

      // Update user's context
      ctx.memory.lastChecked = new Date().toISOString();
      if (!ctx.memory.defaultLocation) {
        ctx.memory.defaultLocation = location;
      }

      return {
        success: true,
        location: weather.name,
        temperature: `${weather.main.temp}°C`,
        description: weather.weather[0].description,
        humidity: `${weather.main.humidity}%`,
        windSpeed: `${weather.wind.speed} m/s`,
      };
    } catch (error) {
      return {
        success: false,
        error: "Could not fetch weather data",
        message: error.message,
      };
    }
  },
});

const setDefaultLocationAction = action({
  name: "set-default-weather-location",
  description: "Set user's default location for weather",
  schema: z.object({
    location: z.string(),
  }),

  handler: async ({ location }, ctx) => {
    ctx.memory.defaultLocation = location;

    // Add to favorites if not already there
    if (!ctx.memory.favoriteLocations.includes(location)) {
      ctx.memory.favoriteLocations.push(location);
    }

    return {
      success: true,
      message: `Default location set to ${location}`,
    };
  },
});
```

### 5. Bundle Everything Into an Extension

```typescript title="weather-extension.ts"
import { extension } from "@daydreamsai/core";

export const weather = extension({
  name: "weather",

  // Services this extension needs
  services: [weatherService],

  // Contexts this extension provides
  contexts: {
    "weather-preferences": weatherContext,
  },

  // Actions this extension provides
  actions: [getCurrentWeatherAction, setDefaultLocationAction],

  // Optional: Run setup when extension is added
  install: async (agent) => {
    console.log("Weather extension installed!");
    // Could do additional setup here if needed
  },
});
```

### 6. Use Your Extension

```typescript title="weather-agent.ts"
import { createDreams } from "@daydreamsai/core";
import { weather } from "./weather-extension";

const agent = createDreams({
  model: openai("gpt-4o"),
  extensions: [weather],
});

await agent.start();

// Now your agent can:
// - Check weather for any location
// - Remember user's preferred locations
// - Set default locations for users
// - All with proper API management
```

## Extension Lifecycle

Here's what happens when your agent starts:

```text title="extension-lifecycle.txt"
1. Agent Creation
   └── Extensions added to agent.extensions[]

2. agent.start() called
   ├── For each extension:
   │   ├── Register all services
   │   ├── Merge contexts into agent
   │   ├── Merge actions into agent
   │   ├── Merge inputs into agent
   │   └── Merge outputs into agent
   │
   ├── Boot all services (connect to APIs, databases, etc.)
   │
   ├── Call extension.install() for each extension
   │
   └── Start all inputs (begin listening for events)

3. Agent Ready
   └── All extension features available to LLM
```

## Advanced Extension Features

### Inputs and Outputs

Extensions can also define how agents listen and respond:

```typescript title="weather-inputs-outputs.ts"
const weatherExtension = extension({
  name: "weather",

  // ... services, contexts, actions ...

  // Listen for weather-related events
  inputs: {
    "weather:alert": input({
      subscribe: (send, agent) => {
        // Listen for severe weather alerts
        const weatherClient = agent.container.resolve("weatherClient");

        setInterval(async () => {
          const alerts = await weatherClient.getAlerts();

          for (const alert of alerts) {
            send({
              type: "weather:alert",
              data: {
                type: alert.type,
                severity: alert.severity,
                location: alert.location,
                message: alert.message,
              },
            });
          }
        }, 60000); // Check every minute
      },
    }),
  },

  // Send weather notifications
  outputs: {
    "weather:notification": output({
      schema: z.object({
        message: z.string(),
        location: z.string(),
        urgency: z.enum(["low", "medium", "high"]),
      }),

      handler: async ({ message, location, urgency }, ctx) => {
        // Could send via email, SMS, Discord, etc.
        console.log(
          `[${urgency.toUpperCase()}] Weather alert for ${location}: ${message}`
        );

        // Could also trigger other actions based on urgency
        if (urgency === "high") {
          // Maybe send emergency notifications
        }
      },
    }),
  },
});
```

### Extension Dependencies

Extensions can depend on other extensions:

```typescript title="weather-discord-extension.ts"
import { discord } from "@daydreamsai/discord";
import { weather } from "./weather-extension";

const weatherDiscordBot = extension({
  name: "weather-discord-bot",

  // This extension requires both Discord and Weather
  services: [], // No additional services needed

  // Add a Discord-specific weather command
  actions: [
    action({
      name: "send-weather-to-discord",
      description: "Send weather info to a Discord channel",
      schema: z.object({
        channelId: z.string(),
        location: z.string(),
      }),

      handler: async ({ channelId, location }, ctx) => {
        // Use weather extension's client
        const weatherClient = ctx.container.resolve("weatherClient");
        const weather = await weatherClient.getCurrentWeather(location);

        // Use Discord extension's client
        const discordClient = ctx.container.resolve("discordClient");
        const channel = await discordClient.channels.fetch(channelId);

        await channel.send(
          `🌤️ Weather in ${location}: ${weather.main.temp}°C, ${weather.weather[0].description}`
        );

        return { success: true };
      },
    }),
  ],
});

// Use all three extensions together
const agent = createDreams({
  model: openai("gpt-4o"),
  extensions: [
    discord, // Provides Discord functionality
    weather, // Provides weather functionality
    weatherDiscordBot, // Combines both for Discord weather bot
  ],
});
```

## Best Practices

### 1. Focus on One Domain

```typescript title="focused-extension.ts"
// ✅ Good - focused on weather
const weather = extension({
  name: "weather",
  // All features related to weather
});

// ❌ Bad - mixing unrelated features
const everything = extension({
  name: "everything",
  // Weather + Discord + Trading + Gaming features mixed together
});
```

### 2. Provide Complete Functionality

```typescript title="complete-extension.ts"
// ✅ Good - provides everything needed for weather
const weather = extension({
  name: "weather",
  services: [weatherService], // API management
  contexts: { preferences: weatherContext }, // User preferences
  actions: [getCurrentWeather, setLocation], // Core functionality
  inputs: { alerts: weatherAlerts }, // Listen for alerts
  outputs: { notify: weatherNotify }, // Send notifications
});

// ❌ Bad - incomplete, missing key features
const incompleteWeather = extension({
  name: "weather",
  actions: [getCurrentWeather], // Only one action, no context or API management
});
```

### 3. Clear Service Dependencies

```typescript title="clear-dependencies.ts"
// ✅ Good - clear what services this extension needs
const trading = extension({
  name: "trading",
  services: [
    alpacaService, // For executing trades
    marketDataService, // For getting quotes
    riskService, // For risk management
  ],
  // ... rest of extension
});

// ❌ Bad - unclear dependencies
const trading = extension({
  name: "trading",
  services: [
    everythingService, // What does this provide?
  ],
});
```

### 4. Meaningful Names

```typescript title="meaningful-names.ts"
// ✅ Good - clear what each extension does
const discord = extension({ name: "discord" });
const weather = extension({ name: "weather" });
const tradingBot = extension({ name: "trading-bot" });

// ❌ Bad - unclear names
const ext1 = extension({ name: "ext1" });
const myStuff = extension({ name: "my-stuff" });
const helper = extension({ name: "helper" });
```

## Publishing Extensions

Once you've built an extension, you can share it:

### 1. Package Structure

```text title="extension-package.txt"
my-weather-extension/
├── src/
│   ├── services/
│   │   └── weather-service.ts
│   ├── contexts/
│   │   └── weather-context.ts
│   ├── actions/
│   │   ├── get-weather.ts
│   │   └── set-location.ts
│   ├── index.ts              # Export the extension
│   └── types.ts              # TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

### 2. Package.json

```json title="package.json"
{
  "name": "@yourorg/daydreams-weather",
  "version": "1.0.0",
  "description": "Weather extension for Daydreams agents",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@daydreamsai/core": "^1.0.0"
  },
  "dependencies": {
    "zod": "^3.0.0"
  }
}
```

### 3. Export Your Extension

```typescript title="src/index.ts"
export { weather } from "./weather-extension";
export type { WeatherData, WeatherAlert } from "./types";
```

### 4. Usage by Others

```typescript title="using-published-extension.ts"
import { createDreams } from "@daydreamsai/core";
import { weather } from "@yourorg/daydreams-weather";

const agent = createDreams({
  model: openai("gpt-4o"),
  extensions: [weather],
});
```

## Next Steps

* **[Extensions vs Services](/docs/core/advanced/extensions-vs-services)** -
  Understand when to use each
* **[Built-in Extensions](/docs/tutorials/examples)** - Explore existing
  extensions
* **[Discord Extension](/docs/tutorials/discord)** - See a complete extension
  example

## Key Takeaways

* **Extensions are feature packages** - Like apps for your agent
* **Bundle related functionality** - Contexts, actions, inputs, outputs together
* **Automatic lifecycle management** - Services boot, features register
  automatically
* **Reusable and shareable** - Build once, use everywhere
* **Clean agent configuration** - Add complex features with one line

Extensions let you build powerful agents by combining focused, reusable feature
packages.


file: ./content/docs/core/advanced/grpo-training-export.mdx
meta: {
  "title": "Training Data Export for GRPO",
  "description": "This guide explains how to export episodic memories as training data for Group Relative Policy Optimization (GRPO) using the Daydreams AI core package."
}
        
## What is GRPO Training?

GRPO (Group Relative Policy Optimization) is a reinforcement learning algorithm
designed to enhance reasoning capabilities in large language models. It
optimizes memory usage and is particularly effective for tasks requiring complex
problem-solving, such as:

* Mathematical reasoning
* Decision-making scenarios
* Step-by-step problem solving
* Game-based learning environments

**Key Benefits of GRPO:**

* Improves reasoning capabilities beyond standard fine-tuning
* Optimizes memory usage compared to traditional PPO
* Particularly effective for complex problem-solving tasks

## Workflow Overview

Your Daydreams agent can build reasoning traces for GRPO training by following
this structured workflow:

1. **Define Prompt Sources** - Use static datasets or interactive environments
2. **Generate Reasoning Traces** - Create completions that include thought
   processes
3. **Store and Save Data** - Export in JSONL format compatible with training
   tools

## Enabling Automatic Export

You can configure Daydreams to automatically export training data after each
episode:

```typescript
import { createDreams } from "@daydreamsai/core";

const agent = createDreams({
  model: openai("gpt-4-turbo"),
  exportTrainingData: true,
  trainingDataPath: "./grpo-training-data.jsonl", // Optional, defaults to "./training-data.jsonl"
  // ... other configuration options
});
```

**Note:** If you don't specify `trainingDataPath`, Daydreams will save the data
to `./training-data.jsonl` in your project root.

## Manual Export

You can manually export all episodes as training data:

```typescript
// Export using the default path from your agent configuration
await agent.exportAllTrainingData();

// Or specify a custom path
await agent.exportAllTrainingData("./custom-path/grpo-training-data.jsonl");
```

## Understanding the Data Format for GRPO

Daydreams exports training data in JSONL (JSON Lines) format, optimized for GRPO
training. Each line contains a JSON object with:

```json
{
  "prompt": "You are in a dark room with a door to the north.",
  "completion": "I need to find a way out. I should check if the door is locked.\n\nI found the door was unlocked and was able to exit the room."
}
```

The format includes:

* **prompt**: The observation or context provided to the agent
* **completion**: The agent's reasoning process and action results

For interactive environments, ensure completions include both reasoning and an
explicit action statement:

```json
{
  "prompt": "You are in a dark room with a door to the north.",
  "completion": "I need to find a way out. I should check if the door is locked.\n\nAction: try opening the door"
}
```

## Creating Custom Training Pairs for GRPO

For advanced use cases, you can create custom training data pairs specifically
designed for GRPO:

## Optimizing Data for GRPO Training

To maximize the effectiveness of your GRPO training data:

1. **Include diverse scenarios** - Ensure your agent encounters a variety of
   situations
2. **Capture step-by-step reasoning** - The completion should show the agent's
   thought process
3. **Format actions consistently** - Use patterns like "Action: \[action]" for
   easy parsing
4. **Balance task difficulty** - Include both simple and complex reasoning
   challenges

## Customizing the Export Format

If you need a different format for your specific GRPO training framework:

1. Create your own formatter function based on the Daydreams utilities
2. Process the episodic memories to match your required format
3. Save the data using your preferred file structure

**Example use case:** You might need to add additional metadata fields like task
difficulty or domain type to help with training organization.


file: ./content/docs/core/advanced/services.mdx
meta: {
  "title": "Services",
  "description": "Dependency Injection & Lifecycle Management."
}
        
## What Are Services?

Services are **infrastructure managers** for your agent. Think of them like the
utilities in a city - you don't think about electricity or water pipes, but
everything depends on them working properly.

## Real Examples

Here's what services handle in your agent:

### Database Connections

```typescript title="database-service.ts"
// Service manages database connection lifecycle
const databaseService = service({
  name: "database",

  register: (container) => {
    // HOW to create database connection
    container.singleton("db", () => new MongoDB(process.env.MONGODB_URI));
  },

  boot: async (container) => {
    // WHEN to connect (agent startup)
    const db = container.resolve("db");
    await db.connect();
    console.log("✅ Database connected!");
  },
});

// Now any action can use the database:
// const db = ctx.container.resolve("db");
// await db.collection("users").findOne({ id: userId });
```

### API Client Management

```typescript title="discord-service.ts"
// Service manages Discord client lifecycle
const discordService = service({
  name: "discord",

  register: (container) => {
    // HOW to create Discord client
    container.singleton(
      "discordClient",
      () =>
        new Discord.Client({
          intents: [Discord.GatewayIntentBits.Guilds],
          token: process.env.DISCORD_TOKEN,
        })
    );
  },

  boot: async (container) => {
    // WHEN to connect (agent startup)
    const client = container.resolve("discordClient");
    await client.login();
    console.log("✅ Discord bot online!");
  },
});

// Now any action can send Discord messages:
// const client = ctx.container.resolve("discordClient");
// await client.channels.get(channelId).send("Hello!");
```

## The Problem: Manual Connection Management

Without services, you'd have to manage connections manually in every action:

```typescript title="manual-connection-nightmare.ts"
// ❌ Without services - repeated connection code everywhere
const sendDiscordMessageAction = action({
  name: "send-discord-message",
  handler: async ({ channelId, message }) => {
    // Create new Discord client every time (slow!)
    const client = new Discord.Client({
      intents: [Discord.GatewayIntentBits.Guilds],
      token: process.env.DISCORD_TOKEN,
    });

    // Connect every time (slow!)
    await client.login();

    // Send message
    await client.channels.get(channelId).send(message);

    // Close connection
    await client.destroy();
  },
});

const banUserAction = action({
  name: "ban-user",
  handler: async ({ userId, guildId }) => {
    // Same connection code repeated (DRY violation!)
    const client = new Discord.Client({
      intents: [Discord.GatewayIntentBits.Guilds],
      token: process.env.DISCORD_TOKEN,
    });

    await client.login(); // Slow reconnection every time!

    const guild = await client.guilds.fetch(guildId);
    await guild.members.ban(userId);

    await client.destroy();
  },
});

// Problems:
// 🐌 Slow - reconnecting for every action
// 🔄 Repetitive - same connection code everywhere
// 💔 Unreliable - connection failures not handled
// 📈 Expensive - multiple connections to same service
```

## The Solution: Services Manage Infrastructure

With services, connections are created once and shared:

```typescript title="clean-service-solution.ts"
// ✅ With services - clean, fast, reliable

// 1. Service handles connection once
const discordService = service({
  name: "discord",
  register: (container) => {
    container.singleton(
      "discordClient",
      () =>
        new Discord.Client({
          intents: [Discord.GatewayIntentBits.Guilds],
          token: process.env.DISCORD_TOKEN,
        })
    );
  },
  boot: async (container) => {
    const client = container.resolve("discordClient");
    await client.login(); // Connect once at startup
  },
});

// 2. Actions just use the shared client
const sendDiscordMessageAction = action({
  name: "send-discord-message",
  handler: async ({ channelId, message }, ctx) => {
    // Get already-connected client (fast!)
    const client = ctx.container.resolve("discordClient");

    // Send message immediately (no connection delay)
    await client.channels.get(channelId).send(message);
  },
});

const banUserAction = action({
  name: "ban-user",
  handler: async ({ userId, guildId }, ctx) => {
    // Same client, no duplication (DRY!)
    const client = ctx.container.resolve("discordClient");

    const guild = await client.guilds.fetch(guildId);
    await guild.members.ban(userId);
  },
});

// Benefits:
// ⚡ Fast - client connected once at startup
// 🔄 DRY - no repeated connection code
// 💪 Reliable - connection managed centrally
// 💰 Efficient - one connection shared across actions
```

## How Services Work: The Container

Services use a **dependency injection container** - think of it like a storage
system for shared resources:

### Container Basics

```typescript title="container-example.ts"
import { createContainer } from "@daydreamsai/core";

const container = createContainer();

// Store things in the container
container.singleton("databaseUrl", () => process.env.DATABASE_URL);
container.singleton("database", (c) => new MongoDB(c.resolve("databaseUrl")));

// Get things from the container
const db = container.resolve("database");
await db.connect();
```

### Container Methods

```typescript title="container-methods.ts"
const container = createContainer();

// singleton() - Create once, reuse everywhere
container.singleton("apiClient", () => new ApiClient());
const client1 = container.resolve("apiClient");
const client2 = container.resolve("apiClient");
// client1 === client2 (same instance)

// register() - Create new instance each time
container.register("requestId", () => Math.random().toString());
const id1 = container.resolve("requestId");
const id2 = container.resolve("requestId");
// id1 !== id2 (different instances)

// instance() - Store pre-created object
const config = { apiKey: "secret123" };
container.instance("config", config);
const retrievedConfig = container.resolve("config");
// retrievedConfig === config (exact same object)

// alias() - Create alternative name
container.alias("db", "database");
const db = container.resolve("db"); // Same as resolve("database")
```

## Service Lifecycle

Services have two phases: **register** (setup) and **boot** (initialize):

```typescript title="service-lifecycle.ts"
const redisService = service({
  name: "redis",

  // Phase 1: REGISTER - Define how to create things
  register: (container) => {
    // Just define the factory functions
    container.singleton("redisConfig", () => ({
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    }));

    container.singleton(
      "redisClient",
      (c) => new Redis(c.resolve("redisConfig"))
    );

    console.log("📝 Redis service registered");
  },

  // Phase 2: BOOT - Actually connect/initialize
  boot: async (container) => {
    // Now connect to Redis
    const client = container.resolve("redisClient");
    await client.connect();

    // Test the connection
    await client.ping();

    console.log("🚀 Redis service booted and connected!");
  },
});

// Lifecycle order:
// 1. All services run register() first
// 2. Then all services run boot()
// 3. This ensures dependencies are available when needed
```

## Real-World Service Examples

### Trading Service

```typescript title="trading-service.ts"
const tradingService = service({
  name: "trading",

  register: (container) => {
    // Register trading client
    container.singleton(
      "alpacaClient",
      () =>
        new Alpaca({
          key: process.env.ALPACA_KEY,
          secret: process.env.ALPACA_SECRET,
          paper: process.env.NODE_ENV !== "production",
        })
    );

    // Register portfolio tracker
    container.singleton(
      "portfolio",
      (c) => new PortfolioTracker(c.resolve("alpacaClient"))
    );

    // Register risk manager
    container.singleton(
      "riskManager",
      () =>
        new RiskManager({
          maxPositionSize: 0.1, // 10% of portfolio
          stopLossPercent: 0.05, // 5% stop loss
        })
    );
  },

  boot: async (container) => {
    // Initialize connections
    const client = container.resolve("alpacaClient");
    await client.authenticate();

    const portfolio = container.resolve("portfolio");
    await portfolio.sync(); // Load current positions

    console.log("💰 Trading service ready!");
  },
});

// Now trading actions can use these:
const buyStockAction = action({
  name: "buy-stock",
  handler: async ({ symbol, quantity }, ctx) => {
    const client = ctx.container.resolve("alpacaClient");
    const riskManager = ctx.container.resolve("riskManager");

    // Check risk before buying
    if (riskManager.canBuy(symbol, quantity)) {
      return await client.createOrder({
        symbol,
        qty: quantity,
        side: "buy",
        type: "market",
      });
    } else {
      throw new Error("Risk limits exceeded");
    }
  },
});
```

### Logging Service

```typescript title="logging-service.ts"
const loggingService = service({
  name: "logging",

  register: (container) => {
    // Different loggers for different purposes
    container.singleton(
      "appLogger",
      () =>
        new Logger({
          level: process.env.LOG_LEVEL || "info",
          format: "json",
          transports: [new FileTransport("app.log"), new ConsoleTransport()],
        })
    );

    container.singleton(
      "actionLogger",
      () =>
        new Logger({
          level: "debug",
          prefix: "[ACTION]",
          transports: [new FileTransport("actions.log")],
        })
    );

    container.singleton(
      "errorLogger",
      () =>
        new Logger({
          level: "error",
          format: "detailed",
          transports: [
            new FileTransport("errors.log"),
            new SlackTransport(process.env.SLACK_WEBHOOK),
          ],
        })
    );
  },

  boot: async (container) => {
    const appLogger = container.resolve("appLogger");
    appLogger.info("🚀 Application starting up");
  },
});

// Actions can use appropriate logger:
const dangerousAction = action({
  name: "delete-user",
  handler: async ({ userId }, ctx) => {
    const actionLogger = ctx.container.resolve("actionLogger");
    const errorLogger = ctx.container.resolve("errorLogger");

    try {
      actionLogger.info(`Attempting to delete user ${userId}`);

      // ... deletion logic ...

      actionLogger.info(`Successfully deleted user ${userId}`);
    } catch (error) {
      errorLogger.error(`Failed to delete user ${userId}`, error);
      throw error;
    }
  },
});
```

## Service Dependencies

Services can depend on other services:

```typescript title="service-dependencies.ts"
// Base database service
const databaseService = service({
  name: "database",
  register: (container) => {
    container.singleton("db", () => new MongoDB(process.env.DB_URI));
  },
  boot: async (container) => {
    const db = container.resolve("db");
    await db.connect();
  },
});

// Cache service that depends on database
const cacheService = service({
  name: "cache",
  register: (container) => {
    // Redis for fast cache
    container.singleton("redis", () => new Redis(process.env.REDIS_URL));

    // Cache manager that uses both Redis and MongoDB
    container.singleton(
      "cacheManager",
      (c) =>
        new CacheManager({
          fastCache: c.resolve("redis"), // From this service
          slowCache: c.resolve("db"), // From database service
          ttl: 3600, // 1 hour
        })
    );
  },

  boot: async (container) => {
    const redis = container.resolve("redis");
    await redis.connect();

    const cacheManager = container.resolve("cacheManager");
    await cacheManager.initialize();

    console.log("💾 Cache service ready!");
  },
});

// Extensions can use both services
const dataExtension = extension({
  name: "data",
  services: [databaseService, cacheService], // Order doesn't matter

  actions: [
    action({
      name: "get-user",
      handler: async ({ userId }, ctx) => {
        const cache = ctx.container.resolve("cacheManager");

        // Try cache first
        let user = await cache.get(`user:${userId}`);

        if (!user) {
          // Cache miss - get from database
          const db = ctx.container.resolve("db");
          user = await db.collection("users").findOne({ _id: userId });

          // Store in cache for next time
          await cache.set(`user:${userId}`, user);
        }

        return user;
      },
    }),
  ],
});
```

## Advanced Patterns

### Environment-Based Services

```typescript title="environment-services.ts"
const storageService = service({
  name: "storage",
  register: (container) => {
    if (process.env.NODE_ENV === "production") {
      // Production: Use S3
      container.singleton(
        "storage",
        () =>
          new S3Storage({
            bucket: process.env.S3_BUCKET,
            region: process.env.AWS_REGION,
          })
      );
    } else {
      // Development: Use local filesystem
      container.singleton(
        "storage",
        () => new LocalStorage({ path: "./uploads" })
      );
    }
  },

  boot: async (container) => {
    const storage = container.resolve("storage");
    await storage.initialize();

    if (process.env.NODE_ENV === "production") {
      console.log("☁️ S3 storage ready");
    } else {
      console.log("📁 Local storage ready");
    }
  },
});
```

### Service Configuration

```typescript title="service-configuration.ts"
const notificationService = service({
  name: "notifications",
  register: (container) => {
    // Configuration
    container.singleton("notificationConfig", () => ({
      slack: {
        webhook: process.env.SLACK_WEBHOOK,
        channel: process.env.SLACK_CHANNEL || "#alerts",
      },
      email: {
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        from: process.env.EMAIL_FROM,
      },
      discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK,
      },
    }));

    // Notification clients
    container.singleton("slackNotifier", (c) => {
      const config = c.resolve("notificationConfig");
      return new SlackNotifier(config.slack);
    });

    container.singleton("emailNotifier", (c) => {
      const config = c.resolve("notificationConfig");
      return new EmailNotifier(config.email);
    });

    container.singleton("discordNotifier", (c) => {
      const config = c.resolve("notificationConfig");
      return new DiscordNotifier(config.discord);
    });

    // Unified notification manager
    container.singleton(
      "notificationManager",
      (c) =>
        new NotificationManager({
          slack: c.resolve("slackNotifier"),
          email: c.resolve("emailNotifier"),
          discord: c.resolve("discordNotifier"),
        })
    );
  },

  boot: async (container) => {
    const manager = container.resolve("notificationManager");
    await manager.testConnections();
    console.log("📢 Notification service ready!");
  },
});
```

## Best Practices

### 1. Single Responsibility

```typescript title="single-responsibility.ts"
// ✅ Good - each service handles one thing
const databaseService = service({
  name: "database",
  // Only database connection management
});

const cacheService = service({
  name: "cache",
  // Only caching functionality
});

const loggingService = service({
  name: "logging",
  // Only logging configuration
});

// ❌ Bad - one service doing everything
const everythingService = service({
  name: "everything",
  register: (container) => {
    // Database + cache + logging + API clients + notifications...
    // Too many responsibilities!
  },
});
```

### 2. Clear Dependencies

```typescript title="clear-dependencies.ts"
// ✅ Good - clear what this service provides
const authService = service({
  name: "auth",
  register: (container) => {
    container.singleton("jwtSecret", () => process.env.JWT_SECRET);
    container.singleton(
      "tokenManager",
      (c) => new TokenManager(c.resolve("jwtSecret"))
    );
    container.singleton(
      "userAuthenticator",
      (c) =>
        new UserAuthenticator({
          tokenManager: c.resolve("tokenManager"),
          database: c.resolve("db"), // Depends on database service
        })
    );
  },
});

// ❌ Bad - unclear what's provided
const helperService = service({
  name: "helper",
  register: (container) => {
    container.singleton("stuff", () => new Thing());
    container.singleton("helper", () => new Helper());
    // What do these do? How do they relate?
  },
});
```

### 3. Graceful Error Handling

```typescript title="error-handling.ts"
const apiService = service({
  name: "external-api",
  register: (container) => {
    container.singleton(
      "apiClient",
      () =>
        new ApiClient({
          baseUrl: process.env.API_URL,
          apiKey: process.env.API_KEY,
          timeout: 10000,
          retries: 3,
        })
    );
  },

  boot: async (container) => {
    try {
      const client = container.resolve("apiClient");
      await client.healthCheck();
      console.log("✅ External API connection verified");
    } catch (error) {
      console.error("❌ External API connection failed:", error.message);

      // Don't crash the agent - just log the error
      // Actions can handle API unavailability gracefully
      console.warn(
        "⚠️ Agent will start but external API features may be limited"
      );
    }
  },
});
```

### 4. Resource Cleanup

```typescript title="resource-cleanup.ts"
const databaseService = service({
  name: "database",
  register: (container) => {
    container.singleton("db", () => {
      const db = new MongoDB(process.env.DB_URI);

      // Register cleanup when process exits
      process.on("SIGINT", async () => {
        console.log("🔄 Closing database connection...");
        await db.close();
        console.log("✅ Database connection closed");
        process.exit(0);
      });

      return db;
    });
  },

  boot: async (container) => {
    const db = container.resolve("db");
    await db.connect();
  },
});
```

## Troubleshooting

### Missing Dependencies

```typescript title="missing-dependency-error.ts"
// Error: "Token 'databaseClient' not found in container"

// ❌ Problem - trying to resolve unregistered token
const action = action({
  handler: async (args, ctx) => {
    const db = ctx.container.resolve("databaseClient"); // Not registered!
  },
});

// ✅ Solution - ensure service registers the token
const databaseService = service({
  register: (container) => {
    container.singleton("databaseClient", () => new Database());
    //                  ^^^^^^^^^^^^^^ Must match resolve token
  },
});
```

### Circular Dependencies

```typescript title="circular-dependency-fix.ts"
// ❌ Problem - services depending on each other
const serviceA = service({
  register: (container) => {
    container.singleton("a", (c) => new A(c.resolve("b"))); // Needs B
  },
});

const serviceB = service({
  register: (container) => {
    container.singleton("b", (c) => new B(c.resolve("a"))); // Needs A
  },
});

// ✅ Solution - introduce a coordinator service
const coordinatorService = service({
  register: (container) => {
    container.singleton("a", () => new A());
    container.singleton("b", () => new B());
    container.singleton(
      "coordinator",
      (c) => new Coordinator(c.resolve("a"), c.resolve("b"))
    );
  },

  boot: async (container) => {
    const coordinator = container.resolve("coordinator");
    coordinator.wireComponents(); // Set up relationships after creation
  },
});
```

## Next Steps

* **[Extensions vs Services](/docs/core/advanced/extensions-vs-services)** -
  When to use services vs extensions
* **[Extensions Guide](/docs/core/advanced/extensions)** - Build complete
  feature packages
* **[Built-in Services](/docs/tutorials/examples)** - See real service examples

## Key Takeaways

* **Services manage infrastructure** - Database connections, API clients,
  utilities
* **Container provides shared access** - One connection used by all actions
* **Two-phase lifecycle** - Register (setup) then boot (initialize)
* **Dependency injection** - Components don't create their own dependencies
* **Clean separation** - Infrastructure separate from business logic

Services let you build reliable agents with proper resource management and clean
architecture.


file: ./content/docs/core/advanced/supabase.mdx
meta: {
  "title": "Supabase",
  "description": "This guide will walk you through creating an AI agent that utilizes supabase as the memory store."
}
        
## Using Supabase with Daydreams

Setup Info:

* Vector Model Provider: `gpt-4-turbo` via `@ai-sdk/openai`
* Model Provider: `google/gemini-2.0-flash-001` via
  `@openrouter/ai-sdk-provider`
* Memory Store: Supabase via `@daydreamsai/supabase`
* Communication method: Command Line via `@daydreamsai/cli`

Initialize a project and add our setup packages

```bash
bun init
bun add @daydreamsai/core @daydreamsai/supabase @daydreamsai/cli @ai-sdk/openai @openrouter/ai-sdk-provider
```

After installing the packages, go to
[https://supabase.com/](https://supabase.com/) and create a new project. Once
your project is created, you'll need to add the two environment variables
necessary for this package to your environment.

```bash
# Supabase
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_KEY

# Other variables used in this example
OPENROUTER_API_KEY=YOUR_SUPABASE_SERVICE_KEY
OPENAI_API_KEY=YOUR_OPENAI_KEY
OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
```

These variables are provided by Supabase when you create the project and can be
found in your project settings:Data API.

Next, you need to set up the necessary database structure for the agent's
memory. Copy the following SQL code block and paste in the Supabase SQL Editor
(found in the sidebar):

```sql
-- Enable the pgvector extension if it's not already enabled
-- This is crucial for vector similarity search used by SupabaseVectorStore
CREATE EXTENSION IF NOT EXISTS vector;

-- Function to enable pgvector extension (might be used internally by SupabaseVectorStore)
CREATE OR REPLACE FUNCTION enable_pgvector_extension()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
END;
$$;

-- Function to execute arbitrary SQL (potentially used by SupabaseVectorStore for initialization)
-- SECURITY DEFINER allows the function to run with the privileges of the user who defines it,
-- necessary for operations like creating tables or extensions if the calling user doesn't have direct permissions.
-- Ensure you understand the security implications before using SECURITY DEFINER.
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;
```

Afterards you should see a success message like "Success. No rows returned".

With the Supabase setup complete, let's create the agent in our `index.ts`:

```ts
// This example shows how to use Supabase with DaydreamsAI.

// Vector Model Provider: gpt-4-turbo                    via @ai-sdk/openai
// Model Provider:        google/gemini-2.0-flash-001    via @openrouter/ai-sdk-provider
// Memory Store:          @daydreamsai/supabase
// CLI Extension:         @daydreamsai/cli

import { openai } from "@ai-sdk/openai";
import {
  createContainer,
  createDreams,
  Logger,
  LogLevel,
  validateEnv,
} from "@daydreamsai/core";
import { createSupabaseBaseMemory } from "@daydreamsai/supabase";
import * as z from "zod/v4";
import { cliExtension } from "@daydreamsai/cli";
import { openrouter } from "@openrouter/ai-sdk-provider";

validateEnv(
  z.object({
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
    SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
    SUPABASE_SERVICE_KEY: z.string().min(1, "SUPABASE_SERVICE_KEY is required"),
  })
);

const agent = createDreams({
  container: createContainer(),
  logger: new Logger({ level: LogLevel.DEBUG }),
  model: openrouter("google/gemini-2.0-flash-001"),
  extensions: [cliExtension],
  memory: createSupabaseBaseMemory({
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_SERVICE_KEY!,
    memoryTableName: "agent",
    vectorTableName: "agentVectors",
    vectorModel: openai("gpt-4-turbo"),
  }),
});

// Agent starts
await agent.start();
```

Run the agent and chat via the command line interface!

```
bun run index.ts
```


file: ./content/docs/core/extra-reading/container.mdx
meta: {
  "title": "container.ts"
}
        
This file provides a system called a "Dependency Injection (DI) Container",
created using `createContainer()`. Its main job is to manage shared resources or
services that different parts of your agent might need, like a connection to an
external API, a database client, or the agent's logger. It ensures these
resources are created correctly and makes them easily accessible wherever
needed.

## How to Use

You generally **don't create or directly interact** with the container yourself
using `createContainer()`. The Daydreams framework creates one automatically
when you call `createDreams`.

* **Registering:** Services (defined using the `service` helper) or Extensions
  use the container's `register`, `singleton`, or `instance` methods internally
  to tell the container *how* to create or find a specific resource (e.g.,
  "Here's how to make the database client"). `singleton` is common for resources
  you only want one of (like a database connection).
* **Accessing:** When your `action` handler (or other component) needs to use a
  shared resource managed by the container, you access it through the `agent`
  object: `agent.container.resolve<ResourceType>('resourceName')`. For example,
  to get the logger, you might use `agent.container.resolve<Logger>('logger')`.

## Benefit

The container decouples your code. Your action handler doesn't need to know
*how* to create the database client or logger; it just asks the container for it
by name (`'database'`, `'logger'`). This makes your code cleaner, easier to
test, and simplifies managing shared resources, especially within extensions. If
the way a resource is created changes, you only need to update its registration,
not every place it's used.

## Anticipated Questions

* *"Do I need to call `createContainer()`?"* No, the agent created by
  `createDreams` already includes a pre-configured container available at
  `agent.container`.
* *"How do things get into the container?"* Typically through `ServiceProvider`
  definitions (created with the `service` helper), which are often bundled
  within `Extension`s. The service's `register` method puts things into the
  container. Core framework components like the default `Logger` are also
  registered automatically.
* *"What's the difference between `register` and `singleton`?"* When
  registering, `singleton` ensures only *one instance* of the resource is ever
  created and shared. `register` creates a *new instance* every time `resolve`
  is called for that name (less common for shared resources).


file: ./content/docs/core/extra-reading/context.mdx
meta: {
  "title": "context.ts"
}
        
This file provides the essential `context` function, which you use to define
different "modes" or "workspaces" for your agent. Think of each context
definition as a blueprint for a specific task or interaction type, like handling
a chat conversation, managing a game, or performing a specific workflow. Each
active instance of a context (e.g., a specific chat session) gets its own
separate memory and state.

## How to Use

You'll typically define your contexts in separate files using the
`context({...})` function and then pass these definitions to `createDreams`. Key
things you define inside `context({...})`:

* `type`: A unique name for this type of context (e.g., `"chat"`,
  `"projectBoard"`).
* `schema`: (Using Zod) Defines the arguments needed to identify a *specific
  instance* of this context (e.g., `{ sessionId: z.string() }` for a chat).
* `create`: A function that returns the initial structure and default values for
  this context's persistent memory (`ctx.memory`). This runs the first time an
  instance is accessed.
* `render`: (Optional) A function that formats the current state (`ctx.memory`)
  of an instance into text (or XML) for the AI model to understand the current
  situation within that specific workspace.
* `actions`, `inputs`, `outputs`: (Optional, often added via `.setActions()`,
  etc.) Link specific tools (Actions), data sources (Inputs), and response
  methods (Outputs) directly to this context type.

## Benefit

Contexts allow your agent to manage multiple tasks or interactions
simultaneously without getting confused. Each context instance has its own
dedicated memory (`ctx.memory`) where it stores relevant information (like chat
history or task lists) persistently. The `render` function ensures the AI model
gets only the relevant state for the specific task it's working on at that
moment. Associating actions/inputs/outputs keeps your agent's capabilities
organized.

## Anticipated Questions

* *"What's the difference between context memory (`ctx.memory`) and working
  memory?"* `ctx.memory` is the *persistent* storage for a specific context
  instance (like chat history saved to a database). *Working memory* is
  *temporary* storage used during a single agent run cycle to track the steps
  (inputs, thoughts, actions) of that specific interaction.
* *"How do I identify a specific chat session if I have multiple?"* You use the
  `schema` you define to pass identifying arguments (like a `sessionId`) when
  calling `agent.run` or `agent.send`. The optional `key` function in the
  context definition helps create truly unique IDs if needed (e.g.,
  `chat:session-xyz`).
* *"How does the AI know what happened in this specific chat?"* The `render`
  function you define formats the relevant parts of `ctx.memory` (e.g., recent
  messages) and includes it in the prompt sent to the AI model for that specific
  context instance.


file: ./content/docs/core/extra-reading/dreams.mdx
meta: {
  "title": "dreams.ts"
}
        
This file provides the `createDreams` function, which is the main entry point
for building your Daydreams agent. Think of it as the constructor or blueprint
for your AI assistant. It takes all your configurations (like which AI model to
use, what tools it has, how it remembers things) and assembles them into a
ready-to-run agent.

## How to Use

You'll call `createDreams({...})` once in your project setup, passing it a
configuration object. This object specifies:

* `model`: Which language model (like OpenAI's GPT or Anthropic's Claude) the
  agent should use for thinking (using providers from the Vercel AI SDK).
* `extensions`: Pre-built packages of functionality (like Discord integration or
  file system access) you want your agent to have.
* `contexts`: Custom definitions for different tasks or conversations your agent
  needs to manage.
* `actions`: Custom tools or abilities you define for your agent.
* `memory`: How the agent should store and recall information (e.g., using
  in-memory storage or a database like MongoDB).
* *(and other optional configurations)*

The function returns an `agent` object. You'll then typically call
`await agent.start()` to initialize it and `agent.send(...)` or `agent.run(...)`
to give it tasks or information to process.

## Benefit

It provides a single, organized way to configure and initialize your entire
agent. Instead of manually wiring up all the different parts (model, memory,
tools), `createDreams` handles the setup and dependencies, letting you focus on
defining your agent's capabilities and behavior.

## Anticipated Questions

* *"Do I need to provide all configuration options?"* No, many options have
  sensible defaults (like basic memory storage). You typically only need to
  provide the `model` and any `extensions` or custom `actions`/`contexts` you
  want to use.
* *"What's the difference between `agent.send()` and `agent.run()`?"*
  `agent.send()` is typically used when an external event happens (like a user
  sending a message), providing the input data. `agent.run()` is the underlying
  method that processes information, reasons, and takes action; `send` usually
  calls `run` internally.
* *"Where do I define things like actions and contexts?"* You usually define
  them in separate files and import them into your main setup file where you
  call `createDreams`.


file: ./content/docs/core/extra-reading/formatters.mdx
meta: {
  "title": "formatters.ts"
}
        
This file contains helper functions that translate the agent's internal data
(like your action definitions, context state, and logs) into the structured XML
format the AI model expects to see in its prompt. It also helps format Zod
schemas into JSON schemas for the prompt.

## How it Affects You

You don't need to call functions like `formatAction` or `formatContextState`
directly. The framework uses them automatically when preparing the prompt for
the AI model during each step of an `agent.run`. For example:

* When you define an `action` with a description and schema, `formatAction`
  converts that definition into the `<action>` XML block seen in the prompt.
* When you define a `render` function for your `context`, the output of your
  function is placed inside the `<state>` tag within the `<context>` XML block
  generated by `formatContextState`.
* The `formatSchema` function ensures the Zod schemas you define for actions,
  outputs, etc., are translated into a format the AI model can understand within
  the prompt's `<schema>` tags.

## Benefit

These formatters ensure that all the information the agent needs to give the AI
model (available tools, current state, recent history) is presented in a
consistent, structured way (XML) that the model is trained to understand. This
standardization makes the communication between your agent's code and the AI
model reliable. You don't have to worry about manually creating complex XML
prompts.

## Anticipated Questions

* *"Do I need to write XML?"* No. You define your components using
  JavaScript/TypeScript objects (via helpers like `action`, `context`, etc.).
  These formatters handle the conversion to XML automatically before sending the
  prompt to the AI.
* *"Why does Daydreams use XML in prompts?"* XML provides a clear way to
  structure complex information (like nested states, lists of tools with
  descriptions and schemas) for the AI model, making it easier for the model to
  parse and understand the different parts of the prompt.
* *"What is the `render` function in this file used for?"* It's primarily used
  internally by the framework to assemble the main prompt template by inserting
  the formatted XML blocks (like actions, contexts, logs) into the correct
  placeholders.


file: ./content/docs/core/extra-reading/handlers.mdx
meta: {
  "title": "handlers.ts"
}
        
This file holds the internal "handlers" that the Daydreams agent uses during its
execution cycle (`agent.run`). When the agent receives input, or when the AI
model decides to call an action or send an output, the functions in this file
are responsible for processing those requests correctly. Think of it as the
agent's internal dispatcher and validator.

## How it Affects You

You don't call functions from this file directly. It works behind the scenes,
but it's where several important things happen based on how you defined your
actions, inputs, and outputs:

* **Validation:** When the AI model provides arguments for your `action` or
  content/attributes for your `output`, the code here validates that data
  against the `schema` you defined using Zod. If the validation fails, it
  prevents your `handler` code from running with bad data.
* **Parsing:** It parses the arguments/content provided by the AI model (which
  might be in JSON or XML format) into a usable JavaScript object/value before
  passing it to your `handler`.
* **Template Resolution:** If you use templates like `{{calls[0].someValue}}` in
  your action arguments (as described in [Prompting](/docs/concepts/prompting)),
  the `resolveTemplates` function here handles resolving those values *before*
  your action's `handler` is called.
* **Handler Execution:** It prepares the necessary context (including the
  correct memory scopes like `ctx.memory` or `ctx.actionMemory`) and then calls
  the specific `handler` function you wrote in your `action`, `input`, or
  `output` definition. For actions, it uses the `TaskRunner` to queue the
  execution.
* **Error Handling:** It defines specific errors like `NotFoundError` (if the AI
  calls a non-existent action/output) and `ParsingError` (if validation fails).

## Benefit

These handlers ensure that the interaction between the AI model's requests and
your custom code (in action/output/input handlers) is safe, validated, and
correctly contextualized. It bridges the gap between the AI's structured text
output and the execution of your JavaScript/TypeScript functions, handling
potential errors and data transformations along the way.

## Anticipated Questions

* *"Is this where my `action`'s `handler` function actually runs?"* Yes,
  functions in this file (specifically `handleActionCall` which uses `runAction`
  from `tasks/index.ts`) are responsible for preparing the context and
  ultimately calling the `handler` you defined for your action (via the
  `TaskRunner`).
* *"What happens if the AI provides arguments that don't match my action's Zod
  schema?"* The validation logic within `prepareActionCall` in this file will
  catch the mismatch, throw a `ParsingError`, and prevent your action's
  `handler` from being called with invalid data.
* *"How does the agent know which specific context's memory (`ctx.memory`) to
  give my action handler?"* The logic here (within functions like
  `prepareActionCall` and `handleOutput`) identifies the correct `ContextState`
  based on the current run and makes its `memory` available in the `ctx` object
  passed to your handler.


file: ./content/docs/core/extra-reading/http.mdx
meta: {
  "title": "http.ts"
}
        
This file provides a convenient helper object named `http` for making network
requests to external APIs or web services from within your agent's actions. It's
essentially a smarter version of the standard web `fetch` command.

## How to Use

When you write an `action` handler that needs to fetch data from or send data to
an external API, you can import and use this `http` object.

* For simple GET requests expecting JSON data:

  ```typescript
  import { http } from "@daydreamsai/core";

  // Inside an action handler:
  try {
    const data = await http.get.json<{ someField: string }>(
      "https://api.example.com/data?id=123"
    );
    console.log(data.someField);
    return { success: true, result: data };
  } catch (error) {
    console.error("API call failed:", error);
    return { success: false, error: "API failed" };
  }
  ```

* For POST requests sending JSON data:

  ```typescript
  import { http } from "@daydreamsai/core";

  // Inside an action handler:
  const payload = { name: "Widget", value: 42 };
  try {
    const response = await http.post.json(
      "https://api.example.com/create",
      payload
    );
    return { success: true, id: response.id };
  } catch (error) {
    // ... handle error ...
  }
  ```

* It also includes helpers for specific protocols like `http.jsonrpc(...)` and
  `http.graphql(...)`.

## Benefit

* **Automatic Retries:** The key benefit is built-in automatic retries. If a
  network request fails due to a temporary network issue or a specific server
  error (like 500 or 503), the `http` helper will automatically wait a bit and
  try the request again a few times before giving up. This makes your actions
  more resilient to temporary glitches.
* **Convenience:** Provides shortcuts for common tasks like setting JSON
  headers, parsing JSON responses, and adding query parameters (`params`
  option).

## Anticipated Questions

* *"Do I have to use this instead of `fetch`?"* No, you can still use the
  standard `fetch` API directly in your actions if you prefer. However, using
  the `http` helper gives you the automatic retry logic for free.
* *"How do I set custom headers (like Authorization)?"* You can pass standard
  `fetch` options (like `headers`) as the last argument to the `http` methods
  (e.g.,
  `http.get.json(url, params, { headers: { 'Authorization': 'Bearer ...' } })`).


file: ./content/docs/core/extra-reading/introduction.mdx
meta: {
  "title": "introduction"
}
        
# The Git-Gud Guide to Daydreams

This started out as a collection of notes from a hobbyist developer trying to
understand the `@daydreamsai/core` package more deeply. The goal isn't to be an
exhaustive API reference, but rather a practical guide – "extra reading" – to
help you grasp the purpose and role of the key TypeScript files that make up the
core framework.

## What's Here?

Each page in this section dives into a specific Typescript file from the core
library. You'll find explanations focusing on:

* **What it is:** A high-level description of the file's purpose.
* **How it Affects You / How to Use:** Practical information on whether you
  interact with it directly and how it fits into building your agent.
* **Benefit:** Why this component exists and what advantages it offers.
* **Anticipated Questions:** Answers to common questions a developer might have
  when encountering this part of the framework.

## How to Approach It

Think of these pages as supplementary material to the main concepts and
tutorials. If you're wondering *why* something works the way it does in
Daydreams, or what's happening under the hood when you make a call or define an
action, browsing the relevant file explanations here might provide valuable
context.

You can start by using the search or dive into specific files as you encounter
them in your development.


file: ./content/docs/core/extra-reading/logger.mdx
meta: {
  "title": "logger.ts"
}
        
This file provides the `Logger` class used throughout the Daydreams framework
for recording informational messages, warnings, and errors that occur during
agent execution. It helps you understand what your agent is doing and diagnose
problems.

## How to Use

You don't typically create a `Logger` instance yourself. The agent object
returned by `createDreams` already has a pre-configured logger available at
`agent.logger`. You use this instance inside your `action` handlers, `context`
lifecycle methods, or `service` definitions to log relevant information:

```typescript
import {
  action,
  type ActionCallContext,
  type AnyAgent,
} from "@daydreamsai/core";

export const myAction = action({
  name: "processData",
  // ... schema ...
  async handler(args, ctx: ActionCallContext, agent: AnyAgent) {
    // Log informational message
    agent.logger.info("processData:handler", "Starting data processing", {
      inputArgs: args,
    });

    try {
      // ... do some work ...
      const result = { status: "completed" };
      // Log successful completion (at debug level)
      agent.logger.debug("processData:handler", "Processing successful", {
        result,
      });
      return result;
    } catch (error) {
      // Log an error
      agent.logger.error("processData:handler", "Processing failed!", {
        error,
      });
      throw error; // Re-throw or handle error
    }
  },
});
```

* Common methods are `agent.logger.info()`, `agent.logger.warn()`,
  `agent.logger.error()`, `agent.logger.debug()`, and `agent.logger.trace()`.
* Each method takes a `context` string (often the function/component name), a
  `message` string, and optional `data` object.

## Benefit

Provides a standard way to record what's happening inside your agent. This is
crucial for:

* **Debugging:** Seeing the flow of execution, variable values, and errors.
* **Monitoring:** Understanding how your agent is performing in production.
* **Auditing:** Keeping a record of important events or decisions. The default
  logger prints messages to the console with timestamps, levels, and context,
  making it easy to follow along.

## Anticipated Questions

* *"How can I change the logging level (e.g., see DEBUG messages)?"* You can set
  the `logLevel` option when calling `createDreams`. For example:
  `createDreams({ ..., logLevel: LogLevel.DEBUG })`. The levels are `ERROR`,
  `WARN`, `INFO`, `DEBUG`, `TRACE` (most verbose).
* *"Can I send logs somewhere other than the console?"* Yes, the logger is
  designed with "transports". While the default is `ConsoleTransport`, you could
  potentially implement custom transports (though this is an advanced topic not
  covered here) and provide them via the `logger` or `transports` option in
  `createDreams`.
* *"Why provide a `context` string (like `'processData:handler'`)?"* It helps
  identify *where* in the code the log message originated, which is very useful
  for debugging complex agents.


file: ./content/docs/core/extra-reading/memory.mdx
meta: {
  "title": "memory.ts"
}
        
These files define the agent's memory system. `base.ts` provides the fundamental
building blocks: `MemoryStore` for saving and loading the persistent state of
your contexts (like chat history), and `VectorStore` for storing "episodic
memories" (learned experiences) using vector embeddings for later recall.
`utils.ts` contains helpers, primarily for automatically generating those
episodic memories using an LLM.

## How to Use

You configure the agent's memory system via the `memory` option when calling
`createDreams`.

* You typically provide implementations for `MemoryStore` and `VectorStore`.
* The core package provides simple defaults: `createMemoryStore()` (stores data
  in memory, lost on restart) and `createVectorStore()` (does nothing).
* For real persistence, you'll import and use implementations from other
  Daydreams packages, like `@daydreamsai/mongo` for MongoDB
  (`createMongoMemoryStore`) or `@daydreamsai/chroma` for ChromaDB
  (`createChromaVectorStore`).
* The `createMemory` function (exported from `base.ts`) is used to bundle your
  chosen store implementations together for the `memory` option.

```typescript
import { createDreams, createMemory } from '@daydreamsai/core';
// Import specific store implementations
import { createMongoMemoryStore } from '@daydreamsai/mongo';
import { createChromaVectorStore } from '@daydreamsai/chroma';

const agent = createDreams({
  model: /* ... */,
  memory: createMemory(
    // Use MongoDB for context state
    await createMongoMemoryStore({ uri: 'mongodb://...' }),
    // Use ChromaDB for episodic memory/vector search
    createChromaVectorStore('my-agent-episodes')
  ),
  // Optional: Enable automatic episodic memory generation
  // generateMemories: true,
  // vectorModel: openai('text-embedding-3-small') // Model for embeddings
});
```

* Episodic memory generation (from `utils.ts`) happens automatically in the
  background if you set `generateMemories: true` in the agent config and provide
  a `VectorStore`.

## Benefit

Allows your agent to have both persistent state (remembering conversations or
task progress across restarts via `MemoryStore`) and the ability to learn from
past interactions (recalling relevant experiences via `VectorStore` and episodic
memory). You can choose storage backends suitable for your needs (simple
in-memory for testing, robust databases for production).

## Anticipated Questions

* *"Do I need both MemoryStore and VectorStore?"* `MemoryStore` is essential for
  saving the state of your `context` instances (like `ctx.memory`).
  `VectorStore` is only needed if you want the agent to use episodic memory
  (learning from past interactions using embeddings). You can use the default
  `createVectorStore()` if you don't need episodic memory.
* *"What is episodic memory?"* It's a feature where the agent summarizes
  sequences of thought -> action -> result into "episodes". These are stored as
  vector embeddings. When the agent encounters a new situation, it can search
  its `VectorStore` for similar past episodes to potentially inform its current
  reasoning. (Requires `generateMemories: true` and a `VectorStore`).
* *"Where does `ctx.memory` get saved?"* The agent automatically saves the
  `memory` property of your `ContextState` instances to the configured
  `MemoryStore` at the end of each run cycle.


file: ./content/docs/core/extra-reading/package-managers.mdx
meta: {
  "title": "package managers"
}
        
It's worth mentioning the role of a good package manager, especially for rapid
development and monorepos. Wondering which one to use? The simple answer:
**[Bun](https://bun.sh/package-manager)**

## **Why?**

For the hobbyist developer, Bun offers several compelling advantages:

* **Speed:** Bun reduces wait time for installing dependencies, running scripts,
  and starting your application/agent.

* **Simplicity:** Bun acts as a runtime, package manager, bundler, and test
  runner rolled into one. This eliminates the need to learn, configure, and
  manage multiple separate tools. Keep it clean.

* **Ease of Use:** No more needing separate compilation steps (`tsc`) before
  running your code (`node index.js`). Bun runs TypeScript directly.

Essentially, Bun lets hobbyists focus more on building cool things and less on
wrangling complex development toolchains.


file: ./content/docs/core/extra-reading/prompt.mdx
meta: {
  "title": "prompt.ts"
}
        
This file offers general tools for working with prompt templates and parsing
structured (XML) responses, separate from the main agent prompt defined in
`prompts/main.ts`. It provides `createPrompt` for making reusable prompt
templates and `createParser` for defining how to extract data from XML text into
a specific JavaScript object structure.

## How to Use

While the core agent loop uses its own specific prompt, you might use these
helpers in more advanced scenarios, perhaps within an `action` handler:

* `createPrompt`: If an action needs to call *another* LLM for a sub-task, you
  could use `createPrompt` to define a reusable template for that specific
  sub-task prompt.

  ```typescript
  import { createPrompt } from "@daydreamsai/core";

  const summarizeTemplate = createPrompt<{ textToSummarize: string }>(
    "Please summarize the following text concisely:\n{{textToSummarize}}"
  );

  // Later, in an action handler:
  const subTaskPrompt = summarizeTemplate({ textToSummarize: someLongText });
  // const summary = await callAnotherLLM(subTaskPrompt);
  ```

* `createParser`: If an action receives a complex XML response from an external
  system (or perhaps even from a specialized LLM call), you could use
  `createParser` to define precisely how to extract the necessary data from the
  XML tags into a structured JavaScript object.

## Benefit

Provides flexible utilities for developers who need to implement custom prompt
generation or response parsing logic within their actions or extensions, beyond
the standard agent interaction loop. `createPrompt` helps manage reusable prompt
strings, and `createParser` offers a structured way to handle custom XML parsing
needs.

## Anticipated Questions

* *"Is this the main prompt the agent uses?"* No, the main prompt template and
  its formatting logic are primarily defined in
  `packages/core/src/prompts/main.ts`. This file (`prompt.ts`) provides more
  general, optional tools for custom prompt/parsing scenarios.
* *"When would I need `createParser`?"* It's less common, but potentially useful
  if an action interacts with a system that returns data in a specific XML
  format, and you want a structured way to extract information based on tag
  names.


file: ./content/docs/core/extra-reading/providers-api.mdx
meta: {
  "title": "providers/api.ts"
}
        
This file provides helper functions for interacting with external APIs within
your agent's actions or services. The main exported function is `fetchGraphQL`,
designed specifically to simplify making requests to GraphQL APIs.

## How to Use

If you need to query a GraphQL endpoint from an `action` handler, you can import
`fetchGraphQL` from `@daydreamsai/core`.

```typescript
import { action, fetchGraphQL } from "@daydreamsai/core";
import type { AnyAgent, ActionCallContext } from "@daydreamsai/core";

const GRAPHQL_ENDPOINT = "https://api.example.com/graphql";

interface UserData {
  user: { id: string; name: string };
}

export const getUserAction = action({
  name: "getUserData",
  schema: z.object({ userId: z.string() }),
  async handler(args, ctx: ActionCallContext, agent: AnyAgent) {
    const query = `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
        }
      }
    `;
    const variables = { id: args.userId };

    try {
      const result = await fetchGraphQL<UserData>(
        GRAPHQL_ENDPOINT,
        query,
        variables
      );

      if (result instanceof Error) {
        agent.logger.error("getUserAction", "GraphQL query failed", {
          error: result.message,
        });
        return { success: false, error: result.message };
      }

      agent.logger.info("getUserAction", "Got user data", {
        user: result.user,
      });
      return { success: true, userData: result.user };
    } catch (error) {
      agent.logger.error("getUserAction", "Fetch failed", { error });
      return { success: false, error: "Network error" };
    }
  },
});
```

## Benefit

`fetchGraphQL` handles the boilerplate of setting up a GraphQL POST request
(setting headers, stringifying the query and variables). It also provides basic
error handling, returning an `Error` object if the GraphQL response indicates
errors, which you can check for using `instanceof Error`. This makes interacting
with GraphQL APIs from your actions cleaner and less error-prone than using
`fetch` directly for this specific case.

## Anticipated Questions

* *"Is there a helper for REST APIs?"* While `api.ts` contains a `fetchRest`
  function, it doesn't seem to be exported directly via `@daydreamsai/core`. For
  general REST calls, you would typically use the `http` helper object (from
  `http.ts`) which provides automatic retries, or the standard `fetch` API.
* *"How does this differ from the `http` helper?"* The `http` object provides
  general-purpose HTTP request helpers (GET, POST, JSON) with automatic retries.
  `fetchGraphQL` is specifically tailored for the GraphQL protocol, formatting
  the request body correctly and performing basic GraphQL-specific error checks
  on the response.


file: ./content/docs/core/extra-reading/serviceProvider.mdx
meta: {
  "title": "serviceProvider.ts"
}
        
This file provides the `service` helper function, which you use to define how
shared resources or external clients (like an API client, database connection,
or special utility) should be managed by the Daydreams framework. It ensures
these services are set up correctly and are ready to use when your agent needs
them.

## How to Use

You typically define a service in its own file using `service({...})` and then
include it in an `Extension`. Inside the `service({...})` call, you can define:

* `register(container)`: (Optional) A function where you tell the agent's DI
  Container (`agent.container`) how to create this service instance. Often,
  you'll use
  `container.singleton('serviceName', () => new MyServiceClient(...))` here to
  ensure only one instance is created.
* `boot(container)`: (Optional) An `async` function where you perform any
  necessary initialization *after* all services have been registered (e.g.,
  connecting to the API using credentials maybe resolved from the container).
  This runs when `agent.start()` is called.

```typescript
import { service, type Container } from "@daydreamsai/core";

// Assume MyApiClient class exists
declare class MyApiClient {
  constructor(config: { url: string });
  connect(): Promise<void>;
}

export const myApiService = service({
  register(container: Container) {
    // Tell the container how to create the client (as a singleton)
    container.singleton(
      "myApiClient",
      () => new MyApiClient({ url: "https://api.example.com" })
    );
  },
  async boot(container: Container) {
    // Initialize the client after registration
    const client = container.resolve<MyApiClient>("myApiClient");
    await client.connect();
    console.log("My API Client connected!");
  },
});

// Typically, you would then include `myApiService` in an extension's `services` array.
```

## Benefit

Defining services this way ensures proper setup and teardown, especially for
resources needing asynchronous initialization (`boot`). It integrates smoothly
with the DI Container, making services easily accessible via
`agent.container.resolve('serviceName')` in your actions or other components,
without them needing to know the setup details. Bundling services in Extensions
makes them reusable.

## Anticipated Questions

* *"When should I use a `service` vs just putting logic in an `action`?"* Use a
  `service` for shared, reusable components, especially those managing
  connections to external systems or requiring specific setup/initialization
  steps (`boot`). Actions are better for defining specific *tasks* the agent can
  perform, which might *use* one or more services obtained from the container.
* *"What's the difference between `register` and `boot`?"* `register` runs first
  and only tells the container *how* to create the service. `boot` runs later
  (during `agent.start()`) and performs the actual initialization (like
  connecting), potentially using other services that were registered earlier.
* *"Do I need to call `createServiceManager()`?"* No, this is handled internally
  by `createDreams`. You just define your services using the `service` helper.


file: ./content/docs/core/extra-reading/tasks.mdx
meta: {
  "title": "task.ts"
}
        
These files define the system (`TaskRunner`) that manages how your agent runs
asynchronous operations, especially the `handler` functions inside your custom
`action` definitions. Think of it as a queue manager that prevents your agent
from trying to do too many things at once, particularly when actions involve
waiting for external APIs or services.

## How it Affects You

You don't directly use the `TaskRunner` or the `task` function yourself.
However, its existence impacts how you write your `action` handlers:

* **Concurrency:** By default, the agent only runs a few action handlers
  simultaneously (e.g., 3). If the AI model asks the agent to perform many
  actions quickly, some will wait in a queue managed by the `TaskRunner` before
  they start executing. This prevents overwhelming external services.
* **Asynchronous Code:** Because actions are run through this system, your
  `action` handlers **must** use `async` and `await` correctly if they perform
  any operations that take time (like network requests `fetch`, database calls,
  or even just `setTimeout`). The `TaskRunner` waits for the `Promise` returned
  by your `async handler` to finish.
* **Retries:** You can add a `retry` option when defining an `action`. If the
  action's handler fails (throws an error), the `TaskRunner` will automatically
  try running it again a few times. If you use this, try to make your handler
  logic *idempotent* (safe to run multiple times with the same input).
* **Cancellation:** Long-running actions should check for cancellation signals.
  Inside your `action` handler, the `ctx` object contains an `abortSignal`. You
  should check `ctx.abortSignal.aborted` periodically in long loops or
  before/after long waits and stop execution if it's `true`. This allows the
  agent's overall run to be cancelled cleanly if needed.

## Benefit

The `TaskRunner` automatically handles concurrency limits and retries for your
actions, making your agent more stable and preventing it from accidentally
overloading external systems you interact with. It ensures asynchronous
operations are managed correctly within the agent's lifecycle.

## Anticipated Questions

* *"Do I need to create a `TaskRunner`?"* No, `createDreams` creates one for you
  automatically with default settings.
* *"How do I know when my action handler actually runs?"* It runs shortly after
  the AI model calls the action, but it might be delayed slightly if the
  `TaskRunner`'s queue is busy with other actions. Use `agent.logger` inside
  your handler to see when it starts and finishes.
* *"What if my action needs to run for a very long time?"* Make sure to
  implement the cancellation check using `ctx.abortSignal.aborted` so the agent
  can stop it if necessary.


file: ./content/docs/core/extra-reading/types.mdx
meta: {
  "title": "types.ts"
}
        
This file acts as the central dictionary for all the data structures used within
the Daydreams framework. It defines the specific "shape" (using TypeScript types
and interfaces) that different pieces of data should have, such as what
information defines an `Action`, what goes into a `Context`, or what the `Agent`
object looks like.

## How to Use

You generally **don't need to change** this file. However, you'll interact with
the types defined here frequently when writing your agent code:

* **Type Hints:** When defining the `handler` for your `action`, `input`, or
  `output`, you'll often use types imported from `@daydreamsai/core` (which
  ultimately come from this file) to get auto-completion and type safety for the
  arguments passed to your function (like the `args`, `ctx`, and `agent`
  parameters).

  ```typescript
  import {
    action,
    type ActionCallContext,
    type AnyAgent,
  } from "@daydreamsai/core";
  import * as z from "zod/v4";

  // Define the memory structure for a specific context
  interface MyChatMemory {
    history: { role: "user" | "agent"; text: string }[];
  }

  // Use ActionCallContext with your memory type for the 'ctx' parameter
  export const myAction = action({
    name: "reply",
    schema: z.object({ message: z.string() }),
    handler: async (
      args,
      ctx: ActionCallContext<any, any, MyChatMemory>,
      agent: AnyAgent
    ) => {
      // Now, ctx.memory is correctly typed as MyChatMemory
      ctx.memory.history.push({ role: "agent", text: args.message });
      // agent parameter is typed as AnyAgent
    },
  });
  ```

* **Defining Memory:** When you define a `context`, you'll often create an
  `interface` for its specific memory structure (like `MyChatMemory` above).
  This interface defines the shape of the data stored in `ctx.memory` for that
  context.

* **Understanding Logs:** If you work with the detailed execution logs
  (`agent.run` results), the types like `InputRef`, `OutputRef`, `ActionCall`,
  `ActionResult`, `Thought` define the structure of each log entry.

## Benefit

Using the types defined here makes your code safer and easier to write. Your
code editor can provide helpful auto-completion and immediately warn you if
you're using a component incorrectly (e.g., trying to access a property that
doesn't exist on the `ctx` object or passing the wrong type of argument to an
action). It acts as a form of documentation, clarifying what data is available
where.

## Anticipated Questions

* *"Do I need to import types directly from `types.ts`?"* No, you should import
  types directly from the main package entry point:
  `import type { Action, Context, Agent } from '@daydreamsai/core';`.
* *"There are so many types! Which ones are most important?"* The most common
  ones you'll likely encounter when building your agent are `Agent`, `Context`,
  `Action`, `Input`, `Output`, `ActionCallContext`, `ContextState`,
  `WorkingMemory`, `MemoryStore`, `VectorStore`, and the various `Ref` types
  (`InputRef`, `OutputRef`, etc.) if you inspect execution logs. Many others are
  for internal framework use.
* *"I see types like `AnyAction`. Is it easier to use those instead of specific
  ones like `Action<MySchema, ...>`?"* While using `AnyAction` might seem
  simpler because you don't need to specify detailed types, it's generally **not
  recommended**, especially when starting out. Using specific types gives you
  significant advantages:

  1. **Type Safety:** TypeScript can check your code for errors *before* you
     run it (e.g., did you misspell a property name in `ctx.memory`? Are you
     using the action's `args` correctly?). `AnyAction` turns these checks off,
     leading to potential runtime bugs that are harder to find.
  2. **Auto-completion:** Your code editor can provide helpful suggestions for
     properties and methods when you use specific types, making coding faster
     and reducing typos. This doesn't work well with `AnyAction`.
  3. **Clarity:** Specific types make your code easier to understand for
     yourself and others. It clearly shows what data an action expects and
     uses.

  It's better practice to define Zod schemas for action arguments and interfaces
  for context memory, then use those in your definitions (e.g.,
  `Action<typeof mySchema, MyResult, MyMemoryInterface>`).


file: ./content/docs/core/extra-reading/utils.mdx
meta: {
  "title": "utils.ts"
}
        
This file provides essential "factory" functions that you use to define the
building blocks of your Daydreams agent, such as its tools (Actions), how it
receives information (Inputs), how it responds (Outputs), how it remembers
things specifically for an action (Memory), and how you bundle features together
(Extensions).

## How to Use

You'll import these functions directly from `@daydreamsai/core` when defining
your agent's components, typically in separate files.

* `action({...})`: Use this to define a specific capability or tool for your
  agent. You give it a `name`, `description`, expected arguments (`schema` using
  Zod), and the `handler` code that runs when the AI decides to use this tool.
  (See [Actions](/docs/concepts/actions) for details).

  ```typescript
  import { action } from "@daydreamsai/core";
  import * as z from "zod/v4";

  export const myAction = action({
    name: "myTool",
    description: "Does something cool.",
    schema: z.object({ param: z.string() }),
    handler: async (args, ctx, agent) => {
      /* ... */
    },
  });
  ```

* `input({...})`: Use this to define how your agent receives information from
  the outside world (like a chat message or an API event). You specify how to
  `subscribe` to the source and how to `send` incoming data into the agent for
  processing. (See [Inputs](/docs/concepts/inputs)).

* `output({...})`: Use this to define how your agent sends information out (like
  replying to a chat). You give it a `type`, expected content structure
  (`schema`), and the `handler` code that performs the sending. (See
  [Outputs](/docs/concepts/outputs)).

* `extension({...})`: Use this to package related actions, inputs, outputs,
  contexts, and services together into a reusable module. You provide a `name`
  and arrays/objects containing the components this extension provides. (See
  [Services & Extensions](/docs/advanced)).

* `memory({...})`: A specialized helper used within an `action` definition if
  that specific action needs its own persistent memory across different calls
  (less common than context memory). You provide a `key` and a `create` function
  for its initial state.

## Benefit

These functions provide a standardized way to define the different parts of your
agent. They ensure all the necessary configuration details are provided and
integrate smoothly with the agent's lifecycle and the AI model. They abstract
away the internal wiring, letting you focus on the logic of your agent's
capabilities.

## Anticipated Questions

* *"Do I use these functions inside `createDreams`?"* No, you typically use
  these functions in separate files to define your actions, inputs, etc., and
  then you import those definitions and pass them *to* `createDreams` in its
  configuration object (e.g., in the `actions: [...]` or `extensions: [...]`
  arrays).
* *"What's the difference between `action` and `output`?"* Use `action` when the
  agent needs to perform a task and get a result back to continue thinking (like
  looking up information). Use `output` when the agent just needs to send
  information out (like sending a final reply message).


file: ./content/docs/core/providers/ai-sdk.mdx
meta: {
  "title": "AI SDK Integration",
  "description": "Leveraging the Vercel AI SDK with Daydreams."
}
        
## What is the Vercel AI SDK?

The [Vercel AI SDK](https://sdk.vercel.ai/docs/introduction) provides a unified
way to connect to different AI providers like OpenAI, Anthropic, Google, and
many others. Instead of learning each provider's unique API, you use one
consistent interface.

## Why This Matters for Your Agent

Daydreams is built on top of the Vercel AI SDK, which means you get:

### Easy Provider Switching

```typescript title="easy-switching.ts"
// Switch from OpenAI to Anthropic by changing one line
// model: openai("gpt-4o")           // OpenAI
model: anthropic("claude-3-sonnet"); // Anthropic
// Everything else stays the same!
```

### Access to All Major Providers

* **OpenAI** - GPT-4, GPT-4o, GPT-3.5
* **Anthropic** - Claude 3 Opus, Sonnet, Haiku
* **Google** - Gemini Pro, Gemini Flash
* **Groq** - Ultra-fast Llama, Mixtral models
* **OpenRouter** - Access to 100+ models through one API
* **And many more** - See the
  [full list](https://sdk.vercel.ai/docs/foundations/providers-and-models)

## The Problem: Each AI Provider is Different

Without a unified SDK, you'd need different code for each provider:

```typescript title="without-ai-sdk.ts"
// ❌ Without AI SDK - different APIs for each provider
if (provider === 'openai') {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [...],
  });
} else if (provider === 'anthropic') {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: "claude-3-sonnet-20240229",
    messages: [...],
  });
}
// Different response formats, error handling, etc.
```

## The Solution: One Interface for All Providers

With the AI SDK, all providers work the same way:

```typescript title="with-ai-sdk.ts"
// ✅ With AI SDK - same code for any provider
const agent = createDreams({
  model: openai("gpt-4o"), // Or anthropic("claude-3-sonnet")
  // model: groq("llama3-70b"),   // Or any other provider
  // Everything else stays identical!
});
```

## Setting Up Your First Provider

### 1. Choose Your Provider

For this example, we'll use OpenAI, but the process is similar for all
providers.

### 2. Install the Provider Package

```bash title="install-openai.sh"
npm install @ai-sdk/openai
```

### 3. Get Your API Key

1. Go to [OpenAI's API platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your environment:

```bash title=".env"
OPENAI_API_KEY=your_api_key_here
```

### 4. Use in Your Agent

```typescript title="openai-agent.ts"
import { createDreams } from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";

const agent = createDreams({
  model: openai("gpt-4o-mini"), // Fast and cost-effective
  // model: openai("gpt-4o"),    // More capable but slower/pricier

  // Your agent configuration
  extensions: [...],
  contexts: [...],
});

await agent.start();
```

## All Supported Providers

### OpenAI

```typescript title="openai-setup.ts"
// Install: npm install @ai-sdk/openai
import { openai } from "@ai-sdk/openai";

model: openai("gpt-4o-mini"); // Fast, cheap
model: openai("gpt-4o"); // Most capable
model: openai("gpt-3.5-turbo"); // Legacy but cheap
```

**Get API key:** [platform.openai.com](https://platform.openai.com/api-keys)

### Anthropic (Claude)

```typescript title="anthropic-setup.ts"
// Install: npm install @ai-sdk/anthropic
import { anthropic } from "@ai-sdk/anthropic";

model: anthropic("claude-3-haiku-20240307"); // Fast, cheap
model: anthropic("claude-3-sonnet-20240229"); // Balanced
model: anthropic("claude-3-opus-20240229"); // Most capable
```

**Get API key:** [console.anthropic.com](https://console.anthropic.com/)

### Google (Gemini)

```typescript title="google-setup.ts"
// Install: npm install @ai-sdk/google
import { google } from "@ai-sdk/google";

model: google("gemini-1.5-flash"); // Fast, cheap
model: google("gemini-1.5-pro"); // More capable
```

**Get API key:** [aistudio.google.com](https://aistudio.google.com/app/apikey)

### Groq (Ultra-Fast)

```typescript title="groq-setup.ts"
// Install: npm install @ai-sdk/groq
import { createGroq } from "@ai-sdk/groq";
const groq = createGroq();

model: groq("llama3-70b-8192"); // Fast Llama
model: groq("mixtral-8x7b-32768"); // Fast Mixtral
```

**Get API key:** [console.groq.com](https://console.groq.com/keys)

### OpenRouter (100+ Models)

```typescript title="openrouter-setup.ts"
// Install: npm install @openrouter/ai-sdk-provider
import { openrouter } from "@openrouter/ai-sdk-provider";

model: openrouter("anthropic/claude-3-opus");
model: openrouter("google/gemini-pro");
model: openrouter("meta-llama/llama-3-70b");
// And 100+ more models!
```

**Get API key:** [openrouter.ai](https://openrouter.ai/keys)

## Switching Providers

The beauty of the AI SDK integration is how easy it is to switch:

```typescript title="provider-switching.ts"
// Development: Use fast, cheap models
const devAgent = createDreams({
  model: groq("llama3-8b-8192"), // Ultra-fast for testing
  // ... rest of config
});

// Production: Use more capable models
const prodAgent = createDreams({
  model: openai("gpt-4o"), // High quality for users
  // ... exact same config
});

// Experimenting: Try different providers
const experimentAgent = createDreams({
  model: anthropic("claude-3-opus"), // Different reasoning style
  // ... exact same config
});
```

## Environment Variables

Set up your API keys in your `.env` file:

```bash title=".env"
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_GENERATIVE_AI_API_KEY=AI...

# Groq
GROQ_API_KEY=gsk_...

# OpenRouter
OPENROUTER_API_KEY=sk-or-...
```

The AI SDK automatically picks up the right environment variable for each
provider.

## Model Recommendations

### For Development/Testing

* **Groq Llama3-8B** - Ultra-fast responses for quick iteration
* **OpenAI GPT-4o-mini** - Good balance of speed and capability

### For Production

* **OpenAI GPT-4o** - Best overall capability and reliability
* **Anthropic Claude-3-Sonnet** - Great reasoning, good for complex tasks

### For Cost Optimization

* **OpenAI GPT-3.5-turbo** - Cheapest OpenAI option
* **Anthropic Claude-3-Haiku** - Cheapest Anthropic option
* **Google Gemini Flash** - Very affordable with good performance

### For Special Use Cases

* **OpenRouter** - Access models not available elsewhere
* **Local models** - Use [Ollama](https://ollama.ai/) for privacy

## Advanced Configuration

You can also configure providers with custom settings:

```typescript title="advanced-config.ts"
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

// Custom OpenAI configuration
const customOpenAI = createOpenAI({
  apiKey: process.env.CUSTOM_OPENAI_KEY,
  baseURL: "https://your-proxy.com/v1", // Use a proxy
});

// Custom Anthropic configuration
const customAnthropic = createAnthropic({
  apiKey: process.env.CUSTOM_ANTHROPIC_KEY,
  baseURL: "https://your-endpoint.com", // Custom endpoint
});

const agent = createDreams({
  model: customOpenAI("gpt-4o"),
  // ... rest of config
});
```

## Troubleshooting

### Missing API Key

```
Error: Missing API key
```

**Solution:** Make sure your environment variable is set and the process can
access it.

### Model Not Found

```
Error: Model 'gpt-5' not found
```

**Solution:** Check the
[AI SDK docs](https://sdk.vercel.ai/docs/foundations/providers-and-models) for
available model names.

### Rate Limits

```
Error: Rate limit exceeded
```

**Solution:** Switch to a provider with higher limits or implement retry logic.

## Next Steps

* **[Core Concepts](/docs/core/concepts/core)** - Learn how to build agents
* **[Your First Agent](/docs/core/first-agent)** - Build a working example
* **[Vercel AI SDK Docs](https://sdk.vercel.ai/docs/introduction)** - Complete
  provider documentation
* **[Model Comparison](https://artificialanalysis.ai/)** - Compare different
  models' performance and cost

## Key Takeaways

* **One interface, many providers** - Same code works with OpenAI, Anthropic,
  Google, etc.
* **Easy switching** - Change providers by changing one line of code
* **Automatic key handling** - Environment variables work automatically
* **Cost flexibility** - Use cheap models for development, premium for
  production
* **Future-proof** - New providers added to AI SDK work immediately with
  Daydreams

The AI SDK integration gives you the freedom to choose the best model for your
use case without vendor lock-in.


file: ./content/docs/tutorials/advanced/browser.mdx
meta: {
  "title": "Browser Integration",
  "description": "Build web applications with daydreams agents in the browser."
}
        
## 1. Agent setup with browser storage

```typescript title="browser.ts"
import {
  createDreams,
  createMemoryStore,
  type MemoryStore,
} from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import { chatExtension } from "./chat";

// Simple browser storage using localStorage
function createBrowserStorage(): MemoryStore {
  return {
    async get<T>(key: string): Promise<T | null> {
      if (typeof window === "undefined") return null;
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    },

    async set(key: string, value: unknown): Promise<void> {
      if (typeof window === "undefined") return;
      localStorage.setItem(key, JSON.stringify(value));
    },

    async delete(key: string): Promise<void> {
      if (typeof window === "undefined") return;
      localStorage.removeItem(key);
    },

    async clear(): Promise<void> {
      if (typeof window === "undefined") return;
      localStorage.clear();
    },

    async keys(): Promise<string[]> {
      if (typeof window === "undefined") return [];
      return Object.keys(localStorage);
    },
  };
}

export function createAgent() {
  return createDreams({
    model: openai("gpt-4-turbo"),
    memory: {
      store: createBrowserStorage(),
    },
    extensions: [chatExtension],
  });
}
```

Browser storage persists conversations across page reloads using localStorage.
For production applications, consider IndexedDB for larger data storage.

## 2. Chat extension for web applications

```typescript title="browser.ts"
import { extension, context, input, output } from "@daydreamsai/core";
import * as z from "zod/v4";

const chatContext = context({
  type: "web-chat",
  schema: z.object({
    sessionId: z.string(),
  }),
  key: ({ sessionId }) => sessionId,
  instructions:
    "You are a helpful assistant. Respond conversationally and be helpful.",
  create: () => ({
    messages: [] as Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: number;
    }>,
  }),
});

export const chatExtension = extension({
  name: "chat",
  contexts: {
    chat: chatContext,
  },
  inputs: {
    message: input({
      schema: z.object({
        content: z.string(),
        sessionId: z.string(),
      }),
      format: ({ data }) => ({
        tag: "input",
        params: { sessionId: data.sessionId },
        children: data.content,
      }),
      handler: async (data, ctx) => {
        ctx.memory.messages.push({
          role: "user",
          content: data.content,
          timestamp: Date.now(),
        });
        return { data, params: {} };
      },
    }),
  },
  outputs: {
    message: output({
      schema: z.string(),
      handler: async (data, ctx) => {
        ctx.memory.messages.push({
          role: "assistant",
          content: data,
          timestamp: Date.now(),
        });
        return { data: { content: data }, params: {}, processed: true };
      },
      examples: [`<output type="message">Hello! How can I help you?</output>`],
    }),
  },
});
```

## 3. React chat component

```typescript title="chat.tsx"
import { useState, useEffect, useRef } from "react";
import { createAgent } from "@/lib/agent";
import { chatExtension } from "@/lib/chat";
import type { Agent } from "@daydreamsai/core";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export function Chat() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const sessionId = useRef(`session-${Date.now()}`);

  // Initialize agent
  useEffect(() => {
    const agentInstance = createAgent();
    agentInstance.start().then(() => {
      setAgent(agentInstance);
    });
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !agent || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await agent.send({
        input: {
          type: "message",
          data: {
            content: input,
            sessionId: sessionId.current,
          },
        },
        context: chatExtension.contexts.chat,
        args: { sessionId: sessionId.current },
      });

      // Extract response from agent result
      const response = extractResponse(result);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractResponse = (result: any): string => {
    if (typeof result === "string") return result;

    if (Array.isArray(result)) {
      const outputLog = result
        .reverse()
        .find((log) => log?.ref === "output" && log?.type === "message");
      return outputLog?.data?.content || "No response";
    }

    return "Invalid response format";
  };

  return (
    <div className="flex flex-col h-96 border rounded-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 4. Custom actions for web applications

```typescript title="actions.ts"
import { action } from "@daydreamsai/core";
import * as z from "zod/v4";

export const webActions = [
  action({
    name: "getCurrentTime",
    description: "Get the current time and date",
    schema: z.object({}),
    handler: () => {
      return new Date().toLocaleString();
    },
  }),

  action({
    name: "fetchData",
    description: "Fetch data from an API endpoint",
    schema: z.object({
      url: z.string().url(),
      method: z.enum(["GET", "POST"]).default("GET"),
    }),
    handler: async ({ url, method }) => {
      try {
        const response = await fetch(url, { method });
        const data = await response.json();
        return JSON.stringify(data);
      } catch (error) {
        return `Error fetching data: ${error}`;
      }
    },
  }),

  action({
    name: "saveToLocalStorage",
    description: "Save data to browser local storage",
    schema: z.object({
      key: z.string(),
      value: z.string(),
    }),
    handler: ({ key, value }) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, value);
        return `Saved "${key}" to local storage`;
      }
      return "Local storage not available";
    },
  }),
];
```

## 5. Agent with custom actions

```typescript title="custom-actions.ts"
import { createDreams } from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import { chatExtension } from "./chat";
import { webActions } from "./actions";

export function createEnhancedAgent() {
  return createDreams({
    model: openai("gpt-4-turbo"),
    extensions: [chatExtension],
    actions: webActions,
    memory: {
      store: createBrowserStorage(),
    },
  });
}
```


file: ./content/docs/tutorials/advanced/deep-research.mdx
meta: {
  "title": "Deep Research Agent",
  "description": "Agent that conducts comprehensive web research with iterative queries and structured analysis."
}
        
## 1. Agent setup and dependencies

```typescript title="index.ts"
import { createContainer, createDreams, LogLevel } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { deepResearch } from "./research";
import { tavily } from "@tavily/core";
import { anthropic } from "@ai-sdk/anthropic";

const container = createContainer();

container.singleton("tavily", () =>
  tavily({
    apiKey: process.env.TAVILY_API_KEY!,
  })
);
```

The research agent uses Tavily for web search and Anthropic's Claude for
analysis. The container provides dependency injection for shared services.

## 2. Configure debugging and start the agent

```typescript title="index.ts"
createDreams({
  logger: LogLevel.DEBUG,
  model: anthropic("claude-3-7-sonnet-latest"),
  debugger: async (contextId, keys, data) => {
    const [type, id] = keys;
    await Bun.write(`./logs/${contextId}/${id}-${type}.md`, data);
  },
  extensions: [cliExtension, deepResearch],
  container,
}).start();
```

The debugger writes research logs to files, creating a detailed audit trail of
the research process including prompts, responses, and analysis.

## 3. Research data structures

```typescript title="research.ts"
export type Research = {
  id: string;
  name: string;
  queries: {
    query: string;
    goal: string;
  }[];
  questions: string[];
  learnings: string[];
  status: "in_progress" | "done" | "cancelled";
  metadata: {
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
    cancelledAt?: number;
    totalQueries: number;
    totalLearnings: number;
    depth: number;
    creator?: string;
  };
};
```

The research structure tracks queries, learnings, and metadata throughout the
research process.

## 4. Web search with content analysis

```typescript title="research.ts"
const researchQueryTask = task(
  "deep-research:query",
  async (
    { model, contextId, tavilyClient, research, query }: SearchQueryParams,
    { callId, debug }
  ) => {
    const seenDomains = new Set<string>();
    research.learnings.forEach((learning) => {
      if (learning.startsWith("Source:")) {
        const domainMatch = learning.match(/Source: ([^/]+)/);
        if (domainMatch && domainMatch[1]) {
          seenDomains.add(domainMatch[1]);
        }
      }
    });

    const { results } = await tavilyClient.search(query.query, {
      maxResults: 8,
      searchDepth: "advanced",
      includeImages: false,
      includeAnswer: true,
      excludeDomains: Array.from(seenDomains),
    });
```

Each search query avoids previously seen domains to ensure source diversity and
filters results for quality and relevance.

## 5. Iterative research with depth control

```typescript title="research.ts"
export async function startDeepResearch({
  contextId,
  model,
  research,
  tavilyClient,
  maxDepth,
  onProgress,
  debug,
}: {
  contextId: string;
  model: LanguageModelV1;
  research: Research;
  tavilyClient: TavilyClient;
  maxDepth: number;
  onProgress?: (progress: ResearchProgress) => void;
  debug: Debugger;
}) {
  let queries = research.queries.slice();
  let depth = 1;

  while (queries.length > 0 && depth <= maxDepth) {
    const results = await Promise.all(
      queries.map(async (query) => {
        return await researchQueryTask({
          contextId,
          model,
          query,
          research,
          tavilyClient,
        }, { debug });
      })
    );

    // Extract follow-up queries for next iteration
    results.forEach((result) => {
      if (result?.followUpQueries) {
        queries.push(...result.followUpQueries);
      }
      if (result?.learnings) {
        research.learnings.push(
          ...result.learnings.map((learning) => learning.content)
        );
      }
    });

    depth++;
  }
```

The research process iterates through multiple depths, generating follow-up
queries based on previous findings until the maximum depth is reached.

## 6. Research actions

```typescript title="research.ts"
const startDeepResearchAction = action({
  name: "start-deep-research",
  schema: researchSchema,
  memory: researchMemory,
  async handler(call, ctx, agent) {
    const research: Research = {
      ...call.data,
      learnings: [],
      status: "in_progress",
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalQueries: call.data.queries.length,
        totalLearnings: 0,
        depth: 0,
        creator: ctx.id,
      },
    };

    ctx.actionMemory.researches.push(research);

    startDeepResearch({
      model: agent.reasoningModel ?? agent.model,
      research,
      tavilyClient: agent.container.resolve("tavily"),
      maxDepth: call.data.maxDepth ?? 2,
      contextId: ctx.id,
      debug: agent.debugger,
    });

    return "Research created!";
  },
});
```


file: ./content/docs/tutorials/advanced/web-search-actions.mdx
meta: {
  "title": "Web Search Actions",
  "description": "Agent with custom actions for searching and fetching web content."
}
        
## 1. Environment setup and dependencies

```typescript title="web-search.ts"
import { createDreams, action, validateEnv } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { anthropic } from "@ai-sdk/anthropic";
import { tavily, type TavilyClient } from "@tavily/core";
import * as z from "zod/v4";

validateEnv(
  z.object({
    ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
    TAVILY_API_KEY: z.string().min(1, "TAVILY_API_KEY is required"),
  })
);
```

This example uses Tavily for web search functionality. Get your API key from
[tavily.com](https://tavily.com/) and set the `TAVILY_API_KEY` environment
variable.

## 2. Web search action with service injection

```typescript title="web-search.ts"
const searchWebAction = action({
  name: "searchWeb",
  description: "Search the web for current information",
  install: ({ container }) => {
    container.singleton("tavily", () =>
      tavily({
        apiKey: process.env.TAVILY_API_KEY!,
      })
    );
  },
  schema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of results"),
    searchDepth: z
      .enum(["basic", "advanced"])
      .optional()
      .default("basic")
      .describe("Search depth - basic is faster, advanced is more thorough"),
  }),
  handler: async ({ query, maxResults, searchDepth }, ctx, agent) => {
    const tavilyClient = agent.container.resolve<TavilyClient>("tavily");

    try {
      const response = await tavilyClient.search(query, {
        maxResults,
        searchDepth,
        includeAnswer: true,
        includeImages: false,
      });

      return {
        success: true,
        query,
        results: response.results.map((result) => ({
          title: result.title,
          url: result.url,
          content: result.content.substring(0, 500) + "...",
          score: result.score,
        })),
        answer: response.answer,
        totalResults: response.results.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
        query,
      };
    }
  },
});
```

The action uses dependency injection to register the Tavily client as a
singleton service, making it available throughout the agent.

## 3. URL fetching action

```typescript title="web-search.ts"
const fetchUrlAction = action({
  name: "fetchUrl",
  description: "Fetch content from a specific URL",
  schema: z.object({
    url: z.string().url().describe("The URL to fetch"),
    timeout: z
      .number()
      .optional()
      .default(10000)
      .describe("Request timeout in ms"),
  }),
  handler: async ({ url, timeout }) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Daydreams Web Agent/1.0",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      const title = content.match(/<title>(.*?)<\/title>/i)?.[1] || "No title";

      return {
        success: true,
        url,
        title: title.trim(),
        content: content.substring(0, 2000) + "...",
        status: response.status,
        contentType: response.headers.get("content-type"),
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : "Fetch failed",
      };
    }
  },
});
```

## 4. Wikipedia search action

```typescript title="web-search.ts"
const searchWikipediaAction = action({
  name: "searchWikipedia",
  description: "Search Wikipedia for information",
  schema: z.object({
    query: z.string().describe("What to search for on Wikipedia"),
    limit: z
      .number()
      .optional()
      .default(3)
      .describe("Maximum number of results"),
  }),
  handler: async ({ query, limit }) => {
    try {
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/search?q=${encodeURIComponent(
        query
      )}&limit=${limit}`;

      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        query,
        results: data.pages.map((page) => ({
          title: page.title,
          description: page.description || "No description",
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.key)}`,
          thumbnail: page.thumbnail?.source,
        })),
        totalResults: data.pages.length,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Wikipedia search failed",
        query,
      };
    }
  },
});
```

## 5. Create the search agent

```typescript title="web-search.ts"
createDreams({
  model: anthropic("claude-3-7-sonnet-latest"),
  extensions: [cliExtension],
  actions: [searchWebAction, fetchUrlAction, searchWikipediaAction],
}).start();
```


file: ./content/docs/tutorials/basic/file-system-agent.mdx
meta: {
  "title": "File System Agent",
  "description": "An agent that can interact with the local file system in a sandboxed way."
}
        
## 1. Create agent workspace

```typescript title="index.ts"
validateEnv(
  z.object({
    OPENROUTER_API_KEY: z.string().min(1),
  })
);

const workspaceDir = path.resolve("./file-agent-workspace");
fs.mkdir(workspaceDir, { recursive: true });

const resolveSafePath = (userPath: string) => {
  const resolvedPath = path.resolve(workspaceDir, userPath);
  if (!resolvedPath.startsWith(workspaceDir)) {
    throw new Error("Access denied.");
  }
  return resolvedPath;
};
```

## 2. Define the filesystem actions

Here we are making three actions: read, write, list.

```typescript title="index.ts"
const listFilesAction = action({
  name: "listFiles",
  description:
    "Lists files and directories in a specified path within the workspace.",
  schema: z.object({
    path: z
      .string()
      .default(".")
      .describe("The path to list files from, relative to the workspace."),
  }),
  async handler({ path: dirPath }) {
    const safePath = resolveSafePath(dirPath);
    const files = await fs.readdir(safePath);
    return { files };
  },
});
```

```typescript title="index.ts"
const readFileAction = action({
  name: "readFile",
  description: "Reads the content of a specified file within the workspace.",
  schema: z.object({
    path: z
      .string()
      .describe("The path of the file to read, relative to the workspace."),
  }),
  async handler({ path: filePath }) {
    const safePath = resolveSafePath(filePath);
    const content = await fs.readFile(safePath, "utf-8");
    return { content };
  },
});
```

```typescript title="index.ts"
const writeFileAction = action({
  name: "writeFile",
  description:
    "Writes content to a specified file within the workspace. Overwrites existing files.",
  schema: z.object({
    path: z
      .string()
      .describe("The path of the file to write to, relative to the workspace."),
    content: z.string().describe("The content to write to the file."),
  }),
  async handler({ path: filePath, content }) {
    const safePath = resolveSafePath(filePath);
    await fs.writeFile(safePath, content, "utf-8");
    return { success: true, path: filePath };
  },
});
```

## 3. Define a context

```typescript title="index.ts"
const fileAgentContext = context({
  type: "filesystem-agent",
  schema: z.object({}),
  instructions: `You are a helpful AI assistant that can interact with a file system. You can list, read, and write files within the './file-agent-workspace' directory.
    When asked to perform a file operation, use the available tools.
    For example:
    - "List all files" should call listFiles with path ".".
    - "Read the file named 'hello.txt'" should call readFile with path "hello.txt".
    - "Create a file 'test.txt' with content 'hello world'" should call writeFile with path "test.txt" and the content.
  `,
});
```

## 4. Create the agent

```typescript title="index.ts"
const agent = createDreams({
  model: openrouter("google/gemini-2.0-flash-001"),
  extensions: [cliExtension],
  actions: [listFilesAction, readFileAction, writeFileAction],
  contexts: [fileAgentContext],
});
agent.start();
```

Converse with your agent in the command line and let it write to files in a
scoped sandbox.


file: ./content/docs/tutorials/basic/multi-context-agent.mdx
meta: {
  "title": "Multi-Context Agent",
  "description": "This guide will walk you through creating an AI agent that can respond to multiple contexts."
}
        
## Prerequisites

* `OPENAI_API_KEY`: Your OpenAI API key

```typescript title="agent.ts"
import { createDreams, context, input, output } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { openai } from "@ai-sdk/openai";
import * as z from "zod/v4";

const fetchContext = context({
  type: "fetch",
  schema: z.object({}),
  instructions:
    "You are a helpful assistant that can fetch data from a test API. When asked, fetch and display data from the JSONPlaceholder API.",
  actions: {
    fetchPosts: {
      schema: z.object({
        limit: z.number().optional().default(5),
      }),
      description: "Fetch posts from the test API",
      handler: async ({ limit }) => {
        const response = await fetch(
          "https://jsonplaceholder.typicode.com/posts"
        );
        const posts = await response.json();
        return posts.slice(0, limit);
      },
    },
    fetchUser: {
      schema: z.object({
        userId: z.number(),
      }),
      description: "Fetch a specific user by ID",
      handler: async ({ userId }) => {
        const response = await fetch(
          `https://jsonplaceholder.typicode.com/users/${userId}`
        );
        return response.json();
      },
    },
  },
});

// 1. Define the main context for our agent
const echoContext = context({
  type: "echo",
  // No specific arguments needed for this simple context
  schema: z.object({}),
  instructions:
    "You are a simple echo bot. Repeat the user's message back to them.",
});

// 2. Create the agent instance
const agent = createDreams({
  // Configure the LLM model to use
  model: openai("gpt-4o-mini"),
  // Include the CLI extension for input/output handling
  extensions: [cliExtension],
  // Register our custom context
  contexts: [echoContext, fetchContext],
});

// 3. Start the agent and run the context
async function main() {
  // Initialize the agent (sets up services like readline)
  await agent.start();

  console.log("Multi-context agent started. Type 'exit' to quit.");
  console.log("Available contexts:");
  console.log("1. Echo context - repeats your messages");
  console.log("2. Fetch context - fetches data from JSONPlaceholder test API");
  console.log("");

  // You can run different contexts based on user choice
  // For this example, we'll run the fetch context
  await agent.run({
    context: fetchContext,
    args: {}, // Empty object since our schema requires no arguments
  });

  // Agent stops when the input loop breaks
  console.log("Agent stopped.");
}

// Start the application
main();
```

### Run your agent

Ensure your `OPENAI_API_KEY` environment variable is set, then run:

```bash title="run-agent.sh"
node agent.ts
```


file: ./content/docs/tutorials/basic/single-context.mdx
meta: {
  "title": "Single Context Agent",
  "description": "This guide will walk you through creating an AI agent that can respond to a single context."
}
        
## Prerequisites

* `OPENAI_API_KEY`: Your OpenAI API key

```typescript title="agent.ts"
import { createDreams, context, input, output } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { openai } from "@ai-sdk/openai";
import * as z from "zod/v4";

// 1. Define the main context for our agent
const echoContext = context({
  type: "echo",
  // No specific arguments needed for this simple context
  schema: z.object({}),
  // Instructions that guide the LLM's behavior
  instructions:
    "You are a simple echo bot. Repeat the user's message back to them.",
});

// 2. Create the agent instance
const agent = createDreams({
  // Configure the LLM model to use
  model: openai("gpt-4o-mini"),
  // Include the CLI extension for input/output handling
  extensions: [cliExtension],
  // Register our custom context
  contexts: [echoContext],
});

// 3. Start the agent and run the context
async function main() {
  // Initialize the agent (sets up services like readline)
  await agent.start();

  console.log("Echo agent started. Type 'exit' to quit.");

  // Run our echo context
  // The cliExtension automatically handles console input/output
  await agent.run({
    context: echoContext,
    args: {}, // Empty object since our schema requires no arguments
  });

  // Agent stops when the input loop breaks (e.g., user types "exit")
  console.log("Agent stopped.");
}

// Start the application
main();
```

Your agent will start listening for input. Type any message and watch as the
agent echoes it back using the LLM and CLI handlers provided by the
`cliExtension`.


file: ./content/docs/tutorials/basic/starting-agent.mdx
meta: {
  "title": "Starting Agent",
  "description": "Agent that manages goals and tasks with simple memory and actions."
}
        
## 1. Environment setup and imports

```typescript title="index.ts"
import { createDreams, context, action, validateEnv } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { anthropic } from "@ai-sdk/anthropic";
import * as z from "zod/v4";

validateEnv(
  z.object({
    ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  })
);
```

The agent requires an Anthropic API key for the Claude language model. Set this
environment variable before running the agent.

## 2. Define the goal context and memory structure

```typescript title="index.ts"
type GoalMemory = {
  goal: string;
  tasks: string[];
  currentTask: string;
};

const goalContext = context({
  type: "goal",
  schema: z.object({
    id: z.string(),
  }),
  key: ({ id }) => id,
  create: () => ({
    goal: "",
    tasks: [],
    currentTask: "",
  }),
  render: ({ memory }) => `
Current Goal: ${memory.goal || "No goal set"}
Tasks: ${memory.tasks.length > 0 ? memory.tasks.join(", ") : "No tasks"}
Current Task: ${memory.currentTask || "None"}
  `,
});
```

The context maintains the agent's current goal, list of tasks, and which task is
currently active. Memory persists between conversations.

## 3. Define task management actions

```typescript title="index.ts"
const taskActions = [
  action({
    name: "setGoal",
    description: "Set a new goal for the agent",
    schema: z.object({
      goal: z.string().describe("The goal to work towards"),
    }),
    handler: ({ goal }, ctx) => {
      const memory = ctx.agentMemory as GoalMemory;
      memory.goal = goal;
      memory.tasks = [];
      memory.currentTask = "";
      return { success: true, message: `Goal set to: ${goal}` };
    },
  }),

  action({
    name: "addTask",
    description: "Add a task to accomplish the goal",
    schema: z.object({
      task: z.string().describe("The task to add"),
    }),
    handler: ({ task }, ctx) => {
      const memory = ctx.agentMemory as GoalMemory;
      memory.tasks.push(task);
      if (!memory.currentTask && memory.tasks.length === 1) {
        memory.currentTask = task;
      }
      return { success: true, message: `Added task: ${task}` };
    },
  }),

  action({
    name: "completeTask",
    description: "Mark the current task as complete",
    schema: z.object({
      task: z.string().describe("The task to complete"),
    }),
    handler: ({ task }, ctx) => {
      const memory = ctx.agentMemory as GoalMemory;
      memory.tasks = memory.tasks.filter((t) => t !== task);

      if (memory.currentTask === task) {
        memory.currentTask = memory.tasks[0] || "";
      }

      return {
        success: true,
        message: `Completed task: ${task}`,
        remainingTasks: memory.tasks.length,
      };
    },
  }),
];
```

## 4. Create and start the agent

```typescript title="index.ts"
createDreams({
  model: anthropic("claude-3-7-sonnet-latest"),
  extensions: [cliExtension],
  context: goalContext,
  actions: taskActions,
}).start({ id: "basic-agent" });
```


file: ./content/docs/tutorials/basic/task-management.mdx
meta: {
  "title": "Task Management Agent",
  "description": "Agent that uses a custom task context and exposes three actions."
}
        
## 1. Define the task context and imports

```typescript title="index.ts"
import { createDreams, context, action, validateEnv } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { openrouter } from "@openrouter/ai-sdk-provider";
import * as z from "zod/v4";

validateEnv(
  z.object({
    OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  })
);

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});

const taskContext = context({
  type: "tasks",
  schema: z.object({
    projectId: z.string(),
  }),
  instructions:
    "You are a task management assistant. Help users create, track, and manage their tasks.",
  create: () => ({
    tasks: [] as z.infer<typeof taskSchema>[],
  }),
});
```

## 2. Define the three task actions

```typescript title="index.ts"
const taskActions = [
  action({
    name: "addTask",
    description: "Add a new task to the list",
    schema: z.object({ title: z.string().describe("The task title") }),
    handler: (args, ctx, agent) => {
      const memory = ctx.agentMemory || ctx.memory;
      if (!memory.tasks) memory.tasks = [];

      const task = {
        id: Date.now().toString(),
        title: args.title,
        done: false,
      };
      memory.tasks.push(task);
      agent.logger.info("addTask", `Task added: ${task.title}`);
      return { task, message: `Added task: "${args.title}"` };
    },
  }),
  action({
    name: "listTasks",
    description: "List all tasks",
    schema: z.object({}),
    handler: (_, ctx) => {
      const memory = ctx.agentMemory || ctx.memory;
      const tasks = memory.tasks || [];
      return {
        tasks,
        count: tasks.length,
        message:
          tasks.length === 0 ? "No tasks yet" : `Found ${tasks.length} task(s)`,
      };
    },
  }),
  action({
    name: "completeTask",
    description: "Mark a task as done",
    schema: z.object({ id: z.string().describe("The task ID") }),
    handler: (args, ctx) => {
      const memory = ctx.agentMemory || ctx.memory;
      if (!memory.tasks) {
        return { success: false, message: "No tasks found" };
      }

      const task = memory.tasks.find(
        (t: z.infer<typeof taskSchema>) => t.id === args.id
      );
      if (task) {
        task.done = true;
        return { success: true, task, message: `Completed: "${task.title}"` };
      }
      return { success: false, message: `Task ${args.id} not found` };
    },
  }),
];
```

## 3. Create the agent that ties everything together

```typescript title="index.ts"
const agent = createDreams({
  model: openrouter("google/gemini-2.0-flash-001"),
  extensions: [cliExtension],
  actions: taskActions,
});

await agent.start();
```

The agent will now listen for input and update, add, and retrieve tasks.


file: ./content/docs/tutorials/chains/solana.mdx
meta: {
  "title": "Solana Agent",
  "description": "An agent that can interact with the Solana blockchain to check balances and transfer SOL."
}
        
This tutorial demonstrates how to build an agent that can interact with the
Solana blockchain. The agent can check wallet balances, transfer SOL, and get
the current block height.

## 1. Imports and Initialization

First, set up the necessary imports and initialize the `SolanaChain` with your
RPC URL and private key from environment variables.

```typescript title="index.ts"
import { openrouter } from "@openrouter/ai-sdk-provider";
import {
  createDreams,
  context,
  action,
  validateEnv,
  extension,
  input,
} from "@daydreamsai/core";
import * as z from "zod/v4";
import chalk from "chalk";
import { SolanaChain } from "@daydreamsai/defai";
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";
import bs58 from "bs58";

// Validate environment variables
const env = validateEnv(
  z.object({
    OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
    SOLANA_RPC_URL: z.string().min(1, "SOLANA_RPC_URL is required"),
    SOLANA_PRIVATE_KEY: z
      .string()
      .min(1, "SOLANA_PRIVATE_KEY is required")
      .refine((key) => {
        try {
          const decoded = bs58.decode(key);
          return decoded.length === 64;
        } catch {
          return false;
        }
      }, "SOLANA_PRIVATE_KEY must be a valid base58-encoded 64-byte private key"),
  })
);

// Initialize Solana Chain
const solanaChain = new SolanaChain({
  chainName: "solana-devnet",
  rpcUrl: env.SOLANA_RPC_URL,
  privateKey: env.SOLANA_PRIVATE_KEY,
});
```

## 2. Define the Solana Context

Next, define the memory structure, a template for the agent's prompts, and the
context configuration.

```typescript title="index.ts"
// Define memory type
type SolanaMemory = {
  wallet: string;
  transactions: string[];
  lastTransaction: string | null;
  balance: number;
};

// Define context template
const template = ({
  wallet,
  lastTransaction,
  transactions,
  balance,
}: SolanaMemory) => `You are an the daydreamsAI agent solana trader/assistant. Do not include xml tags in side your instructed output format.
Wallet: ${wallet}
Balance: ${balance / LAMPORTS_PER_SOL} SOL
Last Transaction: ${lastTransaction ?? "NONE"}
Transaction History:
${transactions.join("\n")}

RPC Provider: Helius (High-performance Solana RPC with full archival data)
Note: If you encounter "Failed to query long-term storage" errors, it may be due to rate limiting. Wait a moment and try again. If persistent, respect the API. 

IMPORTANT: When responding with action results, include the actual data in your response, not template references like {{calls[0].data}}. You're meant to be actionable and helpful, not just a data tool. If the user's request requires multiple actions, take them. You have agency.
`;

// Create context
const solanaContext = context({
  type: "solana",
  schema: {
    wallet: z.string(),
  },
  key: ({ wallet }) => wallet,
  create({ args }): SolanaMemory {
    return {
      wallet: args.wallet,
      transactions: [],
      lastTransaction: null,
      balance: 0,
    };
  },
  render({ memory }) {
    return template(memory);
  },
}).setOutputs({
  message: {
    schema: z.string().describe("The message to send to the user"),
  },
});
```

## 3. Define Solana Actions

Define the actions the agent can perform, such as getting a balance,
transferring SOL, and checking the block height. These actions are then attached
to the `solanaContext`.

```typescript title="index.ts"
// Helper function to ensure consistent action responses
const actionResponse = (message: string) => ({
  data: message,
  content: message,
});

const solanaActions = [
  action({
    name: "solana.getBalance",
    description: "Get the SOL balance of a wallet address",
    schema: {
      address: z
        .string()
        .describe("The Solana wallet address to check balance for"),
    },
    async handler({ address }, { memory }) {
      const balance = await solanaChain.read({
        type: "getBalance",
        address,
      });

      if (balance instanceof Error) {
        return actionResponse(`Error getting balance: ${balance.message}`);
      }

      const solBalance = balance / LAMPORTS_PER_SOL;

      if (address === memory.wallet) {
        memory.balance = balance;
      }

      return actionResponse(
        `Balance for ${address}: ${solBalance} SOL (${balance} lamports)`
      );
    },
  }),
  action({
    name: "solana.transfer",
    description: "Transfer SOL from your wallet to another address",
    schema: {
      recipient: z.string().describe("The recipient's Solana wallet address"),
      amount: z.number().describe("Amount of SOL to transfer (not lamports)"),
    },
    async handler({ recipient, amount }, { memory }) {
      try {
        const fromPubkey = new PublicKey(memory.wallet);
        const toPubkey = new PublicKey(recipient);
        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

        const transferInstruction = SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        });

        const txSignature = await solanaChain.write({
          instructions: [transferInstruction],
          signers: [],
        });

        if (txSignature instanceof Error) {
          return actionResponse(
            `Error sending transaction: ${txSignature.message}`
          );
        }

        const txInfo = `Transferred ${amount} SOL to ${recipient}. Signature: ${txSignature}`;
        memory.lastTransaction = txInfo;
        memory.transactions.push(txInfo);

        const newBalance = await solanaChain.read({
          type: "getBalance",
          address: memory.wallet,
        });
        if (!(newBalance instanceof Error)) {
          memory.balance = newBalance;
        }

        return actionResponse(txInfo);
      } catch (error) {
        return actionResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  }),
  action({
    name: "solana.getBlockHeight",
    description: "Get the current block height of the Solana blockchain",
    schema: {},
    async handler(_, { memory }) {
      const blockHeight = await solanaChain.read({
        type: "getBlockHeight",
      });

      if (blockHeight instanceof Error) {
        return actionResponse(
          `Error getting block height: ${blockHeight.message}`
        );
      }

      return actionResponse(`Current Solana block height: ${blockHeight}`);
    },
  }),
];

solanaContext.setActions(solanaActions);
```

## 4. Create and Run the Agent

Finally, create a custom extension to handle command-line interaction, create
the Dreams instance with the extension, and start the agent.

```typescript title="index.ts"
// Create a custom extension that combines CLI with Solana context
const solanaExtension = extension({
  name: "solana-cli",
  contexts: {
    solana: solanaContext,
  },
  inputs: {
    cli: input({
      schema: z.object({
        text: z.string(),
      }),
      subscribe(send, agent) {
        const readline = require("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const prompt = () => {
          rl.question("> ", async (text: string) => {
            if (text.trim()) {
              console.log(`User: ${text}`);
              await agent.send({
                context: solanaContext,
                args: { wallet: walletAddress },
                input: { type: "cli", data: { text } },
                handlers: {
                  onLogStream(log, done) {
                    if (done) {
                      if (log.ref === "output") {
                        const content = log.content || log.data;
                        if (content && !content.includes("attributes_schema")) {
                          console.log(chalk.green(`Assistant: ${content}`));
                        }
                      }
                    }
                  },
                },
              });
            }
            prompt();
          });
        };

        console.log(
          chalk.cyan(
            "\nType your message and press Enter to send it to the agent.\n"
          )
        );
        prompt();

        return () => {
          rl.close();
        };
      },
    }),
  },
  actions: [],
});

// Create Dreams instance
const dreams = createDreams({
  model: openrouter("google/gemini-2.0-flash-001"),
  extensions: [solanaExtension],
});

// Get the wallet address from the private key
let walletAddress: string;
try {
  const keypair = Keypair.fromSecretKey(
    Buffer.from(bs58.decode(env.SOLANA_PRIVATE_KEY))
  );
  walletAddress = keypair.publicKey.toBase58();
} catch (error) {
  console.error(chalk.red("❌ Failed to load wallet from private key:"), error);
  process.exit(1);
}

// Start the Dreams instance
await dreams.start();

console.log(chalk.green("✅ Solana Dreams agent started!"));
console.log(chalk.blue(`Wallet: ${walletAddress}`));
```


file: ./content/docs/tutorials/gaming/blockchain-game-agent.mdx
meta: {
  "title": "Blockchain Game Agent",
  "description": "Agent that plays blockchain games by managing game state and blockchain interactions."
}
        
## Setup

Ensure the following environment variables are set:

* `ANTHROPIC_API_KEY`: Your Anthropic API key
* `BLOCKCHAIN_RPC_URL`: RPC URL for your target blockchain
* `GAME_CONTRACT_ADDRESS`: Address of the game's smart contract
* `PLAYER_PRIVATE_KEY`: Private key for the player's wallet

```typescript title="index.ts"
import {
  createDreams,
  context,
  action,
  extension,
  validateEnv,
} from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { anthropic } from "@ai-sdk/anthropic";
import * as z from "zod/v4";

validateEnv(
  z.object({
    ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
    BLOCKCHAIN_RPC_URL: z.string().min(1, "BLOCKCHAIN_RPC_URL is required"),
    GAME_CONTRACT_ADDRESS: z
      .string()
      .min(1, "GAME_CONTRACT_ADDRESS is required"),
    PLAYER_PRIVATE_KEY: z.string().min(1, "PLAYER_PRIVATE_KEY is required"),
  })
);

const GAME_CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS!;
```

This example shows blockchain game integration patterns. Replace with your
specific blockchain client (Starknet, Ethereum, etc.).

## 2. Game state interface and context

```ts
interface GameState {
  playerId: string;
  level: number;
  health: number;
  maxHealth: number;
  experience: number;
  gold: number;
  inBattle: boolean;

  // Stats
  strength: number;
  dexterity: number;
  vitality: number;

  // Equipment
  weapon: string;
  armor: string;

  // Current enemy
  enemyName: string;
  enemyHealth: number;
  enemyMaxHealth: number;

  // Game actions
  availableStatPoints: number;
  lastActionResult: string;
}

const gameContext = context({
  type: "blockchain-game",
  schema: z.object({
    playerId: z.string(),
  }),
  key: ({ playerId }) => `game:${playerId}`,
  create: (): GameState => ({
    playerId: "",
    level: 1,
    health: 100,
    maxHealth: 100,
    experience: 0,
    gold: 0,
    inBattle: false,

    strength: 10,
    dexterity: 10,
    vitality: 10,

    weapon: "Basic Sword",
    armor: "Basic Armor",

    enemyName: "",
    enemyHealth: 0,
    enemyMaxHealth: 0,

    availableStatPoints: 0,
    lastActionResult: "Game started",
  }),
  render: ({ memory }) => `
Game Status:
- Player ID: ${memory.playerId}
- Level: ${memory.level} (XP: ${memory.experience})
- Health: ${memory.health}/${memory.maxHealth}
- Gold: ${memory.gold}
- Available Stat Points: ${memory.availableStatPoints}

Stats:
- Strength: ${memory.strength}
- Dexterity: ${memory.dexterity}
- Vitality: ${memory.vitality}

Equipment:
- Weapon: ${memory.weapon}
- Armor: ${memory.armor}

${
  memory.inBattle
    ? `
Battle Status:
- Fighting: ${memory.enemyName}
- Enemy Health: ${memory.enemyHealth}/${memory.enemyMaxHealth}
`
    : "Not in battle"
}

Last Action: ${memory.lastActionResult}
  `,
});
```

The context tracks all game state including player stats, equipment, battle
status, and blockchain transaction results.

## 3. Blockchain interaction helpers

```ts
// Mock blockchain client - replace with actual blockchain integration
class BlockchainClient {
  async callContract(method: string, params: any[]): Promise<any> {
    // Simulate blockchain call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock responses for different methods
    switch (method) {
      case "getPlayerState":
        return {
          level: 1,
          health: 100,
          maxHealth: 100,
          experience: 0,
          gold: 0,
          stats: { strength: 10, dexterity: 10, vitality: 10 },
          equipment: { weapon: "Basic Sword", armor: "Basic Armor" },
          availableStatPoints: 0,
        };
      case "explore":
        return {
          success: true,
          encounter: Math.random() > 0.5 ? "enemy" : "treasure",
          result: "Found something interesting",
        };
      case "attack":
        return {
          playerDamage: Math.floor(Math.random() * 20) + 10,
          enemyDamage: Math.floor(Math.random() * 15) + 5,
          enemyDefeated: Math.random() > 0.7,
        };
      default:
        return { success: true };
    }
  }

  async writeContract(
    method: string,
    params: any[]
  ): Promise<{ txHash: string }> {
    // Simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { txHash: `0x${Math.random().toString(16).substr(2, 8)}` };
  }
}

const blockchainClient = new BlockchainClient();
```

## 4. Game state management action

```ts
const getGameStateAction = action({
  name: "getGameState",
  description: "Fetch current game state from blockchain",
  schema: z.object({
    playerId: z.string().describe("The player ID"),
  }),
  handler: async ({ playerId }, ctx) => {
    try {
      const gameData = await blockchainClient.callContract("getPlayerState", [
        playerId,
      ]);

      // Update context memory with blockchain state
      const memory = ctx.agentMemory as GameState;
      memory.playerId = playerId;
      memory.level = gameData.level;
      memory.health = gameData.health;
      memory.maxHealth = gameData.maxHealth;
      memory.experience = gameData.experience;
      memory.gold = gameData.gold;
      memory.strength = gameData.stats.strength;
      memory.dexterity = gameData.stats.dexterity;
      memory.vitality = gameData.stats.vitality;
      memory.weapon = gameData.equipment.weapon;
      memory.armor = gameData.equipment.armor;
      memory.availableStatPoints = gameData.availableStatPoints;
      memory.lastActionResult = "Game state updated from blockchain";

      return {
        success: true,
        gameState: gameData,
        message: `Player level ${gameData.level} with ${gameData.health}/${gameData.maxHealth} health`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get game state",
      };
    }
  },
});
```

## 5. Exploration action

```ts
const exploreAction = action({
  name: "explore",
  description: "Explore the game world to find enemies or treasures",
  schema: z.object({
    playerId: z.string().describe("The player ID"),
  }),
  handler: async ({ playerId }, ctx) => {
    const memory = ctx.agentMemory as GameState;

    // Can't explore if in battle
    if (memory.inBattle) {
      return {
        success: false,
        message:
          "Cannot explore while in battle. Resolve current battle first.",
      };
    }

    // Can't explore with available stat points
    if (memory.availableStatPoints > 0) {
      return {
        success: false,
        message: "Must allocate available stat points before exploring.",
      };
    }

    try {
      const txResult = await blockchainClient.writeContract("explore", [
        playerId,
      ]);

      // Wait for transaction and get result
      const result = await blockchainClient.callContract("getLastAction", [
        playerId,
      ]);

      if (result.encounter === "enemy") {
        memory.inBattle = true;
        memory.enemyName = "Goblin Warrior";
        memory.enemyHealth = 50;
        memory.enemyMaxHealth = 50;
        memory.lastActionResult = `Encountered ${memory.enemyName}!`;
      } else if (result.encounter === "treasure") {
        const goldFound = Math.floor(Math.random() * 20) + 5;
        memory.gold += goldFound;
        memory.lastActionResult = `Found ${goldFound} gold!`;
      } else {
        memory.lastActionResult = "Explored area but found nothing.";
      }

      return {
        success: true,
        txHash: txResult.txHash,
        encounter: result.encounter,
        message: memory.lastActionResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Exploration failed",
      };
    }
  },
});
```

## 6. Combat action

```ts
const attackAction = action({
  name: "attack",
  description: "Attack the current enemy",
  schema: z.object({
    playerId: z.string().describe("The player ID"),
  }),
  handler: async ({ playerId }, ctx) => {
    const memory = ctx.agentMemory as GameState;

    if (!memory.inBattle) {
      return {
        success: false,
        message: "Not in battle. Explore to find enemies.",
      };
    }

    try {
      const txResult = await blockchainClient.writeContract("attack", [
        playerId,
      ]);
      const combatResult = await blockchainClient.callContract(
        "getCombatResult",
        [playerId]
      );

      // Apply combat results
      memory.health = Math.max(0, memory.health - combatResult.enemyDamage);
      memory.enemyHealth = Math.max(
        0,
        memory.enemyHealth - combatResult.playerDamage
      );

      let actionResult = `Dealt ${combatResult.playerDamage} damage`;
      if (combatResult.enemyDamage > 0) {
        actionResult += `, took ${combatResult.enemyDamage} damage`;
      }

      // Check battle outcome
      if (memory.health <= 0) {
        memory.inBattle = false;
        memory.lastActionResult = "You died in battle!";
        return {
          success: true,
          died: true,
          message: "Combat failed - player died",
        };
      } else if (memory.enemyHealth <= 0) {
        memory.inBattle = false;
        const xpGained = 25;
        const goldGained = 10;
        memory.experience += xpGained;
        memory.gold += goldGained;
        memory.lastActionResult = `Defeated ${memory.enemyName}! Gained ${xpGained} XP and ${goldGained} gold.`;

        // Check for level up
        if (memory.experience >= memory.level * 100) {
          memory.level++;
          memory.availableStatPoints += 3;
          memory.maxHealth += 10;
          memory.health = memory.maxHealth; // Full heal on level up
          memory.lastActionResult += " LEVEL UP! Gained 3 stat points.";
        }
      } else {
        memory.lastActionResult = actionResult;
      }

      return {
        success: true,
        txHash: txResult.txHash,
        combatResult,
        message: memory.lastActionResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Attack failed",
      };
    }
  },
});
```

## 7. Stat allocation action

```ts
const allocateStatsAction = action({
  name: "allocateStats",
  description: "Allocate available stat points",
  schema: z.object({
    playerId: z.string().describe("The player ID"),
    strength: z
      .number()
      .min(0)
      .default(0)
      .describe("Points to add to strength"),
    dexterity: z
      .number()
      .min(0)
      .default(0)
      .describe("Points to add to dexterity"),
    vitality: z
      .number()
      .min(0)
      .default(0)
      .describe("Points to add to vitality"),
  }),
  handler: async ({ playerId, strength, dexterity, vitality }, ctx) => {
    const memory = ctx.agentMemory as GameState;
    const totalPoints = strength + dexterity + vitality;

    if (totalPoints > memory.availableStatPoints) {
      return {
        success: false,
        message: `Cannot allocate ${totalPoints} points. Only ${memory.availableStatPoints} available.`,
      };
    }

    if (totalPoints === 0) {
      return {
        success: false,
        message: "Must allocate at least 1 stat point.",
      };
    }

    try {
      const txResult = await blockchainClient.writeContract("allocateStats", [
        playerId,
        strength,
        dexterity,
        vitality,
      ]);

      // Apply stat changes
      memory.strength += strength;
      memory.dexterity += dexterity;
      memory.vitality += vitality;
      memory.availableStatPoints -= totalPoints;

      // Vitality increases max health
      if (vitality > 0) {
        const healthIncrease = vitality * 5;
        memory.maxHealth += healthIncrease;
        memory.health += healthIncrease; // Also heal current health
      }

      memory.lastActionResult = `Allocated ${totalPoints} stat points: +${strength} STR, +${dexterity} DEX, +${vitality} VIT`;

      return {
        success: true,
        txHash: txResult.txHash,
        message: memory.lastActionResult,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Stat allocation failed",
      };
    }
  },
});
```

## 8. Create the blockchain game extension

```ts
const blockchainGameExtension = extension({
  name: "blockchainGame",
  inputs: {}, // Required property
  contexts: {
    game: gameContext,
  },
  actions: [
    getGameStateAction,
    exploreAction,
    attackAction,
    allocateStatsAction,
  ],
});

createDreams({
  model: anthropic("claude-3-7-sonnet-latest"),
  extensions: [cliExtension, blockchainGameExtension],
  context: gameContext,
}).start({ playerId: "player123" });
```


file: ./content/docs/tutorials/gaming/game-agent.mdx
meta: {
  "title": "Game Agent",
  "description": "Agent that plays games by interacting with game APIs and managing game state."
}
        
## Setup

Ensure the following environment variables are set:

* `ANTHROPIC_API_KEY`: Your Anthropic API key
* `GAME_API_TOKEN`: API token for your target game

```typescript title="index.ts"
import { createDreams, context, action, validateEnv } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { anthropic } from "@ai-sdk/anthropic";
import * as z from "zod/v4";

validateEnv(
  z.object({
    ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
    GAME_API_TOKEN: z.string().min(1, "GAME_API_TOKEN is required"),
  })
);

const GAME_API_BASE = "https://api.gameexample.com";
```

This example shows a generic game agent pattern. Replace `GAME_API_BASE` and
authentication with your specific game's API.

## 2. Game state context

```ts
interface GameState {
  playerId: string;
  level: number;
  health: number;
  maxHealth: number;
  inventory: string[];
  currentLocation: string;
  experience: number;
  gameStatus: "playing" | "dead" | "victory";
}

const gameContext = context({
  type: "game",
  schema: z.object({
    playerId: z.string(),
  }),
  key: ({ playerId }) => `game:${playerId}`,
  create: () => ({
    playerId: "",
    level: 1,
    health: 100,
    maxHealth: 100,
    inventory: [],
    currentLocation: "starting_area",
    experience: 0,
    gameStatus: "playing" as const,
  }),
  render: ({ memory }) => `
Player Status:
- Level: ${memory.level}
- Health: ${memory.health}/${memory.maxHealth}
- Location: ${memory.currentLocation}
- Experience: ${memory.experience}
- Inventory: ${memory.inventory.join(", ") || "empty"}
- Status: ${memory.gameStatus}
  `,
});
```

The context tracks all game state including health, inventory, location, and
progression.

## 3. Game state fetching action

```ts
const getGameStateAction = action({
  name: "getGameState",
  description: "Fetch current game state from the API",
  schema: z.object({
    playerId: z.string().describe("The player ID"),
  }),
  handler: async ({ playerId }, ctx) => {
    try {
      const response = await fetch(
        `${GAME_API_BASE}/player/${playerId}/state`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GAME_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const gameData = await response.json();

      // Update context memory with fresh game state
      const memory = ctx.agentMemory as GameState;
      Object.assign(memory, {
        level: gameData.level,
        health: gameData.health,
        maxHealth: gameData.maxHealth,
        inventory: gameData.inventory,
        currentLocation: gameData.location,
        experience: gameData.experience,
        gameStatus: gameData.status,
      });

      return {
        success: true,
        gameState: gameData,
        message: `Player level ${gameData.level} at ${gameData.location}`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get game state",
      };
    }
  },
});
```

## 4. Combat action

```ts
const performCombatAction = action({
  name: "performCombat",
  description: "Engage in combat with strategy choice",
  schema: z.object({
    action: z
      .enum(["attack", "defend", "special", "flee"])
      .describe("Combat action to take"),
    target: z.string().optional().describe("Target for the action"),
  }),
  handler: async ({ action, target }, ctx) => {
    const memory = ctx.agentMemory as GameState;

    if (memory.gameStatus !== "playing") {
      return {
        success: false,
        message: "Cannot perform combat - game not active",
      };
    }

    try {
      const response = await fetch(`${GAME_API_BASE}/combat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GAME_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: memory.playerId,
          action,
          target,
        }),
      });

      const result = await response.json();

      // Update health based on combat result
      if (result.playerHealth !== undefined) {
        memory.health = result.playerHealth;
      }

      if (result.experience) {
        memory.experience += result.experience;
      }

      return {
        success: true,
        combatResult: result,
        damage: result.damage || 0,
        healthRemaining: memory.health,
        experienceGained: result.experience || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Combat failed",
      };
    }
  },
});
```

## 5. Inventory management action

```ts
const manageInventoryAction = action({
  name: "manageInventory",
  description: "Use, equip, or discard items from inventory",
  schema: z.object({
    action: z.enum(["use", "equip", "discard"]).describe("Inventory action"),
    itemName: z.string().describe("Name of the item"),
  }),
  handler: async ({ action, itemName }, ctx) => {
    const memory = ctx.agentMemory as GameState;

    if (!memory.inventory.includes(itemName)) {
      return {
        success: false,
        message: `Item "${itemName}" not found in inventory`,
      };
    }

    try {
      const response = await fetch(`${GAME_API_BASE}/inventory`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GAME_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: memory.playerId,
          action,
          itemName,
        }),
      });

      const result = await response.json();

      // Update inventory
      if (action === "discard" || action === "use") {
        memory.inventory = memory.inventory.filter((item) => item !== itemName);
      }

      // Update health if item was healing
      if (result.healthChange) {
        memory.health = Math.min(
          memory.maxHealth,
          memory.health + result.healthChange
        );
      }

      return {
        success: true,
        action,
        itemName,
        result: result.message,
        newHealth: memory.health,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Inventory action failed",
      };
    }
  },
});
```

## 6. Create the game agent

```ts
createDreams({
  model: anthropic("claude-3-7-sonnet-latest"),
  extensions: [cliExtension],
  context: gameContext,
  actions: [getGameStateAction, performCombatAction, manageInventoryAction],
}).start({ playerId: "player123" });
```


file: ./content/docs/tutorials/gaming/giga.mdx
meta: {
  "title": "Building a Gigaverse Game Agent",
  "description": "This guide will walk you through creating an AI agent that can play the Gigaverse dungeon crawler game using Daydreams."
}
        
## Prerequisites

Before starting, make sure you have:

1. A Gigaverse account
2. The following environment variables set up:
   * `ANTHROPIC_API_KEY`: Your Anthropic API key
   * `GIGA_TOKEN`: Your Gigaverse authentication token (Bearer token from
     browser)

## Creating the Agent

First, let's create a basic Gigaverse agent:

```ts
import { anthropic } from "@ai-sdk/anthropic";
import {
  createDreams,
  context,
  render,
  action,
  validateEnv,
  LogLevel,
  type Agent,
} from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { string, z } from "zod/v4";

// Validate environment variables
const env = validateEnv(
  z.object({
    ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
    GIGA_TOKEN: z.string().min(1, "GIGA_TOKEN is required"),
  })
);

// Define the goal-oriented context
const goalContexts = context({
  type: "goal",
  schema: z.object({
    id: string(),
    initialGoal: z.string(),
    initialTasks: z.array(z.string()),
  }),

  key({ id }) {
    return id;
  },

  create(state) {
    return {
      goal: state.args.initialGoal,
      tasks: state.args.initialTasks ?? [],
      currentTask: state.args.initialTasks?.[0],
    };
  },

  render({ memory }) {
    return render(template, {
      goal: memory.goal,
      tasks: memory.tasks.join("\n"),
      currentTask: memory.currentTask ?? "NONE",
    });
  },
});

// Create the Gigaverse agent
createDreams({
  logger: LogLevel.INFO,
  model: anthropic("claude-3-7-sonnet-latest"),
  extensions: [cliExtension],
  context: goalContexts,
  actions: [
    // Actions will be defined below
  ],
}).start({
  id: "gigaverse-agent",
  initialGoal: "Successfully complete a dungeon run in Gigaverse",
  initialTasks: [
    "Start a new dungeon run",
    "Make strategic combat decisions using rock-paper-scissors mechanics",
    "Select optimal loot after defeating enemies",
    "Progress as far as possible in the dungeon",
  ],
});
```

## Understanding Gigaverse Game Mechanics

Gigaverse is a dungeon crawler game with the following key mechanics:

1. **Rock-Paper-Scissors Combat**: Battles are resolved using the classic
   rock-paper-scissors game:

   * Rock beats Scissors
   * Scissors beats Paper
   * Paper beats Rock

2. **Dungeon Progression**: Players advance through the dungeon by defeating
   enemies.

3. **Loot System**: After defeating enemies, players can select one of three
   loot options to enhance their character.

4. **Health Management**: Players must manage their health throughout the
   dungeon run.

## Core Game Actions

Let's implement the three main actions needed for the Gigaverse agent:

### 1. Attack in Dungeon

This action handles both combat (rock-paper-scissors) and loot selection:

```ts
action({
  name: "attackInDungeon",
  description: "Attack in the dungeon using rock-paper-scissors game mechanics",
  schema: z
    .object({
      action: z
        .enum([
          "rock",
          "paper",
          "scissor",
          "loot_one",
          "loot_two",
          "loot_three",
        ])
        .describe("The attack move to make"),
      dungeonId: z
        .number()
        .default(0)
        .describe("The ID of the dungeon"),
    })
    .describe(
      "You use this to make an action in a dungeon. If the lootPhase == true then you can select the Loot option, which will then take you to the next phase. If the lootPhase == false then you can select the Rock, Paper, Scissors option."
    ),
  async handler(data, ctx, agent) {
    try {
      const { action, dungeonId } = data;

      const payload = {
        action: action,
        actionToken: new Date().getTime().toString(),
        dungeonId: dungeonId,
      };

      const response = await fetch(
        "https://gigaverse.io/api/game/dungeon/action",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.GIGA_TOKEN}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Attack action failed with status ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        result,
        message: `Successfully performed ${action} attack in dungeon ${dungeonId}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        message: "Attack action failed",
      };
    }
  },
}),
```

### 2. Get Player State

This action retrieves the current state of the player in the dungeon:

```ts
action({
  name: "getPlayerState",
  description: "Get the current state of the player in the dungeon",
  schema: z.object({}),
  async handler(data, ctx, agent) {
    try {
      const response = await fetch(
        "https://gigaverse.io/api/game/dungeon/state",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.GIGA_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Fetch player state failed with status ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        playerState: result,
        message: "Successfully fetched player's dungeon state",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        message: "Failed to fetch player's dungeon state",
      };
    }
  },
}),
```

### 3. Start New Run

This action initiates a new dungeon run:

```ts
action({
  name: "startNewRun",
  description: "Start a new dungeon run. Use this when the player dies or wants to start a new run from outside the dungeon.",
  schema: z.object({
    dungeonId: z
      .number()
      .default(1)
      .describe("The ID of the dungeon to start. Default is 1."),
  }),
  async handler(data, ctx, agent) {
    try {
      const { dungeonId } = data;

      const payload = {
        action: "start_run",
        actionToken: new Date().getTime().toString(),
        dungeonId: dungeonId,
      };

      const response = await fetch(
        "https://gigaverse.io/api/game/dungeon/action",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.GIGA_TOKEN}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Start new run failed with status ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        result,
        message: `Successfully started a new run in dungeon ${dungeonId}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        message: "Failed to start a new dungeon run",
      };
    }
  },
}),
```

For a more thorough demonstration of API implementation for Gigaverse, you can
find the complete example in the
[examples](https://github.com/daydreamsai/daydreams/tree/main/examples/games/gigaverse)
directory.


file: ./content/docs/tutorials/mcp/blender.mdx
meta: {
  "title": "Blender",
  "description": "Configure a Daydreams agent to connect to and use tools from the Blender MCP server."
}
        
### 1. Setup

First, ensure the Blender MCP server is installed and configured correctly by
following the instructions at the
[Blender MCP repository](https://github.com/ahujasid/blender-mcp). Connect
Blender to the server from within the application before running your agent.

### 2. Configuration

This code configures a Daydreams agent to connect to the Blender MCP server.

```typescript title="blender-mcp-agent.ts"
import { createDreams, Logger, LogLevel } from "@daydreamsai/core";
import { createMcpExtension } from "@daydreamsai/mcp";
import { cliExtension } from "@daydreamsai/cli";
import { openrouter } from "@openrouter/ai-sdk-provider";

createDreams({
  model: openrouter("google/gemini-2.0-flash-001"),
  logger: new Logger({ level: LogLevel.INFO }),
  extensions: [
    cliExtension,
    createMcpExtension([
      {
        id: "blender-mcp",
        name: "Blender MCP Server",
        transport: {
          type: "stdio",
          command: "uvx",
          args: ["blender-mcp"],
        },
      },
    ]),
  ],
}).start();
```

### 3. Key Concepts

* The `createMcpExtension` function takes an array of server configurations.
  This example shows a single server.
* A unique `id` (`blender-mcp`) identifies the server for tool calls.
* The `transport` object defines how to run the server process.


file: ./content/docs/tutorials/mcp/mcp-guide.mdx
meta: {
  "title": "MCP Extension",
  "description": "Use the Daydreams MCP extension to connect agents to external tools and data sources via MCP servers."
}
        
The `@daydreamsai/mcp` extension connects a Daydreams agent to external servers
that follow the Model Context Protocol (MCP). This allows an agent to discover
and use tools provided by those servers, such as web scraping, 3D rendering, or
accessing a filesystem.

*The agent interacts with these external tools as if they were native actions.*

### Installation

Install the necessary packages into your project:

```bash
pnpm add @daydreamsai/core @daydreamsai/mcp
```

### Configuration

To connect an agent to an MCP server, you use the `createMcpExtension` in the
agent's `extensions` array. This function takes an array of server
configurations, allowing the agent to connect to one or multiple servers at
once.

### Transport Options

The `transport` object within a server's configuration specifies how the agent
connects to it.

* **`stdio`**: For servers that run as a local child process. The agent
  communicates with the server over its standard input and output streams.

  ```ts
  {
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"],
  }
  ```

* **`sse`**: For remote servers that support Server-Sent Events over HTTP.
  ```ts
  {
    type: "sse",
    serverUrl: "http://localhost:8080",
    sseEndpoint: "/events",
    messageEndpoint: "/messages",
  }
  ```


file: ./content/docs/tutorials/mcp/multi-server.mdx
meta: {
  "title": "Multiple Servers",
  "description": "Configure a Daydreams agent to connect to and use tools from multiple Model Context Protocol (MCP) servers simultaneously."
}
        
This tutorial shows how to configure an agent to connect to two separate MCP
servers: one for web scraping (`firecrawl-mcp`) and another for 3D rendering
(`blender-mcp`).

### Configuration

The agent is configured by passing an array of server configurations to
`createMcpExtension`. Each server has a unique `id` which is used to direct tool
calls to the correct server.

```typescript title="multi-mcp-agent.ts"
import { createDreams, Logger, LogLevel } from "@daydreamsai/core";
import { createMcpExtension } from "@daydreamsai/mcp";
import { cliExtension } from "@daydreamsai/cli";
import { openrouter } from "@openrouter/ai-sdk-provider";

createDreams({
  model: openrouter("google/gemini-2.0-flash-001"),
  logger: new Logger({
    level: LogLevel.INFO,
  }),
  extensions: [
    cliExtension,
    createMcpExtension([
      {
        id: "firecrawl-mcp",
        name: "Firecrawl MCP Server",
        transport: {
          type: "stdio",
          command: "npx",
          args: ["-y", "firecrawl-mcp"],
        },
      },
      {
        id: "blender-mcp",
        name: "Blender MCP Server",
        transport: {
          type: "stdio",
          command: "uvx",
          args: ["blender-mcp"],
        },
      },
    ]),
  ],
}).start();
```

### Key Concepts

* The `createMcpExtension` function takes an array of server configuration
  objects.
* Each server requires a unique `id` which the agent uses to target tool calls
  (e.g., `firecrawl-mcp`).
* The `transport` object defines the connection method. For local executables,
  `stdio` is used with a `command` and an `args` array.

### Agent Operation

Once running, the agent can access tools from both servers. It uses the
`mcp.callTool` action and specifies the target server with the `serverId`
parameter.

To use a tool from the Firecrawl server:

```typescript
// Internal agent action call
agent.actions.mcp.callTool({
  serverId: "firecrawl-mcp",
  name: "scrape_url",
  arguments: { url: "..." },
});
```

To use a tool from the Blender server:

```typescript
// Internal agent action call
agent.actions.mcp.callTool({
  serverId: "blender-mcp",
  name: "render_scene",
  arguments: { "..." }
});
```

The agent learns which tools are available on each server by calling the
`mcp.listTools` action for each `serverId` after it starts.


file: ./content/docs/tutorials/social/discord.mdx
meta: {
  "title": "Building a Discord Agent",
  "description": "This guide will walk you through creating an AI agent that can interact with Discord using DreamsAI."
}
        
## Prerequisites

Before starting, make sure you have:

1. A Discord bot application set up in the Discord Developer Portal
2. The following environment variables set up:
   * `GROQ_API_KEY`: Your Groq API key
   * `DISCORD_TOKEN`: Your Discord bot token

## Getting Your Discord Token

To get your Discord bot token, follow these steps:

1. **Go to the Discord Developer Portal**

   * Visit
     [https://discord.com/developers/applications](https://discord.com/developers/applications)
   * Log in with your Discord account

2. **Create a New Application**

   * Click "New Application"
   * Give your bot a name and click "Create"

3. **Navigate to the Bot Section**

   * In the left sidebar, click "Bot"
   * Click "Add Bot" if prompted

4. **Get Your Token**

   * Under the "Token" section, click "Reset Token"
   * Copy the token that appears (keep this secret!)
   * Add this token to your `.env` file as `DISCORD_TOKEN=your_token_here`

5. **Set Bot Permissions**

   * Scroll down to "Bot Permissions"
   * Select the permissions your bot needs (at minimum: "Send Messages", "Read
     Message History")

6. **Invite Your Bot to a Server**
   * Go to the "OAuth2" > "URL Generator" section
   * Select "bot" scope and the permissions you need
   * Use the generated URL to invite your bot to a Discord server

## Creating the Agent

First, let's create a basic Discord agent:

```ts title="agent.ts"
import { createGroq } from "@ai-sdk/groq";
import {
  createContainer,
  createDreams,
  LogLevel,
  discord,
} from "@daydreamsai/core";
import { discord } from "@daydreamsai/discord";

// Initialize Groq client
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Create the agent
const agent = createDreams({
  logger: LogLevel.DEBUG,
  container: createContainer(),
  model: groq("deepseek-r1-distill-llama-70b"),
  extensions: [discord],
});

// Start the agent
await agent.start();
```

For the full discord example, check out the
[Example-Discord](https://github.com/daydreamsai/daydreams/tree/main/examples/discord)
on Github.


file: ./content/docs/tutorials/social/telegram.mdx
meta: {
  "title": "Telegram Bot Agent",
  "description": "Agent that responds to messages in Telegram chats using the telegram extension."
}
        
## 1. Environment setup and imports

```typescript title="index.ts"
import { createGroq } from "@ai-sdk/groq";
import { createDreams, LogLevel, validateEnv } from "@daydreamsai/core";
import { telegram } from "@daydreamsai/telegram";
import * as z from "zod/v4";

const env = validateEnv(
  z.object({
    TELEGRAM_TOKEN: z.string().min(1, "TELEGRAM_TOKEN is required"),
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  })
);
```

The telegram extension requires a `TELEGRAM_TOKEN` environment variable. Get
your bot token by creating a new bot with [@BotFather](https://t.me/botfather)
on Telegram.

## 2. Configure the language model

```ts
const groq = createGroq({
  apiKey: env.GROQ_API_KEY!,
});
```

This example uses Groq's language models. You can substitute any compatible
provider from the AI SDK.

## 3. Create and start the telegram agent

```ts
createDreams({
  logLevel: LogLevel.DEBUG,
  model: groq("deepseek-r1-distill-llama-70b"),
  extensions: [telegram],
}).start();
```

The `telegram` extension handles:

* Connecting to Telegram using the bot token
* Receiving messages from users as `telegram:message` inputs
* Sending responses back through `telegram:message` outputs
* Managing chat contexts for each conversation


file: ./content/docs/tutorials/social/twitter.mdx
meta: {
  "title": "Building a Twitter Agent",
  "description": "This guide will walk you through creating an AI agent that can interact with Twitter using DreamsAI."
}
        
## Prerequisites

Before starting, make sure you have:

1. A Twitter developer account
2. The following environment variables set up:
   * `GROQ_API_KEY`: Your Groq API key

## Creating the Agent

First, let's create a basic Twitter agent:

```ts
import { createGroq } from "@ai-sdk/groq";
import {
  createContainer,
  createDreams,
  LogLevel,
  twitter,
} from "@daydreamsai/core";

// Initialize Groq client
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Create the agent
const agent = createDreams({
  logger: LogLevel.DEBUG,
  container: createContainer(),
  model: groq("deepseek-r1-distill-llama-70b"),
  extensions: [twitter],
});

// Start the agent
await agent.start();
```

For the full twitter example, check out the
[Example-Twitter](https://github.com/daydreamsai/daydreams/tree/main/examples/twitter)
on Github.
