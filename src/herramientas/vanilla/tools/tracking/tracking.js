class TrackingTool {
  constructor() {
    this.interval = null;
    this.isPlaying = false;
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
    this.runTrackingTick();
    this.interval = setInterval(() => this.runTrackingTick(), 1000);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }

  runTrackingTick() {
    const dot = document.getElementById('tracking-dot');
    const container = document.getElementById('stimulusContainer');
    const padding = 100;
    const maxX = container.clientWidth - padding; 
    const maxY = container.clientHeight - padding;
    if(maxX <= 0 || maxY <= 0) return;
    const randomX = Math.floor(Math.random() * maxX) + (padding/2);
    const randomY = Math.floor(Math.random() * maxY) + (padding/2);
    dot.style.left = `${randomX}px`;
    dot.style.top = `${randomY}px`;
  }
}
const tool = new TrackingTool();
