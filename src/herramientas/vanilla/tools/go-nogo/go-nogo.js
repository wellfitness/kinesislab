class GoNoGoTool {
  constructor() {
    this.levels = {
      basic: {
        goColor: { bg: '#10b981', label: 'TOCA', icon: 'touch_app' },
        nogoColors: [{ bg: '#e11d48', label: 'NO TOQUES', icon: 'block' }],
        instruction: 'Verde = toca. Rojo = no toques.'
      },
      distractors: {
        goColor: { bg: '#10b981', label: 'TOCA', icon: 'touch_app' },
        nogoColors: [
          { bg: '#e11d48', label: 'NO TOQUES', icon: 'block' },
          { bg: '#eab308', label: 'NO TOQUES', icon: 'block' },
          { bg: '#3b82f6', label: 'NO TOQUES', icon: 'block' }
        ],
        instruction: 'Solo verde = toca. Cualquier otro color = no toques.'
      },
      inverted: {
        goColor: { bg: '#e11d48', label: 'TOCA', icon: 'touch_app' },
        nogoColors: [
          { bg: '#10b981', label: 'NO TOQUES', icon: 'block' },
          { bg: '#eab308', label: 'NO TOQUES', icon: 'block' },
          { bg: '#3b82f6', label: 'NO TOQUES', icon: 'block' }
        ],
        instruction: 'Solo rojo = toca. Cualquier otro color = no toques.'
      }
    };
    this.currentLevel = 'basic';
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 2000;
    this.goRatio = 0.6;
    this.hits = 0;
    this.misses = 0;
    this.falseAlarms = 0;
    this.reactionTimes = [];
    this.currentTrial = null;
    this.trialStart = 0;
    this.responded = false;
    this.audioCtx = null;
  }

  getAudioCtx() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    return this.audioCtx;
  }

  beep(freq, duration) {
    const ctx = this.getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.25;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.stop(ctx.currentTime + duration / 1000);
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSA';
      this.resetStats();
      this.startEngine();
    } else {
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'REANUDAR';
      this.stopEngine();
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

  changeLevel(level) {
    this.currentLevel = level;
    const config = this.levels[level];
    document.getElementById('goInstruction').textContent = config.instruction;
    if (this.isPlaying) {
      this.stopEngine();
      this.isPlaying = false;
      this.resetStats();
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'INICIAR';
      const circle = document.getElementById('goCircle');
      circle.style.background = 'var(--gris-700)';
      circle.querySelector('.material-symbols-sharp').textContent = 'touch_app';
      document.getElementById('goLabel').textContent = 'Preparado';
      document.getElementById('goLabel').style.color = 'var(--gris-500)';
    }
  }

  resetStats() {
    this.hits = 0;
    this.misses = 0;
    this.falseAlarms = 0;
    this.reactionTimes = [];
    this.updateStats();
  }

  showTrial() {
    const config = this.levels[this.currentLevel];
    const isGo = Math.random() < this.goRatio;

    this.responded = false;
    this.trialStart = performance.now();

    const circle = document.getElementById('goCircle');
    const label = document.getElementById('goLabel');

    circle.classList.remove('flash');
    void circle.offsetWidth;
    circle.classList.add('flash');

    if (isGo) {
      this.currentTrial = 'go';
      circle.style.background = config.goColor.bg;
      circle.querySelector('.material-symbols-sharp').textContent = config.goColor.icon;
      label.textContent = config.goColor.label;
      label.style.color = config.goColor.bg;
    } else {
      this.currentTrial = 'nogo';
      const nogo = config.nogoColors[Math.floor(Math.random() * config.nogoColors.length)];
      circle.style.background = nogo.bg;
      circle.querySelector('.material-symbols-sharp').textContent = nogo.icon;
      label.textContent = nogo.label;
      label.style.color = nogo.bg;
    }
  }

  evaluateAndNext() {
    if (!this.isPlaying) return;

    if (this.currentTrial === 'go' && !this.responded) {
      this.misses++;
      this.flashFeedback('miss');
    }

    this.showTrial();
    this.updateStats();
  }

  handleTap() {
    if (!this.isPlaying || this.responded) return;
    this.responded = true;

    if (this.currentTrial === 'go') {
      const rt = Math.round(performance.now() - this.trialStart);
      this.hits++;
      this.reactionTimes.push(rt);
      this.beep(880, 80);
      this.flashFeedback('hit');
    } else {
      this.falseAlarms++;
      this.beep(220, 200);
      this.flashFeedback('false');
      if (navigator.vibrate) navigator.vibrate(200);
    }

    this.updateStats();
  }

  flashFeedback(type) {
    const circle = document.getElementById('goCircle');
    if (type === 'hit') {
      circle.style.boxShadow = '0 0 60px rgba(16, 185, 129, 0.8)';
    } else if (type === 'false') {
      circle.style.boxShadow = '0 0 60px rgba(225, 29, 72, 0.8)';
    } else {
      circle.style.boxShadow = '0 0 60px rgba(234, 179, 8, 0.8)';
    }
    setTimeout(() => { circle.style.boxShadow = '0 0 40px rgba(0,0,0,0.4)'; }, 300);
  }

  updateStats() {
    document.getElementById('statHits').textContent = this.hits;
    document.getElementById('statMisses').textContent = this.misses;
    document.getElementById('statFalse').textContent = this.falseAlarms;

    if (this.reactionTimes.length > 0) {
      const avg = Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length);
      document.getElementById('statRT').textContent = avg + ' ms';
    } else {
      document.getElementById('statRT').textContent = '-- ms';
    }
  }
}

const tool = new GoNoGoTool();
