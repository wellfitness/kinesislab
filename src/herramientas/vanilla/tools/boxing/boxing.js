const PUNCHES = [
  'Directo', 'Cruzado',
  'Gancho bajo izquierdo', 'Gancho bajo derecho',
  'Gancho alto izquierdo', 'Gancho alto derecho',
  'Crochet izquierdo', 'Crochet derecho'
];

const DEFENSIVE = [
  'Esquiva', 'Bloqueo', 'Paso atrás', 'Agacharse', 'Paso lateral'
];

class BoxingGeneratorVanilla {
  constructor() {
    this.settings = {
      punchCount: 4,
      includeDefensive: false,
      speechRate: 1.0
    };

    // State internals
    this.isRunning = false;
    this.currentCombo = [];
    this.currentIndex = -1;
    this.comboCount = 0;

    // TTS voice cache (Android WebView compatibility)
    this.voice = null;
    this.loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }

    this.initDOM();
  }

  loadVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    this.voice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('es'))
              || voices.find(v => v.default)
              || voices[0]
              || null;
  }

  warmupTTS() {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      u.lang = 'es-ES';
      if (this.voice) u.voice = this.voice;
      window.speechSynthesis.speak(u);
    } catch (e) { /* noop */ }
  }

  initDOM() {
    // Bind UI inputs
    document.getElementById('punchCount').addEventListener('input', (e) => {
      this.settings.punchCount = parseInt(e.target.value);
      document.getElementById('lblPunch').textContent = this.settings.punchCount;
    });

    document.getElementById('speechRate').addEventListener('input', (e) => {
      this.settings.speechRate = parseFloat(e.target.value);
      document.getElementById('lblSpeech').textContent = this.settings.speechRate.toFixed(1) + 'x';
    });

    document.getElementById('includeDefensive').addEventListener('change', (e) => {
      this.settings.includeDefensive = e.target.checked;
    });
  }

  handleStartStop() {
    if(this.isRunning) {
      this.stopEngine();
    } else {
      this.startEngine();
    }
  }

  startEngine() {
    this.isRunning = true;
    ScreenWakeLock.request();
    this.comboCount = 0;
    this.loadVoices();
    this.warmupTTS();

    // UI Button Update
    const btn = document.getElementById('btnPlayPause');
    btn.style.backgroundColor = 'var(--gris-700)';
    document.getElementById('playIcon').textContent = 'stop';
    document.getElementById('playText').textContent = 'DETENER';
    
    // Deshabilitar config
    ['punchCount', 'speechRate', 'includeDefensive'].forEach(id => document.getElementById(id).disabled = true);

    document.getElementById('stateIdle').style.display = 'none';

    this.runCombosLoop();
  }

  stopEngine() {
    this.isRunning = false;
    ScreenWakeLock.release();

    document.getElementById('stateIdle').style.display = 'flex';
    document.getElementById('stateCombos').style.display = 'none';
    document.getElementById('statePreparing').style.display = 'none';

    window.speechSynthesis.cancel();
    
    const btn = document.getElementById('btnPlayPause');
    btn.style.backgroundColor = 'var(--rosa-600)';
    document.getElementById('playIcon').textContent = 'play_arrow';
    document.getElementById('playText').textContent = 'EMPEZAR';

    // Habilitar config
    ['punchCount', 'speechRate', 'includeDefensive'].forEach(id => document.getElementById(id).disabled = false);
  }

  sleep(ms) {
    return new Promise(resolve => {
      if(!this.isRunning) return resolve();
      setTimeout(resolve, ms);
    });
  }

  speakAndWait(text) {
    return new Promise((resolve) => {
      if (!this.isRunning || !('speechSynthesis' in window)) return resolve();
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = this.settings.speechRate;
        utterance.volume = 1;
        if (this.voice) utterance.voice = this.voice;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      } catch (e) { resolve(); }
    });
  }

  generateCombo() {
    const total = this.settings.punchCount;

    if(!this.settings.includeDefensive) {
      return this.pickMoves(PUNCHES, total);
    }

    const maxDef = Math.floor(total * 0.3);
    const defCount = 1 + Math.floor(Math.random() * maxDef);
    const offCount = total - defCount;

    const offMoves = this.pickMoves(PUNCHES, offCount);
    const defMoves = this.pickMoves(DEFENSIVE, defCount);

    const combo = [...offMoves];
    for(const d of defMoves) {
      const pos = 1 + Math.floor(Math.random() * (combo.length - 1));
      combo.splice(pos, 0, d);
    }
    return combo;
  }

  punchType(move) {
    if (move.startsWith('Gancho bajo')) return 'gancho-bajo';
    if (move.startsWith('Gancho alto')) return 'gancho-alto';
    if (move.startsWith('Crochet')) return 'crochet';
    return move.toLowerCase();
  }

  pickMoves(pool, count) {
    const result = [];
    let lastType = null;
    const isShortCombo = count <= 4;
    let ganchoUsed = false;

    for (let i = 0; i < count; i++) {
      let available = pool.filter(m => this.punchType(m) !== lastType);
      if (isShortCombo && ganchoUsed) {
        available = available.filter(m => {
          const t = this.punchType(m);
          return t !== 'gancho-bajo' && t !== 'gancho-alto';
        });
      }
      if (available.length === 0) available = pool.filter(m => this.punchType(m) !== lastType);
      if (available.length === 0) break;
      const pick = available[Math.floor(Math.random() * available.length)];
      result.push(pick);
      lastType = this.punchType(pick);
      if (lastType === 'gancho-bajo' || lastType === 'gancho-alto') ganchoUsed = true;
    }
    return result;
  }

  renderComboUI() {
    const total = this.currentCombo.length;
    const current = this.currentCombo[this.currentIndex] || '—';
    const next = this.currentCombo[this.currentIndex + 1];

    document.getElementById('currentPunch').textContent = current;

    const nextEl = document.getElementById('nextPunch');
    if (next) {
      nextEl.innerHTML = `<span class="next-label">SIGUIENTE →</span> <span class="next-value">${next}</span>`;
    } else {
      nextEl.innerHTML = '<span class="next-label">ÚLTIMO GOLPE</span>';
    }

    document.getElementById('lblProgress').innerHTML =
      `Combinación <strong>#${this.comboCount}</strong> · <strong>${this.currentIndex + 1} / ${total}</strong>`;

    // Re-trigger pulse animation en cada golpe
    const cur = document.getElementById('currentPunch');
    cur.style.animation = 'none';
    void cur.offsetWidth;
    cur.style.animation = '';
  }

  showPreparing(comboNum) {
    document.getElementById('stateCombos').style.display = 'none';
    document.getElementById('statePreparing').style.display = 'flex';
    document.getElementById('lblPrepCombo').textContent = `Combinación #${comboNum}`;
  }

  showCombos() {
    document.getElementById('statePreparing').style.display = 'none';
    document.getElementById('stateCombos').style.display = 'flex';
  }

  async runCombosLoop() {
    while(this.isRunning) {
      this.currentCombo = this.generateCombo();
      this.comboCount++;

      this.showPreparing(this.comboCount);
      await this.speakAndWait('Preparados');
      if(!this.isRunning) break;
      await this.sleep(1500);
      if(!this.isRunning) break;
      await this.speakAndWait('Ya');
      if(!this.isRunning) break;

      this.showCombos();

      for(let i = 0; i < this.currentCombo.length; i++) {
        if(!this.isRunning) break;

        this.currentIndex = i;
        this.renderComboUI();

        const t0 = performance.now();
        await this.speakAndWait(this.currentCombo[i]);
        if(!this.isRunning) break;

        const minPerPunch = 2000 / this.settings.speechRate;
        const elapsed = performance.now() - t0;
        const extra = Math.max(300, minPerPunch - elapsed);
        await this.sleep(extra);
      }

      if(!this.isRunning) break;
    }
  }
}

const tool = new BoxingGeneratorVanilla();
