class SonidosTool {
  constructor() {
    this.sonidosData = [
      { name: 'GRAVE', frequency: 200, icon: 'volume_down', action: 'SENTADILLA' },
      { name: 'AGUDO', frequency: 800, icon: 'volume_up', action: 'SALTO' },
      { name: 'MEDIO', frequency: 440, icon: 'volume_mute', action: 'GIRO' }
    ];
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
    this.totalTrials = 0;
    this.learningRounds = 6;
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
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
    osc.start(ctx.currentTime);
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
    this.runSonidos();
    this.interval = setInterval(() => this.runSonidos(), this.currentSpeed);
  }

  stopEngine() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  updateAction(index, value) {
    this.sonidosData[index].action = value.toUpperCase().trim();
    this.renderLegend();
  }

  renderLegend() {
    const el = document.getElementById('sonidosLegend');
    el.innerHTML = this.sonidosData.map((s, i) =>
      '<div class="legend-item">' +
        '<span class="legend-sound">' + s.name + '</span>' +
        '<span class="legend-arrow">→</span>' +
        '<input class="legend-action" value="' + s.action + '" ' +
          'onchange="tool.updateAction(' + i + ', this.value)" ' +
          'maxlength="20">' +
      '</div>'
    ).join('');
  }

  runSonidos() {
    const snd = this.sonidosData[Math.floor(Math.random() * this.sonidosData.length)];
    const icon = document.getElementById('sonidosIcon');
    const actionEl = document.getElementById('sonidosAction');

    icon.textContent = snd.icon;
    document.getElementById('sonidosText').textContent = snd.name;
    icon.style.transform = 'scale(1.5)';
    setTimeout(() => { icon.style.transform = 'scale(1)'; }, 200);

    if (this.totalTrials < this.learningRounds) {
      actionEl.textContent = snd.action;
      actionEl.style.opacity = '1';
    } else {
      actionEl.textContent = snd.action;
      actionEl.style.opacity = '0';
    }

    this.beep(snd.frequency, 500);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    this.totalTrials++;
    this.updateStats();
  }

  updateStats() {
    document.getElementById('statRounds').textContent = this.totalTrials;
    const phase = this.totalTrials <= this.learningRounds ? 'APRENDIZAJE' : 'MEMORIA';
    document.getElementById('statPhase').textContent = phase;
  }
}

const tool = new SonidosTool();
