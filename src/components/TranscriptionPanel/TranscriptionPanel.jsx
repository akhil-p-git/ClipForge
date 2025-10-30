import React, { useState, useEffect } from 'react';
import './TranscriptionPanel.css';

function TranscriptionPanel({ videoPath, fileName, onClose }) {
  const [transcript, setTranscript] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState('');

  // Load API key from environment on mount
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const envApiKey = await window.electronAPI.getOpenAIApiKey();
        if (envApiKey) {
          setApiKey(envApiKey);
        }
      } catch (err) {
        console.warn('Could not load API key from environment:', err);
      }
    };
    loadApiKey();
  }, []);

  const handleTranscribe = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your OpenAI API key in the .env file or input field');
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      const result = await window.electronAPI.transcribeVideo({
        inputPath: videoPath,
        apiKey: apiKey.trim()
      });

      setTranscript({
        text: result.text,
        segments: result.segments
      });
    } catch (err) {
      console.error('Transcription error:', err);
      setError(err.message || 'Failed to transcribe video');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleExport = async (format) => {
    if (!transcript) return;

    let content = '';
    let ext = '';

    switch (format) {
      case 'txt':
        content = transcript.text;
        ext = 'txt';
        break;
      case 'srt':
        content = generateSRT(transcript.segments);
        ext = 'srt';
        break;
      case 'vtt':
        content = generateVTT(transcript.segments);
        ext = 'vtt';
        break;
      default:
        return;
    }

    const { canceled, filePath } = await window.electronAPI.showSaveDialog({
      defaultPath: fileName.replace(/\.(mp4|mov)$/i, `.${ext}`),
      filters: [
        { name: `${ext.toUpperCase()} Files`, extensions: [ext] }
      ]
    });

    if (!canceled && filePath) {
      // Write file using IPC
      try {
        const result = await window.electronAPI.saveTextFile({ filePath, content });
        if (result.success) {
          alert('Transcript exported successfully!');
        } else {
          alert(`Failed to export: ${result.error}`);
        }
      } catch (err) {
        console.error('Export error:', err);
        alert(`Failed to export: ${err.message}`);
      }
    }
  };

  const generateSRT = (segments) => {
    if (!segments || segments.length === 0) return '';
    
    return segments.map((segment, index) => {
      const start = formatSRTTime(segment.start);
      const end = formatSRTTime(segment.end);
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n\n`;
    }).join('');
  };

  const formatSRTTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const generateVTT = (segments) => {
    if (!segments || segments.length === 0) return 'WEBVTT\n\n';
    
    let vtt = 'WEBVTT\n\n';
    segments.forEach((segment, index) => {
      const start = formatVTTTime(segment.start);
      const end = formatVTTTime(segment.end);
      vtt += `${start} --> ${end}\n${segment.text}\n\n`;
    });
    
    return vtt;
  };

  const formatVTTTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript.text);
    alert('Transcript copied to clipboard!');
  };

  return (
    <div className="transcription-panel">
      <div className="transcription-header">
        <h3>Transcription</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="transcription-content">
        {!transcript && !isTranscribing && (
          <div className="transcription-input">
            <label>
              <span>OpenAI API Key:</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your OpenAI API key"
              />
            </label>
            <button onClick={handleTranscribe}>Transcribe Video</button>
          </div>
        )}

        {isTranscribing && (
          <div className="transcription-loading">
            <p>Transcribing video...</p>
            <p className="loading-note">This may take a minute</p>
          </div>
        )}

        {error && (
          <div className="transcription-error">
            <p>Error: {error}</p>
          </div>
        )}

        {transcript && (
          <div className="transcription-result">
            <div className="transcription-actions">
              <button onClick={handleCopy}>Copy</button>
              <button onClick={() => handleExport('txt')}>Export TXT</button>
              <button onClick={() => handleExport('srt')}>Export SRT</button>
              <button onClick={() => handleExport('vtt')}>Export VTT</button>
            </div>
            <div className="transcription-text">
              {transcript.text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TranscriptionPanel;

