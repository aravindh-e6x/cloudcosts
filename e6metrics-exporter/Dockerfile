FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir requests pyyaml

COPY exporter.py /app/
COPY config.yaml /app/

RUN chmod 755 /app/exporter.py

USER 65534

ENV CONFIG_PATH=/app/config.yaml

CMD ["python", "-u", "exporter.py"]
