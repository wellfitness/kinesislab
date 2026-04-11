class ClockTool {
  constructor() {
    this.clockTimes = [
      "Tres y cuarto", "Seis y media", "Nueve y cuarto", "Doce en punto",
      "Tres menos cuarto", "Nueve y media", "Seis en punto", "Una y cinco",
      "Doce y media", "Nueve menos cuarto"
    ];
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
    this.runClock();
    this.interval = setInterval(() => this.runClock(), this.currentSpeed);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runClock() {
    const timeStr = this.clockTimes[Math.floor(Math.random() * this.clockTimes.length)];
    document.getElementById('clockText').textContent = `"${timeStr}"`;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(timeStr);
      utterance.lang = 'es-ES';
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  }
}
const tool = new ClockTool();
