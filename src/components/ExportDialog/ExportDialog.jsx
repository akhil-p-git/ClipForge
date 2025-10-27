import React, { useState } from 'react';

function ExportDialog({ isOpen, onClose, onExport }) {
  const [outputPath, setOutputPath] = useState('');
  const [resolution, setResolution] = useState('source');
  const [quality, setQuality] = useState('high');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);
    
    try {
      const config = {
        outputPath,
        resolution,
        quality,
      };
      
      await onExport(config);
      setExporting(false);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      setExporting(false);
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
            <input
              type="text"
              placeholder="Choose output path..."
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              disabled={exporting}
            />
            <button className="browse-button" disabled={exporting}>
              Browse...
            </button>
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
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;

