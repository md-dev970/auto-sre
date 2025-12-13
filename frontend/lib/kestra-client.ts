const KESTRA_URL = process.env.NEXT_PUBLIC_KESTRA_URL || 'http://localhost:8080';

export interface ExecutionResponse {
  id: string;
  status: string;
}

export interface ExecutionStatus {
  id: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  outputs?: {
    previewUrl?: string;
    projectName?: string;
    repoUrl?: string;
    repoName?: string;
    status?: string; // 'github_ready' | 'deployed'
    // For factory-builder-v2 flow
    githubRepo?: string;
    githubRepoName?: string;
  };
}

export interface GitHubRepoInfo {
  repoUrl: string;
  repoName: string;
  owner: string;
  vercelImportUrl: string;
}

// Trigger factory-builder-v2 flow (creates new app)
// Falls back to simple-builder if factory-builder-v2 doesn't exist
export async function triggerFactoryBuilder(prompt: string): Promise<ExecutionResponse> {
  // Try factory-builder-v2 first (new flow with GitHub-first approach)
  let response = await fetch(
    `${KESTRA_URL}/api/v1/executions/trigger/production/factory-builder-v2`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          prompt,
        },
      }),
    }
  );

  // Fallback to simple-builder if factory-builder-v2 doesn't exist
  if (!response.ok && response.status === 404) {
    response = await fetch(
      `${KESTRA_URL}/api/v1/executions/trigger/production/simple-builder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            prompt,
          },
        }),
      }
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to trigger flow: ${response.statusText}`);
  }

  return response.json();
}

// Trigger update-feature flow (for edits to existing app)
export async function triggerUpdateFeature(
  prompt: string,
  repoUrl: string
): Promise<ExecutionResponse> {
  const response = await fetch(
    `${KESTRA_URL}/api/v1/executions/trigger/production/update-feature`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          prompt,
          githubRepo: repoUrl,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to trigger update flow: ${response.statusText}`);
  }

  return response.json();
}

// Legacy function for backward compatibility
export async function triggerFlow(prompt: string): Promise<ExecutionResponse> {
  return triggerFactoryBuilder(prompt);
}

export async function getExecutionStatus(
  executionId: string
): Promise<ExecutionStatus> {
  const response = await fetch(
    `${KESTRA_URL}/api/v1/executions/${executionId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get execution status: ${response.statusText}`);
  }

  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${KESTRA_URL}/api/v1/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

