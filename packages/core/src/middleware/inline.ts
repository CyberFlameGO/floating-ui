import type {Middleware, Padding} from '../types';
import {getSide} from '../utils/getSide';
import {getMainAxisFromPlacement} from '../utils/getMainAxisFromPlacement';
import {getSideObjectFromPadding} from '../utils/getPaddingObject';
import {max, min} from '../utils/math';
import {rectToClientRect} from '../utils/rectToClientRect';

export interface Options {
  /**
   * Viewport-relative `x` coordinate to choose a `ClientRect`.
   * @default undefined
   */
  x: number;

  /**
   * Viewport-relative `y` coordinate to choose a `ClientRect`.
   * @default undefined
   */
  y: number;

  /**
   * @experimental
   * @default 2
   */
  padding: Padding;
}

/**
 * Provides improved positioning for inline reference elements that can span
 * over multiple lines, such as hyperlinks or range selections.
 * @see https://floating-ui.com/docs/inline
 */
export const inline = (options: Partial<Options> = {}): Middleware => ({
  name: 'inline',
  options,
  async fn(middlewareArguments) {
    const {placement, elements, rects, platform, strategy} =
      middlewareArguments;
    // A MouseEvent's client{X,Y} coords can be up to 2 pixels off a
    // ClientRect's bounds, despite the event listener being triggered. A
    // padding of 2 seems to handle this issue.
    const {padding = 2, x, y} = options;

    const fallback = rectToClientRect(
      platform.convertOffsetParentRelativeRectToViewportRelativeRect
        ? await platform.convertOffsetParentRelativeRectToViewportRelativeRect({
            rect: rects.reference,
            offsetParent: await platform.getOffsetParent?.(elements.floating),
            strategy,
          })
        : rects.reference
    );
    const clientRects =
      (await platform.getClientRects?.(elements.reference)) ?? [];
    const paddingObject = getSideObjectFromPadding(padding);

    function getBoundingClientRect() {
      // There are two rects and they are disjoined
      if (
        clientRects.length === 2 &&
        clientRects[0].left > clientRects[1].right &&
        x != null &&
        y != null
      ) {
        // Find the first rect in which the point is fully inside
        return (
          clientRects.find(
            (rect) =>
              x > rect.left - paddingObject.left &&
              x < rect.right + paddingObject.right &&
              y > rect.top - paddingObject.top &&
              y < rect.bottom + paddingObject.bottom
          ) ?? fallback
        );
      }

      // There are 2 or more connected rects
      if (clientRects.length >= 2) {
        if (getMainAxisFromPlacement(placement) === 'x') {
          const firstRect = clientRects[0];
          const lastRect = clientRects[clientRects.length - 1];
          const isTop = getSide(placement) === 'top';

          const top = firstRect.top;
          const bottom = lastRect.bottom;
          const left = isTop ? firstRect.left : lastRect.left;
          const right = isTop ? firstRect.right : lastRect.right;
          const width = right - left;
          const height = bottom - top;

          return {
            top,
            bottom,
            left,
            right,
            width,
            height,
            x: left,
            y: top,
          };
        }

        const isLeftSide = getSide(placement) === 'left';
        const maxRight = max(...clientRects.map((rect) => rect.right));
        const minLeft = min(...clientRects.map((rect) => rect.left));
        const measureRects = clientRects.filter((rect) =>
          isLeftSide ? rect.left === minLeft : rect.right === maxRight
        );

        const top = measureRects[0].top;
        const bottom = measureRects[measureRects.length - 1].bottom;
        const left = minLeft;
        const right = maxRight;
        const width = right - left;
        const height = bottom - top;

        return {
          top,
          bottom,
          left,
          right,
          width,
          height,
          x: left,
          y: top,
        };
      }

      return fallback;
    }

    return {
      reset: {
        rects: await platform.getElementRects({
          reference: {getBoundingClientRect},
          floating: elements.floating,
          strategy,
        }),
      },
    };
  },
});
