import { useEffect, useRef } from 'react';

type Axis = 'x' | 'y';

interface Options {
  observeContent?: boolean;
}

export function useScrollFade<T extends HTMLElement>(axis: Axis = 'x', { observeContent = false }: Options = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const position = axis === 'x' ? el.scrollLeft : el.scrollTop;
      const visible = axis === 'x' ? el.clientWidth : el.clientHeight;
      const total = axis === 'x' ? el.scrollWidth : el.scrollHeight;
      el.dataset.fadeStart = String(position > 1);
      el.dataset.fadeEnd = String(position + visible < total - 1);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    el.addEventListener('input', update);
    el.addEventListener('keyup', update);

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);

    let mutationObserver: MutationObserver | null = null;
    if (observeContent) {
      const observeChildren = () => Array.from(el.children).forEach((child) => resizeObserver.observe(child));
      observeChildren();
      mutationObserver = new MutationObserver(() => {
        observeChildren();
        update();
      });
      mutationObserver.observe(el, { childList: true, subtree: true, characterData: true });
    }

    return () => {
      el.removeEventListener('scroll', update);
      el.removeEventListener('input', update);
      el.removeEventListener('keyup', update);
      resizeObserver.disconnect();
      mutationObserver?.disconnect();
    };
  }, [axis, observeContent]);

  return ref;
}
