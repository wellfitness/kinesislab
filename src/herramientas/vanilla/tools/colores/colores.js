class ColoresTool {
  constructor() {
    this.coloresData = [
      { name: 'ROJO', hex: '#e11d48' },
      { name: 'AZUL', hex: '#3b82f6' },
      { name: 'VERDE', hex: '#10b981' },
      { name: 'AMARILLO', hex: '#eab308' }
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
    this.runColores();
    this.interval = setInterval(() => this.runColores(), this.currentSpeed);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }
  runColores() {
    const col = this.coloresData[Math.floor(Math.random() * this.coloresData.length)];
    const bg = document.getElementById('stimulus-colores');
    bg.style.backgroundColor = col.hex;
    document.getElementById('coloresText').textContent = col.name;
    if(navigator.vibrate) navigator.vibrate(50);
  }
}
const tool = new ColoresTool();
