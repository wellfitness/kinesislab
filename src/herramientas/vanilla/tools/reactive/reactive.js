class ReactiveTool {
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
    this.runReactive();
    this.interval = setInterval(() => this.runReactive(), this.currentSpeed);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }
  
  runReactive() {
     const bg = document.getElementById('reactiveBg');
     const txt = document.getElementById('reactiveText');
     document.getElementById('reactiveIntro').style.display = 'none';
     const colors = ['var(--turquesa-400)', 'var(--tulip-tree-400)', 'var(--rosa-400)'];
     const beep = Math.random() > 0.5;

     txt.style.display = 'none';
     bg.style.background = 'var(--gris-900)';
     
     const delay = Math.floor(Math.random() * (this.currentSpeed * 0.5)) + (this.currentSpeed * 0.2); 
     
     setTimeout(() => {
        if(!this.isPlaying) return;
        if(beep) {
            txt.style.display = 'block';
            if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance("YA"));
        } else {
            bg.style.background = colors[Math.floor(Math.random()*colors.length)];
        }
        
        setTimeout(() => {
           if(this.isPlaying) {
              txt.style.display = 'none';
              bg.style.background = 'var(--gris-900)';
           }
        }, 600);
     }, delay);
  }
}
const tool = new ReactiveTool();
