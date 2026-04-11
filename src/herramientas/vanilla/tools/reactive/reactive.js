class ReactiveTool {
  constructor() {
    this.stimuli = [
      { type: 'beep', color: null, hex: '#ffffff', name: 'PITIDO', action: 'SALTO' },
      { type: 'color', color: 'var(--turquesa-400)', hex: '#18f8f6', name: 'TURQUESA', action: 'DERECHA' },
      { type: 'color', color: 'var(--tulip-tree-400)', hex: '#eab308', name: 'AMARILLO', action: 'IZQUIERDA' },
      { type: 'color', color: 'var(--rosa-400)', hex: '#e11d48', name: 'ROSA', action: 'ABAJO' }
    ];
    this.interval = null;
    this.pendingTimeout = null;
    this.clearTimeout = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
    this.totalTrials = 0;
    this.learningRounds = 8;
    this.audioCtx = null;
    this.wakeLock = null;
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

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) this.wakeLock = await navigator.wakeLock.request('screen');
    } catch (_) {}
  }

  releaseWakeLock() {
    if (this.wakeLock) { this.wakeLock.release(); this.wakeLock = null; }
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSE';
      this.totalTrials = 0;
      this.updateStats();
      this.renderLegend();
      this.startEngine();
      this.requestWakeLock();
    } else {
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'RESUME';
      this.stopEngine();
      this.releaseWakeLock();
    }
  }

  startEngine() {
    this.runReactive();
    this.interval = setInterval(() => this.runReactive(), this.currentSpeed);
  }

  stopEngine() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    if (this.pendingTimeout) clearTimeout(this.pendingTimeout);
    if (this.clearTimeout) clearTimeout(this.clearTimeout);
    this.pendingTimeout = null;
    this.clearTimeout = null;
  }

  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  updateAction(index, value) {
    this.stimuli[index].action = value.toUpperCase().trim();
    this.renderLegend();
  }

  renderLegend() {
    const el = document.getElementById('reactiveLegend');
    el.innerHTML = this.stimuli.map((s, i) =>
      '<div class="legend-item">' +
        '<span class="legend-signal" style="color:' + s.hex + ';">' +
          (s.type === 'beep' ? '<span class="material-symbols-sharp" style="font-size:1rem;vertical-align:middle;">volume_up</span> ' : '') +
          s.name +
        '</span>' +
        '<span class="legend-arrow">&rarr;</span>' +
        '<input class="legend-action" value="' + s.action + '" ' +
          'onchange="tool.updateAction(' + i + ', this.value)" ' +
          'maxlength="20">' +
      '</div>'
    ).join('');
  }

  runReactive() {
    const bg = document.getElementById('reactiveBg');
    const actionEl = document.getElementById('reactiveAction');
    const signalEl = document.getElementById('reactiveSignal');
    document.getElementById('reactiveIntro').style.display = 'none';

    actionEl.style.opacity = '0';
    signalEl.style.display = 'none';
    bg.style.background = 'var(--gris-900)';

    const delay = Math.floor(Math.random() * (this.currentSpeed * 0.4)) + (this.currentSpeed * 0.2);

    this.pendingTimeout = setTimeout(() => {
      if (!this.isPlaying) return;

      const stim = this.stimuli[Math.floor(Math.random() * this.stimuli.length)];
      this.totalTrials++;
      this.updateStats();

      if (stim.type === 'beep') {
        signalEl.innerHTML = '<span class="material-symbols-sharp" style="font-size: clamp(4rem, 12vw, 7rem); color: white;">volume_up</span>';
        signalEl.style.display = 'flex';
        this.beep(900, 150);
      } else {
        bg.style.background = stim.color;
      }

      if (this.totalTrials <= this.learningRounds) {
        actionEl.textContent = stim.action;
        actionEl.style.opacity = '1';
      }

      if (navigator.vibrate) navigator.vibrate(80);

      const flashDuration = Math.min(600, this.currentSpeed * 0.2);
      this.clearTimeout = setTimeout(() => {
        if (this.isPlaying) {
          actionEl.style.opacity = '0';
          signalEl.style.display = 'none';
          bg.style.background = 'var(--gris-900)';
        }
      }, flashDuration);
    }, delay);
  }

  updateStats() {
    document.getElementById('statRounds').textContent = this.totalTrials;
    const phase = this.totalTrials <= this.learningRounds ? 'APRENDIZAJE' : 'MEMORIA';
    document.getElementById('statPhase').textContent = phase;
  }
}

const tool = new ReactiveTool();
