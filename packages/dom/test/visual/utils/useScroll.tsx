import {
  MutableRefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {getOverflowAncestors, useFloating, shift} from '@floating-ui/react-dom';
import {VirtualElement} from '@floating-ui/core';

export const useScroll = ({
  refs,
  update,
  rtl = false,
}: {
  refs: {
    reference: MutableRefObject<Element | VirtualElement | null>;
    floating: MutableRefObject<HTMLElement | null>;
  };
  update: () => void;
  rtl?: boolean;
}) => {
  const {
    x,
    y,
    reference,
    floating,
    strategy,
    update: indicatorUpdate,
  } = useFloating({
    strategy: 'fixed',
    placement: 'top',
    middleware: [shift({crossAxis: true, altBoundary: true, padding: 10})],
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [{scrollX, scrollY}, setScroll] = useState<{
    scrollX: null | number;
    scrollY: null | number;
  }>({
    scrollX: null,
    scrollY: null,
  });

  useEffect(() => {
    if (!refs.reference.current || !refs.floating.current) {
      return;
    }

    const parents = [
      ...(refs.reference.current instanceof Element
        ? getOverflowAncestors(refs.reference.current)
        : []),
      ...getOverflowAncestors(refs.floating.current),
    ];

    const localUpdate = () => {
      const scroll = scrollRef.current;

      if (scroll) {
        setScroll({scrollX: scroll.scrollLeft, scrollY: scroll.scrollTop});
      }

      update();
      indicatorUpdate();
    };

    parents.forEach((el) => {
      el.addEventListener('scroll', localUpdate);
    });

    const scroll = scrollRef.current;
    if (scroll) {
      const y = scroll.scrollHeight / 2 - scroll.offsetHeight / 2;
      const x = scroll.scrollWidth / 2 - scroll.offsetWidth / 2;
      scroll.scrollTop = y;
      scroll.scrollLeft = rtl ? -x : x;
    }

    update();

    return () => {
      parents.forEach((el) => {
        el.removeEventListener('scroll', localUpdate);
      });
    };
  }, [refs.floating, refs.reference, update, indicatorUpdate, rtl]);

  useLayoutEffect(() => {
    reference(refs.reference.current);
  }, [reference, refs.reference]);

  const indicator = (
    <div
      className="scroll-indicator"
      ref={floating}
      style={{
        position: strategy,
        top: y ?? '',
        left: x ?? '',
      }}
    >
      x: {scrollX}, y: {scrollY}
    </div>
  );

  return {scrollRef, indicator};
};
