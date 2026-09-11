from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import (
    SatqueryException,
    satquery_exception_handler,
    generic_exception_handler,
)
from app.api.routes.analyses import router as analyses_router
from app.api.routes.health import router as health_router
from app.api.routes.images import router as images_router


setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    logger.info(
        f"Starting {settings.PROJECT_NAME} (version {settings.VERSION}) in [{settings.ENV}] mode..."
    )
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=settings.DESCRIPTION,
        debug=settings.DEBUG,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Allowed origins for your React frontend
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Exception Handlers
    app.add_exception_handler(SatqueryException, satquery_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Include Routes
    app.include_router(health_router, tags=["health"])
    app.include_router(health_router, prefix=settings.API_V1_STR, tags=["health"])

    app.include_router(
        images_router,
        prefix=f"{settings.API_V1_STR}/images",
        tags=["images"],
    )
    app.include_router(
        images_router,
        prefix="/images",
        tags=["images"],
    )

    app.include_router(
        analyses_router,
        prefix=f"{settings.API_V1_STR}/analyses",
        tags=["analyses"],
    )
    app.include_router(
        analyses_router,
        prefix="/analyses",
        tags=["analyses"],
    )

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )