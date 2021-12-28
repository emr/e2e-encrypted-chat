window.showElement = (element) => {
  element.removeAttribute('aria-hidden');
  element.removeAttribute('hidden');
};
window.showElements = (elements) => {
  elements.forEach(showElement);
};
window.hideElement = (element) => {
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('hidden', 'true');
};
window.hideElements = (elements) => {
  elements.forEach(hideElement);
};
