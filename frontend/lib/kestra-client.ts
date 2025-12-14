const KESTRA_URL = '/kestra-api';

export interface ExecutionResponse {
  id: string;
  status: string;
}

export interface ExecutionStatus {
  id: string;
  state: {
    current: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CREATED' | 'WARNING' | 'KILLED';
  };
  // We map state.current to this for easier consumption, or just use state.current
  status?: string; 
  outputs?: {
    previewUrl?: string;
    preview_url?: string;
    projectName?: string;
    repoUrl?: string;
    repoName?: string;
    status?: string; 
    githubRepo?: string;
    githubRepoName?: string;
  };
  taskRunList?: Array<{
    id: string;
    taskId: string;
    outputs?: {
      vars?: {
        previewUrl?: string;
        preview_url?: string;
        repoUrl?: string;
        repoName?: string;
      };
    };
  }>;
}

// Trigger factory-builder-v2 flow (creates new app)
// Falls back to simple-builder if factory-builder-v2 doesn't exist
export async function triggerFactoryBuilder(prompt: string): Promise<ExecutionResponse> {
  const formData = new FormData();
  formData.append('prompt', prompt);

  // Directly trigger simple-builder using FormData (multipart/form-data)
  // This matches the curl example in README and avoids 415 Unsupported Media Type errors
  const response = await fetch(
    `${KESTRA_URL}/executions/trigger/production/simple-builder-v2`,
    {
      method: 'POST',
      body: formData,
    }
  );

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
    `${KESTRA_URL}/executions/trigger/production/update-feature`,
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
    `${KESTRA_URL}/executions/${executionId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get execution status: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Map Kestra's nested state.current to a top-level status property for compatibility
  // or ensure the consumer checks data.state.current
  return {
    ...data,
    status: data.state?.current // Polyfill top-level status
  };
}

export async function checkHealth(): Promise<boolean> {
  try {
    // Check /configs as it's a reliable endpoint that returns 200 when server is up
    const response = await fetch(`${KESTRA_URL}/configs`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}