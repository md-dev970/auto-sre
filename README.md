# Kestra + Cline Auto-SRE Builder

This project is an automated pipeline that uses **Kestra** to orchestrate **Cline AI** (powered by Gemini) for generating and deploying Next.js applications to **Vercel** via a simple chat interface.

## 🚀 What it does
1.  **Takes a user prompt** (e.g., "Build a landing page for a coffee shop").
2.  **Orchestrates a build environment** using Docker and Kestra.
3.  **Uses AI (Cline)** to generate the full Next.js application code.
4.  **Deploys the app** automatically to Vercel.
5.  **Returns a preview link** to view the live application.

## 🛠️ Setup & Run

### 1. Prerequisites
- Docker & Docker Compose
- API Keys:
    - **Gemini API Key** (from Google AI Studio)
    - **Vercel Token** (from Vercel Account Settings)

### 2. Configure Secrets
Kestra requires Base64-encoded secrets in the `.env` file.

1.  **Encode your keys:**
    *   **Windows (Easy Method):** Use the included helper script in `kestra/base64.bat`:
        ```cmd
        .\kestra\base64.bat "YOUR_KEY_HERE"
        ```
    *   **Linux/Mac:**
        ```bash
        echo -n 'YOUR_KEY_HERE' | base64
        ```
    *   **PowerShell:**
        ```powershell
        [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("YOUR_KEY"))
        ```

2.  **Create `.env` file in this directory:**
    ```env
    GEMINI_API_KEY=VGhpcyBpcy...
    VERCEL_TOKEN=ZGVwbG95bW...
    ```

### 3. Build the Docker Image
```bash
docker build -f Dockerfile.kestra-cline -t kestra-cline:latest .
```

### 4. Start the Backend (Kestra)
```bash
docker compose up -d
```
The Kestra UI will be available at `http://localhost:8080`.

### 5. Import Kestra Flow
Before using the frontend, you must import the `simple-builder.yml` flow into your Kestra instance.
-   Access the Kestra UI at `http://localhost:8080`.
-   Go to "Flows", then click "Create" or "Upload".
-   Upload the `auto-sre/kestra/flows/simple-builder.yml` file.

### 6. Start the Frontend (Chat Interface)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` to start building apps!

## ⚠️ Vercel Preview Note
Due to browser security policies (X-Frame-Options) and Vercel's default authentication protections, generated applications are not embedded directly in the chat. 

The interface provides an **"Open Application ↗"** button to launch your deployed app in a new, secure tab where you can log in to Vercel if required.

---