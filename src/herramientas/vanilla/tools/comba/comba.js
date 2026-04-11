class CombaTool {
  constructor() {
    this.combaMoves = [
      "Pies juntos", "Rodillas altas", "Cruzado", "Salto alterno", 
      "Pata coja derecha", "Pata coja izquierda", "Sprint"
    ];
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
    this.hasSpeech = false;

    this.init();
  }

  init() {
    if ('speechSynthesis' in window) {
      this.hasSpeech = true;
      window.speechSynthesis.getVoices();
    }
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const btn = document.getElementById('btnPlayPause');
    
    if (this.isPlaying) {
      btn.classList.add('active');
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSE';
      this.startEngine();
    } else {
      btn.classList.remove('active');
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'RESUME';
      this.stopEngine();
    }
  }

  startEngine() {
    this.runComba(); // Trigger first hit instantly
    this.interval = setInterval(() => {
      this.runComba();
    }, this.currentSpeed);
  }

  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }

  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) {
      this.stopEngine();
      this.startEngine();
    }
  }

  runComba() {
    const textEl = document.getElementById('combaText');
    const move = this.combaMoves[Math.floor(Math.random() * this.combaMoves.length)];
    textEl.textContent = move;
    
    // Animación visual
    textEl.style.transform = 'scale(1.1)';
    textEl.style.color = 'var(--turquesa-400)';
    setTimeout(() => {
      textEl.style.transform = 'scale(1)';
      textEl.style.color = 'var(--gris-800)';
    }, 200);

    if (this.hasSpeech) {
      const utterance = new SpeechSynthesisUtterance(move);
      utterance.lang = 'es-ES';
      utterance.rate = 1.1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }
}

const tool = new CombaTool();
