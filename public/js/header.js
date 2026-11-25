export function createHeader({
  root = document.querySelector('.topbar'),
  milestones = [],
  onFilter,
  onCityProgress,
  onHqClick,
  onForemanClick,
  onProjectsToggle,
  onBuildOrderToggle,
  onAudioToggle
} = {}) {
  const scope = root || document;

  const connStatus = scope.querySelector('#connection-status');
  const connLabel = scope.querySelector('#connection-status .conn-label');
  const btnCityProgress = scope.querySelector('#btn-city-progress');
  const cityProgressText = scope.querySelector('#city-progress-text');
  const cityProgressFill = scope.querySelector('#city-progress-fill');
  const filterButtons = Array.from(scope.querySelectorAll('.filter-pill'));
  const waitingFilterBtn = scope.querySelector('.filter-pill[data-filter="waiting"]');
  const countNodes = {
    total: scope.querySelector('[data-count="total"]'),
    working: scope.querySelector('[data-count="working"]'),
    waiting: scope.querySelector('[data-count="waiting"]'),
    done: scope.querySelector('[data-count="done"]'),
    sleeping: scope.querySelector('[data-count="sleeping"]')
  };
  const btnHq = scope.querySelector('#btn-hq');
  const btnForeman = scope.querySelector('#btn-foreman');
  const btnProjects = scope.querySelector('#btn-projects');
  const btnBuildOrder = scope.querySelector('#btn-build-order');
  const btnAudio = scope.querySelector('#btn-audio');
  const iconAudioOff = scope.querySelector('#icon-audio-off');
  const iconAudioOn = scope.querySelector('#icon-audio-on');

  btnCityProgress?.addEventListener('click', () => onCityProgress?.());

  for (const btn of filterButtons) {
    btn.addEventListener('click', () => {
      onFilter?.(btn.dataset.filter || 'all');
    });
  }

  btnHq?.addEventListener('click', () => onHqClick?.());
  btnForeman?.addEventListener('click', () => onForemanClick?.());
  btnProjects?.addEventListener('click', () => onProjectsToggle?.());
  btnBuildOrder?.addEventListener('click', () => onBuildOrderToggle?.());
  btnAudio?.addEventListener('click', () => onAudioToggle?.());

  return {
    setConnectionState(connState, text) {
      if (connStatus) connStatus.dataset.state = connState;
      if (connLabel) connLabel.textContent = text;
    },

    setCounts(counts = {}) {
      for (const key of Object.keys(countNodes)) {
        const node = countNodes[key];
        if (node) node.textContent = String(counts[key] ?? 0);
      }
      waitingFilterBtn?.classList.toggle('has-urgent', (counts.waiting ?? 0) > 0);
    },

    setCityProgress(city = {}, totalBuildings = city.totalBuildings ?? 0) {
      const bldgWord = totalBuildings === 1 ? 'gebouw' : 'gebouwen';
      if (cityProgressText) {
        cityProgressText.textContent = `Niv. ${city.level} · ${city.name} · ${totalBuildings} ${bldgWord}`;
      }

      let pct = 100;
      if (city.nextMilestone && city.nextMilestone > 0) {
        const curMilestone = milestones.find((m) => m.level === city.level) || milestones[0] || { min: 0 };
        const span = Math.max(1, city.nextMilestone - curMilestone.min);
        pct = Math.max(6, Math.min(100, Math.round(((totalBuildings - curMilestone.min) / span) * 100)));
      }
      if (cityProgressFill) {
        cityProgressFill.style.width = `${pct}%`;
      }
    },

    setActiveFilter(nextFilter) {
      for (const btn of filterButtons) {
        const active = btn.dataset.filter === nextFilter;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    },

    setHqActive(active) {
      const on = Boolean(active);
      btnHq?.classList.toggle('is-active', on);
      btnHq?.setAttribute('aria-pressed', on ? 'true' : 'false');
    },

    setForemanActive(active) {
      const on = Boolean(active);
      btnForeman?.classList.toggle('is-active', on);
      btnForeman?.setAttribute('aria-pressed', on ? 'true' : 'false');
    },

    setAudioEnabled(enabled) {
      const on = Boolean(enabled);
      btnAudio?.setAttribute('aria-pressed', on ? 'true' : 'false');
      iconAudioOn?.classList.toggle('is-hidden', !on);
      iconAudioOff?.classList.toggle('is-hidden', on);
    },

    setProjectsExpanded(expanded) {
      btnProjects?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    },

    setBuildOrderExpanded(expanded) {
      btnBuildOrder?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    },

    containsBuildOrderTarget(target) {
      return Boolean(btnBuildOrder?.contains(target));
    }
  };
}
