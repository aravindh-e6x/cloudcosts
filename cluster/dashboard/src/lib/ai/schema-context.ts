// System prompts for AI chat - simplified since SQL is now handled by query-tools.ts

export interface WorkspaceContext {
  eksCluster: string
  e6Clusters?: string[]
}

export const EXAMPLE_QUESTIONS = [
  "What is the total cost for this workspace?",
  "How many nodes are running?",
  "Show pods per namespace",
  "Which nodes cost the most?",
  "Give me a workspace summary",
  "How many E6 clusters are there?",
]
