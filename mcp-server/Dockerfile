FROM python:3.11-slim

WORKDIR /app

# Install uv for fast dependency management
RUN pip install --no-cache-dir uv

# Copy project files
COPY pyproject.toml .
COPY src/ src/

# Install dependencies using uv
RUN uv pip install --system .

# Create non-root user
RUN useradd -m -u 1000 mcp
USER mcp

# Default environment variables
ENV GREPTIMEDB_URL="https://greptimedb.cloudcosts.in"
ENV GREPTIMEDB_USERNAME=""
ENV GREPTIMEDB_PASSWORD=""

# Run the MCP server
CMD ["cloudcosts-mcp"]
