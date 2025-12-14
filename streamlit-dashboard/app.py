import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import requests
import os
from datetime import datetime, timedelta

st.set_page_config(
    page_title="CloudCosts Dashboard",
    page_icon="📊",
    layout="wide"
)

# Connection settings
GREPTIMEDB_URL = os.environ.get("GREPTIMEDB_URL", "https://greptimedb.cloudcosts.in")
GREPTIMEDB_USER = os.environ.get("GREPTIMEDB_USER", "e6data")
GREPTIMEDB_PASS = os.environ.get("GREPTIMEDB_PASS", "cloudcosts")


def run_query(database: str, query: str) -> pd.DataFrame:
    try:
        response = requests.post(
            f"{GREPTIMEDB_URL}/v1/sql",
            params={"db": database},
            data={"sql": query},
            auth=(GREPTIMEDB_USER, GREPTIMEDB_PASS),
            timeout=30
        )
        if response.ok:
            data = response.json()
            if data.get("output") and data["output"][0].get("records"):
                records = data["output"][0]["records"]
                columns = [col["name"] for col in records["schema"]["column_schemas"]]
                rows = records.get("rows", [])
                return pd.DataFrame(rows, columns=columns)
        return pd.DataFrame()
    except Exception as e:
        st.error(f"Query error: {e}")
        return pd.DataFrame()


# Sidebar
st.sidebar.title("CloudCosts")
page = st.sidebar.radio("Navigate", ["Overview", "Cloud Costs", "Kubernetes", "POC"])

# Date range filter
st.sidebar.markdown("---")
st.sidebar.subheader("Filters")
days_back = st.sidebar.selectbox("Time Range", [7, 14, 30, 60, 90], index=2)

if page == "Overview":
    st.title("📊 CloudCosts Dashboard")

    col1, col2, col3, col4 = st.columns(4)

    # Total cloud spend (last 30 days)
    cost_df = run_query("vantage", f"""
        SELECT SUM(greptime_value) as total_cost
        FROM vantage_daily_cost_by_provider
        WHERE greptime_timestamp >= NOW() - INTERVAL '{days_back}' DAY
    """)
    total_cost = cost_df['total_cost'].iloc[0] if not cost_df.empty else 0
    col1.metric("Cloud Spend", f"${total_cost:,.0f}", f"Last {days_back} days")

    # Kubernetes clusters
    clusters_df = run_query("kubernetes", """
        SELECT COUNT(DISTINCT cluster) as clusters
        FROM kube_node_info
        WHERE greptime_timestamp > NOW() - INTERVAL '5' MINUTE
    """)
    clusters = clusters_df['clusters'].iloc[0] if not clusters_df.empty else 0
    col2.metric("K8s Clusters", clusters)

    # Total nodes
    nodes_df = run_query("kubernetes", """
        SELECT COUNT(DISTINCT node) as nodes
        FROM kube_node_info
        WHERE greptime_timestamp > NOW() - INTERVAL '5' MINUTE
    """)
    nodes = nodes_df['nodes'].iloc[0] if not nodes_df.empty else 0
    col3.metric("Nodes", nodes)

    # Total pods
    pods_df = run_query("kubernetes", """
        SELECT COUNT(DISTINCT pod) as pods
        FROM kube_pod_info
        WHERE greptime_timestamp > NOW() - INTERVAL '5' MINUTE
    """)
    pods = pods_df['pods'].iloc[0] if not pods_df.empty else 0
    col4.metric("Pods", pods)

    st.markdown("---")

    # Cost by provider chart
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Cost by Provider")
        provider_df = run_query("vantage", f"""
            SELECT provider, SUM(greptime_value) as cost
            FROM vantage_daily_cost_by_provider
            WHERE greptime_timestamp >= NOW() - INTERVAL '{days_back}' DAY
            GROUP BY provider
            ORDER BY cost DESC
        """)
        if not provider_df.empty:
            fig = px.pie(provider_df, values='cost', names='provider', hole=0.4)
            fig.update_layout(margin=dict(t=0, b=0, l=0, r=0))
            st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.subheader("Daily Cost Trend")
        trend_df = run_query("vantage", f"""
            SELECT DATE(greptime_timestamp) as date, SUM(greptime_value) as cost
            FROM vantage_daily_cost_by_provider
            WHERE greptime_timestamp >= NOW() - INTERVAL '{days_back}' DAY
            GROUP BY date
            ORDER BY date
        """)
        if not trend_df.empty:
            fig = px.line(trend_df, x='date', y='cost')
            fig.update_layout(margin=dict(t=0, b=0, l=0, r=0))
            st.plotly_chart(fig, use_container_width=True)

elif page == "Cloud Costs":
    st.title("💰 Cloud Costs")

    # Cost by provider
    st.subheader("Cost by Provider")
    provider_df = run_query("vantage", f"""
        SELECT DATE(greptime_timestamp) as date, provider, SUM(greptime_value) as cost
        FROM vantage_daily_cost_by_provider
        WHERE greptime_timestamp >= NOW() - INTERVAL '{days_back}' DAY
        GROUP BY date, provider
        ORDER BY date
    """)
    if not provider_df.empty:
        fig = px.area(provider_df, x='date', y='cost', color='provider')
        st.plotly_chart(fig, use_container_width=True)

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Top 10 Accounts")
        accounts_df = run_query("vantage", f"""
            SELECT account_name, SUM(greptime_value) as cost
            FROM vantage_daily_cost_by_account
            WHERE greptime_timestamp >= NOW() - INTERVAL '{days_back}' DAY
            GROUP BY account_name
            ORDER BY cost DESC
            LIMIT 10
        """)
        if not accounts_df.empty:
            fig = px.bar(accounts_df, x='cost', y='account_name', orientation='h')
            fig.update_layout(yaxis={'categoryorder': 'total ascending'})
            st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.subheader("Top 10 Services")
        services_df = run_query("vantage", f"""
            SELECT service, SUM(greptime_value) as cost
            FROM vantage_daily_cost_by_service
            WHERE greptime_timestamp >= NOW() - INTERVAL '{days_back}' DAY
            GROUP BY service
            ORDER BY cost DESC
            LIMIT 10
        """)
        if not services_df.empty:
            fig = px.bar(services_df, x='cost', y='service', orientation='h')
            fig.update_layout(yaxis={'categoryorder': 'total ascending'})
            st.plotly_chart(fig, use_container_width=True)

elif page == "Kubernetes":
    st.title("☸️ Kubernetes Clusters")

    # Cluster selector
    clusters_df = run_query("kubernetes", """
        SELECT DISTINCT cluster FROM kube_node_info
        WHERE greptime_timestamp > NOW() - INTERVAL '5' MINUTE
    """)
    clusters = clusters_df['cluster'].tolist() if not clusters_df.empty else []
    selected_cluster = st.selectbox("Select Cluster", ["All"] + clusters)

    cluster_filter = f"AND cluster = '{selected_cluster}'" if selected_cluster != "All" else ""

    col1, col2, col3 = st.columns(3)

    # Nodes
    nodes_df = run_query("kubernetes", f"""
        SELECT COUNT(DISTINCT node) as nodes
        FROM kube_node_info
        WHERE greptime_timestamp > NOW() - INTERVAL '5' MINUTE {cluster_filter}
    """)
    col1.metric("Nodes", nodes_df['nodes'].iloc[0] if not nodes_df.empty else 0)

    # Pods
    pods_df = run_query("kubernetes", f"""
        SELECT COUNT(DISTINCT pod) as pods
        FROM kube_pod_info
        WHERE greptime_timestamp > NOW() - INTERVAL '5' MINUTE {cluster_filter}
    """)
    col2.metric("Pods", pods_df['pods'].iloc[0] if not pods_df.empty else 0)

    # Hourly cost
    cost_df = run_query("kubernetes", f"""
        SELECT SUM(greptime_value) as hourly_cost
        FROM node_total_hourly_cost
        WHERE greptime_timestamp > NOW() - INTERVAL '5' MINUTE {cluster_filter}
    """)
    hourly = cost_df['hourly_cost'].iloc[0] if not cost_df.empty and cost_df['hourly_cost'].iloc[0] else 0
    col3.metric("Hourly Cost", f"${hourly:.2f}")

    st.markdown("---")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Pods by Namespace")
        ns_df = run_query("kubernetes", f"""
            SELECT namespace, COUNT(DISTINCT pod) as pods
            FROM kube_pod_info
            WHERE greptime_timestamp > NOW() - INTERVAL '5' MINUTE {cluster_filter}
            GROUP BY namespace
            ORDER BY pods DESC
        """)
        if not ns_df.empty:
            fig = px.bar(ns_df, x='namespace', y='pods')
            st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.subheader("Node Instance Types")
        instance_df = run_query("kubernetes", f"""
            SELECT instance_type, COUNT(DISTINCT node) as nodes
            FROM node_total_hourly_cost
            WHERE greptime_timestamp > NOW() - INTERVAL '5' MINUTE {cluster_filter}
            GROUP BY instance_type
        """)
        if not instance_df.empty:
            fig = px.pie(instance_df, values='nodes', names='instance_type')
            st.plotly_chart(fig, use_container_width=True)

elif page == "POC":
    st.title("🧪 POC Customers")

    # Cluster selector
    clusters_df = run_query("cisco_sal", """
        SELECT DISTINCT e6cluster FROM cluster_composition
        ORDER BY e6cluster
    """)
    clusters = clusters_df['e6cluster'].tolist() if not clusters_df.empty else []
    selected_cluster = st.selectbox("Select Cluster", ["All"] + clusters)

    cluster_filter = f"WHERE e6cluster = '{selected_cluster}'" if selected_cluster != "All" else ""
    cluster_filter_and = f"AND e6cluster = '{selected_cluster}'" if selected_cluster != "All" else ""

    st.subheader("Cluster Composition")
    comp_df = run_query("cisco_sal", f"""
        SELECT e6cluster, component, pod_count
        FROM cluster_composition
        WHERE ts > NOW() - INTERVAL '1' HOUR {cluster_filter_and}
    """)
    if not comp_df.empty:
        fig = px.bar(comp_df, x='e6cluster', y='pod_count', color='component', barmode='group')
        st.plotly_chart(fig, use_container_width=True)

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("CPU Usage by Component")
        cpu_df = run_query("cisco_sal", f"""
            SELECT component, SUM(cpu_used_cores) as cpu_cores
            FROM resource_usage
            WHERE ts > NOW() - INTERVAL '1' HOUR {cluster_filter_and}
            GROUP BY component
        """)
        if not cpu_df.empty:
            fig = px.pie(cpu_df, values='cpu_cores', names='component')
            st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.subheader("Memory Usage by Component")
        mem_df = run_query("cisco_sal", f"""
            SELECT component, SUM(memory_used_gi) as memory_gi
            FROM resource_usage
            WHERE ts > NOW() - INTERVAL '1' HOUR {cluster_filter_and}
            GROUP BY component
        """)
        if not mem_df.empty:
            fig = px.pie(mem_df, values='memory_gi', names='component')
            st.plotly_chart(fig, use_container_width=True)
