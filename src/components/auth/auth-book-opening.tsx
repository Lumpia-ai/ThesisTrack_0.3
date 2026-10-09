import { authUi, cx } from './auth-ui';

type AuthBookOpeningProps = {
  direction: 'forward' | 'back';
  mode: 'entry' | 'exit';
};

export function AuthBookOpening({ direction, mode }: AuthBookOpeningProps) {
  const isEntry = mode === 'entry';

  return (
    <div
      className={cx(
        authUi.openBookOverlay,
        isEntry ? authUi.openBookOverlayEntry : authUi.openBookOverlayExit
      )}
      aria-hidden="true"
    >
      <div className={authUi.openBookStage}>
        <span className={authUi.openBookShadow} />

        <div
          className={cx(
            authUi.openBookPage,
            authUi.openBookLeftPage,
            isEntry && authUi.openBookEntryLeftPage
          )}
        >
          <span className={authUi.openBookLines} />
          <span className={cx(authUi.openBookMargin, authUi.openBookMarginLeft)} />
        </div>

        <div
          className={cx(
            authUi.openBookPage,
            authUi.openBookRightPage,
            isEntry && authUi.openBookEntryRightPage
          )}
        >
          <span className={authUi.openBookLines} />
          <span className={cx(authUi.openBookMargin, authUi.openBookMarginRight)} />
        </div>

        {!isEntry ? (
          <div
            className={cx(
              authUi.openBookCover,
              direction === 'forward' ? authUi.openBookCoverForward : authUi.openBookCoverBack
            )}
          >
            <span className={authUi.openBookBrand}>
              Thesis<span className={authUi.openBookAccent}>Track</span>
            </span>
          </div>
        ) : null}

        <span className={authUi.openBookSpine} />
      </div>
    </div>
  );
}
