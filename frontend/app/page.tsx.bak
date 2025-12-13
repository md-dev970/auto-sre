'use client';

import { useState, useEffect } from 'react';
import Chat from '@/components/Chat';

interface GitHubRepoInfo {
  repoUrl: string;
  repoName: string;
  vercelImportUrl: string;
}

export default function Home() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [githubRepo, setGitHubRepo] = useState<GitHubRepoInfo | null>(null);
  const [vercelConnected, setVercelConnected] = useState(false);

  // Load persisted repo info from localStorage
  useEffect(() => {
    const savedRepo = localStorage.getItem('githubRepo');
    const savedPreview = localStorage.getItem('previewUrl');
    const savedConnected = localStorage.getItem('vercelConnected');
    
    if (savedRepo) {
      try {
        setGitHubRepo(JSON.parse(savedRepo));
      } catch (e) {
        console.error('Failed to parse saved repo info', e);
      }
    }
    
    if (savedPreview) {
      setPreviewUrl(savedPreview);
    }
    
    if (savedConnected === 'true') {
      setVercelConnected(true);
    }
  }, []);

  // Save repo info to localStorage
  useEffect(() => {
    if (githubRepo) {
      localStorage.setItem('githubRepo', JSON.stringify(githubRepo));
    } else {
      localStorage.removeItem('githubRepo');
    }
  }, [githubRepo]);

  // Save preview URL to localStorage
  useEffect(() => {
    if (previewUrl) {
      localStorage.setItem('previewUrl', previewUrl);
      localStorage.setItem('vercelConnected', 'true');
    }
  }, [previewUrl]);

  // Save Vercel connection status
  useEffect(() => {
    localStorage.setItem('vercelConnected', vercelConnected.toString());
  }, [vercelConnected]);

  return (
    <main className="flex h-screen">
      {/* Left: Chat */}
      <div className="w-1/2 border-r">
        <div className="h-full flex flex-col">
          <div className="border-b p-4 bg-gray-50">
            <h1 className="text-xl font-bold">App Builder Chat</h1>
            <p className="text-sm text-gray-600">
              Describe your app and it will be built automatically
            </p>
          </div>
          <Chat
            onPreviewUrl={(url) => {
              setPreviewUrl(url);
              setPreviewLoading(true);
              setVercelConnected(true); // If we get a preview URL, Vercel is connected
            }}
            onBuildStart={() => {
              setPreviewLoading(true);
            }}
            onGitHubReady={(repoInfo) => {
              setGitHubRepo(repoInfo);
              setVercelConnected(false); // Reset until user connects Vercel
              setPreviewUrl(null); // Clear preview until Vercel is connected
            }}
            currentRepoUrl={githubRepo?.repoUrl || null}
          />
        </div>
      </div>

      {/* Right: Preview */}
      <div className="w-1/2 flex flex-col">
        <div className="border-b p-4 bg-gray-50">
          <h2 className="text-xl font-bold">Live Preview</h2>
          {previewUrl && (
            <p className="text-sm text-gray-600">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {previewUrl}
              </a>
            </p>
          )}
          {githubRepo && !vercelConnected && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-2">
                Repository: <span className="font-mono">{githubRepo.repoName}</span>
              </p>
            </div>
          )}
        </div>
        <div className="flex-1 relative">
          {previewLoading && (
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-100 z-10">
              <div className="h-1 bg-blue-500 animate-pulse w-1/2" />
            </div>
          )}
          
          {/* Show Connect Vercel button if repo is ready but Vercel not connected */}
          {githubRepo && !vercelConnected && !previewUrl ? (
            <div className="flex flex-col items-center justify-center h-full p-8 space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Your app is ready on GitHub!</h3>
                <p className="text-gray-600 mb-4">
                  Connect to Vercel to enable live preview and automatic deployments.
                </p>
                <a
                  href={githubRepo.vercelImportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Connect to Vercel for Preview
                </a>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <p>After connecting, future updates will auto-deploy.</p>
                <button
                  onClick={() => {
                    // User can manually mark as connected after they've done it
                    setVercelConnected(true);
                  }}
                  className="mt-2 text-blue-500 hover:underline"
                >
                  I've connected Vercel
                </button>
              </div>
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="App Preview"
              onLoad={() => setPreviewLoading(false)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Preview will appear here after build completes
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
