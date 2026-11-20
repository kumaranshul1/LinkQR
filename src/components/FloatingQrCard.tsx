import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { encodeQr, qrToSvgPath } from '../lib/qrEncoder';
import { ResolvedCardTheme } from '../lib/themeResolver';

export interface FloatingQrState {
  payload: string;
  triggerType: 'link' | 'selection' | 'page';
  anchorX: number;
  anchorY: number;
  anchorTop?: number;
}

interface FloatingQrCardProps {
  qrState: FloatingQrState;
  containerWidth: number;
  containerHeight: number;
  theme: ResolvedCardTheme;
  onDismiss: () => void;
}

const CARD_WIDTH = 248;
const CARD_ESTIMATED_HEIGHT = 278;
const VIEWPORT_MARGIN = 14;

export function FloatingQrCard({
  qrState,
  containerWidth,
  containerHeight,
  theme,
  onDismiss,
}: FloatingQrCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onDismiss]);

  const encoded = useMemo(() => {
    try {
      const qr = encodeQr(qrState.payload);
      const quietZone = 4;
      return {
        ok: true as const,
        viewBoxSize: qr.size + quietZone * 2,
        pathData: qrToSvgPath(qr, quietZone),
        version: qr.version,
        eccLevel: qr.eccLevel,
      };
    } catch (err) {
      return {
        ok: false as const,
        message: err instanceof Error ? err.message : 'Unable to encode QR code.',
      };
    }
  }, [qrState.payload]);

  const { left, top } = useMemo(() => {
    let targetX = qrState.anchorX + 12;
    let targetY = qrState.anchorY + 10;

    // Flip above the link if there isn't room below
    if (
      targetY + CARD_ESTIMATED_HEIGHT > containerHeight - VIEWPORT_MARGIN &&
      typeof qrState.anchorTop === 'number'
    ) {
      const aboveY = qrState.anchorTop - CARD_ESTIMATED_HEIGHT - 10;
      if (aboveY >= VIEWPORT_MARGIN) {
        targetY = aboveY;
      }
    }

    const clampedLeft = Math.min(
      Math.max(VIEWPORT_MARGIN, targetX),
      Math.max(VIEWPORT_MARGIN, containerWidth - CARD_WIDTH - VIEWPORT_MARGIN)
    );
    const clampedTop = Math.min(
      Math.max(VIEWPORT_MARGIN, targetY),
      Math.max(VIEWPORT_MARGIN, containerHeight - CARD_ESTIMATED_HEIGHT - VIEWPORT_MARGIN)
    );

    return { left: Math.round(clampedLeft), top: Math.round(clampedTop) };
  }, [qrState.anchorX, qrState.anchorY, qrState.anchorTop, containerWidth, containerHeight]);

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Scannable QR Code"
      className="linkqr-animate-pop absolute z-40 rounded-xl p-4 select-none"
      style={{
        left,
        top,
        width: CARD_WIDTH,
        backgroundColor: theme.cardBg,
        color: theme.cardText,
        border: `1px solid ${theme.cardBorder}`,
        boxShadow: '0 14px 34px rgba(15, 23, 42, 0.22), 0 2px 6px rgba(15, 23, 42, 0.08)',
      }}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close QR code"
        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-1"
        style={{ color: theme.cardMutedText }}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {encoded.ok ? (
        <>
          <div
            className="mx-auto mt-2 mb-3 flex h-[200px] w-[200px] items-center justify-center overflow-hidden rounded-lg"
            style={{ backgroundColor: theme.qrBg }}
          >
            <svg
              viewBox={`0 0 ${encoded.viewBoxSize} ${encoded.viewBoxSize}`}
              width={200}
              height={200}
              shapeRendering="crispEdges"
              role="img"
              aria-label={`QR code for ${qrState.payload}`}
            >
              <rect width="100%" height="100%" fill={theme.qrBg} />
              <path d={encoded.pathData} fill={theme.qrFg} />
            </svg>
          </div>
          <p
            title={qrState.payload}
            className="m-0 truncate text-center font-mono text-xs"
            style={{ color: theme.cardMutedText }}
          >
            {qrState.payload}
          </p>
        </>
      ) : (
        <div className="px-2 py-6 text-center text-[13px] leading-relaxed">
          {encoded.message}
        </div>
      )}
    </div>
  );
}
