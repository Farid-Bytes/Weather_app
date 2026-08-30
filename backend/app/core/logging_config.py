"""Structured logging configuration using loguru.

Call `configure_logging()` once at application startup (done in `app.main`).
Other modules just do `from loguru import logger` and use it directly.
"""

import sys

from loguru import logger

from app.config import get_settings


def configure_logging() -> None:
    """Configure loguru sinks, format, and level from application settings.

    Removes the default handler and installs a single stdout sink with a
    structured, timestamped format suitable for both local dev and container
    log aggregation (e.g. CloudWatch, Loki, Datadog).
    """
    settings = get_settings()

    logger.remove()
    logger.add(
        sys.stdout,
        level=settings.log_level.upper(),
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
            "<level>{message}</level>"
        ),
        colorize=True,
        backtrace=True,
        diagnose=False,  # Avoid leaking variable values in production logs
    )
    logger.info("Logging configured at level {}", settings.log_level.upper())
