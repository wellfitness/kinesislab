class SortTool {
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
    this.runSort();
    this.interval = setInterval(() => this.runSort(), this.currentSpeed);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runSort() {
    let nums = [];
    while(nums.length < 3) {
       let r = Math.floor(Math.random() * 90) + 10;
       if(!nums.includes(r)) nums.push(r);
    }
    document.getElementById('sort-0').textContent = nums[0];
    document.getElementById('sort-1').textContent = nums[1];
    document.getElementById('sort-2').textContent = nums[2];
  }
}
const tool = new SortTool();
