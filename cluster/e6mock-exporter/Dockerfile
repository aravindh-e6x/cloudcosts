FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY exporter.py .

ENV GREPTIMEDB_URL=https://greptimedb.cloudcosts.in
ENV GREPTIMEDB_USERNAME=e6data
ENV GREPTIMEDB_PASSWORD=cloudcosts
ENV DATABASE=e6_mock
ENV SCRAPE_INTERVAL=60

CMD ["python", "exporter.py"]
