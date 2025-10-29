import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import MediaItem from './MediaItem';
import TranscriptionPanel from '../TranscriptionPanel/TranscriptionPanel';
import ScreenRecorder from '../ScreenRecorder/ScreenRecorder';
import WebcamRecorder from '../WebcamRecorder/WebcamRecorder';
import './MediaLibrary.css';

function MediaLibrary() {
  const { clips, addClip, setCurrentClip, currentClip } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [showTranscriptionPanel, setShowTranscriptionPanel] = useState(false);
  const [transcriptionClip, setTranscriptionClip] = useState(null);
  const [showScreenRecorder, setShowScreenRecorder] = useState(false);
  const [showWebcamRecorder, setShowWebcamRecorder] = useState(false);

  const handleImportClick = async () => {
    console.log('Import button clicked');
    
    if (!window.electronAPI) {
      console.error('Electron API not available');
      alert('Import is only available in Electron. Running in dev mode.');
      return;
    }
    
    try {
      console.log('Calling electronAPI.showOpenDialog...');
      const result = await window.electronAPI.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Videos', extensions: ['mp4', 'mov', 'webm', 'avi', 'mkv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      console.log('Dialog result:', result);

      if (!result.canceled && result.filePaths) {
        for (const filePath of result.filePaths) {
          try {
            // Get video metadata using FFmpeg
            console.log('Getting metadata for:', filePath);
            const metadata = await window.electronAPI.getVideoMetadata(filePath);
            
            const clip = {
              id: `clip-${Date.now()}-${Math.random()}`,
              filePath: filePath,
              fileName: filePath.split('/').pop() || filePath.split('\\').pop(),
              duration: metadata.duration,
              resolution: metadata.resolution,
              fileSize: metadata.fileSize,
              format: filePath.split('.').pop(),
              hasAudio: metadata.hasAudio,
              createdAt: new Date(),
            };
            
            console.log('Adding clip with metadata:', clip);
            addClip(clip);
          } catch (error) {
            console.log('FFmpeg metadata failed, adding with defaults:', error.message);
            // Fallback with basic info if FFmpeg fails
            const clip = {
              id: `clip-${Date.now()}-${Math.random()}`,
              filePath: filePath,
              fileName: filePath.split('/').pop() || filePath.split('\\').pop(),
              duration: 10,
              resolution: 'Unknown',
              fileSize: 0,
              format: filePath.split('.').pop(),
              hasAudio: true,
              createdAt: new Date(),
            };
            addClip(clip);
          }
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Error importing video: ${error.message}`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    console.log('Dropped files:', files);
    
    for (const file of files) {
      // Check if it's a video file
      const isVideo = file.type.startsWith('video/') || 
                     /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name);
      
      if (isVideo) {
        try {
          const filePath = file.path || file.name;
          console.log('Getting metadata for dropped file:', filePath);
          if (window.electronAPI) {
            const metadata = await window.electronAPI.getVideoMetadata(filePath);
            
            const clip = {
              id: `clip-${Date.now()}-${Math.random()}`,
              filePath: filePath,
              fileName: file.name,
              duration: metadata.duration,
              resolution: metadata.resolution,
              fileSize: metadata.fileSize,
              format: file.name.split('.').pop(),
              hasAudio: metadata.hasAudio,
              createdAt: new Date(),
            };
            
            console.log('Adding dropped clip with metadata:', clip);
            addClip(clip);
          } else {
            throw new Error('Electron API not available');
          }
        } catch (error) {
          console.error('Failed to get metadata for dropped file:', error);
          // Fallback
          const clip = {
            id: `clip-${Date.now()}-${Math.random()}`,
            filePath: file.path || file.name,
            fileName: file.name,
            duration: 0,
            resolution: 'Unknown',
            fileSize: file.size,
            format: file.name.split('.').pop(),
            hasAudio: true,
            createdAt: new Date(),
          };
          addClip(clip);
        }
      }
    }
  };

  const handleClipClick = (clip) => {
    console.log('=== CLIP CLICKED ===');
    console.log('Clip data:', clip);
    console.log('Setting current clip to:', clip.id);
    
    // Set current clip for video preview
    setCurrentClip(clip);
    console.log('Current clip set in store');
  };

  const handleRemoveClip = (clipId) => {
    // If we're removing the currently selected clip, clear it
    if (currentClip?.id === clipId) {
      setCurrentClip(null);
      useStore.getState().setPlayhead(0);
      useStore.getState().setIsPlaying(false);
      useStore.getState().clearTrimPoints();
    }
    useStore.getState().removeClip(clipId);
  };

  const handleTranscribeClick = (clip) => {
    setTranscriptionClip(clip);
    setShowTranscriptionPanel(true);
  };

  return (
    <div className="media-library">
      <div className="media-library-header">
        <h2 className="section-title">Media Library</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="record-button-header"
            onClick={() => setShowScreenRecorder(true)}
            title="Record Screen"
          >
            📹 Screen
          </button>
          <button 
            className="webcam-button-header"
            onClick={() => setShowWebcamRecorder(true)}
            title="Record Webcam"
          >
            📷 Webcam
          </button>
          <button 
            className="import-button"
            onClick={handleImportClick}
            title="Import Video Files"
          >
            Import
          </button>
          <button 
            className="export-button"
            onClick={() => window.showExportDialog?.()}
            title="Export Video"
          >
            Export
          </button>
        </div>
      </div>

      <div 
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {clips.length === 0 ? (
          <div className="empty-state">
            {isDragging ? (
              <p className="drop-text">Drop videos here</p>
            ) : (
              <>
                <p className="empty-text">No media imported</p>
                <p className="help-text">Click "Import" or drag & drop videos</p>
              </>
            )}
          </div>
        ) : (
          <div className="media-items">
            {clips.map(clip => (
              <MediaItem 
                key={clip.id} 
                clip={clip} 
                isSelected={currentClip?.id === clip.id}
                onClick={() => handleClipClick(clip)}
                onRemove={handleRemoveClip}
                onTranscribe={() => handleTranscribeClick(clip)}
              />
            ))}
          </div>
        )}
      </div>

      {clips.length > 0 && (
        <div className="media-library-footer">
          <span className="count-text">{clips.length} {clips.length === 1 ? 'clip' : 'clips'}</span>
        </div>
      )}

      {showTranscriptionPanel && transcriptionClip && (
        <TranscriptionPanel
          videoPath={transcriptionClip.filePath}
          fileName={transcriptionClip.fileName}
          onClose={() => {
            setShowTranscriptionPanel(false);
            setTranscriptionClip(null);
          }}
        />
      )}

      {showScreenRecorder && (
        <ScreenRecorder
          onClose={() => setShowScreenRecorder(false)}
        />
      )}

      {showWebcamRecorder && (
        <WebcamRecorder
          onClose={() => setShowWebcamRecorder(false)}
        />
      )}
    </div>
  );
}

export default MediaLibrary;
