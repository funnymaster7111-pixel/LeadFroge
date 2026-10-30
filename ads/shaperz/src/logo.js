// Shows the Shaperz logo, or a clearly marked empty slot until assets/shaperz-logo.png exists.
document.querySelectorAll('.logo img').forEach(img => {
  const markMissing = () => {
    const slot = img.parentElement;
    slot.classList.add('missing');
    slot.textContent = 'SHAPERZ LOGO — add assets/shaperz-logo.png';
  };
  if (img.complete && !img.naturalWidth) markMissing();
  else img.addEventListener('error', markMissing);
});
