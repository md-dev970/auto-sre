'use client';

import { useState, useEffect, useRef } from 'react';
import { triggerFactoryBuilder, triggerUpdateFeature, getExecutionStatus, checkHealth, ExecutionStatus } from '@/lib/kestra-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatProps {
  onPreviewUrl: (url: string) => void;
  onBuildStart?: () => void;
  currentRepoUrl?: string | null;
}

export default function Chat({ onPreviewUrl, onBuildStart, currentRepoUrl }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Idle');
  
  // Use refs for polling to avoid closure staleness issues if we were using useEffect dependencies loosely
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;

    // Reset state
    setInput('');
    setLoading(true);
    setStatusMessage('Initializing...');
    addMessage('user', prompt);

    try {
      // 1. Check Health
      const isHealthy = await checkHealth();
      if (!isHealthy) {
        throw new Error('Backend is unreachable (health check failed).');
      }

      // 2. Trigger Build
      setStatusMessage('Triggering build...');
      onBuildStart?.();
      
      const triggerResponse = currentRepoUrl 
        ? await triggerUpdateFeature(prompt, currentRepoUrl)
        : await triggerFactoryBuilder(prompt);

      const executionId = triggerResponse.id;
      addMessage('assistant', `Build started! Execution ID: ${executionId}. Waiting for completion...`);
      setStatusMessage('Build running...');

      // 3. Poll for Completion
      startPolling(executionId);

    } catch (err) {
      console.error(err);
      setLoading(false);
      setStatusMessage('Error');
      addMessage('assistant', `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const startPolling = (executionId: string) => {
    let attempts = 0;
    const maxAttempts = 600; // 20 minutes (2s interval)

    stopPolling(); // Ensure no duplicate pollers

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      
      try {
        const status = await getExecutionStatus(executionId);
        console.log(`[Poll #${attempts}] Status:`, status.status, status);

        // Update status message with current state if available
        setStatusMessage(`Status: ${status.status} (Attempt ${attempts})`);

        if (status.status === 'SUCCESS') {
          stopPolling();
          setLoading(false);
          setStatusMessage('Success!');
          handleSuccess(status);
        } else if (status.status === 'FAILED' || status.status === 'KILLED' || status.status === 'WARNING') {
          stopPolling();
          setLoading(false);
          setStatusMessage('Failed');
          addMessage('assistant', `❌ Build ended with status: ${status.status}`);
        } else if (attempts >= maxAttempts) {
          stopPolling();
          setLoading(false);
          setStatusMessage('Timeout');
          addMessage('assistant', '⏱️ Build timed out waiting for completion.');
        }
      } catch (err) {
        console.warn('Poll error:', err);
        // Don't stop polling on transient network errors, just log
      }
    }, 2000);
  };

  const handleSuccess = (status: ExecutionStatus) => {
    console.log('Handling Success', status);
    
    // Extraction Logic
    let previewUrl: string | undefined;
    
    // 1. Try generic output
    if (status.outputs) {
      previewUrl = status.outputs.previewUrl || status.outputs.preview_url;
    }

    // 2. Deep search in tasks if not found
    if (!previewUrl && status.taskRunList) {
      const buildTask = status.taskRunList.find(t => t.taskId === 'build-and-deploy');
      if (buildTask?.outputs?.vars) {
        previewUrl = buildTask.outputs.vars.previewUrl || buildTask.outputs.vars.preview_url;
      }
    }

    if (previewUrl) {
      console.log('Preview URL found:', previewUrl);
      onPreviewUrl(previewUrl);
      addMessage('assistant', `✅ Build Complete! Loading preview...`);
    } else {
      console.warn('No preview URL found in outputs', status);
      addMessage('assistant', '✅ Build finished, but could not auto-detect the Preview URL. Please check Kestra logs.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p>Ready to build.</p>
            <p className="text-sm">Type a prompt to start.</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`max-w-[85%] rounded-lg p-3 ${
               m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
             }`}>
               <p className="whitespace-pre-wrap">{m.content}</p>
               <span className="text-xs opacity-50 block mt-1">
                 {m.timestamp.toLocaleTimeString()}
               </span>
             </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
             <div className="bg-gray-100 rounded-lg p-3 animate-pulse">
               Building... ({statusMessage})
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            placeholder="Describe your app..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            {loading ? 'Building...' : 'Build'}
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-2 text-center">
          Status: {statusMessage}
        </div>
      </div>
    </div>
  );
}
