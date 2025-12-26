"""Constants for mock data generation."""

GB = 1024 * 1024 * 1024
MB = 1024 * 1024

# Instance type specifications with costs
INSTANCE_SPECS = {
    'm5.xlarge': {'cpu': 4, 'memory': 16 * GB, 'cost': 0.192, 'cpu_cost': 0.096, 'ram_cost': 0.096},
    'm5.2xlarge': {'cpu': 8, 'memory': 32 * GB, 'cost': 0.384, 'cpu_cost': 0.192, 'ram_cost': 0.192},
    'm5.4xlarge': {'cpu': 16, 'memory': 64 * GB, 'cost': 0.768, 'cpu_cost': 0.384, 'ram_cost': 0.384},
    'r5.xlarge': {'cpu': 4, 'memory': 32 * GB, 'cost': 0.252, 'cpu_cost': 0.084, 'ram_cost': 0.168},
    'r5.2xlarge': {'cpu': 8, 'memory': 64 * GB, 'cost': 0.504, 'cpu_cost': 0.168, 'ram_cost': 0.336},
    'c5.xlarge': {'cpu': 4, 'memory': 8 * GB, 'cost': 0.170, 'cpu_cost': 0.136, 'ram_cost': 0.034},
    'c5.2xlarge': {'cpu': 8, 'memory': 16 * GB, 'cost': 0.340, 'cpu_cost': 0.272, 'ram_cost': 0.068},
}

# E6 component specifications
# namespace: 'workspace' means the component goes in the workspace namespace
# namespace: 'e6_cluster' means the component goes in each e6_cluster namespace
COMPONENT_SPECS = {
    'gateway': {'cpu_request': 2, 'memory_request': 4 * GB, 'namespace': 'workspace'},
    'schema': {'cpu_request': 1, 'memory_request': 2 * GB, 'namespace': 'workspace'},
    'storage': {'cpu_request': 2, 'memory_request': 4 * GB, 'namespace': 'workspace'},
    'executor': {'cpu_request': 4, 'memory_request': 8 * GB, 'namespace': 'e6_cluster'},
    'queue': {'cpu_request': 1, 'memory_request': 2 * GB, 'namespace': 'e6_cluster'},
    'planner': {'cpu_request': 1, 'memory_request': 2 * GB, 'namespace': 'e6_cluster'},
}

# Base utilization by component type
BASE_UTILIZATION = {
    'gateway': 0.70,
    'schema': 0.50,
    'storage': 0.60,
    'executor': 0.30,  # Increases with query rate
    'queue': 0.60,
    'planner': 0.40,
}
