class StroopTool {
  constructor() {
    this.stroopColors = [
      { name: 'ROJO', hex: '#e11d48' },
      { name: 'AZUL', hex: '#3b82f6' },
      { name: 'VERDE', hex: '#10b981' },
      { name: 'AMARILLO', hex: '#eab308' },
      { name: 'ROSA', hex: '#fb7185' }
    ];
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
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
    this.runStroop();
    this.interval = setInterval(() => this.runStroop(), this.currentSpeed);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runStroop() {
    const wordObj = this.stroopColors[Math.floor(Math.random() * this.stroopColors.length)];
    let colorObj = this.stroopColors[Math.floor(Math.random() * this.stroopColors.length)];
    if(Math.random() < 0.7 && wordObj === colorObj) {
      const remaining = this.stroopColors.filter(c => c !== wordObj);
      colorObj = remaining[Math.floor(Math.random() * remaining.length)];
    }
    const el = document.getElementById('stroopText');
    el.textContent = wordObj.name;
    el.style.color = colorObj.hex;
  }
}
const tool = new StroopTool();
