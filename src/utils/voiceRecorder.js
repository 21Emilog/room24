// Voice Recording Utility for RentMzansi
// Handles audio recording, playback, and processing

export class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.recordingStartTime = null;
    this.pausedDuration = 0;
  }

  /**
   * Check if browser supports MediaRecorder API
   */
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * Check for microphone permission
   */
  static async checkPermission() {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      return permission.state === 'granted';
    } catch (e) {
      console.warn('Permission API not available:', e);
      return false;
    }
  }

  /**
   * Request microphone access
   */
  async requestMicrophoneAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      return stream;
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone access denied. Please enable microphone permissions.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please check your audio device.');
      } else {
        throw new Error(`Microphone access error: ${error.message}`);
      }
    }
  }

  /**
   * Start recording
   */
  async startRecording() {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    try {
      const stream = await this.requestMicrophoneAccess();

      // Use WebM codec for better compatibility
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000,
      };

      // Fallback if WebM isn't supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = '';
        }
      }

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.audioChunks = [];
      this.recordingStartTime = Date.now();
      this.pausedDuration = 0;
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();

      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn('Not currently recording');
      return null;
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const duration = (Date.now() - this.recordingStartTime - this.pausedDuration) / 1000;

        // Stop all tracks to release microphone
        this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());

        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordingStartTime = null;

        resolve({ blob: audioBlob, duration });
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('Recording error:', event.error);
        reject(new Error(`Recording error: ${event.error}`));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel recording without saving
   */
  cancelRecording() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }

    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordingStartTime = null;
  }

  /**
   * Get current recording duration in seconds
   */
  getDuration() {
    if (!this.isRecording || !this.recordingStartTime) {
      return 0;
    }
    return (Date.now() - this.recordingStartTime - this.pausedDuration) / 1000;
  }

  /**
   * Pause recording
   */
  pauseRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
      this.pauseTime = Date.now();
    }
  }

  /**
   * Resume recording
   */
  resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      if (this.pauseTime) {
        this.pausedDuration += Date.now() - this.pauseTime;
      }
    }
  }
}

/**
 * Play audio from blob or URL
 */
export function playAudio(source) {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio();

      if (source instanceof Blob) {
        audio.src = URL.createObjectURL(source);
      } else if (typeof source === 'string') {
        audio.src = source;
      } else {
        reject(new Error('Invalid audio source'));
        return;
      }

      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        reject(new Error('Error playing audio'));
      };

      audio.play().catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format duration in mm:ss format
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert audio blob to base64
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Check browser's audio support
 */
export function getAudioCapabilities() {
  const audio = new Audio();
  return {
    webm: audio.canPlayType('audio/webm') !== '',
    mp3: audio.canPlayType('audio/mpeg') !== '',
    ogg: audio.canPlayType('audio/ogg') !== '',
    wav: audio.canPlayType('audio/wav') !== '',
  };
}
