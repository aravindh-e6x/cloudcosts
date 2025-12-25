// Vantage Cost Queries
// All queries take date as parameter for date filtering

import { logQuery } from '../logger.server'

/**
 * Get executive summary with comparisons (today vs yesterday, week, month)
 */
export function getExecutiveSummary(date: string): string {
  const sql = `
    SELECT
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as today,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '1 day' AND greptime_timestamp < '${date}'::timestamp THEN greptime_value ELSE 0 END) as yesterday,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('week', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as this_week,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('week', '${date}'::timestamp) - INTERVAL '7 days' AND greptime_timestamp < DATE_TRUNC('week', '${date}'::timestamp) THEN greptime_value ELSE 0 END) as last_week,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '28 days' AND greptime_timestamp < '${date}'::timestamp - INTERVAL '21 days' THEN greptime_value ELSE 0 END) as same_week_last_month,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as mtd,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' + ('${date}'::timestamp - DATE_TRUNC('month', '${date}'::timestamp)) + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as same_period_last_month
    FROM vantage_daily_cost_by_provider
    WHERE greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '2 months' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day'
  `
  logQuery('vantage', 'getExecutiveSummary', { date }, sql)
  return sql
}

/**
 * Get cost breakdown by provider with period comparisons
 */
export function getCostByProvider(date: string): string {
  const sql = `
    SELECT provider,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as cost,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as today,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '1 day' AND greptime_timestamp < '${date}'::timestamp THEN greptime_value ELSE 0 END) as yesterday,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '6 days' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as last_7d,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '13 days' AND greptime_timestamp < '${date}'::timestamp - INTERVAL '6 days' THEN greptime_value ELSE 0 END) as prev_7d,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as mtd,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < DATE_TRUNC('month', '${date}'::timestamp) THEN greptime_value ELSE 0 END) as prev_mtd
    FROM vantage_daily_cost_by_provider
    WHERE greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day'
    GROUP BY provider
    ORDER BY cost DESC
  `
  logQuery('vantage', 'getCostByProvider', { date }, sql)
  return sql
}

/**
 * Get top services by cost with period comparisons
 */
export function getTopServices(date: string, limit: number = 10): string {
  const sql = `
    SELECT service,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as cost,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as today,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '1 day' AND greptime_timestamp < '${date}'::timestamp THEN greptime_value ELSE 0 END) as yesterday,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '6 days' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as last_7d,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '13 days' AND greptime_timestamp < '${date}'::timestamp - INTERVAL '6 days' THEN greptime_value ELSE 0 END) as prev_7d,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as mtd,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < DATE_TRUNC('month', '${date}'::timestamp) THEN greptime_value ELSE 0 END) as prev_mtd
    FROM vantage_daily_cost_by_service
    WHERE greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day'
    GROUP BY service
    ORDER BY cost DESC
    LIMIT ${limit}
  `
  logQuery('vantage', 'getTopServices', { date, limit }, sql)
  return sql
}

/**
 * Get daily cost trend (last 30 days)
 */
export function getDailyCostTrend(date: string): string {
  const sql = `
    SELECT DATE_TRUNC('day', greptime_timestamp) as date, SUM(greptime_value) as cost
    FROM vantage_daily_cost_by_provider
    WHERE greptime_timestamp >= '${date}'::timestamp - INTERVAL '29 days' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day'
    GROUP BY DATE_TRUNC('day', greptime_timestamp)
    ORDER BY date
  `
  logQuery('vantage', 'getDailyCostTrend', { date }, sql)
  return sql
}

/**
 * Get today vs yesterday comparison SQL (for display)
 */
export function getTodayVsYesterdaySql(date: string): string {
  const sql = `SELECT
  SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as today,
  SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '1 day' AND greptime_timestamp < '${date}'::timestamp THEN greptime_value ELSE 0 END) as yesterday
FROM vantage_daily_cost_by_provider`
  logQuery('vantage', 'getTodayVsYesterdaySql', { date }, sql)
  return sql
}

/**
 * Get this week vs last week comparison SQL (for display)
 */
export function getThisWeekVsLastWeekSql(date: string): string {
  const sql = `SELECT
  SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('week', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as this_week,
  SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('week', '${date}'::timestamp) - INTERVAL '7 days' AND greptime_timestamp < DATE_TRUNC('week', '${date}'::timestamp) THEN greptime_value ELSE 0 END) as last_week
FROM vantage_daily_cost_by_provider`
  logQuery('vantage', 'getThisWeekVsLastWeekSql', { date }, sql)
  return sql
}

/**
 * Get this week vs same week last month SQL (for display)
 */
export function getThisWeekVsSameWeekLastMonthSql(date: string): string {
  const sql = `SELECT
  SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('week', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as this_week,
  SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '28 days' AND greptime_timestamp < '${date}'::timestamp - INTERVAL '21 days' THEN greptime_value ELSE 0 END) as same_week_last_month
FROM vantage_daily_cost_by_provider`
  logQuery('vantage', 'getThisWeekVsSameWeekLastMonthSql', { date }, sql)
  return sql
}

/**
 * Get MTD vs same period last month SQL (for display)
 */
export function getMtdVsSamePeriodLastMonthSql(date: string): string {
  const sql = `SELECT
  SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as mtd,
  SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' + ('${date}'::timestamp - DATE_TRUNC('month', '${date}'::timestamp)) + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as same_period_last_month
FROM vantage_daily_cost_by_provider`
  logQuery('vantage', 'getMtdVsSamePeriodLastMonthSql', { date }, sql)
  return sql
}
