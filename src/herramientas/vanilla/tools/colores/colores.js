class ColoresTool {
  constructor() {
    this.coloresData = [
      { name: 'ROJO', hex: '#e11d48', action: 'SENTADILLA' },
      { name: 'AZUL', hex: '#3b82f6', action: 'SALTO' },
      { name: 'VERDE', hex: '#10b981', action: 'DERECHA' },
      { name: 'AMARILLO', hex: '#eab308', action: 'IZQUIERDA' }
    ];
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
    this.rounds = 0;
    this.learningRounds = 6;
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const btn = document.getElementById('btnPlayPause');
    const intro = document.getElementById('coloresIntro');
    if (this.isPlaying) {
      btn.classList.add('active');
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSA';
      if (intro) intro.style.display = 'none';
      this.startEngine();
    } else {
      btn.classList.remove('active');
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'REANUDAR';
      this.stopEngine();
    }
  }

  startEngine() {
    this.runColores();
    ScreenWakeLock.request();
    this.interval = setInterval(() => this.runColores(), this.currentSpeed);
  }

  stopEngine() {
    if (this.interval) clearInterval(this.interval);
    ScreenWakeLock.release();
  }

  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  updateAction(index, value) {
    this.coloresData[index].action = value.toUpperCase();
  }

  runColores() {
    const col = this.coloresData[Math.floor(Math.random() * this.coloresData.length)];
    const bg = document.getElementById('stimulus-colores');
    const actionEl = document.getElementById('coloresAction');

    bg.style.backgroundColor = col.hex;
    document.getElementById('coloresText').textContent = col.name;

    this.rounds++;
    document.getElementById('statRounds').textContent = this.rounds;

    if (this.rounds <= this.learningRounds) {
      actionEl.textContent = col.action;
      actionEl.classList.add('visible');
    } else {
      actionEl.classList.remove('visible');
    }

    if (navigator.vibrate) navigator.vibrate(50);
  }
}

const tool = new ColoresTool();
