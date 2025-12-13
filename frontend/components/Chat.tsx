'use client';

import { useState } from 'react';
import { triggerFactoryBuilder, triggerUpdateFeature, getExecutionStatus, checkHealth } from '@/lib/kestra-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatProps {
  onPreviewUrl: (url: string) => void;
  onBuildStart?: () => void;
  onGitHubReady?: (repoInfo: { repoUrl: string; repoName: string; vercelImportUrl: string }) => void;
  currentRepoUrl?: string | null; // For tracking if we have an existing repo
}

export default function Chat({ onPreviewUrl, onBuildStart, onGitHubReady, currentRepoUrl }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Idle');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');

  const handleSend = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? input).trim();
    if (!prompt || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!promptOverride) setInput('');
    setLastPrompt(prompt);
    setLoading(true);
    setStatusMessage('Checking Kestra health...');
    setStatusType('info');

    try {
      const healthy = await checkHealth();
      if (!healthy) {
        setStatusMessage('Kestra is unreachable. Please ensure it is running.');
        setStatusType('error');
        setLoading(false);
        return;
      }

      setStatusMessage('Building... connecting to Kestra');
      onBuildStart?.();

      // Determine which flow to use
      // If we have a repo URL, use update-feature; otherwise use factory-builder-v2
      const response = currentRepoUrl
        ? await triggerUpdateFeature(prompt, currentRepoUrl)
        : await triggerFactoryBuilder(prompt);
      setExecutionId(response.id);

      // Add loading message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Building your app... This may take a few minutes.',
          timestamp: new Date(),
        },
      ]);

      // Poll for completion
      pollExecutionStatus(response.id);
    } catch (error) {
      setStatusMessage('Error triggering build. Please retry.');
      setStatusType('error');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        },
      ]);
      setLoading(false);
    }
  };

  const pollExecutionStatus = async (id: string) => {
    const maxAttempts = 60; // 2 minutes max
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const status = await getExecutionStatus(id);

        if (status.status === 'SUCCESS') {
          clearInterval(interval);
          setLoading(false);
          setStatusMessage('Build complete');
          setStatusType('success');

          const outputs = status.outputs || {};
          const buildStatus = outputs.status;

          // Handle github_ready status (new app created, needs Vercel connection)
          // Check both possible output formats: status field or direct repo fields
          const repoUrl = outputs.repoUrl || outputs.githubRepo;
          const repoName = outputs.repoName || outputs.githubRepoName;
          
          if ((buildStatus === 'github_ready' || (!buildStatus && repoUrl && !outputs.previewUrl)) && repoUrl && repoName) {
            // Extract owner and repo from URL (e.g., https://github.com/owner/repo or owner/repo)
            let owner = '';
            let repo = repoName;
            
            // Try to extract from full URL
            const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (urlMatch) {
              owner = urlMatch[1];
              repo = urlMatch[2];
            } else {
              // Try owner/repo format
              const ownerRepoMatch = repoUrl.match(/([^\/]+)\/([^\/]+)/);
              if (ownerRepoMatch) {
                owner = ownerRepoMatch[1];
                repo = ownerRepoMatch[2];
              }
            }
            
            const vercelImportUrl = owner 
              ? `https://vercel.com/new/import?s=https://github.com/${owner}/${repo}`
              : `https://vercel.com/new/import?s=${repoUrl}`;
            
            onGitHubReady?.({ 
              repoUrl: repoUrl.startsWith('http') ? repoUrl : `https://github.com/${repoUrl}`, 
              repoName: repo, 
              vercelImportUrl 
            });
            
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `✅ Your app is ready on GitHub!\n\nRepository: ${repo}\n\nClick "Connect to Vercel" to enable live preview.`,
                timestamp: new Date(),
              },
            ]);
          }
          // Handle direct preview URL (legacy or auto-deployed after Vercel connection)
          else if (outputs.previewUrl) {
            onPreviewUrl(outputs.previewUrl);
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `✅ Build complete! Preview URL: ${outputs.previewUrl}`,
                timestamp: new Date(),
              },
            ]);
          }
          // Fallback message
          else {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `✅ Build complete! Check Kestra UI for details.`,
                timestamp: new Date(),
              },
            ]);
          }
        } else if (status.status === 'FAILED') {
          clearInterval(interval);
          setLoading(false);
          setStatusMessage('Build failed. Please retry.');
          setStatusType('error');
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: '❌ Build failed. Check Kestra logs for details.',
              timestamp: new Date(),
            },
          ]);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setLoading(false);
          setStatusMessage('Build timed out. Please retry.');
          setStatusType('error');
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: '⏱️ Build timed out. Check Kestra UI for status.',
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        clearInterval(interval);
        setLoading(false);
        setStatusMessage('Error checking status. Please retry.');
        setStatusType('error');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Error checking status: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date(),
          },
        ]);
      }
    }, 2000); // Poll every 2 seconds
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status banner */}
      <div
        className={`border-b px-4 py-2 text-sm ${
          statusType === 'success'
            ? 'bg-green-50 text-green-800'
            : statusType === 'error'
            ? 'bg-red-50 text-red-800'
            : 'bg-blue-50 text-blue-800'
        }`}
      >
        {statusMessage}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center mt-8">
            Enter a prompt to build your Next.js app...
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>Building...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe your app (e.g., 'Create a todo app with add/delete')"
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
          {!loading && statusType === 'error' && lastPrompt && (
            <button
              onClick={() => handleSend(lastPrompt)}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

