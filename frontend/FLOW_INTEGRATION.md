# Frontend Flow Integration Guide

## Overview

The frontend is now configured to work with the new GitHub-first flow structure where:
1. User submits prompt → Kestra creates app and pushes to GitHub
2. Frontend receives `{ repoUrl, repoName, status: "github_ready" }`
3. Frontend shows "Connect to Vercel" button
4. User manually connects Vercel (one-time per repo)
5. Future updates auto-deploy via Vercel webhooks

## Flow Names

The frontend supports two flow names:

### Primary: `factory-builder-v2`
- **Expected Output**: `{ repoUrl, repoName, status: "github_ready" }`
- **Behavior**: Creates GitHub repo, pushes code, returns repo info
- **Next Step**: User connects Vercel manually

### Fallback: `simple-builder`
- **Expected Output**: `{ previewUrl, projectName }`
- **Behavior**: Directly deploys to Vercel (legacy behavior)
- **Next Step**: Preview URL shown immediately

## Flow Structure

### factory-builder-v2 Flow

**Input:**
```json
{
  "inputs": {
    "prompt": "Build a todo app with dark mode"
  }
}
```

**Expected Output:**
```json
{
  "id": "execution-id",
  "status": "SUCCESS",
  "outputs": {
    "repoUrl": "https://github.com/owner/repo-name",
    "repoName": "repo-name",
    "status": "github_ready"
  }
}
```

**Alternative Output Format (also supported):**
```json
{
  "outputs": {
    "githubRepo": "owner/repo-name",
    "githubRepoName": "repo-name",
    "status": "github_ready"
  }
}
```

### update-feature Flow

**Input:**
```json
{
  "inputs": {
    "prompt": "Add a delete button",
    "githubRepo": "https://github.com/owner/repo-name"
  }
}
```

**Expected Output:**
```json
{
  "id": "execution-id",
  "status": "SUCCESS",
  "outputs": {
    "previewUrl": "https://app-name.vercel.app"
  }
}
```

## Frontend Behavior

### Phase 1: New App Creation

1. User enters prompt in chat
2. Frontend calls `triggerFactoryBuilder(prompt)`
3. Polls execution status
4. When status is `SUCCESS`:
   - If `outputs.status === "github_ready"`:
     - Shows "Your app is ready on GitHub!" message
     - Displays "Connect to Vercel" button
     - Button opens: `https://vercel.com/new/import?s=https://github.com/{owner}/{repo}`
   - If `outputs.previewUrl` exists (legacy):
     - Shows preview URL immediately
     - Loads iframe

### Phase 2: Vercel Connection (One-Time)

1. User clicks "Connect to Vercel" button
2. Redirected to Vercel import page
3. User selects repo and imports
4. Vercel deploys automatically
5. User clicks "I've connected Vercel" button in frontend
6. Frontend marks Vercel as connected
7. Future updates will auto-deploy

### Phase 3: Updates (After Vercel Connected)

1. User enters new prompt
2. Frontend detects existing repo (`currentRepoUrl` prop)
3. Calls `triggerUpdateFeature(prompt, repoUrl)`
4. Kestra pushes to GitHub
5. Vercel webhook triggers deployment
6. Frontend polls for new preview URL
7. Updates iframe when ready

## State Management

The frontend persists state in `localStorage`:
- `githubRepo`: Repository information
- `previewUrl`: Current preview URL
- `vercelConnected`: Whether Vercel is connected

This allows the app to remember the repo across page refreshes.

## Vercel Import URL Format

The frontend constructs the Vercel import URL as:
```
https://vercel.com/new/import?s=https://github.com/{owner}/{repo}
```

Where:
- `owner`: Extracted from `repoUrl` (e.g., `github.com/owner/repo` → `owner`)
- `repo`: The repository name

## Error Handling

- **Kestra unreachable**: Shows error banner, disables send button
- **Build failed**: Shows error message with retry button
- **Build timeout**: Shows timeout message after 2 minutes
- **Missing outputs**: Shows generic success message

## Testing

To test the integration:

1. **Test with factory-builder-v2**:
   ```bash
   # Ensure flow exists in Kestra
   # Trigger via frontend or API
   ```

2. **Test with simple-builder** (fallback):
   ```bash
   # Frontend will automatically fallback if factory-builder-v2 doesn't exist
   ```

3. **Test update flow**:
   ```bash
   # After creating a repo, send another prompt
   # Frontend should use update-feature flow
   ```

## Configuration

Environment variables:
- `NEXT_PUBLIC_KESTRA_URL`: Kestra API URL (default: `http://localhost:8080`)

## Notes

- The frontend automatically detects which flow to use based on available flows
- Repository information is persisted across sessions
- Vercel connection status is tracked per repository
- Preview URL updates automatically after Vercel deployments


