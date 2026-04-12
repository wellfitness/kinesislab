class TimersTool {
  constructor() {
    this.selectedTimer = null;
    this.phase = 'config';
    this.isPaused = false;
    this.interval = null;
    this.timeLeft = 0;
    this.currentRound = 1;
    this.isWorkPhase = true;
    this.afapTime = 0;

    this.config = {
      emomInterval: 60,
      emomRounds: 10,
      intervalWork: 30,
      intervalRest: 30,
      intervalRounds: 8,
      afapLimit: 600,
      amrapMinutes: 12,
      prepSeconds: 5,
      soundEnabled: true
    };
  }

  init() {
    this.$ = {
      viewConfig: document.getElementById('viewConfig'),
      viewTimer: document.getElementById('viewTimer'),
      toolbarConfig: document.getElementById('toolbarConfig'),
      toolbarRunning: document.getElementById('toolbarRunning'),
      timerTitle: document.getElementById('timerTitle'),
      timerTime: document.getElementById('timerTime'),
      timerInfo: document.getElementById('timerInfo'),
      btnPause: document.getElementById('btnPause'),
      btnSound: document.getElementById('btnSound')
    };
  }

  // === Config ===

  syncConfig() {
    const val = (id, fallback) => parseInt(document.getElementById(id).value) || fallback;
    this.config.emomInterval = Math.max(10, Math.min(300, val('cfgEmomInterval', 60)));
    this.config.emomRounds = Math.max(1, Math.min(60, val('cfgEmomRounds', 10)));
    this.config.intervalWork = Math.max(5, Math.min(300, val('cfgIntWork', 30)));
    this.config.intervalRest = Math.max(5, Math.min(300, val('cfgIntRest', 30)));
    this.config.intervalRounds = Math.max(1, Math.min(50, val('cfgIntRounds', 8)));
    this.config.afapLimit = Math.max(1, Math.min(60, val('cfgAfapMin', 10))) * 60;
    this.config.amrapMinutes = Math.max(1, Math.min(60, val('cfgAmrapMin', 12)));
    this.config.prepSeconds = Math.max(3, Math.min(20, val('cfgPrep', 5)));
  }

  // === Timer Selection ===

  selectTimer(type) {
    if (this.phase !== 'config') return;
    this.selectedTimer = type;
    document.querySelectorAll('.timer-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.timer === type);
    });
  }

  // === Start Flow ===

  startTimer(type) {
    this.syncConfig();
    this.selectedTimer = type;
    this.isPaused = false;
    this.currentRound = 1;
    this.isWorkPhase = true;
    this.afapTime = 0;

    this.phase = 'prep';
    this.timeLeft = this.config.prepSeconds;

    this.showTimerView();
    this.renderPrep();
    ScreenWakeLock.request();

    this.clearTick();
    this.interval = setInterval(() => this.tickPrep(), 1000);
  }

  tickPrep() {
    this.timeLeft--;
    this.renderPrep();

    if (this.timeLeft <= 0) {
      this.playAlert();
      this.clearTick();
      this.actuallyStart();
    }
  }

  actuallyStart() {
    this.phase = 'running';
    this.isPaused = false;

    switch (this.selectedTimer) {
      case 'EMOM':
        this.timeLeft = this.config.emomInterval;
        this.currentRound = 1;
        break;
      case 'INTERVALOS':
        this.timeLeft = this.config.intervalWork;
        this.currentRound = 1;
        this.isWorkPhase = true;
        break;
      case 'AFAP':
        this.afapTime = 0;
        this.timeLeft = this.config.afapLimit;
        break;
      case 'AMRAP':
        this.timeLeft = this.config.amrapMinutes * 60;
        break;
    }

    this.renderRunning();
    this.showRunningControls();
    this.interval = setInterval(() => this.tick(), 1000);
  }

  // === Tick Logic ===

  tick() {
    if (this.isPaused) return;

    switch (this.selectedTimer) {
      case 'EMOM': this.tickEmom(); break;
      case 'INTERVALOS': this.tickInterval(); break;
      case 'AFAP': this.tickAfap(); break;
      case 'AMRAP': this.tickAmrap(); break;
    }

    this.renderRunning();
  }

  tickEmom() {
    this.timeLeft--;
    if (this.timeLeft <= 0) {
      this.playAlert();
      this.currentRound++;
      if (this.currentRound > this.config.emomRounds) {
        this.finish();
        return;
      }
      this.timeLeft = this.config.emomInterval;
    }
  }

  tickInterval() {
    this.timeLeft--;
    if (this.timeLeft <= 0) {
      this.playAlert();
      if (this.isWorkPhase) {
        this.isWorkPhase = false;
        this.timeLeft = this.config.intervalRest;
      } else {
        this.currentRound++;
        if (this.currentRound > this.config.intervalRounds) {
          this.finish();
          return;
        }
        this.isWorkPhase = true;
        this.timeLeft = this.config.intervalWork;
      }
    }
  }

  tickAfap() {
    this.afapTime++;
    this.timeLeft = this.config.afapLimit - this.afapTime;
    if (this.afapTime >= this.config.afapLimit) {
      this.playAlert();
      this.finish();
    }
  }

  tickAmrap() {
    this.timeLeft--;
    if (this.timeLeft <= 0) {
      this.playAlert();
      this.finish();
    }
  }

  // === Controls ===

  togglePause() {
    if (this.phase !== 'running') return;
    this.isPaused = !this.isPaused;
    this.updatePauseBtn();
  }

  stop() {
    this.clearTick();
    this.phase = 'config';
    this.isPaused = false;
    this.showConfigView();
    ScreenWakeLock.release();
  }

  reset() {
    this.stop();
    this.selectedTimer = null;
    this.timeLeft = 0;
    this.afapTime = 0;
    this.currentRound = 1;
    this.isWorkPhase = true;
    document.querySelectorAll('.timer-card').forEach(c => c.classList.remove('selected'));
  }

  finish() {
    this.clearTick();
    this.phase = 'config';
    this.isPaused = false;
    this.showConfigView();
    ScreenWakeLock.release();
  }

  // === View Management ===

  showConfigView() {
    this.$.viewConfig.classList.remove('hidden-view');
    this.$.viewTimer.classList.add('hidden-view');
    this.$.toolbarConfig.classList.remove('hidden-view');
    this.$.toolbarRunning.classList.add('hidden-view');
    this.setInputsDisabled(false);
  }

  showTimerView() {
    this.$.viewConfig.classList.add('hidden-view');
    this.$.viewTimer.classList.remove('hidden-view');
    this.$.toolbarConfig.classList.add('hidden-view');
    this.$.toolbarRunning.classList.remove('hidden-view');
    this.setInputsDisabled(true);
  }

  setInputsDisabled(disabled) {
    document.querySelectorAll('.config-input, .setting-input').forEach(el => {
      el.disabled = disabled;
    });
  }

  showRunningControls() {
    this.$.toolbarRunning.querySelectorAll('button').forEach(b => {
      b.style.display = '';
    });
    this.updatePauseBtn();
  }

  // === Rendering ===

  renderPrep() {
    this.$.timerTitle.innerHTML =
      '<span class="material-symbols-sharp">notifications_active</span> COMENZAMOS';
    this.$.timerTitle.className = 'timer-display__title timer-display__title--prep';

    this.$.timerTime.textContent = this.formatTime(this.timeLeft);
    this.$.timerTime.className = 'timer-display__time timer-display__time--prep';

    this.$.timerInfo.innerHTML =
      '<div class="prep-message">El entrenamiento comenzar&aacute; pronto</div>';

    this.$.toolbarRunning.querySelectorAll('button').forEach(b => {
      b.style.display = 'none';
    });
  }

  renderRunning() {
    const icons = {
      EMOM: 'avg_pace',
      INTERVALOS: 'sync',
      AFAP: 'speed',
      AMRAP: 'local_fire_department'
    };

    this.$.timerTitle.innerHTML =
      `<span class="material-symbols-sharp">${icons[this.selectedTimer]}</span> ${this.selectedTimer}`;
    this.$.timerTitle.className = 'timer-display__title';

    const displayTime = this.selectedTimer === 'AFAP' ? this.afapTime : this.timeLeft;
    this.$.timerTime.textContent = this.formatTime(displayTime);
    this.$.timerTime.className = 'timer-display__time';

    this.$.timerInfo.innerHTML = this.buildInfoHtml();
  }

  buildInfoHtml() {
    switch (this.selectedTimer) {
      case 'EMOM':
        return `<div class="timer-info__round">Ronda: ${this.currentRound} / ${this.config.emomRounds}</div>`;

      case 'INTERVALOS': {
        const cls = this.isWorkPhase ? 'work' : 'rest';
        const txt = this.isWorkPhase ? 'TRABAJO' : 'DESCANSO';
        return `
          <div class="timer-info__round">Ronda: ${this.currentRound} / ${this.config.intervalRounds}</div>
          <div class="timer-phase timer-phase--${cls}">${txt}</div>`;
      }

      case 'AFAP': {
        let html = `<div class="timer-info__limit">
          <span class="material-symbols-sharp">schedule</span>
          Tiempo l&iacute;mite: ${this.formatTime(Math.max(0, this.timeLeft))}
        </div>`;
        if (this.timeLeft <= 0) {
          html += `<div class="timer-phase timer-phase--work">
            <span class="material-symbols-sharp">alarm</span> TIEMPO AGOTADO
          </div>`;
        }
        return html;
      }

      case 'AMRAP':
        return '<div class="timer-info__label">Tiempo restante</div>';

      default:
        return '';
    }
  }

  updatePauseBtn() {
    const icon = this.isPaused ? 'play_arrow' : 'pause';
    const text = this.isPaused ? 'Reanudar' : 'Pausar';
    this.$.btnPause.innerHTML =
      `<span class="material-symbols-sharp">${icon}</span> ${text}`;
  }

  // === Audio ===

  playAlert() {
    if (!this.config.soundEnabled) return;

    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (_) { /* silent */ }

    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  }

  toggleSound() {
    this.config.soundEnabled = !this.config.soundEnabled;
    const btn = this.$.btnSound;
    if (this.config.soundEnabled) {
      btn.innerHTML = '<span class="material-symbols-sharp">volume_up</span><span>Sonido</span>';
      btn.className = 'btn-sound btn-sound--on';
    } else {
      btn.innerHTML = '<span class="material-symbols-sharp">volume_off</span><span>Silencio</span>';
      btn.className = 'btn-sound btn-sound--off';
    }
  }

  // === Helpers ===

  formatTime(seconds) {
    const abs = Math.abs(seconds);
    const m = String(Math.floor(abs / 60)).padStart(2, '0');
    const s = String(abs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  clearTick() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

const tool = new TimersTool();
document.addEventListener('DOMContentLoaded', () => tool.init());
