// Shows each ad photo, or a clearly marked slot naming the file it expects.
document.querySelectorAll('.photo-cell img').forEach(img => {
  const markMissing = () => {
    const cell = img.parentElement;
    cell.classList.add('missing');
    img.remove();
    const label = document.createElement('span');
    label.textContent = cell.dataset.label;
    cell.append(label);
  };
  if (img.complete && !img.naturalWidth) markMissing();
  else img.addEventListener('error', markMissing);
});
