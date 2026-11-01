# Other frameworks (untested snippets)

The widget is plain DOM: any framework only has to call `Feedback.init(options)` once when the app starts, `Feedback.destroy()` when it is torn down, and `Feedback.open()` from a button.
The Vue, React, jQuery, web component and plain HTML examples in this folder are run in a browser; the snippets below follow the same pattern but have **not** been run here.

## Svelte / SvelteKit

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  export let options = {};
  let Feedback;
  onMount(async () => { Feedback = (await import('../../src/widget/assets/feedback.js')).default; Feedback.init(options); });   // client only: no SSR
  onDestroy(() => Feedback?.destroy());
</script>
<button on:click={() => Feedback?.open({ type: 'error' })}>Report a problem</button>
```

## Angular

```ts
import { Component, OnInit, OnDestroy } from '@angular/core';
declare const Feedback: any;                      // load feedback.js with "scripts" in angular.json, feedback.css in "styles"

@Component({ selector: 'app-feedback', template: '<button (click)="open()">Feedback</button>' })
export class FeedbackComponent implements OnInit, OnDestroy {
  ngOnInit() { Feedback.init({ lang: 'en', submitUrl: '/api/feedback' }); }
  ngOnDestroy() { Feedback.destroy(); }
  open() { Feedback.open(); }
}
```

## Next.js / Nuxt

Initialise inside a client-only component (`'use client'` in Next, `<ClientOnly>` or `.client.vue` in Nuxt). Importing `feedback.js` on the server is safe (it exports no-op functions), but it does nothing there.

## Alpine.js / htmx / server-rendered pages

```html
<link rel="stylesheet" href="/feedback.css"><script src="/feedback.js"></script>
<script>Feedback.init({ submitUrl: '/api/feedback' });</script>
<a href="#" data-feedback-open>Feedback</a>
```

## Web component in any of them

`<rapttor-feedback submit-url="/api/feedback"></rapttor-feedback>` (see `web-component.html`). Frameworks that need custom elements declared (Vue: `compilerOptions.isCustomElement: t => t === 'rapttor-feedback'`) need that one setting.
