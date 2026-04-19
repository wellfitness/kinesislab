const BASIC_EXERCISES = [
  'Salto básico', 'Salto alterno', 'Rodillas altas', 
  'Talones atrás', 'Salto lateral', 'Tijeras'
];

const ADVANCED_EXERCISES = [
  'Cruce de brazos', 'Doble salto', 'Salto a una pierna'
];

class CombaTrainerVanilla {
  constructor() {
    this.settings = {
      exerciseCount: 4,
      exerciseDuration: 10,
      speechRate: 1.0,
      includeAdvanced: false
    };

    // State internals
    this.isRunning = false;
    this.trainerState = 'idle'; // idle | preparing | exercising | resting | completed
    this.currentSequence = [];
    this.currentExerciseIndex = 0;
    this.timeRemaining = 0;
    this.sequenceCount = 0;

    // Anti-repetición: últimos ejercicios usados
    this.recentHistory = [];

    // Control promises
    this.activeTimer = null;
    this.abortController = null;

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
    document.getElementById('exerciseCount').addEventListener('input', (e) => {
      this.settings.exerciseCount = parseInt(e.target.value);
      document.getElementById('lblExCount').textContent = this.settings.exerciseCount;
    });

    document.getElementById('exerciseDuration').addEventListener('input', (e) => {
      this.settings.exerciseDuration = parseInt(e.target.value);
      document.getElementById('lblExDur').textContent = this.settings.exerciseDuration + 's';
    });

    document.getElementById('speechRate').addEventListener('input', (e) => {
      this.settings.speechRate = parseFloat(e.target.value);
      document.getElementById('lblSpeech').textContent = this.settings.speechRate.toFixed(1) + 'x';
    });

    document.getElementById('includeAdvanced').addEventListener('change', (e) => {
      this.settings.includeAdvanced = e.target.checked;
    });
  }

  updateUIState(newState) {
    this.trainerState = newState;
    ['stateIdle', 'statePreparing', 'stateExercising', 'stateResting', 'stateCompleted'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
    
    if(newState === 'idle') document.getElementById('stateIdle').style.display = 'flex';
    if(newState === 'preparing') document.getElementById('statePreparing').style.display = 'flex';
    if(newState === 'exercising') document.getElementById('stateExercising').style.display = 'flex';
    if(newState === 'resting') document.getElementById('stateResting').style.display = 'flex';
    if(newState === 'completed') document.getElementById('stateCompleted').style.display = 'flex';
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
    this.sequenceCount = 0;
    this.loadVoices();
    this.warmupTTS();

    // UI Button Update
    const btn = document.getElementById('btnPlayPause');
    btn.style.backgroundColor = 'var(--gris-700)';
    document.getElementById('playIcon').textContent = 'stop';
    document.getElementById('playText').textContent = 'DETENER';

    // Deshabilitar config
    ['exerciseCount', 'exerciseDuration', 'speechRate', 'includeAdvanced'].forEach(id => document.getElementById(id).disabled = true);

    this.runSequenceLoop();
  }

  stopEngine() {
    this.isRunning = false;
    ScreenWakeLock.release();
    this.updateUIState('idle');
    if(this.activeTimer) clearInterval(this.activeTimer);
    window.speechSynthesis.cancel();
    
    const btn = document.getElementById('btnPlayPause');
    btn.style.backgroundColor = 'var(--turquesa-600)';
    document.getElementById('playIcon').textContent = 'play_arrow';
    document.getElementById('playText').textContent = 'EMPEZAR';

    // Habilitar config
    ['exerciseCount', 'exerciseDuration', 'speechRate', 'includeAdvanced'].forEach(id => document.getElementById(id).disabled = false);
  }

  sleep(ms) {
    return new Promise(resolve => {
      if(!this.isRunning) return resolve();
      let timer = setTimeout(() => resolve(), ms);
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

  speak(text) {
    if (!this.isRunning || !('speechSynthesis' in window)) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = this.settings.speechRate;
      utterance.volume = 1;
      if (this.voice) utterance.voice = this.voice;
      window.speechSynthesis.speak(utterance);
    } catch (e) { /* noop */ }
  }

  generateSequence() {
    let pool = [...BASIC_EXERCISES];
    if(this.settings.includeAdvanced) pool = pool.concat(ADVANCED_EXERCISES);

    const count = Math.min(this.settings.exerciseCount, pool.length);
    const result = [];
    for (let i = 0; i < count; i++) {
      let available = pool.filter(e => !this.recentHistory.includes(e) && !result.includes(e));
      if (available.length === 0) {
        available = pool.filter(e => !result.includes(e));
      }
      if (available.length === 0) break;
      const pick = available[Math.floor(Math.random() * available.length)];
      result.push(pick);
    }
    this.recentHistory.push(...result);
    const minGap = 4;
    if (this.recentHistory.length > pool.length - minGap) {
      this.recentHistory = this.recentHistory.slice(-minGap);
    }
    return result;
  }

  runExerciseTimer(duration) {
    return new Promise((resolve) => {
      this.timeRemaining = duration;
      this.updateTimerUI();

      this.activeTimer = setInterval(() => {
        if(!this.isRunning) {
          clearInterval(this.activeTimer);
          return resolve();
        }

        this.timeRemaining--;
        this.updateTimerUI();

        if(this.timeRemaining === 3) this.speak('3');
        if(this.timeRemaining === 2) this.speak('2');
        if(this.timeRemaining === 1) this.speak('1');

        if(this.timeRemaining <= 0) {
          clearInterval(this.activeTimer);
          resolve();
        }
      }, 1000);
    });
  }

  updateTimerUI() {
    const lbl = document.getElementById('lblCountdown');
    const circle = document.getElementById('countdownCircle');
    lbl.textContent = this.timeRemaining;

    if(this.timeRemaining <= 3 && this.timeRemaining > 0) {
      circle.classList.add('pulsing');
      lbl.style.color = 'var(--rosa-600)';
    } else {
      circle.classList.remove('pulsing');
      lbl.style.color = 'white';
    }
  }

  renderSequenceUI() {
    const container = document.getElementById('sequenceList');
    container.innerHTML = '';
    this.currentSequence.forEach((ex, i) => {
      let activeClass = '';
      if(i === this.currentExerciseIndex) activeClass = 'active';
      container.innerHTML += `<span class="seq-badge ${activeClass}">${ex}</span>`;
    });
  }

  async runSequenceLoop() {
    while(this.isRunning) {
      this.currentSequence = this.generateSequence();
      this.sequenceCount++;

      // Preparing
      this.updateUIState('preparing');
      document.getElementById('lblSequenceCount').textContent = `Secuencia #${this.sequenceCount}`;
      await this.speakAndWait('Preparados');
      if(!this.isRunning) break;
      await this.sleep(1500);
      if(!this.isRunning) break;

      await this.speakAndWait('Ya');
      if(!this.isRunning) break;

      for(let i = 0; i < this.currentSequence.length; i++) {
        if(!this.isRunning) break;

        this.currentExerciseIndex = i;
        this.updateUIState('exercising');
        
        document.getElementById('lblExerciseIndex').textContent = `Ejercicio ${i+1} de ${this.currentSequence.length}`;
        document.getElementById('lblCurrentExercise').textContent = this.currentSequence[i];
        this.renderSequenceUI();

        await this.speakAndWait(this.currentSequence[i]);
        if(!this.isRunning) break;

        await this.runExerciseTimer(this.settings.exerciseDuration);
        if(!this.isRunning) break;

        if(i < this.currentSequence.length - 1) {
          this.updateUIState('resting');
          if(!this.isRunning) break;
          await this.sleep(1500);
        }
      }

      if(!this.isRunning) break;

      // Completed
      this.updateUIState('completed');
      await this.speakAndWait('Secuencia completada');
      if(!this.isRunning) break;

      await this.sleep(5000); // Descanso de bloque
    }
  }
}

const tool = new CombaTrainerVanilla();
