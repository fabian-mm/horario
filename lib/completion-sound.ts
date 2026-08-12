let audioContext: AudioContext | null = null;

export const prepareCompletionSound = () => {
  if (typeof window === "undefined") return;
  const Context = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  audioContext ??= new Context();
  if (audioContext.state === "suspended") void audioContext.resume();
};

export const playCompletionSound = () => {
  prepareCompletionSound();
  if (!audioContext) return;
  const start = audioContext.currentTime;
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = audioContext!.createOscillator();
    const gain = audioContext!.createGain();
    const noteStart = start + index * 0.14;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.3);
    oscillator.connect(gain).connect(audioContext!.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.32);
  });
};
