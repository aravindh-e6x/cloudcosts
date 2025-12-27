FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Default environment variables
ENV E6_COMPONENT=executor
ENV E6_CLUSTER=default
ENV E6_WORKSPACE=demo
ENV E6_NAMESPACE=default
ENV E6_POD_NAME=mock-0
ENV E6_PORT=8080
ENV E6_BASE_QPM=100
ENV E6_UPDATE_INTERVAL=15.0

# Expose metrics port
EXPOSE 8080

# Run the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
