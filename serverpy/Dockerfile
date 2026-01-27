# Python CAD Backend with pythonOCC (requires conda)
FROM condaforge/mambaforge:latest

WORKDIR /app

# Copy environment file and create conda environment
COPY app/environment.yml .
RUN mamba env create -f environment.yml && mamba clean -afy

# Copy requirements and install pip packages
COPY app/requirements.txt .
RUN mamba run -n cad-env pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/src ./src

# Expose port
EXPOSE 8080

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Run the application
CMD ["mamba", "run", "-n", "cad-env", "--no-capture-output", "python", "src/main.py"]
