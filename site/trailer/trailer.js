const trailer = document.querySelector('[data-trailer]');
const scenes = [...document.querySelectorAll('[data-scene]')];
const toggle = document.querySelector('[data-toggle]');
const restart = document.querySelector('[data-restart]');
const time = document.querySelector('[data-time]');
const totalSeconds = 42;
const sceneSeconds = [0, 5, 12, 20, 28, 35];
let elapsed = 0;
let startedAt = performance.now();
let playing = true;
let frame;

function formatTime(value) {
  return `00:${String(Math.min(Math.floor(value), totalSeconds)).padStart(2, '0')}`;
}

function render(now) {
  if (playing) elapsed = Math.min(totalSeconds, (now - startedAt) / 1000);
  let activeIndex = 0;
  sceneSeconds.forEach((start, index) => { if (elapsed >= start) activeIndex = index; });
  scenes.forEach((scene, index) => scene.classList.toggle('active', index === activeIndex));
  time.textContent = `${formatTime(elapsed)} / 00:42`;
  if (elapsed >= totalSeconds) {
    playing = false;
    trailer.classList.remove('playing');
    trailer.classList.add('paused');
    toggle.querySelector('span').textContent = '▶';
  }
  frame = requestAnimationFrame(render);
}

function setPlaying(next) {
  playing = next;
  trailer.classList.toggle('playing', playing);
  trailer.classList.toggle('paused', !playing);
  toggle.querySelector('span').textContent = playing ? 'Ⅱ' : '▶';
  if (playing) startedAt = performance.now() - elapsed * 1000;
}

function reset() {
  elapsed = 0;
  startedAt = performance.now();
  document.querySelector('[data-progress]').style.animation = 'none';
  void trailer.offsetWidth;
  document.querySelector('[data-progress]').style.animation = '';
  setPlaying(true);
}

toggle.addEventListener('click', () => setPlaying(!playing));
restart.addEventListener('click', reset);
trailer.classList.add('playing');
frame = requestAnimationFrame(render);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && playing) setPlaying(false);
});
