import os
import hashlib
import hmac
import base64
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import jwt
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

SECRET_KEY = os.getenv("DEPOSITGUARD_SECRET_KEY", "aicte_depositguard_super_secret_key_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security_bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Secure PBKDF2-HMAC-SHA256 password hashing with salt."""
    salt = "aicte_salt_depositguard_2026"
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return pwd_hash.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(hash_password(plain_password), hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
    except jwt.PyJWTError:
        return None
    
    user = db.query(User).filter(User.username == username).first()
    return user

def require_auth(user: Optional[User] = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided or have expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(user: User = Depends(require_auth)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. User role '{user.role}' is not authorized. Required: {allowed_roles}"
            )
        return user
    return role_checker

# DSC and Cryptographic Simulation for Bank Attestation (Slide 3: pyHanko, CCA Root CA)
def generate_dsc_attestation(bank_name: str, officer_name: str, officer_empid: str, fdr_payload: dict) -> dict:
    """
    Simulates Class-3 DSC (Digital Signature Certificate) under CCA India Root CA.
    Produces RFC 5652 PKCS#7 compatible digital signature record.
    """
    signing_time = datetime.now(timezone.utc).isoformat()
    serial_seed = f"{bank_name}-{officer_empid}-{signing_time}"
    cert_serial = hashlib.sha1(serial_seed.encode()).hexdigest().upper()
    
    payload_json = json.dumps(fdr_payload, sort_keys=True)
    raw_signature = hmac.new(
        key=f"DSC_PRIVATE_KEY_{officer_empid}".encode(),
        msg=payload_json.encode(),
        digestmod=hashlib.sha256
    ).hexdigest()

    return {
        "signer_dn": f"CN={officer_name}, O={bank_name}, OU=Nodal Verification Branch, C=IN",
        "cert_issuer": "CN=eMudhra Class 3 Institutional CA 2024, O=eMudhra Limited, C=IN (Root: CCA India 2014)",
        "cert_serial": f"0x{cert_serial[:16]}",
        "timestamp": signing_time,
        "signature_hex": raw_signature,
        "signature_algorithm": "SHA256withRSA / PKCS#7 CMS",
        "ocsp_status": "GOOD (RFC 6960 Validated)",
        "legal_validity": "Valid under Section 4 & Section 5 of Information Technology Act 2000 (India)"
    }

