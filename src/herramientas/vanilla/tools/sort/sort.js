class SortTool {
  constructor() {
    this.currentLevel = 'easy';
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
    this.totalTrials = 0;
    this.audioCtx = null;
  }

  getAudioCtx() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
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

  changeLevel(level) {
    this.currentLevel = level;
    const instrEl = document.getElementById('sortInstruction');
    if (level === 'easy') {
      instrEl.textContent = 'Dilos en voz alta de menor a mayor';
    } else {
      instrEl.textContent = 'Calcula, retén los resultados y ordénalos de menor a mayor';
    }
    if (this.isPlaying) {
      this.stopEngine();
      this.isPlaying = false;
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'INICIAR';
    }
    this.totalTrials = 0;
    this.updateStats();
    document.getElementById('sort-0').textContent = '--';
    document.getElementById('sort-1').textContent = '--';
    document.getElementById('sort-2').textContent = '--';
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSA';
      this.totalTrials = 0;
      this.updateStats();
      this.startEngine();
      ScreenWakeLock.request();
    } else {
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'REANUDAR';
      this.stopEngine();
      ScreenWakeLock.release();
    }
  }

  startEngine() {
    this.runSort();
    this.interval = setInterval(() => this.runSort(), this.currentSpeed);
  }

  stopEngine() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  generateEasy() {
    const nums = [];
    while (nums.length < 3) {
      const r = Math.floor(Math.random() * 90) + 10;
      if (!nums.includes(r)) nums.push(r);
    }
    return nums.map(n => ({ display: String(n), value: n }));
  }

  generateMedium() {
    const items = [];
    const usedValues = [];
    while (items.length < 3) {
      const isSum = Math.random() < 0.5;
      let a, b, value;
      if (isSum) {
        a = Math.floor(Math.random() * 25) + 5;
        b = Math.floor(Math.random() * 15) + 1;
        value = a + b;
      } else {
        a = Math.floor(Math.random() * 25) + 15;
        b = Math.floor(Math.random() * 12) + 1;
        value = a - b;
      }
      if (usedValues.includes(value)) continue;
      usedValues.push(value);
      const display = isSum ? '(' + a + ' + ' + b + ')' : '(' + a + ' - ' + b + ')';
      items.push({ display, value });
    }
    return items;
  }

  generateHard() {
    const items = [];
    const usedValues = [];
    while (items.length < 3) {
      const a = Math.floor(Math.random() * 8) + 2;
      const b = Math.floor(Math.random() * 8) + 2;
      const value = a * b;
      if (usedValues.includes(value)) continue;
      usedValues.push(value);
      items.push({ display: '(' + a + ' x ' + b + ')', value });
    }
    return items;
  }

  runSort() {
    let items;
    switch (this.currentLevel) {
      case 'medium': items = this.generateMedium(); break;
      case 'hard':   items = this.generateHard(); break;
      default:       items = this.generateEasy();
    }

    document.getElementById('sort-0').textContent = items[0].display;
    document.getElementById('sort-1').textContent = items[1].display;
    document.getElementById('sort-2').textContent = items[2].display;

    this.beep(600, 60);
    if (navigator.vibrate) navigator.vibrate(30);

    this.totalTrials++;
    this.updateStats();
  }

  updateStats() {
    document.getElementById('statRounds').textContent = this.totalTrials;
  }
}

const tool = new SortTool();
