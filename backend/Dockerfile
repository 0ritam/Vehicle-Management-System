FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# WeasyPrint system dependencies (pango/cairo/harfbuzz)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libjpeg-dev \
    libffi-dev \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

# Collect static files using dev settings (has safe defaults for build time)
RUN DJANGO_SETTINGS_MODULE=backend.settings.dev \
    python manage.py collectstatic --noinput

ENV DJANGO_SETTINGS_MODULE=backend.settings.prod

# Railway injects PORT. Migrate then start gunicorn.
CMD python manage.py migrate --noinput && \
    gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2
