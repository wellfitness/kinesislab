class TraceTool {
  constructor() {
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 8000;
  }
  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const btn = document.getElementById('btnPlayPause');
    if (this.isPlaying) {
      btn.classList.add('active');
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSA';
      this.startEngine();
    } else {
      btn.classList.remove('active');
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'REANUDAR';
      this.stopEngine();
    }
  }
  startEngine() {
    ScreenWakeLock.request();
    this.runTrace();
    this.interval = setInterval(() => this.runTrace(), this.currentSpeed);
  }
  stopEngine() {
    ScreenWakeLock.release();
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runTrace() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?&@";
    const char = chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('traceText').textContent = char;
  }
}
const tool = new TraceTool();
