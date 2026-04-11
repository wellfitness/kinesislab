class BoxingTool {
  constructor() {
    this.boxingMoves = [
      "Jab", "Cross", "Crochet", "Uppercut", 
      "Jab - Cross", "Esquiva - Cross", "Uno - Dos - Esquiva",
      "Rodillazo", "Codo"
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
    this.runBoxing();
    this.interval = setInterval(() => {
      this.runBoxing();
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

  runBoxing() {
    const textEl = document.getElementById('boxingText');
    const move = this.boxingMoves[Math.floor(Math.random() * this.boxingMoves.length)];
    textEl.textContent = move;

    textEl.style.transform = 'scale(1.1)';
    textEl.style.color = 'var(--rosa-400)';
    setTimeout(() => {
      textEl.style.transform = 'scale(1)';
      textEl.style.color = 'var(--gris-800)';
    }, 200);

    if (this.hasSpeech) {
      const utterance = new SpeechSynthesisUtterance(move);
      utterance.lang = 'es-ES';
      utterance.rate = 1.3;
      window.speechSynthesis.speak(utterance);
    }
  }
}

const tool = new BoxingTool();
