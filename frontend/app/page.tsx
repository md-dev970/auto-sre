'use client';

import { useState } from 'react';
import Chat from '@/components/Chat';

export default function Home() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <main className="flex h-screen w-full overflow-hidden">
      {/* Left Panel: Chat Interface */}
      <div className="w-1/2 flex flex-col border-r border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10">
          <h1 className="text-xl font-bold text-gray-800">AI App Builder</h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <Chat 
            onPreviewUrl={(url) => setPreviewUrl(url)}
            onBuildStart={() => setPreviewUrl(null)} // Clear preview on new build
          />
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="w-1/2 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
          <h2 className="font-semibold text-gray-700">Live Preview</h2>
          {previewUrl && (
            <a 
              href={previewUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              Open in new tab ↗
            </a>
          )}
        </div>
        
        <div className="flex-1 relative bg-gray-100 flex items-center justify-center">
          {previewUrl ? (
            <div className="text-center p-8 bg-white rounded-lg shadow-lg border border-gray-200 max-w-md mx-4">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Build Successful!</h3>
              <p className="text-gray-600 mb-8">
                Your application has been deployed to Vercel. 
                Due to security restrictions, the preview opens in a new window.
              </p>
              <a 
                href={previewUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-150 shadow-sm"
              >
                Open Application ↗
              </a>
              <p className="mt-4 text-xs text-gray-400">
                Host: {new URL(previewUrl).hostname}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full mb-4 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium">No application preview</p>
              <p className="text-sm mt-2">Build an app in the chat to see it here.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
