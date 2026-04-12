class ReactiveTool {
  constructor() {
    this.stimuli = [
      { type: 'beep', freq: 900, color: null, hex: '#ffffff', name: 'AGUDO', action: 'SALTO' },
      { type: 'beep', freq: 250, color: null, hex: '#ffffff', name: 'GRAVE', action: 'ABAJO' },
      { type: 'color', freq: null, color: 'var(--turquesa-400)', hex: '#18f8f6', name: 'TURQUESA', action: 'DERECHA' },
      { type: 'color', freq: null, color: 'var(--tulip-tree-400)', hex: '#eab308', name: 'DORADO', action: 'IZQUIERDA' }
    ];
    this.interval = null;
    this.pendingTimeout = null;
    this.clearTimeout = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
    this.totalTrials = 0;
    this.learningRounds = 8;
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
      this.totalTrials = 0;
      this.updateStats();
      this.renderLegend();
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

  escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  renderLegend() {
    const el = document.getElementById('reactiveLegend');
    el.innerHTML = this.stimuli.map((s, i) =>
      '<div class="legend-item">' +
        '<span class="legend-signal" style="color:' + s.hex + ';">' +
          (s.type === 'beep' ? '<span class="material-symbols-sharp" style="font-size:1rem;vertical-align:middle;">' + (s.freq >= 500 ? 'volume_up' : 'volume_down') + '</span> ' : '') +
          s.name +
        '</span>' +
        '<span class="legend-arrow">&rarr;</span>' +
        '<input class="legend-action" value="' + this.escapeAttr(s.action) + '" ' +
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
        const icon = stim.freq >= 500 ? 'volume_up' : 'volume_down';
        signalEl.innerHTML = '<span class="material-symbols-sharp" style="font-size: clamp(4rem, 12vw, 7rem); color: white;">' + icon + '</span>';
        signalEl.style.display = 'flex';
        this.beep(stim.freq, 200);
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
    const isMobile = window.innerWidth < 480;
    const phase = this.totalTrials <= this.learningRounds
      ? (isMobile ? 'APRENDE' : 'APRENDIZAJE')
      : 'MEMORIA';
    document.getElementById('statPhase').textContent = phase;
  }
}

const tool = new ReactiveTool();
