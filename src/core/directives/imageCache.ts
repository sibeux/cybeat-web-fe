import { DirectiveBinding, ObjectDirective } from 'vue';
import { getCachedImage } from '../utils/imageCache';

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const el = entry.target as HTMLImageElement;
      const url = el.dataset.src;
      if (url) {
        observer.unobserve(el);
        
        getCachedImage(url).then((finalUrl) => {
          el.src = finalUrl;
        });
      }
    }
  });
}, {
  rootMargin: '200px 0px',
  threshold: 0.01
});

export const imageCacheDirective: ObjectDirective<HTMLImageElement, string> = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding<string>) {
    const url = binding.value;
    if (!url) return;
    
    el.dataset.src = url;
    observer.observe(el);
  },
  
  updated(el: HTMLImageElement, binding: DirectiveBinding<string>) {
    if (binding.value !== binding.oldValue) {
      const newUrl = binding.value;
      if (!newUrl) {
        el.src = '';
        el.dataset.src = '';
        observer.unobserve(el);
        return;
      }
      
      el.dataset.src = newUrl;
      observer.observe(el);
    }
  },

  unmounted(el: HTMLImageElement) {
    observer.unobserve(el);
  }
};
