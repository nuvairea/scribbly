export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const SPINNER_MARKUP = '<span class="btn-spinner" aria-hidden="true">'
  + '<span></span>'.repeat(8)
  + '</span>';

export const setButtonLoading = (btn, isLoading) => {
  if (isLoading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = SPINNER_MARKUP;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalHtml !== undefined) {
      btn.innerHTML = btn.dataset.originalHtml;
    }
  }
};