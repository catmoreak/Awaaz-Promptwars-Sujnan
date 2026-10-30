import { LOGO_PATH, LOGO_VIEWBOX } from '@awaaz/shared';

const LAYERS = 10;

/** The logo turning in 3D. Stacked layers give it real depth as it spins. */
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
              viewBox={LOGO_VIEWBOX}
              aria-hidden="true"
            >
              <path d={LOGO_PATH} fillRule="evenodd" />
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
