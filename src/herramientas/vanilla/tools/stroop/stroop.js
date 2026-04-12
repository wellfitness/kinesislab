class StroopTool {
  constructor() {
    this.stroopColors = [
      { name: 'ROJO', hex: '#e11d48' },
      { name: 'AZUL', hex: '#3b82f6' },
      { name: 'VERDE', hex: '#10b981' },
      { name: 'AMARILLO', hex: '#eab308' },
      { name: 'BLANCO', hex: '#ffffff' }
    ];
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
    this.hits = 0;
    this.misses = 0;
    this.totalTrials = 0;
    this.currentInkColor = null;
    this.responded = false;
    this.trialStart = 0;
    this.reactionTimes = [];
    this.audioCtx = null;
  }

  getAudioCtx() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSA';
      this.resetStats();
      this.startEngine();
      this.setButtonsEnabled(true);
    } else {
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'REANUDAR';
      this.stopEngine();
      this.setButtonsEnabled(false);
    }
  }

  startEngine() {
    ScreenWakeLock.request();
    this.showTrial();
    this.interval = setInterval(() => this.evaluateAndNext(), this.currentSpeed);
  }

  stopEngine() {
    ScreenWakeLock.release();
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  resetStats() {
    this.hits = 0;
    this.misses = 0;
    this.totalTrials = 0;
    this.reactionTimes = [];
    this.updateStats();
  }

  showTrial() {
    const wordObj = this.stroopColors[Math.floor(Math.random() * this.stroopColors.length)];
    let colorObj;
    if (Math.random() < 0.7) {
      const others = this.stroopColors.filter(c => c !== wordObj);
      colorObj = others[Math.floor(Math.random() * others.length)];
    } else {
      colorObj = wordObj;
    }
    this.currentInkColor = colorObj;
    this.responded = false;
    this.trialStart = performance.now();
    this.totalTrials++;

    const el = document.getElementById('stroopText');
    el.textContent = wordObj.name;
    el.style.color = colorObj.hex;

    document.querySelectorAll('.stroop-answer-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong');
    });

    this.updateStats();
  }

  evaluateAndNext() {
    if (!this.isPlaying) return;
    if (!this.responded) {
      this.misses++;
      this.showFeedbackOnButton(null);
      this.updateStats();
      this.stopEngine();
      setTimeout(() => {
        if (!this.isPlaying) return;
        this.showTrial();
        this.interval = setInterval(() => this.evaluateAndNext(), this.currentSpeed);
      }, 800);
      return;
    }
    this.showTrial();
  }

  handleAnswer(colorName) {
    if (!this.isPlaying || this.responded) return;
    this.responded = true;

    const rt = performance.now() - this.trialStart;
    const correct = this.currentInkColor.name === colorName;

    const btn = document.querySelector(`.stroop-answer-btn[data-color="${colorName}"]`);
    if (correct) {
      this.hits++;
      this.reactionTimes.push(rt);
      this.beep(880, 80);
      if (btn) btn.classList.add('correct');
    } else {
      this.misses++;
      this.beep(220, 200);
      if (btn) btn.classList.add('wrong');
      if (navigator.vibrate) navigator.vibrate(100);
    }

    this.updateStats();
  }

  showFeedbackOnButton(btn) {
    const correctBtn = document.querySelector(`.stroop-answer-btn[data-color="${this.currentInkColor.name}"]`);
    if (correctBtn) correctBtn.classList.add('correct');
  }

  setButtonsEnabled(enabled) {
    document.querySelectorAll('.stroop-answer-btn').forEach(btn => {
      btn.disabled = !enabled;
    });
  }

  updateStats() {
    document.getElementById('statHits').textContent = this.hits;
    document.getElementById('statMisses').textContent = this.misses;
    document.getElementById('statTotal').textContent = this.totalTrials;
    const avgRT = this.reactionTimes.length > 0
      ? Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length)
      : '--';
    document.getElementById('statRT').textContent = avgRT + (avgRT !== '--' ? ' ms' : '');
  }
}

const tool = new StroopTool();
