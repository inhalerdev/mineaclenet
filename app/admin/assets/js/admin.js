(() => {
  'use strict';

  document.documentElement.classList.add('is-ready');

  const dropZone = document.querySelector('[data-admin-image-drop]');
  const input = document.querySelector('[data-admin-image-input]');
  const label = document.querySelector('[data-admin-upload-label]');

  if (!(dropZone instanceof HTMLElement) || !(input instanceof HTMLInputElement) || !label) {
    return;
  }

  const defaultLabel = label.textContent || 'Drag an image here or click to upload';
  const updateLabel = () => {
    label.textContent = input.files?.[0]?.name || defaultLabel;
  };

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'dragend'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('is-dragging');
    });
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');

    if (!event.dataTransfer?.files.length) {
      return;
    }

    try {
      input.files = event.dataTransfer.files;
    } catch (_) {
      return;
    }

    updateLabel();
  });

  input.addEventListener('change', updateLabel);
  updateLabel();
})();
