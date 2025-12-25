"use client"

import { useQuery } from "./useQuery"
import { useMemo } from "react"

// Types matching the data from GreptimeDB tables
export interface VantageTag {
  key: string
  providers: string[]
  hidden: boolean
}

export interface VantageResource {
  token: string
  uuid: string
  type: string
  label: string
  provider: string
  account_id: string
  region: string
  cost: number
}

export interface VantageCostByTag {
  provider: string
  service: string
  tag_key: string
  tag_value: string
  cost: number
}

interface VantageQueryOptions {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
}

interface DateRange {
  startTimestamp: string
  endTimestamp: string
}

// Hook to fetch all tags from vantage_tags table
export function useVantageTags(options?: VantageQueryOptions) {
  const { data, loading, error, refetch } = useQuery<{
    tag_key: string
    providers: string
    hidden: string
  }>(
    "vantage",
    `SELECT DISTINCT tag_key, providers, hidden
     FROM vantage_tags
     ORDER BY tag_key`,
    options
  )

  const tags: VantageTag[] = useMemo(() => {
    if (!data) return []
    return data.map((row) => ({
      key: row.tag_key,
      providers: row.providers?.split(",") || [],
      hidden: row.hidden === "true",
    }))
  }, [data])

  return {
    data: tags,
    loading,
    error,
    refetch,
  }
}

// Hook to fetch resources from vantage_resources table
export function useVantageResources(
  params?: {
    limit?: number
  },
  options?: VantageQueryOptions
) {
  const limit = params?.limit || 1000

  const { data, loading, error, refetch } = useQuery<{
    token: string
    uuid: string
    type: string
    label: string
    provider: string
    account_id: string
    region: string
    greptime_value: number
  }>(
    "vantage",
    `SELECT token, uuid, type, label, provider, account_id, region, greptime_value
     FROM vantage_resources
     ORDER BY greptime_value DESC
     LIMIT ${limit}`,
    options
  )

  const resources: VantageResource[] = useMemo(() => {
    if (!data) return []
    return data.map((row) => ({
      token: row.token,
      uuid: row.uuid,
      type: row.type,
      label: row.label,
      provider: row.provider,
      account_id: row.account_id,
      region: row.region,
      cost: row.greptime_value || 0,
    }))
  }, [data])

  return {
    data: resources,
    loading,
    error,
    refetch,
  }
}

// Hook to fetch cost by tag data - aggregated totals for a specific date
export function useVantageCostByTag(
  tagKey?: string,
  dateRange?: DateRange,
  options?: VantageQueryOptions
) {
  const whereConditions: string[] = []
  if (tagKey) {
    whereConditions.push(`tag_key = '${tagKey}'`)
  }
  if (dateRange) {
    whereConditions.push(`greptime_timestamp >= '${dateRange.startTimestamp}'`)
    whereConditions.push(`greptime_timestamp < '${dateRange.endTimestamp}'`)
  }
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ""

  const { data, loading, error, refetch } = useQuery<{
    provider: string
    service: string
    tag_key: string
    tag_value: string
    total_cost: number
  }>(
    "vantage",
    `SELECT provider, service, tag_key, tag_value,
            SUM(greptime_value) as total_cost
     FROM vantage_cost_by_tag
     ${whereClause}
     GROUP BY provider, service, tag_key, tag_value
     ORDER BY total_cost DESC`,
    options
  )

  const costs: VantageCostByTag[] = useMemo(() => {
    if (!data) return []
    return data.map((row) => ({
      provider: row.provider,
      service: row.service,
      tag_key: row.tag_key,
      tag_value: row.tag_value === "__untagged__" ? "" : row.tag_value,
      cost: row.total_cost || 0,
    }))
  }, [data])

  return {
    data: costs,
    loading,
    error,
    refetch,
  }
}

// Hook to get tag coverage statistics based on cost_by_tag data for a specific date
export function useTagCoverage(
  requiredTags: string[],
  dateRange?: DateRange,
  options?: VantageQueryOptions
) {
  // Build date filter clause
  const dateFilter = dateRange
    ? `AND greptime_timestamp >= '${dateRange.startTimestamp}' AND greptime_timestamp < '${dateRange.endTimestamp}'`
    : ""

  // Fetch cost by tag data for all required tags
  const { data: costByTagData, loading: costLoading, error: costError } = useQuery<{
    tag_key: string
    tag_value: string
    total_cost: number
  }>(
    "vantage",
    `SELECT tag_key, tag_value, SUM(greptime_value) as total_cost
     FROM vantage_cost_by_tag
     WHERE tag_key IN (${requiredTags.map(t => `'${t}'`).join(', ')})
     ${dateFilter}
     GROUP BY tag_key, tag_value
     ORDER BY total_cost DESC`,
    options
  )

  // Fetch total cost for context (for the selected date)
  const { data: totalCostData, loading: totalLoading, error: totalError } = useQuery<{
    total_cost: number
  }>(
    "vantage",
    `SELECT SUM(greptime_value) as total_cost
     FROM vantage_daily_cost_by_provider
     ${dateRange ? `WHERE greptime_timestamp >= '${dateRange.startTimestamp}' AND greptime_timestamp < '${dateRange.endTimestamp}'` : ""}`,
    options
  )

  // Fetch tags inventory (not date-filtered, it's a snapshot)
  const { data: tags, loading: tagsLoading, error: tagsError } = useVantageTags(options)

  // Fetch resources for resource count (not date-filtered, it's a snapshot)
  const { data: resources, loading: resourcesLoading, error: resourcesError } = useVantageResources(
    { limit: 10000 },
    options
  )

  // Calculate coverage for each required tag based on cost
  const coverage = useMemo(() => {
    if (!costByTagData) return []

    return requiredTags.map((tagKey) => {
      const tagData = costByTagData.filter(d => d.tag_key.toLowerCase() === tagKey.toLowerCase())
      const taggedCost = tagData
        .filter(d => d.tag_value !== "__untagged__" && d.tag_value !== "")
        .reduce((sum, d) => sum + d.total_cost, 0)
      const untaggedCost = tagData
        .filter(d => d.tag_value === "__untagged__" || d.tag_value === "")
        .reduce((sum, d) => sum + d.total_cost, 0)
      const totalCost = taggedCost + untaggedCost

      return {
        tagKey,
        taggedCost,
        untaggedCost,
        totalCost,
        coveragePercent: totalCost > 0 ? (taggedCost / totalCost) * 100 : 0,
        taggedCount: tagData.filter(d => d.tag_value !== "__untagged__" && d.tag_value !== "").length,
        untaggedCount: tagData.filter(d => d.tag_value === "__untagged__" || d.tag_value === "").length,
        totalCount: tagData.length,
      }
    })
  }, [costByTagData, requiredTags])

  // Calculate overall summary
  const summary = useMemo(() => {
    const totalResources = resources.length
    const totalCost = totalCostData?.[0]?.total_cost || 0

    // Calculate tagged vs untagged based on cost data
    let fullyTaggedCost = 0
    let untaggedCost = 0

    if (costByTagData) {
      // Use first required tag as proxy for "tagged" status
      const firstTagData = costByTagData.filter(d =>
        d.tag_key.toLowerCase() === requiredTags[0]?.toLowerCase()
      )
      fullyTaggedCost = firstTagData
        .filter(d => d.tag_value !== "__untagged__" && d.tag_value !== "")
        .reduce((sum, d) => sum + d.total_cost, 0)
      untaggedCost = firstTagData
        .filter(d => d.tag_value === "__untagged__" || d.tag_value === "")
        .reduce((sum, d) => sum + d.total_cost, 0)
    }

    const coveragePercent = (fullyTaggedCost + untaggedCost) > 0
      ? (fullyTaggedCost / (fullyTaggedCost + untaggedCost)) * 100
      : 0

    return {
      totalResources,
      totalCost,
      fullyTaggedCost,
      fullyTaggedPercent: coveragePercent,
      fullyTaggedCount: Math.round(totalResources * coveragePercent / 100),
      partiallyTaggedCount: 0, // Can't determine from cost data
      untaggedCount: Math.round(totalResources * (100 - coveragePercent) / 100),
      untaggedCost,
    }
  }, [costByTagData, totalCostData, resources, requiredTags])

  return {
    coverage,
    summary,
    resources: {
      all: resources,
      fullyTagged: [],
      partiallyTagged: [],
      untagged: [],
    },
    tags,
    loading: costLoading || totalLoading || tagsLoading || resourcesLoading,
    error: costError || totalError || tagsError || resourcesError,
  }
}

// Hook to get untagged cost by service for a specific date
export function useUntaggedByService(
  requiredTags: string[],
  dateRange?: DateRange,
  options?: VantageQueryOptions
) {
  // Build date filter clause
  const dateFilter = dateRange
    ? `AND greptime_timestamp >= '${dateRange.startTimestamp}' AND greptime_timestamp < '${dateRange.endTimestamp}'`
    : ""

  const { data, loading, error } = useQuery<{
    service: string
    tag_key: string
    total_cost: number
  }>(
    "vantage",
    `SELECT service, tag_key, SUM(greptime_value) as total_cost
     FROM vantage_cost_by_tag
     WHERE tag_value = '__untagged__'
       AND tag_key IN (${requiredTags.map(t => `'${t}'`).join(', ')})
     ${dateFilter}
     GROUP BY service, tag_key
     ORDER BY total_cost DESC`,
    options
  )

  const services = useMemo(() => {
    if (!data) return []

    // Group by service
    const byService: Record<string, { service: string; cost: number; missingTags: Set<string> }> = {}

    data.forEach((row) => {
      if (!byService[row.service]) {
        byService[row.service] = {
          service: row.service,
          cost: 0,
          missingTags: new Set(),
        }
      }
      byService[row.service].cost += row.total_cost
      byService[row.service].missingTags.add(row.tag_key)
    })

    return Object.values(byService)
      .map((s) => ({
        service: s.service,
        cost: s.cost,
        count: 0, // Can't determine resource count from cost data
        missingTags: Array.from(s.missingTags),
      }))
      .sort((a, b) => b.cost - a.cost)
  }, [data])

  return {
    data: services,
    loading,
    error,
  }
}

// Hook to get tag value distribution for a specific tag and date
export function useTagValueDistribution(
  tagKey: string,
  dateRange?: DateRange,
  options?: VantageQueryOptions
) {
  // Build date filter clause
  const dateFilter = dateRange
    ? `AND greptime_timestamp >= '${dateRange.startTimestamp}' AND greptime_timestamp < '${dateRange.endTimestamp}'`
    : ""

  const { data, loading, error, refetch } = useQuery<{
    tag_value: string
    total_cost: number
  }>(
    "vantage",
    `SELECT tag_value, SUM(greptime_value) as total_cost
     FROM vantage_cost_by_tag
     WHERE tag_key = '${tagKey}'
     ${dateFilter}
     GROUP BY tag_value
     ORDER BY total_cost DESC`,
    options
  )

  const distribution = useMemo(() => {
    if (!data) return []
    return data.map((row) => ({
      value: row.tag_value === "__untagged__" ? "(untagged)" : row.tag_value,
      cost: row.total_cost || 0,
      count: 0, // Can't determine from cost data
    }))
  }, [data])

  return {
    data: distribution,
    loading,
    error,
    refetch,
  }
}
