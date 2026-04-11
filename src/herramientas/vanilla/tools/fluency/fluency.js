class FluencyTool {
  constructor() {
    this.fluencyCategories = [
      "Animales", "Comida", "Colores", "Ciudades", 
      "Nombres propios", "Transporte", "Herramientas", 
      "Empieza por A", "Empieza por C", "Empieza por M"
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
    this.runFluency();
    this.interval = setInterval(() => this.runFluency(), this.currentSpeed * 2);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runFluency() {
    const cat = this.fluencyCategories[Math.floor(Math.random() * this.fluencyCategories.length)];
    document.getElementById('fluencyText').textContent = cat;
  }
}
const tool = new FluencyTool();
