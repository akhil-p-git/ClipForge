import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import MediaItem from './MediaItem';
import './MediaLibrary.css';

function MediaLibrary() {
  const { clips, addClip, setCurrentClip } = useStore();
  const [isDragging, setIsDragging] = useState(false);

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
            console.error('Failed to get metadata, using fallback:', error);
            // Fallback with basic info if FFmpeg fails
            const clip = {
              id: `clip-${Date.now()}-${Math.random()}`,
              filePath: filePath,
              fileName: filePath.split('/').pop() || filePath.split('\\').pop(),
              duration: 0,
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
    console.log('Clip clicked:', clip);
    setCurrentClip(clip);
  };

  return (
    <div className="media-library">
      <div className="media-library-header">
        <h2 className="section-title">Media Library</h2>
        <button 
          className="import-button"
          onClick={handleImportClick}
          title="Import Video Files"
        >
          + Import
        </button>
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
                onClick={() => handleClipClick(clip)}
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
    </div>
  );
}

export default MediaLibrary;
