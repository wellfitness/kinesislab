class NBackTool {
  constructor() {
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 3000;
    this.n = 1;
    this.stimuli = [
      { shape: 'circle', color: '#18f8f6' },
      { shape: 'square', color: '#e11d48' },
      { shape: 'triangle', color: '#eab308' },
      { shape: 'diamond', color: '#3b82f6' },
      { shape: 'circle', color: '#10b981' },
      { shape: 'square', color: '#fb7185' },
    ];
    this.history = [];
    this.hits = 0;
    this.misses = 0;
    this.falseAlarms = 0;
    this.totalTrials = 0;
    this.responded = false;
    this.isMatch = false;
    this.audioCtx = null;
    this.matchProbability = 0.33;
  }

  getAudioCtx() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return this.audioCtx;
  }

  beep(freq, duration) {
    const ctx = this.getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.stop(ctx.currentTime + duration / 1000);
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSE';
      this.resetStats();
      this.startEngine();
    } else {
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'RESUME';
      this.stopEngine();
      document.getElementById('matchBtn').disabled = true;
    }
  }

  startEngine() {
    this.showStimulus();
    this.interval = setInterval(() => this.evaluateAndNext(), this.currentSpeed);
  }

  stopEngine() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  changeN(value) {
    this.n = parseInt(value, 10);
    document.getElementById('nLabel').textContent = this.n;
    if (this.isPlaying) {
      this.stopEngine();
      this.isPlaying = false;
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'START';
      document.getElementById('matchBtn').disabled = true;
    }
  }

  resetStats() {
    this.history = [];
    this.hits = 0;
    this.misses = 0;
    this.falseAlarms = 0;
    this.totalTrials = 0;
    this.updateStats();
    this.renderHistory();
  }

  pickStimulus() {
    if (this.history.length >= this.n && Math.random() < this.matchProbability) {
      return this.history[this.history.length - this.n];
    }
    return this.stimuli[Math.floor(Math.random() * this.stimuli.length)];
  }

  showStimulus() {
    const stim = this.pickStimulus();
    this.history.push(stim);
    this.totalTrials++;
    this.responded = false;

    this.isMatch = this.history.length > this.n &&
      this.history[this.history.length - 1] === this.history[this.history.length - 1 - this.n];

    this.renderShape(stim);
    this.renderHistory();

    document.getElementById('matchBtn').disabled = false;
    document.getElementById('matchBtn').classList.remove('pressed');

    this.updateStats();
  }

  evaluateAndNext() {
    if (!this.isPlaying) return;

    if (this.isMatch && !this.responded) {
      this.misses++;
      this.showFeedback('miss');
    }

    this.showStimulus();
    this.updateStats();
  }

  handleMatch() {
    if (!this.isPlaying || this.responded) return;
    this.responded = true;

    document.getElementById('matchBtn').classList.add('pressed');

    if (this.isMatch) {
      this.hits++;
      this.beep(880, 80);
      this.showFeedback('hit');
    } else {
      this.falseAlarms++;
      this.beep(220, 200);
      this.showFeedback('false');
      if (navigator.vibrate) navigator.vibrate(100);
    }

    this.updateStats();
  }

  renderShape(stim) {
    const display = document.getElementById('shapeDisplay');
    const container = document.getElementById('nbackStimulus');

    container.style.background = 'var(--gris-800)';
    container.style.borderColor = stim.color;
    container.style.border = '3px solid ' + stim.color;

    let svg = '';
    switch (stim.shape) {
      case 'circle':
        svg = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="${stim.color}"/></svg>`;
        break;
      case 'square':
        svg = `<svg viewBox="0 0 100 100"><rect x="15" y="15" width="70" height="70" rx="8" fill="${stim.color}"/></svg>`;
        break;
      case 'triangle':
        svg = `<svg viewBox="0 0 100 100"><polygon points="50,10 90,85 10,85" fill="${stim.color}"/></svg>`;
        break;
      case 'diamond':
        svg = `<svg viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill="${stim.color}"/></svg>`;
        break;
    }
    display.innerHTML = svg;
  }

  renderHistory() {
    const bar = document.getElementById('historyBar');
    const visible = this.history.slice(-(this.n + 3));
    bar.innerHTML = '';
    visible.forEach((stim, i) => {
      const dot = document.createElement('div');
      dot.className = 'history-dot';
      dot.style.background = stim.color;
      if (i === visible.length - 1) dot.classList.add('current');
      bar.appendChild(dot);
    });
  }

  showFeedback(type) {
    const el = document.getElementById('feedbackFlash');
    const stim = document.getElementById('nbackStimulus');

    if (type === 'hit') {
      el.textContent = '';
      el.style.color = '#10b981';
      stim.style.boxShadow = '0 0 50px rgba(16, 185, 129, 0.6)';
    } else if (type === 'false') {
      el.textContent = '';
      el.style.color = 'var(--rosa-400)';
      stim.style.boxShadow = '0 0 50px rgba(225, 29, 72, 0.6)';
    } else {
      el.textContent = '';
      el.style.color = 'var(--tulip-tree-400)';
      stim.style.boxShadow = '0 0 50px rgba(234, 179, 8, 0.6)';
    }

    el.classList.add('show');
    setTimeout(() => {
      el.classList.remove('show');
      stim.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
    }, 400);
  }

  updateStats() {
    document.getElementById('statHits').textContent = this.hits;
    document.getElementById('statMisses').textContent = this.misses;
    document.getElementById('statFalse').textContent = this.falseAlarms;
    document.getElementById('statTotal').textContent = this.totalTrials;
  }
}

const tool = new NBackTool();
