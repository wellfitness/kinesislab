class GoNoGoTool {
  constructor() {
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
    }
  }

  startEngine() {
    this.showTrial();
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

  changeLevel(level) {
    if (level === 'easy') this.goRatio = 0.8;
    else if (level === 'medium') this.goRatio = 0.6;
    else this.goRatio = 0.5;
  }

  resetStats() {
    this.hits = 0;
    this.misses = 0;
    this.falseAlarms = 0;
    this.reactionTimes = [];
    this.updateStats();
  }

  showTrial() {
    this.currentTrial = Math.random() < this.goRatio ? 'go' : 'nogo';
    this.responded = false;
    this.trialStart = performance.now();

    const circle = document.getElementById('goCircle');
    const label = document.getElementById('goLabel');

    circle.classList.remove('flash');
    void circle.offsetWidth;
    circle.classList.add('flash');

    if (this.currentTrial === 'go') {
      circle.style.background = '#10b981';
      circle.querySelector('.material-icons').textContent = 'touch_app';
      label.textContent = 'TOCA';
      label.style.color = '#10b981';
      label.className = 'go-label';
    } else {
      circle.style.background = 'var(--rosa-600)';
      circle.querySelector('.material-icons').textContent = 'block';
      label.textContent = 'NO TOQUES';
      label.style.color = 'var(--rosa-400)';
      label.className = 'go-label';
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
      if (navigator.vibrate) navigator.vibrate(100);
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
