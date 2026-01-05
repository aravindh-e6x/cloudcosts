// Shared component colors - use these everywhere for consistency
const E6_GREEN = "#10b981"  // Darker green - same for all components

export const COMPONENT_COLORS: Record<string, string> = {
  gateway: E6_GREEN,
  queue: E6_GREEN,
  executor: E6_GREEN,
  schema: E6_GREEN,
  storage: E6_GREEN,
}

export const COMPONENT_NAMES = ["Gateway", "Queue", "Executor", "Schema", "Storage"] as const
export type ComponentName = typeof COMPONENT_NAMES[number]
