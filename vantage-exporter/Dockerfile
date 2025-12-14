FROM python:3.11-slim

WORKDIR /app

# Install build dependencies for python-snappy
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsnappy-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chmod=644 exporter.py .

USER 65534

CMD ["python", "-u", "exporter.py"]
