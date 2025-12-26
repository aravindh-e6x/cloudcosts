FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chmod=644 exporter.py .
COPY --chmod=644 config.yaml .

ENV GREPTIMEDB_URL=https://greptimedb.cloudcosts.in
ENV GREPTIMEDB_USERNAME=e6data
ENV GREPTIMEDB_PASSWORD=cloudcosts
ENV DATABASE=e6_mock
ENV SCRAPE_INTERVAL=60
ENV CONFIG_PATH=/app/config.yaml

CMD ["python", "exporter.py"]
