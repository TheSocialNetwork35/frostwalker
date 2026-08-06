const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

document.querySelectorAll('.reveal').forEach((element, index) => {
  element.style.transitionDelay = reducedMotion ? '0ms' : `${Math.min(index % 3, 2) * 70}ms`;
  observer.observe(element);
});

const demoButton = document.querySelector('[data-demo-play]');
const launchOverlay = document.querySelector('[data-launch-overlay]');
const launchText = document.querySelector('[data-launch-text]');
let launchTimers = [];

function clearLaunchTimers() {
  launchTimers.forEach(window.clearTimeout);
  launchTimers = [];
}

demoButton?.addEventListener('click', () => {
  clearLaunchTimers();
  launchOverlay.classList.remove('active');
  void launchOverlay.offsetWidth;
  launchOverlay.classList.add('active');
  launchOverlay.setAttribute('aria-hidden', 'false');
  launchText.textContent = 'Checking instance';
  launchTimers.push(window.setTimeout(() => { launchText.textContent = 'Loading Fabric'; }, 900));
  launchTimers.push(window.setTimeout(() => { launchText.textContent = 'Starting Minecraft'; }, 1850));
  launchTimers.push(window.setTimeout(() => {
    launchText.textContent = 'Ready';
    launchOverlay.classList.remove('active');
    launchOverlay.setAttribute('aria-hidden', 'true');
  }, 3100));
});
