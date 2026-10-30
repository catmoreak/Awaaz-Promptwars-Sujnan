const LAYERS = 10;
const PIN_PATH =
  'M32 2C16 2 4 14 4 30c0 21 28 48 28 48s28-27 28-48C60 14 48 2 32 2zm0 18a10 10 0 1 1 0 20 10 10 0 0 1 0-20z';

/** A map pin, because a pin is what a report is: stacked layers give it real depth as it turns. */
export function Loader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className={fullScreen ? 'loader loader-full' : 'loader'} role="status" aria-label="Loading">
      <div className="loader-scene">
        <div className="loader-rig">
          {Array.from({ length: LAYERS }, (_, index) => (
            <svg
              key={index}
              className={index === LAYERS - 1 ? 'loader-layer loader-face' : 'loader-layer'}
              style={{ transform: `translateZ(${index * 1.4 - 6}px)` }}
              viewBox="0 0 64 80"
              aria-hidden="true"
            >
              <path d={PIN_PATH} fillRule="evenodd" />
            </svg>
          ))}
        </div>
        <svg className="loader-tile" viewBox="0 0 100 100" aria-hidden="true">
          <polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" />
        </svg>
      </div>
    </div>
  );
}
