// Procedural Web Audio API pentatonic Tokyo bell chimes for Shin-AI Tokyo
// Muted by default; initializes lazily on explicit user toggle.

export function createAudio() {
  let enabled = false;
  let ctx = null;

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return ctx;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      ctx = new AudioCtx();
    } catch {
      return null;
    }
    return ctx;
  }

  function playBellNote(ac, freq, startOffset, duration, peakGain) {
    const now = ac.currentTime + startOffset;
    const osc = ac.createOscillator();
    const harmonic = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    const harmGain = ac.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Subtle crystalline bell harmonic
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(freq * 2.003, now);
    harmGain.gain.setValueAtTime(0.14, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    harmonic.connect(harmGain);
    harmGain.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    osc.start(now);
    harmonic.start(now);
    osc.stop(now + duration + 0.05);
    harmonic.stop(now + duration + 0.05);
  }

  // Soft Tokyo ascending pentatonic chime when a permanent building is completed
  function playComplete() {
    if (!enabled) return;
    const ac = ensureContext();
    if (!ac) return;
    // Yo pentatonic: D5 -> E5 -> A5 -> D6
    playBellNote(ac, 587.33, 0.0, 0.85, 0.065);
    playBellNote(ac, 659.25, 0.09, 0.9, 0.06);
    playBellNote(ac, 880.0, 0.18, 1.15, 0.055);
    playBellNote(ac, 1174.66, 0.28, 1.35, 0.038);
  }

  // Clear two-tone Tokyo station chime when an AI builder waits for user approval
  function playWaiting() {
    if (!enabled) return;
    const ac = ensureContext();
    if (!ac) return;
    // A5 -> E5 gentle attentive bell
    playBellNote(ac, 880.0, 0.0, 0.75, 0.06);
    playBellNote(ac, 659.25, 0.14, 0.95, 0.055);
  }

  function playToggleConfirm() {
    const ac = ensureContext();
    if (!ac) return;
    playBellNote(ac, 587.33, 0.0, 0.65, 0.05);
    playBellNote(ac, 880.0, 0.08, 0.75, 0.045);
  }

  function setEnabled(next) {
    enabled = Boolean(next);
    if (enabled) {
      playToggleConfirm();
    }
    return enabled;
  }

  function toggle() {
    return setEnabled(!enabled);
  }

  function isEnabled() {
    return enabled;
  }

  return {
    isEnabled,
    setEnabled,
    toggle,
    playComplete,
    playWaiting
  };
}
