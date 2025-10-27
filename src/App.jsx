import React from 'react';
import './App.css';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Menu Bar */}
      <div className="h-12 bg-gray-800 text-white flex items-center px-4 border-b border-gray-700">
        <h1 className="text-lg font-semibold">ClipForge</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Media Library - Left Panel */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 text-white">
          <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide text-gray-400">
            Media Library
          </h2>
          <div className="bg-gray-700/50 rounded-lg p-4 mb-4 hover:bg-gray-700 cursor-pointer transition-colors">
            <p className="text-sm text-gray-300">+ Import Video</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 cursor-pointer transition-colors">
            <p className="text-sm text-gray-300">🎥 Record Screen</p>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col">
          {/* Video Preview */}
          <div className="flex-1 bg-black flex items-center justify-center">
            <div className="text-gray-500 text-center">
              <p className="text-lg mb-2">Video Preview</p>
              <p className="text-sm">Import or record video to get started</p>
            </div>
          </div>

          {/* Timeline - Bottom Panel */}
          <div className="h-48 bg-gray-800 border-t border-gray-700 p-4">
            <h2 className="text-sm font-semibold mb-2 uppercase tracking-wide text-gray-400">
              Timeline
            </h2>
            <div className="flex items-center h-32 bg-gray-700/30 rounded p-2">
              <div className="text-gray-500 text-sm">
                Drag clips from media library to start editing
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-500">
        Ready
      </div>
    </div>
  );
}

export default App;

