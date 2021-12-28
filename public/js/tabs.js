// Tab'leri çalıştır
(() => {
  const containers = document.getElementsByClassName('tabs');
  for (const container of containers) {
    const tablist = container.querySelector('[role="tablist"]');
    const panels = container.querySelectorAll('[role="tabpanel"]');
    const resetTab = () => {
      for (const child of tablist.children) {
        child.removeAttribute('aria-selected');
        // if child is a button
        child.classList.remove('bp3-active');
      }
      hideElements(panels);
    }
    for (const child of tablist.children) {
      child.addEventListener('click', () => {
        resetTab();
        child.setAttribute('aria-selected', 'true');
        // if child is a button
        child.classList.add('bp3-active');

        const panel = document.getElementById(child.getAttribute('aria-controls'));
        panel.removeAttribute('aria-hidden');
        panel.removeAttribute('hidden');
      })
    }
  }
})();
