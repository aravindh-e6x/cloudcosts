"""Configuration for mock E6 components."""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Component type: gateway, schema, storage, executor, planner, queue
    component: str = "executor"

    # E6 identifiers
    cluster: str = "default"
    workspace: str = "demo"

    # Pod info (from Kubernetes downward API)
    pod_name: str = "mock-0"
    namespace: str = "default"
    node_name: str = "unknown"

    # Simulation settings
    base_qpm: int = 100  # Base queries per minute
    update_interval: float = 15.0  # Seconds between metric updates

    # Server settings
    port: int = 8080

    class Config:
        env_prefix = "E6_"


settings = Settings()
