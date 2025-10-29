import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import './WebcamRecorder.css';

function WebcamRecorder({ onClose }) {
  const { addClip } = useStore();
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [previewStream, setPreviewStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    loadCameras();
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    // Start preview when camera is selected
    if (selectedCameraId && !isRecording) {
      startPreview();
    } else if (!selectedCameraId && previewStream) {
      stopPreview();
    }

    return () => {
      if (previewStream && !isRecording) {
        stopPreview();
      }
    };
  }, [selectedCameraId, isRecording]);

  const loadCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setCameras(videoDevices);
      
      if (videoDevices.length > 0) {
        setSelectedCameraId(videoDevices[0].deviceId);
      } else {
        setError('No cameras found');
      }
    } catch (err) {
      console.error('Error loading cameras:', err);
      setError('Failed to access cameras. Please grant camera permissions.');
    }
  };

  const startPreview = async () => {
    try {
      setError(null);
      
      // Stop existing preview if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPreviewStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error starting preview:', err);
      setError(`Failed to start camera: ${err.message}`);
    }
  };

  const stopPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setPreviewStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!selectedCameraId || !streamRef.current) {
      setError('Please select a camera first');
      return;
    }

    try {
      setError(null);

      // Use the existing preview stream
      const stream = streamRef.current;

      // Create MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp9'
      };

      // Try to find a compatible codec
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Create blob from chunks
        const blob = new Blob(chunksRef.current, { type: options.mimeType });
        
        // Save to file (will be converted to MP4)
        const { canceled, filePath } = await window.electronAPI.showSaveDialog({
          defaultPath: `webcam_recording_${Date.now()}.mp4`,
          filters: [
            { name: 'MP4 Files', extensions: ['mp4'] },
            { name: 'WebM Files', extensions: ['webm'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (!canceled && filePath) {
          // Convert blob to base64 and save via IPC
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result.split(',')[1];
            await saveRecordingFile(filePath, base64);
          };
          reader.onerror = () => {
            setError('Failed to process recording');
          };
          reader.readAsDataURL(blob);
        } else {
          // User canceled, but we still need to clean up
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Failed to start recording: ${err.message}`);
    }
  };

  const saveRecordingFile = async (filePath, base64Data) => {
    try {
      // Save file via IPC and convert to MP4
      const result = await window.electronAPI.saveRecordingFile({ 
        filePath, 
        base64Data, 
        convertToMp4: true 
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save file');
      }
      
      // Use the returned file path (might be MP4 after conversion)
      const finalPath = result.filePath || filePath;
      const fileExtension = finalPath.toLowerCase().endsWith('.mp4') ? 'mp4' : 'webm';
      
      // Wait longer for conversion and file to be ready, then get metadata
      // Use fileSize from save result if available
      const savedFileSize = result.fileSize || 0;
      
      setTimeout(async () => {
        try {
          const metadata = await window.electronAPI.getVideoMetadata(finalPath);
          
          // Validate metadata - ensure duration is valid
          const duration = metadata.duration && !isNaN(metadata.duration) && metadata.duration > 0
            ? metadata.duration
            : recordingTime; // Fallback to recording time
          
          const clip = {
            id: `clip-${Date.now()}-${Math.random()}`,
            filePath: finalPath,
            fileName: finalPath.split('/').pop() || finalPath.split('\\').pop(),
            duration: duration,
            resolution: metadata.resolution || 'Unknown',
            fileSize: metadata.fileSize || savedFileSize || 0,
            format: fileExtension,
            hasAudio: true, // Webcam recordings always include audio
            createdAt: new Date(),
          };
          
          addClip(clip);
          onClose();
        } catch (err) {
          console.error('Error adding clip to library:', err);
          // Still add clip with recording time as fallback duration
          const clip = {
            id: `clip-${Date.now()}-${Math.random()}`,
            filePath: finalPath,
            fileName: finalPath.split('/').pop() || finalPath.split('\\').pop(),
            duration: recordingTime,
            resolution: 'Unknown',
            fileSize: 0,
            format: fileExtension,
            hasAudio: true,
            createdAt: new Date(),
          };
          addClip(clip);
          onClose();
        }
      }, 2000); // Longer wait for conversion
    } catch (err) {
      console.error('Error saving recording:', err);
      setError('Failed to save recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="webcam-recorder">
      <div className="webcam-recorder-header">
        <h3>Webcam Recording</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="webcam-recorder-content">
        {error && (
          <div className="webcam-recorder-error">
            <p>{error}</p>
          </div>
        )}

        <div className="webcam-preview">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="preview-video"
          />
          {!previewStream && (
            <div className="preview-placeholder">
              <p>Select a camera to start preview</p>
            </div>
          )}
        </div>

        <div className="webcam-select">
          <label>
            <span>Camera:</span>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              disabled={isRecording}
            >
              {cameras.map(camera => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="webcam-controls">
          {!isRecording ? (
            <button 
              className="record-button start"
              onClick={startRecording}
              disabled={!selectedCameraId || !previewStream}
            >
              Start Recording
            </button>
          ) : (
            <>
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span>Recording: {formatTime(recordingTime)}</span>
              </div>
              <button 
                className="record-button stop"
                onClick={stopRecording}
              >
                Stop Recording
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default WebcamRecorder;

