import { LOGO_PATH, LOGO_VIEWBOX } from '@awaaz/shared';

export function Logo() {
  return (
    <span className="brand">
      <svg className="brand-mark" viewBox={LOGO_VIEWBOX} aria-hidden="true">
        <path d={LOGO_PATH} fillRule="evenodd" />
      </svg>
      Awaaz
    </span>
  );
}
