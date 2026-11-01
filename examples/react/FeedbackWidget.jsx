// React 17/18/19 (Vite, CRA, Next.js client component). Render it once near the root:
//
//   <FeedbackWidget options={{ lang: i18n.language, submitUrl: '/api/feedback' }} onSent={() => toast('Thanks!')} />
//   <FeedbackButton type="error">Report a problem</FeedbackButton>
//
// Load the stylesheet once:  import '<path>/src/widget/assets/feedback.css';
// Next.js: this file needs 'use client' at the top (the widget touches window and document).
import { useEffect, useRef } from 'react';
import Feedback from '../../src/widget/assets/feedback.js';   // or: import Feedback from '@rapttor/feedback' once published to npm

const stable = (options) => JSON.stringify(options, (k, v) => (typeof v === 'function' ? 'fn' : v));   // restart only when the options really change

export default function FeedbackWidget({ options = {}, onSent, onError }) {
  const handlers = useRef({});
  handlers.current = { onSent, onError };                    // latest callbacks without restarting the widget

  useEffect(() => {
    Feedback.init(options);
    const offSent = Feedback.on('sent', (d) => handlers.current.onSent?.(d));
    const offError = Feedback.on('error', (d) => handlers.current.onError?.(d));
    return () => { offSent(); offError(); Feedback.destroy(); };   // StrictMode mounts twice: init/destroy are idempotent
  }, [stable(options)]);                                     // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export function FeedbackButton({ type, children, ...rest }) {
  return <button type="button" onClick={() => Feedback.open(type ? { type } : {})} {...rest}>{children}</button>;
}

export const openFeedback = (type) => Feedback.open(type ? { type } : {});
