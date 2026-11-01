<!--
  Vue 3 single-file component (Vite, Vue CLI, Nuxt client-only). Put it once in your root layout:

    <FeedbackWidget :options="{ lang: locale, submitUrl: '/api/feedback' }" @sent="toast('Thanks!')" />

  Open it from anywhere: a template ref (widget.value.open('error')) or the global  window.Feedback.open().
  Load the stylesheet once:  import '@/../node_modules/<path>/src/widget/assets/feedback.css'  (or a <link> in index.html).
-->
<script setup>
import { onMounted, onBeforeUnmount, watch } from 'vue';
import Feedback from '../../src/widget/assets/feedback.js';   // or: import Feedback from '@rapttor/feedback' once published to npm

const props = defineProps({ options: { type: Object, default: () => ({}) } });
const emit = defineEmits(['sent', 'open', 'close', 'error']);

let off = [];
function start() {
  off.forEach((f) => f());
  Feedback.init(props.options);                            // restarts with the new options
  off = ['sent', 'open', 'close', 'error'].map((name) => Feedback.on(name, (detail) => emit(name, detail)));
}
onMounted(start);
watch(() => props.options, start, { deep: true });        // e.g. the language changed
onBeforeUnmount(() => { off.forEach((f) => f()); Feedback.destroy(); });

defineExpose({ open: (type) => Feedback.open(type ? { type } : {}), close: () => Feedback.close(), show: () => Feedback.show(), hide: () => Feedback.hide() });
</script>

<template><span hidden aria-hidden="true" /></template>
