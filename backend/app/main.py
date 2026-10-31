import os
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .database import engine, Base
from .seed_data import seed_database
from .routes import (
    auth,
    institutions,
    fdrs,
    bank_portal,
    scrutiny,
    release,
    audit,
    alerts,
    dashboard,
    messages,
    documents,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    # Seed default data on startup
    seed_database()
    yield

app = FastAPI(
    title="DepositGuard: Centralized Security Deposit & FDR Management Portal",
    description="Official AICTE Regulation Bureau & Bank Verification System for Security Deposits and FDRs",
    version="2.4.0",
    lifespan=lifespan
)

class ErrorEnvelopeMiddleware(BaseHTTPMiddleware):
    """
    Turn an unhandled server error into a normal JSON response.

    Without this an exception escapes past the CORS middleware, so the reply
    carries no Access-Control-Allow-Origin header, the browser refuses to read
    it, and the UI reports a misleading "Failed to fetch" instead of the real
    cause. Registered BEFORE CORSMiddleware so that CORS ends up on the
    outside and still decorates this response.
    """
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            traceback.print_exc()
            return JSONResponse(
                status_code=500,
                content={"detail": f"Server error: {type(exc).__name__}: {exc}"},
            )


# Order matters: added first => inner; CORS added last => outermost wrapper.
app.add_middleware(ErrorEnvelopeMiddleware)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(institutions.router)
app.include_router(fdrs.router)
app.include_router(bank_portal.router)
app.include_router(scrutiny.router)
app.include_router(release.router)
app.include_router(audit.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(messages.router)
app.include_router(documents.router)

# Health & Root Check
@app.get("/")
def root():
    return {
        "system": "DepositGuard: Centralized Security Deposit & FDR Management Portal",
        "version": "2.4.0",
        "organization": "All India Council for Technical Education (AICTE), Ministry of Education, Government of India",
        "stakeholders": ["AICTE Regulation Bureau", "Issuing Banks (Nodal Cells)"],
        "status": "OPERATIONAL",
        "endpoints": {
            "docs": "/docs",
            "dashboard_stats": "/api/dashboard/stats",
            "fdr_registry": "/api/fdrs",
            "messages": "/api/messages",
            "audit_chain": "/api/audit/chain"
        }
    }
