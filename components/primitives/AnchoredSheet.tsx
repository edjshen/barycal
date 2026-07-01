'use client';
import { useEffect, useRef, useState } from 'react';
import { Popover } from '@base-ui-components/react/popover';
import Sheet from './Sheet';

// A floating card that opens next to the place it was launched from — mirroring
// Google Calendar's create/detail bubbles — instead of a fixed bottom sheet.
// The `anchor` is anything with a viewport-space `getBoundingClientRect()`
// (a live DOM element, or a snapshot rect from `rectAnchor`). Collision
// avoidance flips/shifts the card so it always stays on screen.
//
// On phone-width viewports a side bubble can't fit a full form, so we fall back
// to the app's normal bottom sheet — the same choice Google Calendar makes.
export type Anchor = { getBoundingClientRect: () => DOMRect } | Element | null | undefined;

// Anchored bubble only kicks in once there's room beside the content.
const ANCHOR_MIN_WIDTH = 700;

// Build a virtual anchor from a fixed viewport rectangle — used when there is no
// persistent element to point at (e.g. a drag-to-create time block).
export function rectAnchor(x: number, y: number, width: number, height: number): Anchor {
  const r = {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON() {},
  } as DOMRect;
  return { getBoundingClientRect: () => r };
}

// Fallback anchor at the viewport centre, so the card still lands somewhere
// sensible if a launch site forgets to pass one.
function centerAnchor(): Anchor {
  if (typeof window === 'undefined') return rectAnchor(0, 0, 0, 0);
  return rectAnchor(window.innerWidth / 2, window.innerHeight / 2, 0, 0);
}

function useAnchoredLayout() {
  const [anchored, setAnchored] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(min-width: ${ANCHOR_MIN_WIDTH}px)`).matches
      : true
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${ANCHOR_MIN_WIDTH}px)`);
    const on = () => setAnchored(mq.matches);
    // Reconcile in case the width changed between the initial render and mount.
    if (mq.matches !== anchored) on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return anchored;
}

export default function AnchoredSheet({
  open,
  onOpenChange,
  anchor,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  anchor?: Anchor;
  children: React.ReactNode;
}) {
  const anchored = useAnchoredLayout();

  // These cards are frequently opened from a pointerup (drag-to-create, or a tap
  // that releases on an event). The browser then fires a trailing `click`, which
  // Base UI's outside-press dismissal would otherwise catch and immediately close
  // the card. Record when we opened (during render, before that click is
  // dispatched) and swallow an outside-press close within the same gesture.
  const openedAt = useRef(0);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) openedAt.current = now();
  wasOpen.current = open;

  if (!anchored) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {children}
      </Sheet>
    );
  }

  function handleOpenChange(next: boolean, details?: { reason?: string }) {
    if (!next && details?.reason === 'outside-press' && now() - openedAt.current < 400) return;
    onOpenChange(next);
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange} modal>
      <Popover.Portal>
        <Popover.Backdrop className="cal-pop-scrim" />
        <Popover.Positioner
          className="cal-pop-pos"
          anchor={anchor ?? centerAnchor()}
          positionMethod="fixed"
          side="right"
          align="start"
          sideOffset={10}
          alignOffset={-8}
          collisionPadding={12}
          collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'end' }}
        >
          <Popover.Popup className="sheet cal-pop">{children}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : 0;
}
