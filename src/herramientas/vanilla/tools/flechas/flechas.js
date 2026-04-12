class FlechasTool {
  constructor() {
    this.arrows = [
      'north', 'south', 'west', 'east',
      'north_east', 'north_west', 'south_east', 'south_west'
    ];
    this.interval = null;
    this.timerInterval = null;
    this.isPlaying = false;
    this.currentSpeed = 2000;
    this.duration = 5;
    this.timeLeft = 0;
    this.audioCtx = null;
    this.isFullscreen = false;
  }

  getAudioCtx() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return this.audioCtx;
  }

  beep() {
    const ctx = this.getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.value = 0.25;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.12);
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      document.getElementById('playIcon').textContent = 'stop';
      document.getElementById('playText').textContent = 'DETENER';
      this.timeLeft = this.duration * 60;
      this.startEngine();
      this.startTimer();
    } else {
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'INICIAR';
      this.stopEngine();
      this.stopTimer();
    }
  }

  startEngine() {
    this.showArrow();
    ScreenWakeLock.request();
    this.interval = setInterval(() => this.showArrow(), this.currentSpeed);
  }

  stopEngine() {
    if (this.interval) clearInterval(this.interval);
    ScreenWakeLock.release();
    this.interval = null;
  }

  startTimer() {
    const display = document.getElementById('timerDisplay');
    display.style.display = 'block';
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.updateTimerDisplay();
      if (this.timeLeft <= 0) {
        this.endExercise();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    document.getElementById('timerDisplay').style.display = 'none';
  }

  endExercise() {
    this.isPlaying = false;
    this.stopEngine();
    this.stopTimer();
    document.getElementById('playIcon').textContent = 'play_arrow';
    document.getElementById('playText').textContent = 'INICIAR';

    const arrow = document.getElementById('arrowIcon');
    arrow.textContent = 'check_circle';
    arrow.style.color = '#10b981';

    const ctx = this.getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600;
    osc.type = 'sine';
    gain.gain.value = 0.2;
    osc.start();
    setTimeout(() => { osc.frequency.value = 800; }, 150);
    setTimeout(() => { osc.frequency.value = 1000; }, 300);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    document.getElementById('timerDisplay').textContent =
      String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    this.updateArrowColor();
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  adjustDuration(delta) {
    this.duration = Math.max(1, Math.min(30, this.duration + delta));
    document.getElementById('durationValue').textContent = this.duration + ' min';
  }

  getSpeedColor() {
    if (this.currentSpeed >= 3000) return 'var(--turquesa-400)';
    if (this.currentSpeed >= 2000) return 'var(--tulip-tree-400)';
    return 'var(--rosa-400)';
  }

  updateArrowColor() {
    document.getElementById('arrowIcon').style.color = this.getSpeedColor();
  }

  showArrow() {
    const arrow = this.arrows[Math.floor(Math.random() * this.arrows.length)];
    const el = document.getElementById('arrowIcon');

    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');

    el.textContent = arrow;
    el.style.color = this.getSpeedColor();

    this.beep();
    if (navigator.vibrate) navigator.vibrate(50);
  }

  toggleFullscreen() {
    if (!this.isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    this.isFullscreen = !this.isFullscreen;
    document.getElementById('fullscreenIcon').textContent =
      this.isFullscreen ? 'fullscreen_exit' : 'fullscreen';
  }
}

const tool = new FlechasTool();
