class MatrixTool {
  constructor() {
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
    this.matrixTimeoutId = null;
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
    this.runMatrix();
    this.interval = setInterval(() => this.runMatrix(), this.currentSpeed * 1.5);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runMatrix() {
    this.clearMatrix();
    const instruction = document.getElementById('matrixInstruction');
    instruction.textContent = 'MEMORIZA...';
    instruction.style.color = 'white';

    let selected = [];
    while(selected.length < 3) {
      let r = Math.floor(Math.random() * 9);
      if(!selected.includes(r)) selected.push(r);
    }
    selected.forEach(idx => document.getElementById(`cell-${idx}`).classList.add('active'));

    let hideTime = this.currentSpeed * 0.4;

    clearTimeout(this.matrixTimeoutId);
    this.matrixTimeoutId = setTimeout(() => {
      if(this.isPlaying) {
        this.clearMatrix();
        instruction.textContent = '¿Dónde estaban?';
        instruction.style.color = 'var(--turquesa-400)';
      }
    }, hideTime);
  }
  
  clearMatrix() {
    for(let i=0; i<9; i++) document.getElementById(`cell-${i}`).classList.remove('active');
  }
}
const tool = new MatrixTool();
