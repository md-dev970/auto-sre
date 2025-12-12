<<<<<<< HEAD
# Auto-SRE
=======
# Kestra + Cline AI Automated App Builder

An automated pipeline that uses **Kestra** orchestration with **Cline AI** to generate Next.js applications and deploy them to **Vercel** - all from a simple text prompt.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         KESTRA                                   │
│                    (Orchestration Engine)                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Flow: simple-builder                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│    │
│  │  │ Log Start│→ │Build Task│→ │Log Result│→ │  Output  ││    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DOCKER CONTAINER                              │
│                   (kestra-cline:latest)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Node.js   │  │  Cline CLI  │  │      Vercel CLI         │  │
│  │    v22+     │  │   v1.0.8    │  │       v49+              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BUILD PIPELINE                              │
│  1. Create Next.js project (TypeScript + Tailwind)              │
│  2. Authenticate Cline with Gemini API                          │
│  3. Run Cline AI to generate/modify code                        │
│  4. Deploy to Vercel                                            │
│  5. Return preview URL                                          │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
.
├── docker-compose.yml       # Kestra service configuration
├── Dockerfile.kestra-cline  # Docker image with Cline + Vercel CLI
├── .env                     # API keys (Base64 encoded)
├── flows/
│   └── simple-builder.yml   # Kestra flow definition
└── README.md
```

## 🔐 API Key Encryption

Kestra requires secrets to be **Base64 encoded**. Here's how to encrypt your API keys:

### Step 1: Get Your API Keys

| Service | Get Key From |
|---------|--------------|
| Gemini API | https://aistudio.google.com/apikey |
| Vercel Token | https://vercel.com/account/tokens |
| OpenRouter (optional) | https://openrouter.ai/keys |

### Step 2: Base64 Encode Each Key

```bash
# Encode Gemini API Key
echo -n 'YOUR_GEMINI_API_KEY' | base64

# Encode Vercel Token
echo -n 'YOUR_VERCEL_TOKEN' | base64

# Encode OpenRouter Key (optional)
echo -n 'YOUR_OPENROUTER_KEY' | base64
```

### Step 3: Add to .env File

```env
# .env file - All values must be Base64 encoded!

GEMINI_API_KEY=QUl6YVN5... (your base64 encoded key)
VERCEL_TOKEN=RFpGVGNs... (your base64 encoded token)
# OPENROUTER_API_KEY=c2stb3... (optional, base64 encoded)
```

### Example Encoding

```bash
# If your Gemini key is: AIzaSyABC123xyz
echo -n 'AIzaSyABC123xyz' | base64
# Output: QUl6YVN5QUJDMTIzeHl6

# To decode and verify:
echo 'QUl6YVN5QUJDMTIzeHl6' | base64 -d
# Output: AIzaSyABC123xyz
```

## 🚀 Quick Start

### 1. Build the Docker Image

```bash
docker build -f Dockerfile.kestra-cline -t kestra-cline:latest .
```

### 2. Configure API Keys

Edit `.env` with your Base64-encoded keys (see encryption section above).

### 3. Start Kestra

```bash
docker compose up -d
```

### 4. Access Kestra UI

Open http://localhost:8080 in your browser.

### 5. Run a Build

Via Kestra UI:
- Go to Flows → production → simple-builder
- Click "Execute"
- Enter your prompt (e.g., "A todo app with add/delete functionality")
- Click "Execute"

Via API:
```bash
curl -X POST "http://localhost:8080/api/v1/executions/production/simple-builder" \
  -H "Content-Type: multipart/form-data" \
  -F 'prompt=A counter app with + and - buttons' \
  -F 'project_prefix=myapp'
```

## ⚙️ Configuration

### Supported AI Providers

| Provider | Model | Free Tier |
|----------|-------|-----------|
| Gemini | gemini-2.5-flash | 1500 req/day |
| Gemini | gemini-2.0-flash | 1500 req/day |
| OpenRouter | nex-agi/deepseek-v3.1-nex-n1:free | 50 req/day |

### Changing the AI Model

Edit `flows/simple-builder.yml` and modify the auth line:

```bash
# For Gemini
cline auth --provider gemini --apikey "$GEMINI_API_KEY" --modelid "gemini-2.5-flash"

# For OpenRouter
cline auth --provider openrouter --apikey "$OPENROUTER_API_KEY" --modelid "nex-agi/deepseek-v3.1-nex-n1:free"
```

### Vercel Deployment Protection

By default, Vercel enables deployment protection. To make deployments public:

1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Deployment Protection
4. Set to "No Protection" or disable authentication

## 🔧 Troubleshooting

### Cline Auth Fails

Ensure `HOME` environment variable is set in the flow:
```yaml
env:
  HOME: "/root"
```

### Rate Limit Errors

Switch to a different model or wait for quota reset (midnight Pacific Time).

### Build Fails

Check the build logs in Kestra UI for detailed error messages.

## 📊 Flow Outputs

Each execution produces:

| Output | Description |
|--------|-------------|
| `preview_url` | Vercel deployment URL |
| `project_name` | Generated project name |
| `build.log` | Full build log |
| `generated_code.txt` | Generated source code |

## 🛑 Stopping the Service

```bash
docker compose down
```

## 📝 License

MIT

---

Built with ❤️ using Kestra, Cline AI, and Vercel
>>>>>>> 1c326198db02af41b634dccfb16eecb56de62768
