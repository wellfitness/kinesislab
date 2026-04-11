class SonidosTool {
  constructor() {
    this.sonidosData = [
      { name: 'GRAVE (Diferente)', frequency: 200, icon: 'volume_down' },
      { name: 'AGUDO (Igual)', frequency: 800, icon: 'volume_up' },
      { name: 'MEDIO (Ignorar)', frequency: 440, icon: 'volume_mute' }
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
    this.runSonidos();
    this.interval = setInterval(() => this.runSonidos(), this.currentSpeed);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }
  runSonidos() {
    const snd = this.sonidosData[Math.floor(Math.random() * this.sonidosData.length)];
    const icon = document.getElementById('sonidosIcon');
    icon.textContent = snd.icon;
    document.getElementById('sonidosText').textContent = snd.name;
    icon.style.transform = 'scale(1.5)';
    setTimeout(() => { icon.style.transform = 'scale(1)'; }, 200);

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if(AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = snd.frequency;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    }
    if(navigator.vibrate) navigator.vibrate([100,50,100]);
  }
}
const tool = new SonidosTool();
