'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * TruncatedText — static single-line text that fades out at the right edge when it doesn't fit.
 *
 * Short text renders normally. Long text keeps its beginning visible, is cut off at the container
 * edge, and gets a subtle right-side fade so it's clear there is more. No animation. The full text
 * is available as a native tooltip. Styles live in app/globals.css (.truncated-text), so it works
 * on any page.
 *
 * Use it only for text that
 *   1. sits in a fixed or constrained width,
 *   2. must stay on one line, and
 *   3. can be very long (project titles, output names, document names, researcher lists).
 * Don't use it for page headings, paragraphs, buttons, navigation labels, short text, or badges.
 *
 * The width must be constrained. Inside a table cell, give it a width (via `width` or CSS on
 * `.truncated-text`), because a cell otherwise grows to fit its content and nothing overflows.
 *
 *   <TruncatedText text={project.title} width="16rem" className="table-title" />
 *
 * `className` is applied to the element itself, so existing text styles carry over unchanged.
 */
type TruncatedTextProps = {
  text: string;
  className?: string;
  /** Optional fixed width (any CSS length, e.g. "16rem"). Omit to fill the parent's width. */
  width?: CSSProperties['width'];
};

export function TruncatedText({ text, className, width }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  // The fade is applied only when the text actually overflows, so text that fits is never dimmed.
  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const update = () => {
      if (element.scrollWidth > element.clientWidth + 1) {
        element.dataset.overflowing = 'true';
      } else {
        delete element.dataset.overflowing;
      }
    };

    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);

    // Web fonts can change the text width without resizing the element.
    let disposed = false;
    document.fonts?.ready.then(() => {
      if (!disposed) {
        update();
      }
    });

    return () => {
      disposed = true;
      resizeObserver.disconnect();
    };
  }, [text]);

  return (
    <span
      ref={ref}
      className={className ? `truncated-text ${className}` : 'truncated-text'}
      style={width === undefined ? undefined : { width }}
      title={text}
    >
      {text}
    </span>
  );
}
