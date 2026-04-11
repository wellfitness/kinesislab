const PUNCHES = [
  'Jab', 'Cross', 'Hook izquierdo', 'Hook derecho', 
  'Uppercut izquierdo', 'Uppercut derecho'
];

const DEFENSIVE = [
  'Esquiva', 'Bloqueo', 'Paso atrás'
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

    this.initDOM();
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
    this.comboCount = 0;
    
    // UI Button Update
    const btn = document.getElementById('btnPlayPause');
    btn.style.backgroundColor = 'var(--gris-700)';
    document.getElementById('playIcon').textContent = 'stop';
    document.getElementById('playText').textContent = 'DETENER';
    
    // Deshabilitar config
    ['punchCount', 'speechRate', 'includeDefensive'].forEach(id => document.getElementById(id).disabled = true);

    document.getElementById('stateIdle').style.display = 'none';
    document.getElementById('stateCombos').style.display = 'flex';

    this.runCombosLoop();
  }

  stopEngine() {
    this.isRunning = false;
    
    document.getElementById('stateIdle').style.display = 'flex';
    document.getElementById('stateCombos').style.display = 'none';

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
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = this.settings.speechRate;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  generateCombo() {
    let pool = [...PUNCHES];
    if(this.settings.includeDefensive) pool = pool.concat(DEFENSIVE);
    
    let combo = [];
    for(let i=0; i<this.settings.punchCount; i++) {
        combo.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return combo;
  }

  renderComboUI() {
    const container = document.getElementById('comboGrid');
    container.innerHTML = '';
    this.currentCombo.forEach((move, i) => {
      let cssClass = 'punch-badge';
      if(i === this.currentIndex) cssClass += ' active';
      else if (i < this.currentIndex) cssClass += ' past';
      container.innerHTML += `<span class="${cssClass}">${move}</span>`;
    });
  }

  async runCombosLoop() {
    while(this.isRunning) {
      this.currentCombo = this.generateCombo();
      this.comboCount++;
      
      document.getElementById('lblComboCount').textContent = `Combinación #${this.comboCount}`;
      document.getElementById('lblPause').style.display = 'none';
      
      for(let i = 0; i < this.currentCombo.length; i++) {
        if(!this.isRunning) break;

        this.currentIndex = i;
        this.renderComboUI();

        await this.speakAndWait(this.currentCombo[i]);
        if(!this.isRunning) break;

        await this.sleep(300); // 300ms de espacio exacto entre golpe y golpe
      }

      if(!this.isRunning) break;

      this.currentIndex = -1;
      this.renderComboUI();
      document.getElementById('lblPause').style.display = 'block';

      await this.sleep(2500); // 2.5s descanso per combo
    }
  }
}

const tool = new BoxingGeneratorVanilla();
