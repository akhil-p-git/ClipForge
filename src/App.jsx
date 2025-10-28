import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import MediaLibrary from './components/MediaLibrary/MediaLibrary';
import VideoPlayer from './components/VideoPlayer/VideoPlayer';
import Timeline from './components/Timeline/Timeline';
import ExportDialog from './components/ExportDialog/ExportDialog';
import './App.css';

function App() {
  console.log('App component rendering...');

  const handleExport = async (config) => {
    console.log('Export config:', config);
    
    if (!window.electronAPI) {
      alert('Export is only available in Electron');
      return;
    }
    
    try {
      const result = await window.electronAPI.exportVideo(config);
      
      if (result.success) {
        alert(result.message || 'Export completed successfully!');
      } else {
        alert(`Export failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-900">
      {/* Menu Bar */}
      <div className="h-12 bg-gray-800 text-white flex items-center justify-center px-4 border-b border-gray-700">
        <h1 className="text-lg font-semibold">ClipForge</h1>
      </div>

      <ExportDialog onExport={handleExport} />

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
          <div className="h-64 bg-gray-800 border-t border-gray-700" style={{ flexShrink: 0 }}>
            <Timeline />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-500">
        Ready
      </div>
    </div>
    </DndProvider>
  );
}

export default App;

