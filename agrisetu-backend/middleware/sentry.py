"""
Sentry Error Tracking — initialised only if SENTRY_DSN is set.
"""
import logging

logger = logging.getLogger("agrisetu")


def init_sentry(dsn: str | None = None, environment: str = "development") -> None:
    """Initialise Sentry SDK if a DSN is provided. Safe to call without DSN."""
    if not dsn:
        logger.info("Sentry: not configured (no SENTRY_DSN)")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            integrations=[FastApiIntegration()],
            traces_sample_rate=0.1,
            send_default_pii=False,
        )
        logger.info("Sentry: initialised")
    except ImportError:
        logger.warning("Sentry: sentry-sdk package not installed. Add 'sentry-sdk[fastapi]' to requirements.")
    except Exception as e:
        logger.warning(f"Sentry: init failed: {e}")
