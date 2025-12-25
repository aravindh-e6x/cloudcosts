"use client"

import { useQuery as useTanstackQuery } from "@tanstack/react-query"

// Types matching the Vantage API responses
export interface VantageTag {
  token: string
  key: string
  values: string[]
  created_at: string
}

export interface VantageResource {
  token: string
  uuid: string
  type: string
  label: string
  metadata: Record<string, unknown>
  account_id: string
  billing_account_id: string
  provider: string
  region: string
  cost?: number
  created_at: string
  tags?: Array<{ key: string; value: string }>
}

export interface VantageCost {
  amount: number
  currency: string
  provider: string
  account_id: string
  service: string
  region?: string
  resource_id?: string
  accrued_at: string
  tags?: Record<string, string>
}

interface VantageQueryOptions {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
}

// Generic fetch function for Vantage API proxy
async function fetchVantage<T>(
  endpoint: string,
  params?: Record<string, string | boolean | number | string[]>
): Promise<T> {
  const searchParams = new URLSearchParams()

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(`${key}[]`, v))
        } else {
          searchParams.set(key, String(value))
        }
      }
    })
  }

  const query = searchParams.toString()
  const url = `/api/vantage/${endpoint}${query ? `?${query}` : ""}`

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `Vantage API error: ${response.status}`)
  }

  return response.json()
}

// Hook to fetch all tags
export function useVantageTags(options?: VantageQueryOptions) {
  const { data, isLoading, error, refetch } = useTanstackQuery({
    queryKey: ["vantage", "tags"],
    queryFn: () => fetchVantage<{ tags: VantageTag[] }>("tags"),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return {
    data: data?.tags ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  }
}

// Hook to fetch resources with optional cost inclusion
export function useVantageResources(
  params?: {
    resource_report_token?: string
    filter?: string
    include_costs?: boolean
    limit?: number
  },
  options?: VantageQueryOptions
) {
  const { data, isLoading, error, refetch } = useTanstackQuery({
    queryKey: ["vantage", "resources", params],
    queryFn: () =>
      fetchVantage<{ resources: VantageResource[] }>("resources", {
        resource_report_token: params?.resource_report_token,
        filter: params?.filter,
        include_costs: params?.include_costs,
        limit: params?.limit,
      } as Record<string, string | boolean | number>),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return {
    data: data?.resources ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  }
}

// Hook to fetch costs with VQL filtering
export function useVantageCosts(
  params?: {
    cost_report_token?: string
    filter?: string
    start_date?: string
    end_date?: string
    groupings?: string[]
    limit?: number
  },
  options?: VantageQueryOptions
) {
  const { data, isLoading, error, refetch } = useTanstackQuery({
    queryKey: ["vantage", "costs", params],
    queryFn: () =>
      fetchVantage<{ costs: VantageCost[] }>("costs", {
        cost_report_token: params?.cost_report_token,
        filter: params?.filter,
        start_date: params?.start_date,
        end_date: params?.end_date,
        groupings: params?.groupings,
        limit: params?.limit,
      } as Record<string, string | boolean | number | string[]>),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return {
    data: data?.costs ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  }
}

// Hook to get tag coverage statistics
export function useTagCoverage(
  requiredTags: string[],
  options?: VantageQueryOptions
) {
  const { data: allResources, loading: resourcesLoading, error: resourcesError } =
    useVantageResources({ include_costs: true }, options)

  const { data: tags, loading: tagsLoading, error: tagsError } =
    useVantageTags(options)

  // Calculate coverage for each required tag
  const coverage = requiredTags.map((tagKey) => {
    const taggedCount = allResources.filter((r) =>
      r.tags?.some((t) => t.key === tagKey)
    ).length
    const totalCount = allResources.length
    const taggedCost = allResources
      .filter((r) => r.tags?.some((t) => t.key === tagKey))
      .reduce((sum, r) => sum + (r.cost || 0), 0)
    const untaggedCost = allResources
      .filter((r) => !r.tags?.some((t) => t.key === tagKey))
      .reduce((sum, r) => sum + (r.cost || 0), 0)

    return {
      tagKey,
      taggedCount,
      untaggedCount: totalCount - taggedCount,
      totalCount,
      coveragePercent: totalCount > 0 ? (taggedCount / totalCount) * 100 : 0,
      taggedCost,
      untaggedCost,
    }
  })

  // Calculate overall stats
  const totalResources = allResources.length
  const totalCost = allResources.reduce((sum, r) => sum + (r.cost || 0), 0)

  // A resource is "fully tagged" if it has all required tags
  const fullyTaggedResources = allResources.filter((r) =>
    requiredTags.every((tagKey) => r.tags?.some((t) => t.key === tagKey))
  )
  const fullyTaggedCount = fullyTaggedResources.length
  const fullyTaggedCost = fullyTaggedResources.reduce(
    (sum, r) => sum + (r.cost || 0),
    0
  )

  // Resources missing at least one required tag
  const partiallyTaggedResources = allResources.filter(
    (r) =>
      !requiredTags.every((tagKey) => r.tags?.some((t) => t.key === tagKey)) &&
      requiredTags.some((tagKey) => r.tags?.some((t) => t.key === tagKey))
  )

  // Resources with no required tags at all
  const untaggedResources = allResources.filter(
    (r) => !requiredTags.some((tagKey) => r.tags?.some((t) => t.key === tagKey))
  )

  return {
    coverage,
    summary: {
      totalResources,
      totalCost,
      fullyTaggedCount,
      fullyTaggedPercent: totalResources > 0 ? (fullyTaggedCount / totalResources) * 100 : 0,
      fullyTaggedCost,
      partiallyTaggedCount: partiallyTaggedResources.length,
      untaggedCount: untaggedResources.length,
      untaggedCost: totalCost - fullyTaggedCost,
    },
    resources: {
      all: allResources,
      fullyTagged: fullyTaggedResources,
      partiallyTagged: partiallyTaggedResources,
      untagged: untaggedResources,
    },
    tags,
    loading: resourcesLoading || tagsLoading,
    error: resourcesError || tagsError,
  }
}

// Hook to get resources grouped by missing tags
export function useUntaggedByService(
  requiredTags: string[],
  options?: VantageQueryOptions
) {
  const { data: allResources, loading, error } = useVantageResources(
    { include_costs: true },
    options
  )

  // Group untagged resources by service/type
  const byService = allResources.reduce(
    (acc, resource) => {
      const missingTags = requiredTags.filter(
        (tagKey) => !resource.tags?.some((t) => t.key === tagKey)
      )

      if (missingTags.length === 0) return acc

      const service = resource.type || "Unknown"
      if (!acc[service]) {
        acc[service] = {
          service,
          count: 0,
          cost: 0,
          missingTags: new Set<string>(),
          resources: [],
        }
      }

      acc[service].count++
      acc[service].cost += resource.cost || 0
      missingTags.forEach((tag) => acc[service].missingTags.add(tag))
      acc[service].resources.push(resource)

      return acc
    },
    {} as Record<
      string,
      {
        service: string
        count: number
        cost: number
        missingTags: Set<string>
        resources: VantageResource[]
      }
    >
  )

  // Convert to array and sort by cost
  const services = Object.values(byService)
    .map((s) => ({
      ...s,
      missingTags: Array.from(s.missingTags),
    }))
    .sort((a, b) => b.cost - a.cost)

  return {
    data: services,
    loading,
    error,
  }
}

// Hook to get tag value distribution for a specific tag
export function useTagValueDistribution(
  tagKey: string,
  options?: VantageQueryOptions
) {
  const { data: allResources, loading, error } = useVantageResources(
    { include_costs: true },
    options
  )

  // Group by tag value
  const distribution = allResources.reduce(
    (acc, resource) => {
      const tag = resource.tags?.find((t) => t.key === tagKey)
      const value = tag?.value || "(untagged)"

      if (!acc[value]) {
        acc[value] = {
          value,
          count: 0,
          cost: 0,
        }
      }

      acc[value].count++
      acc[value].cost += resource.cost || 0

      return acc
    },
    {} as Record<string, { value: string; count: number; cost: number }>
  )

  // Convert to array and sort by cost
  const values = Object.values(distribution).sort((a, b) => b.cost - a.cost)

  return {
    data: values,
    loading,
    error,
  }
}
