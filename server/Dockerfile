FROM python:3.13-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Collect static assets for production serving via WhiteNoise
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Run migrations and start Uvicorn (ASGI)
CMD ["sh", "-c", "python manage.py migrate && uvicorn core.asgi:application --host 0.0.0.0 --port ${PORT:-8000} --workers 4 --log-level info"]
