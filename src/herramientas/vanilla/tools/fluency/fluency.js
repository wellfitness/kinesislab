class FluencyTool {
  constructor() {
    this.fluencyCategories = [
      "Animales", "Comida", "Colores", "Ciudades",
      "Nombres propios", "Transporte", "Herramientas",
      "Deportes", "Profesiones", "Partes del cuerpo",
      "Empieza por A", "Empieza por C", "Empieza por M",
      "Empieza por S", "Empieza por P"
    ];
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
    this.totalTrials = 0;
    this.lastCategory = null;
    this.audioCtx = null;
    this.wakeLock = null;
  }

  getAudioCtx() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return this.audioCtx;
  }

  beep(freq, dur) {
    const ctx = this.getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.25;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
    osc.stop(ctx.currentTime + dur / 1000);
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) this.wakeLock = await navigator.wakeLock.request('screen');
    } catch (_) {}
  }

  releaseWakeLock() {
    if (this.wakeLock) { this.wakeLock.release(); this.wakeLock = null; }
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSA';
      this.totalTrials = 0;
      this.updateStats();
      this.startEngine();
      this.requestWakeLock();
    } else {
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'REANUDAR';
      this.stopEngine();
      this.releaseWakeLock();
    }
  }

  startEngine() {
    this.runFluency();
    this.interval = setInterval(() => this.runFluency(), this.currentSpeed * 2);
  }

  stopEngine() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runFluency() {
    let cat;
    do {
      cat = this.fluencyCategories[Math.floor(Math.random() * this.fluencyCategories.length)];
    } while (cat === this.lastCategory && this.fluencyCategories.length > 1);
    this.lastCategory = cat;
    document.getElementById('fluencyText').textContent = cat;

    this.beep(600, 60);
    if (navigator.vibrate) navigator.vibrate(30);

    this.totalTrials++;
    this.updateStats();
  }

  updateStats() {
    document.getElementById('statRounds').textContent = this.totalTrials;
  }
}

const tool = new FluencyTool();
