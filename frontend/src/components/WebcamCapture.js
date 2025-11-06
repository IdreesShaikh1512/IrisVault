import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Camera, CameraOff } from 'lucide-react';

const WebcamCapture = ({ onCapture, onFramesCollected, autoCapture = false, targetFrames = 5 }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState([]);
  const [countdown, setCountdown] = useState(null);

  // Start webcam
  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      alert('Unable to access webcam. Please check permissions.');
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Capture single frame
  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Start auto capture sequence
  const startAutoCapture = useCallback(() => {
    if (capturing) return;
    
    setCapturing(true);
    setCapturedFrames([]);
    
    let count = targetFrames;
    const frames = [];
    
    const captureInterval = setInterval(() => {
      const frame = captureFrame();
      if (frame) {
        frames.push(frame);
        setCapturedFrames(prev => [...prev, frame]);
        
        if (onCapture) {
          onCapture(frame);
        }
      }
      
      count--;
      setCountdown(count);
      
      if (count <= 0) {
        clearInterval(captureInterval);
        setCapturing(false);
        setCountdown(null);
        
        if (onFramesCollected) {
          onFramesCollected(frames);
        }
      }
    }, 800); // Capture every 800ms
    
  }, [capturing, targetFrames, captureFrame, onCapture, onFramesCollected]);

  // Manual single capture
  const handleManualCapture = () => {
    const frame = captureFrame();
    if (frame) {
      const newFrames = [...capturedFrames, frame];
      setCapturedFrames(newFrames);
      
      if (onCapture) {
        onCapture(frame);
      }
      
      if (newFrames.length >= targetFrames && onFramesCollected) {
        onFramesCollected(newFrames);
      }
    }
  };

  // Initialize webcam on mount
  useEffect(() => {
    startWebcam();
    return () => stopWebcam();
  }, []);

  return (
    <div className="space-y-4">
      <div className="webcam-container relative" data-testid="webcam-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto rounded-lg"
          data-testid="webcam-video"
        />
        
        {/* Iris guide overlay */}
        {stream && (
          <div className="webcam-overlay">
            <div className="iris-guide" />
            <div className="iris-crosshair" />
            {capturing && <div className="scan-line" />}
          </div>
        )}
        
        {/* Countdown display */}
        {countdown !== null && (
          <div className="absolute top-4 right-4 bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold">
            {countdown}
          </div>
        )}
        
        {/* Frame counter */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
          Frames: {capturedFrames.length}/{targetFrames}
        </div>
        
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-lg">
            <div className="text-center text-slate-400">
              <CameraOff className="w-12 h-12 mx-auto mb-2" />
              <p>Initializing camera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 justify-center">
        {autoCapture ? (
          <Button
            onClick={startAutoCapture}
            disabled={!stream || capturing}
            className="bg-blue-500 hover:bg-blue-600"
            data-testid="start-capture-button"
          >
            <Camera className="w-4 h-4 mr-2" />
            {capturing ? `Capturing... (${countdown})` : 'Start Capture'}
          </Button>
        ) : (
          <Button
            onClick={handleManualCapture}
            disabled={!stream || capturedFrames.length >= targetFrames}
            className="bg-blue-500 hover:bg-blue-600"
            data-testid="capture-frame-button"
          >
            <Camera className="w-4 h-4 mr-2" />
            Capture Frame
          </Button>
        )}
        
        {capturedFrames.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setCapturedFrames([])}
            data-testid="reset-capture-button"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Progress indicator */}
      {capturedFrames.length > 0 && (
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${(capturedFrames.length / targetFrames) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
