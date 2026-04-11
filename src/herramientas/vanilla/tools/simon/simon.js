class SimonTool {
  constructor() {
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
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
    this.runSimon();
    this.interval = setInterval(() => this.runSimon(), this.currentSpeed + 2000);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runSimon() {
     document.getElementById('simonInstruction').textContent = 'Observa...';
     const seq = [];
     for(let i=0; i<3; i++) seq.push(Math.floor(Math.random()*4));
     
     let i = 0;
     const flash = () => {
         if(i >= seq.length || !this.isPlaying) {
           if(this.isPlaying) {
              document.getElementById('simonInstruction').textContent = '¡Tu turno! Replica el orden.';
           }
           return;
         }
         const btn = document.getElementById(`simon-${seq[i]}`);
         btn.classList.add('lit');
         if(navigator.vibrate) navigator.vibrate(50);
         setTimeout(() => {
             btn.classList.remove('lit');
             i++;
             setTimeout(flash, 300);
         }, 500);
     };
     flash();
  }
}
const tool = new SimonTool();
