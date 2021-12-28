(() => {
  const key = 'dark-theme-enabled';
  const darkThemeEnabled = () => !!localStorage.getItem(key);
  const setDarkThemeEnabled = (enabled) => enabled ? localStorage.setItem(key, 'true') : localStorage.removeItem(key);

  const enableDark = document.querySelector('[data-action="dark-theme"]');
  const enableLight = document.querySelector('[data-action="light-theme"]');

  const setTheme = (dark) => {
    if (dark) {
      document.body.classList.add('bp3-dark');
      hideElement(enableDark);
      showElement(enableLight);
    } else {
      document.body.classList.remove('bp3-dark');
      hideElement(enableLight);
      showElement(enableDark);
    }
    setDarkThemeEnabled(dark);
  }

  setTheme(darkThemeEnabled());

  enableDark.addEventListener('click', () => {
    setTheme(true);
  });
  enableLight.addEventListener('click', () => {
    setTheme(false);
  });
})();
