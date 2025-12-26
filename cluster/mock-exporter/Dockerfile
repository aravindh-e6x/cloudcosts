FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy project files
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

# Copy application code
COPY *.py ./

# Set permissions for non-root user
RUN chmod -R 755 /app && \
    mkdir -p /tmp/uv-cache && chmod 777 /tmp/uv-cache

ENV UV_CACHE_DIR=/tmp/uv-cache
ENV HOME=/tmp
ENV PYTHONUNBUFFERED=1

# Run as non-root
USER 65534

ENTRYPOINT ["uv", "run", "python", "main.py"]
CMD ["--config", "/config/config.yaml"]
