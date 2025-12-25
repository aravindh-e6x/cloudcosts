// Vantage API Client
// Documentation: https://docs.vantage.sh/api-reference

const VANTAGE_API_URL = process.env.VANTAGE_API_URL || "https://api.vantage.sh/v2"
const VANTAGE_API_TOKEN = process.env.VANTAGE_API_TOKEN

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

export interface VantagePaginatedResponse<T> {
  links: {
    self: string
    first: string
    next: string | null
    last: string
    prev: string | null
  }
  [key: string]: T[] | unknown
}

export interface VantageTagsResponse extends VantagePaginatedResponse<VantageTag> {
  tags: VantageTag[]
}

export interface VantageResourcesResponse extends VantagePaginatedResponse<VantageResource> {
  resources: VantageResource[]
}

export interface VantageCostsResponse extends VantagePaginatedResponse<VantageCost> {
  costs: VantageCost[]
}

export interface VantageCostsParams {
  cost_report_token?: string
  filter?: string // VQL filter
  start_date?: string
  end_date?: string
  groupings?: string[]
  limit?: number
}

export interface VantageResourcesParams {
  resource_report_token?: string
  filter?: string
  include_costs?: boolean
  limit?: number
}

class VantageApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message)
    this.name = "VantageApiError"
  }
}

async function vantageRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!VANTAGE_API_TOKEN) {
    throw new VantageApiError("VANTAGE_API_TOKEN is not configured", 401)
  }

  const url = `${VANTAGE_API_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${VANTAGE_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    let details: unknown
    try {
      details = JSON.parse(errorBody)
    } catch {
      details = errorBody
    }
    throw new VantageApiError(
      `Vantage API error: ${response.status} ${response.statusText}`,
      response.status,
      details
    )
  }

  return response.json()
}

export const vantageApi = {
  // Get all tags
  async getTags(): Promise<VantageTagsResponse> {
    return vantageRequest<VantageTagsResponse>("/tags")
  },

  // Get a specific tag by token
  async getTag(token: string): Promise<VantageTag> {
    return vantageRequest<VantageTag>(`/tags/${token}`)
  },

  // Get resources with optional costs
  async getResources(params?: VantageResourcesParams): Promise<VantageResourcesResponse> {
    const searchParams = new URLSearchParams()
    if (params?.resource_report_token) {
      searchParams.set("resource_report_token", params.resource_report_token)
    }
    if (params?.filter) {
      searchParams.set("filter", params.filter)
    }
    if (params?.include_costs) {
      searchParams.set("include_costs", "true")
    }
    if (params?.limit) {
      searchParams.set("limit", params.limit.toString())
    }

    const query = searchParams.toString()
    return vantageRequest<VantageResourcesResponse>(`/resources${query ? `?${query}` : ""}`)
  },

  // Get costs with VQL filtering
  async getCosts(params?: VantageCostsParams): Promise<VantageCostsResponse> {
    const searchParams = new URLSearchParams()
    if (params?.cost_report_token) {
      searchParams.set("cost_report_token", params.cost_report_token)
    }
    if (params?.filter) {
      searchParams.set("filter", params.filter)
    }
    if (params?.start_date) {
      searchParams.set("start_date", params.start_date)
    }
    if (params?.end_date) {
      searchParams.set("end_date", params.end_date)
    }
    if (params?.groupings) {
      params.groupings.forEach((g) => searchParams.append("groupings[]", g))
    }
    if (params?.limit) {
      searchParams.set("limit", params.limit.toString())
    }

    const query = searchParams.toString()
    return vantageRequest<VantageCostsResponse>(`/costs${query ? `?${query}` : ""}`)
  },

  // Get costs grouped by tag
  async getCostsByTag(
    tagKey: string,
    startDate?: string,
    endDate?: string
  ): Promise<VantageCostsResponse> {
    return this.getCosts({
      filter: `tags.name = '${tagKey}'`,
      groupings: [`tag:${tagKey}`],
      start_date: startDate,
      end_date: endDate,
    })
  },

  // Get costs for untagged resources
  async getUntaggedCosts(
    tagKey: string,
    startDate?: string,
    endDate?: string
  ): Promise<VantageCostsResponse> {
    return this.getCosts({
      filter: `NOT EXISTS (tags.name = '${tagKey}')`,
      groupings: ["service"],
      start_date: startDate,
      end_date: endDate,
    })
  },
}

export { VantageApiError }
