/**
 * Singleton Web Audio context for real-time lip sync.
 *
 * When a new TTS audio element is created, call `ttsAudio.connect(audio)`.
 * The avatar lip-sync hook reads `ttsAudio.analyser` and `ttsAudio.data`
 * each frame to drive mouth morph targets.
 *
 * Kept as a plain mutable object (not React state) so it's accessible
 * inside React Three Fiber's useFrame loop without re-renders.
 */

let _context: AudioContext | null = null;
let _analyser: AnalyserNode | null = null;
let _data: Uint8Array | null = null;
let _prevSource: MediaElementAudioSourceNode | null = null;

function ensureContext(): boolean {
  if (_context && _context.state !== 'closed') return true;

  try {
    _context  = new AudioContext();
    _analyser = _context.createAnalyser();
    _analyser.fftSize = 256;
    _analyser.smoothingTimeConstant = 0.72;
    _analyser.connect(_context.destination);
    _data = new Uint8Array(_analyser.frequencyBinCount);
    return true;
  } catch {
    return false; // Web Audio unavailable — lip sync degrades gracefully
  }
}

export const ttsAudio = {
  get analyser() { return _analyser; },
  get data()     { return _data; },

  connect(audio: HTMLAudioElement) {
    if (!ensureContext()) return;

    // Resume context if browser suspended it (autoplay policy)
    if (_context!.state === 'suspended') {
      void _context!.resume();
    }

    // Disconnect previous source to avoid accumulating nodes
    try { _prevSource?.disconnect(); } catch { /* ignore */ }

    try {
      const source = _context!.createMediaElementSource(audio);
      source.connect(_analyser!);
      _prevSource = source;
    } catch {
      // createMediaElementSource throws if called twice on same element — ignore
    }
  },
};
