class ArrowsTool {
  constructor() {
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 3000;
    this.voice = null;
    this.loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    this.voice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('es'))
              || voices.find(v => v.default)
              || voices[0]
              || null;
  }

  warmupTTS() {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      u.lang = 'es-ES';
      if (this.voice) u.voice = this.voice;
      window.speechSynthesis.speak(u);
    } catch (e) { /* noop */ }
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const btn = document.getElementById('btnPlayPause');
    if (this.isPlaying) {
      btn.classList.add('active');
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSA';
      this.loadVoices();
      this.warmupTTS();
      this.startEngine();
    } else {
      btn.classList.remove('active');
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'REANUDAR';
      this.stopEngine();
    }
  }
  startEngine() {
    this.runArrows();
    ScreenWakeLock.request();
    this.interval = setInterval(() => this.runArrows(), this.currentSpeed);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    ScreenWakeLock.release();
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runArrows() {
    const dirs = ['IZQUIERDA', 'DERECHA'];
    const visDir = dirs[Math.floor(Math.random() * dirs.length)];
    document.getElementById('arrowVisual').textContent = visDir === 'IZQUIERDA' ? 'arrow_back' : 'arrow_forward';

    let audioDir = visDir;
    if (Math.random() > 0.5) audioDir = visDir === 'IZQUIERDA' ? 'DERECHA' : 'IZQUIERDA';

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(audioDir);
        utterance.lang = 'es-ES';
        utterance.rate = 1.3;
        utterance.volume = 1;
        if (this.voice) utterance.voice = this.voice;
        window.speechSynthesis.speak(utterance);
      } catch (e) { /* noop */ }
    }
  }
}
const tool = new ArrowsTool();
