import React from 'react';
import MediaLibrary from './components/MediaLibrary/MediaLibrary';
import VideoPlayer from './components/VideoPlayer/VideoPlayer';
import Timeline from './components/Timeline/Timeline';
import './App.css';

function App() {
  console.log('App component rendering...');
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Menu Bar */}
      <div className="h-12 bg-gray-800 text-white flex items-center px-4 border-b border-gray-700">
        <h1 className="text-lg font-semibold">ClipForge</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Media Library - Left Panel */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <MediaLibrary />
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col">
          {/* Video Preview */}
          <div className="flex-1 bg-black">
            <VideoPlayer />
          </div>

          {/* Timeline - Bottom Panel */}
          <div className="h-64 bg-gray-800 border-t border-gray-700">
            <Timeline />
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

