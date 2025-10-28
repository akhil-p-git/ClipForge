import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';

function ExportDialog({ isOpen, onClose, onExport }) {
  const { timelineClips } = useStore();
  const [outputPath, setOutputPath] = useState('');
  const [resolution, setResolution] = useState('source');
  const [quality, setQuality] = useState('high');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Listen for export progress updates
  useEffect(() => {
    if (!window.electronAPI) return;
    
    const handleProgress = (percent) => {
      setProgress(percent);
    };
    
    window.electronAPI.onExportProgress?.(handleProgress);
    
    return () => {
      // Cleanup listener
    };
  }, []);

  if (!isOpen) return null;

  const handleBrowseOutput = async () => {
    if (!window.electronAPI) return;
    
    try {
      const result = await window.electronAPI.showSaveDialog({
        title: 'Export Video As',
        defaultPath: 'output.mp4',
        filters: [
          { name: 'Video', extensions: ['mp4', 'mov', 'webm'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (!result.canceled && result.filePath) {
        setOutputPath(result.filePath);
      }
    } catch (error) {
      console.error('Browse error:', error);
    }
  };

  const handleExport = async () => {
    if (!outputPath) {
      alert('Please choose an output location');
      return;
    }
    
    if (timelineClips.length === 0) {
      alert('No clips on timeline to export');
      return;
    }
    
    setExporting(true);
    setProgress(0);
    
    try {
      const config = {
        outputPath,
        resolution,
        quality,
        timelineClips, // Pass timeline clips for export
      };
      
      await onExport(config);
      setExporting(false);
      setProgress(0);
      alert('Export completed successfully!');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      setExporting(false);
      setProgress(0);
      alert(`Export failed: ${error.message}`);
    }
  };

  return (
    <div className="export-dialog-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="export-dialog-header">
          <h2>Export Video</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="export-dialog-content">
          <div className="form-group">
            <label>Output Location</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Choose output path..."
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                disabled={exporting}
                style={{ flex: 1 }}
              />
              <button className="browse-button" onClick={handleBrowseOutput} disabled={exporting}>
                Browse...
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              disabled={exporting}
            >
              <option value="source">Source</option>
              <option value="1080p">1080p (1920x1080)</option>
              <option value="720p">720p (1280x720)</option>
              <option value="480p">480p (640x480)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              disabled={exporting}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {exporting && (
            <div className="progress-section">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="progress-text">{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        <div className="export-dialog-footer">
          <button className="cancel-button" onClick={onClose} disabled={exporting}>
            Cancel
          </button>
          <button
            className="export-button"
            onClick={handleExport}
            disabled={exporting || !outputPath}
          >
            {exporting ? `Exporting... ${progress}%` : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;

