# Kestra Setup Guide

## Step-by-Step Setup

### Step 1: Build the Custom Docker Image (One-Time)

The `Dockerfile.kestra-cline` creates a Docker image with Cline CLI and Vercel CLI pre-installed. This image is used by Kestra flows to run build tasks.

```bash
# From the kestra/ directory
cd kestra

# Build the image
docker build -f Dockerfile.kestra-cline -t kestra-cline:latest .

# Verify the image was created
docker images | grep kestra-cline
# Should show: kestra-cline   latest   ...
```

**Why?** The flow `simple-builder.yml` uses `image: kestra-cline:latest` (line 54). Without this image, Kestra flows will fail.

### Step 2: Configure Environment Variables

Create a `.env` file in the `kestra/` directory:

```bash
# kestra/.env
GEMINI_API_KEY=your-gemini-api-key-here
VERCEL_TOKEN=your-vercel-token-here
```

**Note:** These are NOT Base64 encoded - they're plain text. Kestra will handle encoding internally.

### Step 3: Start Kestra with Docker Compose

```bash
# From the kestra/ directory
docker compose up -d

# Check it's running
docker compose ps
# Should show kestra container as "Up"

# View logs
docker compose logs -f kestra
```

### Step 4: Verify Everything Works

```bash
# Check Kestra health
curl http://localhost:8080/api/v1/health
# Should return: {"status":"UP"}

# Open Kestra UI in browser
# http://localhost:8080
```

## Quick Reference

### Build the image (when Dockerfile changes)
```bash
docker build -f Dockerfile.kestra-cline -t kestra-cline:latest .
```

### Start Kestra
```bash
docker compose up -d
```

### Stop Kestra
```bash
docker compose down
```

### View logs
```bash
docker compose logs -f kestra
```

### Rebuild image (if you update Dockerfile)
```bash
docker build -f Dockerfile.kestra-cline -t kestra-cline:latest .
docker compose restart  # Restart to pick up new image
```

## Troubleshooting

### Error: "image kestra-cline:latest not found"
- **Solution:** Build the image first: `docker build -f Dockerfile.kestra-cline -t kestra-cline:latest .`

### Error: "Cannot connect to Docker daemon"
- **Solution:** Ensure Docker Desktop is running

### Error: "Secret not found" in flows
- **Solution:** Check `.env` file exists and has correct variable names (GEMINI_API_KEY, VERCEL_TOKEN)

### Flow fails with "cline: command not found"
- **Solution:** Rebuild the Docker image: `docker build -f Dockerfile.kestra-cline -t kestra-cline:latest .`

## Summary

1. **Dockerfile.kestra-cline** → Build once to create `kestra-cline:latest` image
2. **docker-compose.yml** → Use to run Kestra server (uses the image from step 1)

Both are needed! The Dockerfile creates the tool image, docker-compose runs the orchestrator.

