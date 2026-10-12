FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered log streaming
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Create a dedicated non-root system user and group
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install dependencies first to leverage Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Alembic config, migrations, and application code
COPY alembic.ini .
COPY alembic/ ./alembic/
COPY app/ ./app/

# Grant ownership of /app to the non-root user
RUN chown -R appuser:appuser /app

# Switch to the non-root user
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
