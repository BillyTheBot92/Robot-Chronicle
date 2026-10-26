/* Robot Chronicle — assemblage du moteur depuis ses modules classiques. */
(function () {
  const parts = window.__RC_MODULES || [];
  const EXPECTED_MODULES = 7;
  if (parts.length !== EXPECTED_MODULES) {
    const message = 'Chargement incomplet du moteur (' + parts.length + '/' + EXPECTED_MODULES + ' modules). Rechargez la page.';
    const banner = document.getElementById('jserr');
    if (banner) { banner.style.display = 'block'; banner.textContent = message; }
    throw new Error(message);
  }

  const RC = Object.assign({}, ...parts);
  delete window.__RC_MODULES;
  window.RC = RC;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => RC.init());
  } else {
    RC.init();
  }
})();
