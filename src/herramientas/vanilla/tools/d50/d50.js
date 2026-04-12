class D50Tool {
  constructor() {
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
    this.hits = 0;
    this.misses = 0;
    this.totalTrials = 0;
    this.currentAnswer = null;
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
    let num1, num2;
    do {
      num1 = Math.floor(Math.random() * 40) + 5;
      num2 = Math.floor(Math.random() * 40) + 5;
    } while (num1 + num2 === 50);

    this.currentAnswer = (num1 + num2) > 50 ? 'mayor' : 'menor';
    this.responded = false;
    this.trialStart = performance.now();
    this.totalTrials++;

    document.getElementById('d50Text').textContent = num1 + ' + ' + num2;
    document.querySelectorAll('.d50-answer-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong');
    });

    this.updateStats();
  }

  evaluateAndNext() {
    if (!this.isPlaying) return;
    if (!this.responded) {
      this.misses++;
      const correctBtn = document.querySelector(`.d50-answer-btn[data-answer="${this.currentAnswer}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
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
    this.updateStats();
  }

  handleAnswer(answer) {
    if (!this.isPlaying || this.responded) return;
    this.responded = true;

    const rt = performance.now() - this.trialStart;
    const correct = this.currentAnswer === answer;
    const btn = document.querySelector(`.d50-answer-btn[data-answer="${answer}"]`);

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

  setButtonsEnabled(enabled) {
    document.querySelectorAll('.d50-answer-btn').forEach(btn => {
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

const tool = new D50Tool();
