export interface SyncSession {
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  stream: MediaStream | null;
  animationFrameId: number | null;
  scriptNode?: ScriptProcessorNode | null;
}

export class CinemaSyncEngine {
  private session: SyncSession = {
    audioContext: null,
    analyserNode: null,
    stream: null,
    animationFrameId: null,
    scriptNode: null,
  };
  
  private isAnalyzing = false;
  private onTimeUpdate: (seconds: number) => void;
  private onStatusChange: (status: 'idle' | 'listening' | 'matching' | 'synced' | 'error', message: string) => void;
  private onErrorCallback: (err: unknown) => void;
  
  constructor(
    onTimeUpdate: (seconds: number) => void,
    onStatusChange: (status: 'idle' | 'listening' | 'matching' | 'synced' | 'error', message: string) => void,
    onErrorCallback: (err: unknown) => void
  ) {
    this.onTimeUpdate = onTimeUpdate;
    this.onStatusChange = onStatusChange;
    this.onErrorCallback = onErrorCallback;
  }
  
  public async start(referenceAudioPath?: string) {
    try {
      this.onStatusChange('listening', 'Initializing microphone stream...');
      
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.session.stream = stream;
      
      // 2. Set up Web Audio API context and nodes
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser');
      }
      const audioContext = new AudioContextClass();
      const analyserNode = audioContext.createAnalyser();
      
      // Connect mic stream to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyserNode);
      
      analyserNode.fftSize = 256;
      this.session.audioContext = audioContext;
      this.session.analyserNode = analyserNode;
      
      this.isAnalyzing = true;
      this.onStatusChange('matching', 'Listening to ambient sound...');
      
      // Start visualizer loop
      this.readFrequencyData();
      
      // If no reference audio path is provided, run mock sync fallback
      if (!referenceAudioPath) {
        console.warn('No reference audio path provided for real-time sync. Falling back to mock sync.');
        this.runMockFallback();
        return;
      }
      
      // 3. Load reference audio in parallel with microphone recording
      let referenceBuffer: AudioBuffer | null = null;
      let loadError = false;
      
      try {
        this.onStatusChange('matching', 'Loading reference fingerprints...');
        const response = await fetch(referenceAudioPath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        referenceBuffer = await audioContext.decodeAudioData(arrayBuffer);
      } catch (err) {
        console.warn('Failed to load reference audio file. Falling back to mock sync.', err);
        loadError = true;
      }
      
      if (loadError || !referenceBuffer) {
        this.runMockFallback();
        return;
      }
      
      // 4. Record 4 seconds of microphone audio
      this.onStatusChange('matching', 'Analyzing ambient sound (4s)...');
      const micSamples = await this.recordMicSamples(audioContext, source, 4.0);
      
      if (!this.isAnalyzing) return;
      
      // 5. Match recorded sample against reference buffer
      this.onStatusChange('matching', 'Correlating fingerprints...');
      const matchedOffset = this.findAcousticMatch(referenceBuffer, micSamples, audioContext.sampleRate);
      
      if (matchedOffset !== null) {
        this.onStatusChange('synced', 'Sync established via real-time sound!');
        this.onTimeUpdate(matchedOffset);
      } else {
        throw new Error('Acoustic correlation failed to find a high-confidence match.');
      }
      
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to access microphone';
      console.error('Mic access or audio context error:', err);
      this.onStatusChange('error', errorMsg);
      this.onErrorCallback(err);
      this.stop();
    }
  }
  
  private runMockFallback() {
    setTimeout(() => {
      if (!this.isAnalyzing) return;
      const matchedTimestamp = 5045; // 1 hour, 24 mins, 5 seconds
      this.onStatusChange('synced', 'Sync established (Mock Fallback)!');
      this.onTimeUpdate(matchedTimestamp);
    }, 2000);
  }
  
  private recordMicSamples(
    audioContext: AudioContext,
    source: MediaStreamAudioSourceNode,
    durationSeconds: number
  ): Promise<number[]> {
    return new Promise((resolve) => {
      const sampleRate = audioContext.sampleRate;
      const totalSamplesNeeded = sampleRate * durationSeconds;
      const micSamples: number[] = [];
      
      const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
      
      scriptNode.onaudioprocess = (e) => {
        if (!this.isAnalyzing || micSamples.length >= totalSamplesNeeded) {
          scriptNode.disconnect();
          resolve(micSamples);
          return;
        }
        
        const inputData = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < inputData.length; i++) {
          micSamples.push(inputData[i]);
        }
      };
      
      source.connect(scriptNode);
      scriptNode.connect(audioContext.destination);
      
      this.session.scriptNode = scriptNode;
    });
  }
  
  private findAcousticMatch(
    referenceBuffer: AudioBuffer,
    micSamples: number[],
    micSampleRate: number
  ): number | null {
    const refSamples = referenceBuffer.getChannelData(0);
    const refSampleRate = referenceBuffer.sampleRate;
    
    // Downsample rate for correlation (low rate like 2000Hz makes it super fast)
    const targetRate = 2000;
    
    const downsampledRef = this.downsample(refSamples, refSampleRate, targetRate);
    const downsampledMic = this.downsample(micSamples, micSampleRate, targetRate);
    
    // Normalize signals (zero mean, unit variance)
    this.normalize(downsampledRef);
    this.normalize(downsampledMic);
    
    const N = downsampledRef.length;
    const M = downsampledMic.length;
    
    if (N < M) return null;
    
    // Perform coarse search first (every 20 samples = 10ms resolution)
    let bestCoarseScore = -Infinity;
    let bestCoarseIndex = 0;
    const coarseStride = 20;
    
    for (let k = 0; k < N - M; k += coarseStride) {
      let score = 0;
      for (let i = 0; i < M; i++) {
        score += downsampledMic[i] * downsampledRef[k + i];
      }
      
      if (score > bestCoarseScore) {
        bestCoarseScore = score;
        bestCoarseIndex = k;
      }
    }
    
    // Perform fine search around best coarse match (+/- coarseStride samples)
    let bestFineScore = -Infinity;
    let bestFineIndex = bestCoarseIndex;
    const startSearch = Math.max(0, bestCoarseIndex - coarseStride);
    const endSearch = Math.min(N - M, bestCoarseIndex + coarseStride);
    
    for (let k = startSearch; k <= endSearch; k++) {
      let score = 0;
      for (let i = 0; i < M; i++) {
        score += downsampledMic[i] * downsampledRef[k + i];
      }
      
      if (score > bestFineScore) {
        bestFineScore = score;
        bestFineIndex = k;
      }
    }
    
    // Convert sample index back to seconds in the reference track
    const matchedSeconds = bestFineIndex / targetRate;
    console.log(`Acoustic match found at offset: ${matchedSeconds}s with score: ${bestFineScore}`);
    
    return matchedSeconds;
  }
  
  private downsample(channelData: Float32Array | number[], originalSampleRate: number, targetSampleRate: number): Float32Array {
    const factor = originalSampleRate / targetSampleRate;
    const targetLength = Math.round(channelData.length / factor);
    const result = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i++) {
      const originalIndex = Math.round(i * factor);
      result[i] = channelData[originalIndex] || 0;
    }
    return result;
  }
  
  private normalize(arr: Float32Array) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i];
    const mean = sum / arr.length;
    
    let sqSum = 0;
    for (let i = 0; i < arr.length; i++) {
      const diff = arr[i] - mean;
      arr[i] = diff;
      sqSum += diff * diff;
    }
    const std = Math.sqrt(sqSum / arr.length);
    if (std > 0) {
      for (let i = 0; i < arr.length; i++) arr[i] /= std;
    }
  }
  
  private readFrequencyData() {
    if (!this.isAnalyzing || !this.session.analyserNode) return;
    
    const bufferLength = this.session.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const tick = () => {
      if (!this.isAnalyzing || !this.session.analyserNode) return;
      
      // Get byte frequency data
      this.session.analyserNode.getByteFrequencyData(dataArray);
      
      this.session.animationFrameId = requestAnimationFrame(tick);
    };
    
    this.session.animationFrameId = requestAnimationFrame(tick);
  }
  
  public stop() {
    this.isAnalyzing = false;
    
    if (this.session.animationFrameId) {
      cancelAnimationFrame(this.session.animationFrameId);
      this.session.animationFrameId = null;
    }
    
    if (this.session.scriptNode) {
      this.session.scriptNode.disconnect();
      this.session.scriptNode = null;
    }
    
    if (this.session.stream) {
      this.session.stream.getTracks().forEach(track => track.stop());
      this.session.stream = null;
    }
    
    if (this.session.audioContext) {
      if (this.session.audioContext.state !== 'closed') {
        this.session.audioContext.close();
      }
      this.session.audioContext = null;
    }
    
    this.session.analyserNode = null;
    this.onStatusChange('idle', 'Sync engine stopped');
  }
}
export default CinemaSyncEngine;
