// Composable alternative to the component: const { open } = useFeedback(() => ({ lang: locale.value, submitUrl: '/api/feedback' }));
import { onMounted, onBeforeUnmount, watch } from 'vue';
import Feedback from '../../src/widget/assets/feedback.js';

export function useFeedback(getOptions, handlers = {}) {
  let off = [];
  const start = () => {
    off.forEach((f) => f());
    Feedback.init(getOptions());
    off = Object.entries(handlers).map(([name, fn]) => Feedback.on(name, fn));   // { sent(d) {}, error(d) {} }
  };
  onMounted(start);
  watch(getOptions, start, { deep: true });
  onBeforeUnmount(() => { off.forEach((f) => f()); Feedback.destroy(); });
  return { open: (type) => Feedback.open(type ? { type } : {}), close: Feedback.close, show: Feedback.show, hide: Feedback.hide };
}
