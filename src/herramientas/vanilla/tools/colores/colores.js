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
    this.minPerColor = 2;
    this.colorCounts = [0, 0, 0, 0];
    this.learningDone = false;
    this.level = 2;
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
      this.rounds = 0;
      this.colorCounts = [0, 0, 0, 0];
      this.learningDone = false;
      document.getElementById('statRounds').textContent = '0';
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

  changeLevel(val) {
    this.level = parseInt(val, 10);
    const legend = document.getElementById('coloresLegend');
    if (legend) legend.style.display = this.level === 1 ? 'none' : '';
  }

  updateAction(index, value) {
    this.coloresData[index].action = value.toUpperCase();
  }

  getDistractorName(excludeIndex) {
    let idx;
    do { idx = Math.floor(Math.random() * this.coloresData.length); }
    while (idx === excludeIndex);
    return this.coloresData[idx].name;
  }

  runColores() {
    const colorIndex = Math.floor(Math.random() * this.coloresData.length);
    const col = this.coloresData[colorIndex];
    const bg = document.getElementById('stimulus-colores');
    const textEl = document.getElementById('coloresText');
    const actionEl = document.getElementById('coloresAction');

    bg.style.backgroundColor = col.hex;

    if (this.level === 1 || this.level === 3) {
      textEl.textContent = this.getDistractorName(colorIndex);
    } else {
      textEl.textContent = col.name;
    }

    this.rounds++;
    this.colorCounts[colorIndex]++;
    document.getElementById('statRounds').textContent = this.rounds;

    if (!this.learningDone) {
      this.learningDone = this.colorCounts.every(c => c >= this.minPerColor);
    }

    if (this.level === 1) {
      actionEl.classList.remove('visible');
    } else if (!this.learningDone) {
      actionEl.textContent = col.action;
      actionEl.classList.add('visible');
    } else {
      actionEl.classList.remove('visible');
    }
  }
}

const tool = new ColoresTool();
