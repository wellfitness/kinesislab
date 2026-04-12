class TrackingTool {
  constructor() {
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 1000;
    this.totalTrials = 0;
    this.wakeLock = null;
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
    this.runTrackingTick();
    this.interval = setInterval(() => this.runTrackingTick(), this.currentSpeed);
  }

  stopEngine() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    const dot = document.getElementById('tracking-dot');
    dot.style.transition = 'all ' + (this.currentSpeed / 1000) + 's ease-in-out';
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runTrackingTick() {
    const dot = document.getElementById('tracking-dot');
    const container = document.getElementById('stimulusContainer');
    const padding = 80;
    const maxX = container.clientWidth - padding;
    const maxY = container.clientHeight - padding;
    if (maxX <= 0 || maxY <= 0) return;
    const randomX = Math.floor(Math.random() * maxX) + (padding / 2);
    const randomY = Math.floor(Math.random() * maxY) + (padding / 2);
    dot.style.left = randomX + 'px';
    dot.style.top = randomY + 'px';

    this.totalTrials++;
    this.updateStats();
  }

  updateStats() {
    document.getElementById('statRounds').textContent = this.totalTrials;
  }
}

const tool = new TrackingTool();
