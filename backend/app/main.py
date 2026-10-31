import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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
    description="Official AICTE Regulation Bureau & Bank Verification System for Security Deposits and FDRs (SIH 2026 - Problem SIH26265)",
    version="2.4.0",
    lifespan=lifespan
)

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

# Health & Root Check
@app.get("/")
def root():
    return {
        "system": "DepositGuard: AICTE Security Deposit & FDR Portal",
        "version": "2.4.0",
        "organization": "All India Council for Technical Education (AICTE), Ministry of Education, GoI",
        "team": "CODECREWW$ (Team ID: 199121)",
        "problem_statement": "SIH26265 - Streamline of Security Deposit / FDR Portal",
        "status": "OPERATIONAL",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "dashboard_stats": "/api/dashboard/stats",
            "fdr_registry": "/api/fdrs",
            "audit_chain": "/api/audit/chain"
        }
    }
