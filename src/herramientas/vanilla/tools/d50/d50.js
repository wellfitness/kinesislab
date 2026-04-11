class D50Tool {
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
    this.runD50();
    this.interval = setInterval(() => this.runD50(), this.currentSpeed);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runD50() {
    let isOver50 = Math.random() > 0.5;
    let num1 = Math.floor(Math.random() * 40) + 10;
    let maxNum2 = isOver50 ? (80 - num1) : (49 - num1);
    let minNum2 = isOver50 ? (51 - num1) : 5;
    if(minNum2 < 1) minNum2 = 1;
    if(maxNum2 < minNum2) maxNum2 = minNum2 + 10;
    let num2 = Math.floor(Math.random() * (maxNum2 - minNum2 + 1)) + minNum2;
    document.getElementById('d50Text').textContent = `${num1} + ${num2}`;
  }
}
const tool = new D50Tool();
