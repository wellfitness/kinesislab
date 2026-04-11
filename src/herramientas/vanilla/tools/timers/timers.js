class TimersTool {
  constructor() {
    this.interval = null;
    this.isPlaying = false;
    this.timerSeconds = 0;
  }
  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const btn = document.getElementById('btnPlayPause');
    if (this.isPlaying) {
      btn.classList.add('active');
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSE';
      this.startEngine();
    } else {
      btn.classList.remove('active');
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'RESUME';
      this.stopEngine();
    }
  }
  startEngine() {
    this.interval = setInterval(() => this.runTimersTick(), 1000);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  reset() {
      this.stopEngine();
      this.timerSeconds = 0;
      this.isPlaying = false;
      document.getElementById('timerDisplay').textContent = "00:00";
      const btn = document.getElementById('btnPlayPause');
      btn.classList.remove('active');
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'START';
  }
  runTimersTick() {
    this.timerSeconds++;
    const m = String(Math.floor(this.timerSeconds / 60)).padStart(2, '0');
    const s = String(this.timerSeconds % 60).padStart(2, '0');
    document.getElementById('timerDisplay').textContent = `${m}:${s}`;
  }
}
const tool = new TimersTool();
