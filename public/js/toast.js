window.addToast = (message, type, autoClose = true) => {
  const container = document.getElementsByClassName('bp3-toast-container')[0];
  container.insertAdjacentHTML('afterbegin', `
    <div class="bp3-toast bp3-intent-${type} bp3-dark bp3-overlay-content bp3-toast-enter" tabindex="0">
      <span class="bp3-icon bp3-icon-${{success: 'tick', danger: 'warning-sign'}[type]}"></span>
      <span class="bp3-toast-message">${message}</span>
      <div class="bp3-button-group bp3-minimal">
        <button type="button" aria-label="Close" class="bp3-button">
          <span class="bp3-icon bp3-icon-cross"></span>
        </button>
      </div>
    </div>
    `);
  const toast = container.firstElementChild;
  setTimeout(
    () => {
      toast.classList.add('bp3-toast-enter-active');
    },
  );
  setTimeout(
    () => {
      toast.classList.remove('bp3-toast-enter');
      toast.classList.remove('bp3-toast-enter-active');
      toast.classList.add('bp3-toast-enter-done');
    },
    300
  );

  const closeToast = () => {
    toast.classList.remove('bp3-toast-enter-done');
    toast.classList.add('bp3-toast-exit');
    toast.classList.add('bp3-toast-exit-active');
    setTimeout(
      () => {
        toast.remove();
      },
      300
    );
  };
  toast.getElementsByTagName('button')[0].onclick = closeToast;
  if (autoClose) {
    setTimeout(
      () => {
        if (toast) {
          closeToast();
        }
      },
      3_000
    );
  }
}
