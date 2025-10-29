import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import './TrimExportDialog.css';

function TrimExportDialog({ onClose, onExport, inPoint, outPoint }) {
  const { currentClip } = useStore();
  const [format, setFormat] = useState('mp4');
  const [filename, setFilename] = useState('');
  const [saving, setSaving] = useState(false);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = async () => {
    if (!filename.trim()) {
      alert('Please enter a filename');
      return;
    }

    setSaving(true);
    try {
      await onExport(filename, format);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!currentClip) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="trim-export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Trimmed Video</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="export-info">
            <p>Exporting from <strong>{formatTime(inPoint)}</strong> to <strong>{formatTime(outPoint)}</strong></p>
          </div>

          <div className="form-group">
            <label>Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Enter filename"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Format</label>
            <div className="format-options">
              <button
                className={`format-button ${format === 'mp4' ? 'active' : ''}`}
                onClick={() => setFormat('mp4')}
              >
                MP4
              </button>
              <button
                className={`format-button ${format === 'mov' ? 'active' : ''}`}
                onClick={() => setFormat('mov')}
              >
                MOV
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="export-button"
            onClick={handleExport}
            disabled={saving || !filename.trim()}
          >
            {saving ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrimExportDialog;

