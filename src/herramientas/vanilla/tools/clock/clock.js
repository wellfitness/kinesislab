class ClockTool {
  constructor() {
    this.clockTimes = [
      { text: 'Tres y cuarto', hour: 3, min: 15, sameSide: true },
      { text: 'Seis y media', hour: 6, min: 30, sameSide: false },
      { text: 'Nueve y cuarto', hour: 9, min: 15, sameSide: false },
      { text: 'Doce en punto', hour: 12, min: 0, sameSide: true },
      { text: 'Tres menos cuarto', hour: 2, min: 45, sameSide: false },
      { text: 'Nueve y media', hour: 9, min: 30, sameSide: true },
      { text: 'Seis en punto', hour: 6, min: 0, sameSide: false },
      { text: 'Una y cinco', hour: 1, min: 5, sameSide: true },
      { text: 'Doce y media', hour: 12, min: 30, sameSide: false },
      { text: 'Nueve menos cuarto', hour: 8, min: 45, sameSide: true },
      { text: 'Cuatro y veinte', hour: 4, min: 20, sameSide: true },
      { text: 'Diez y diez', hour: 10, min: 10, sameSide: true },
      { text: 'Siete menos cinco', hour: 6, min: 55, sameSide: false },
      { text: 'Dos y media', hour: 2, min: 30, sameSide: true },
      { text: 'Once menos cuarto', hour: 10, min: 45, sameSide: false }
    ];
    this.interval = null;
    this.pendingRestart = null;
    this.isPlaying = false;
    this.currentSpeed = 6000;
    this.currentAnswer = null;
    this.responded = false;
    this.hits = 0;
    this.misses = 0;
    this.totalTrials = 0;
    this.reactionTimes = [];
    this.trialStart = 0;
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
    if (this.pendingRestart) clearTimeout(this.pendingRestart);
    this.pendingRestart = null;
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
    const time = this.clockTimes[Math.floor(Math.random() * this.clockTimes.length)];
    this.currentAnswer = time.sameSide ? 'mismo' : 'opuesto';
    this.responded = false;
    this.trialStart = performance.now();
    this.totalTrials++;

    document.getElementById('clockText').textContent = '"' + time.text + '"';
    document.querySelectorAll('.clock-answer-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong');
    });

    this.beep(600, 60);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(time.text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }

    this.updateStats();
  }

  evaluateAndNext() {
    if (!this.isPlaying) return;
    if (!this.responded) {
      this.misses++;
      const correctBtn = document.querySelector(`.clock-answer-btn[data-answer="${this.currentAnswer}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
      this.updateStats();
      this.stopEngine();
      this.isPlaying = true;
      ScreenWakeLock.request();
      this.pendingRestart = setTimeout(() => {
        this.pendingRestart = null;
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
    const btn = document.querySelector(`.clock-answer-btn[data-answer="${answer}"]`);

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
      const correctBtn = document.querySelector(`.clock-answer-btn[data-answer="${this.currentAnswer}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
    }
    this.updateStats();
  }

  setButtonsEnabled(enabled) {
    document.querySelectorAll('.clock-answer-btn').forEach(btn => {
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

const tool = new ClockTool();
