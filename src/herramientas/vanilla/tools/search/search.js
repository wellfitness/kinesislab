class SearchTool {
  constructor() {
    this.searchPairs = [
      { target: 'O', distractor: 'Q' },
      { target: 'Q', distractor: 'O' },
      { target: 'b', distractor: 'd' },
      { target: 'E', distractor: 'F' },
      { target: 'I', distractor: 'l' },
      { target: 'M', distractor: 'N' }
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
    this.runSearch();
    this.interval = setInterval(() => this.runSearch(), this.currentSpeed * 1.5);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runSearch() {
    const pair = this.searchPairs[Math.floor(Math.random() * this.searchPairs.length)];
    document.getElementById('searchTargetText').innerHTML = 
      `Busca la <span style="color:var(--turquesa-500); font-size:1.2em; font-weight:bold;">${pair.target}</span> entre las ${pair.distractor}`;
    const grid = document.getElementById('searchGrid');
    grid.innerHTML = '';
    const totalItems = window.innerWidth < 768 ? 36 : 48;
    const targetIndex = Math.floor(Math.random() * totalItems);

    for(let i=0; i<totalItems; i++) {
      const div = document.createElement('div');
      div.className = 'search-item';
      div.style.padding = "10px"; div.style.fontSize = "2rem"; div.style.fontWeight = "bold";
      if(i === targetIndex) {
        div.textContent = pair.target;
        div.classList.add('target');
      } else {
        div.textContent = pair.distractor;
      }
      grid.appendChild(div);
    }
  }
}
const tool = new SearchTool();
