document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('open');
      const answer = btn.nextElementSibling;
      answer.style.maxHeight = answer.style.maxHeight
        ? null
        : answer.scrollHeight + 'px';
    });
  });
});
