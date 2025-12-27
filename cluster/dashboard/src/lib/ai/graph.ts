import { StateGraph, Annotation, END, START } from "@langchain/langgraph"
import { ChatAnthropic } from "@langchain/anthropic"
import { HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages"
import { QUERY_TOOLS, getToolByName, getToolsDescription } from "./query-tools"

// Workspace context type
export interface WorkspaceContext {
  eksCluster: string
  e6Clusters?: string[]
}

// State annotation for the graph
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  userQuestion: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  workspaceContext: Annotation<WorkspaceContext | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  intent: Annotation<"query" | "explain" | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  selectedTools: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  sql: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  database: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "kubernetes",
  }),
  queryResult: Annotation<Record<string, unknown>[] | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  error: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  finalAnswer: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
})

type AgentStateType = typeof AgentState.State

// Create model
const getModel = () => {
  return new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0,
  })
}

// Node: Router - classify user intent
async function router(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const model = getModel()

  const response = await model.invoke([
    new SystemMessage(`Classify the user's question as:
- "query": User wants data (costs, metrics, counts, lists, comparisons)
- "explain": User wants to understand what data is available or how something works

Respond with ONLY: query OR explain`),
    new HumanMessage(state.userQuestion),
  ])

  const intent = (response.content as string).trim().toLowerCase()

  return {
    intent: intent === "explain" ? "explain" : "query",
  }
}

// Node: Tool Selector - pick the right pre-defined query tool
async function toolSelector(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const model = getModel()
  const toolsList = getToolsDescription()

  const response = await model.invoke([
    new SystemMessage(`You are a query tool selector. Based on the user's question, select the most appropriate query tool(s).

AVAILABLE TOOLS:
${toolsList}

RULES:
1. Select 1-3 tools that best answer the question
2. Return ONLY the tool names, one per line
3. If the question needs multiple data points, select multiple tools
4. For "summary" or "overview" questions, use get_workspace_summary
5. For cost questions, prefer get_total_cost or get_cost_per_node
6. For node questions, use get_node_* tools
7. For pod questions, use get_pod_* or get_pods_* tools
8. For E6 query metrics, use get_queries_* or get_active_* tools

EXAMPLES:
"What is the total cost?" -> get_total_cost
"How many nodes?" -> get_node_count
"Show pods per namespace" -> get_pods_per_namespace
"Give me a summary" -> get_workspace_summary
"Cost breakdown by node" -> get_cost_per_node

Return ONLY tool names, nothing else.`),
    new HumanMessage(state.userQuestion),
  ])

  const content = (response.content as string).trim()
  const toolNames = content.split("\n").map(t => t.trim()).filter(t => t.length > 0)

  // Validate tool names
  const validTools = toolNames.filter(name => getToolByName(name) !== undefined)

  // Fallback to workspace summary if no valid tools found
  if (validTools.length === 0) {
    validTools.push("get_workspace_summary")
  }

  return {
    selectedTools: validTools,
  }
}

// Node: Execute Query - run the selected tool's SQL
async function executeQuery(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const eksCluster = state.workspaceContext?.eksCluster || "k3d-cloudcosts"

  // Get the first selected tool
  const toolName = state.selectedTools[0]
  const tool = getToolByName(toolName)

  if (!tool) {
    return {
      error: `Tool not found: ${toolName}`,
      queryResult: null,
    }
  }

  // Generate SQL using the tool's template
  const sql = tool.sql({ eksCluster, timeRange: "1 hour" })
  const database = tool.database

  try {
    const greptimeUrl = process.env.GREPTIMEDB_URL || "http://localhost:4000"
    const username = process.env.GREPTIMEDB_USERNAME || ""
    const password = process.env.GREPTIMEDB_PASSWORD || ""
    const authHeader = username ? `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` : ""

    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" }
    if (authHeader) {
      headers["Authorization"] = authHeader
    }

    const response = await fetch(
      `${greptimeUrl}/v1/sql?db=${database}`,
      {
        method: "POST",
        headers,
        body: `sql=${encodeURIComponent(sql)}`,
      }
    )

    const data = await response.json()

    if (data.error) {
      return {
        error: `Query error: ${data.error}`,
        queryResult: null,
        sql,
        database,
      }
    }

    // Transform GreptimeDB response to array of objects
    const columns = data.output?.[0]?.records?.schema?.column_schemas?.map(
      (c: { name: string }) => c.name
    ) || []
    const rows = data.output?.[0]?.records?.rows || []

    const result = rows.map((row: unknown[]) => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i]
      })
      return obj
    })

    return {
      queryResult: result,
      error: null,
      sql,
      database,
    }
  } catch (err) {
    return {
      error: `Failed to execute query: ${err}`,
      queryResult: null,
      sql,
      database,
    }
  }
}

// Node: Synthesize Answer
async function synthesize(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const model = getModel()
  const eksCluster = state.workspaceContext?.eksCluster || "unknown"

  let context = ""

  if (state.error) {
    context = `Query failed with error: ${state.error}\nSQL attempted: ${state.sql}`
  } else if (state.queryResult && state.queryResult.length > 0) {
    context = `Database: ${state.database}
SQL: ${state.sql}

Results (${state.queryResult.length} rows):
${JSON.stringify(state.queryResult.slice(0, 50), null, 2)}`
    if (state.queryResult.length > 50) {
      context += `\n... and ${state.queryResult.length - 50} more rows`
    }
  } else {
    context = `SQL: ${state.sql}\n\nNo results returned.`
  }

  const response = await model.invoke([
    new SystemMessage(`You are a cost analyst for EKS workspace: ${eksCluster}

RULES:
1. Lead with the KEY NUMBER (e.g., "$156.24/day across 7 nodes")
2. Use markdown tables for multi-row data
3. Format costs: $X.XX/hr ($XX.XX/day)
4. Format memory: X.X GB
5. Format percentages: XX.X%
6. Highlight problems: low utilization (<50%), high costs, failures
7. Be CONCISE - no fluff, no explanations unless asked`),
    new HumanMessage(`Question: ${state.userQuestion}\n\n${context}`),
  ])

  return {
    finalAnswer: response.content as string,
  }
}

// Node: Schema Explainer
async function explainSchema(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const model = getModel()
  const toolsList = getToolsDescription()

  const response = await model.invoke([
    new SystemMessage(`You are a helpful assistant that explains what data is available.

AVAILABLE QUERIES:
${toolsList}

DATABASES:
- kubernetes: Infrastructure metrics (costs, nodes, pods, containers, network)
- e6: Query engine metrics (queries completed, failed, running, data read)

Answer questions about what data is available and what can be queried. Be concise.`),
    new HumanMessage(state.userQuestion),
  ])

  return {
    finalAnswer: response.content as string,
  }
}

// Conditional edge: route based on intent
function routeByIntent(state: AgentStateType): string {
  if (state.intent === "explain") {
    return "explainSchema"
  }
  return "toolSelector"
}

// Build the graph
export function createGraph() {
  const graph = new StateGraph(AgentState)
    .addNode("router", router)
    .addNode("toolSelector", toolSelector)
    .addNode("executeQuery", executeQuery)
    .addNode("synthesize", synthesize)
    .addNode("explainSchema", explainSchema)
    .addEdge(START, "router")
    .addConditionalEdges("router", routeByIntent, {
      toolSelector: "toolSelector",
      explainSchema: "explainSchema",
    })
    .addEdge("toolSelector", "executeQuery")
    .addEdge("executeQuery", "synthesize")
    .addEdge("synthesize", END)
    .addEdge("explainSchema", END)

  return graph.compile()
}

// Helper to run the graph
export async function runAgent(
  question: string,
  context?: WorkspaceContext
): Promise<{
  answer: string
  sql: string | null
  queryResult: Record<string, unknown>[] | null
  error: string | null
}> {
  const app = createGraph()

  const result = await app.invoke({
    userQuestion: question,
    workspaceContext: context || null,
    messages: [new HumanMessage(question)],
  })

  return {
    answer: result.finalAnswer || "I couldn't generate an answer.",
    sql: result.sql,
    queryResult: result.queryResult,
    error: result.error,
  }
}
