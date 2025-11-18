FROM python:3.11-slim

# Install system dependencies for PDF and image processing
RUN apt-get update && apt-get install -y \
    # Poppler for pdf2image
    poppler-utils \
    # Tesseract OCR
    tesseract-ocr \
    tesseract-ocr-eng \
    # libvips for image processing
    libvips-dev \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY processors ./processors
COPY services ./services
COPY __init__.py .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run the service
CMD ["python", "-m", "uvicorn", "services.ocr_service:app", "--host", "0.0.0.0", "--port", "8000"]
