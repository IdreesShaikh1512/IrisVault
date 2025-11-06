from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import json
from biometric_engine import IrisBiometricEngine, SyntheticIrisGenerator
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Biometric engine
bio_engine = IrisBiometricEngine()

# Create the main app
app = FastAPI(title="IrisVault API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    account_number: str
    email: str
    balance: float = 10000.0  # Starting balance
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    account_number: str
    email: str

class BiometricTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    account_number: str
    template_blob: str  # Encrypted template
    template_meta: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    account_number: Optional[str] = None
    event_type: str
    device_info: str = "webcam"
    success: bool
    details: dict
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    account_number: str
    type: str  # withdraw, deposit, check
    amount: float
    balance_after: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EnrollRequest(BaseModel):
    name: str
    account_number: str
    email: str
    consent: bool
    frames: List[str]  # base64 encoded images

class VerifyRequest(BaseModel):
    account_number: str
    frames: List[str]

class TransactionRequest(BaseModel):
    account_number: str
    type: str
    amount: float = 0

class FallbackRequest(BaseModel):
    account_number: str
    fingerprint_pin: str
    security_answer: Optional[str] = None

# ============= HELPER FUNCTIONS =============

def convert_numpy_types(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    import numpy as np
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(v) for v in obj]
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj

async def log_audit(event_type: str, account_number: str = None, user_id: str = None, 
                   success: bool = True, details: dict = {}):
    """Log audit event"""
    try:
        # Convert numpy types to Python types
        clean_details = convert_numpy_types(details)
        
        log = AuditLog(
            user_id=user_id,
            account_number=account_number,
            event_type=event_type,
            success=success,
            details=clean_details
        )
        doc = log.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.audit_logs.insert_one(doc)
    except Exception as e:
        logger.error(f"Audit log error: {e}")

# ============= API ENDPOINTS =============

@api_router.get("/")
async def root():
    return {"message": "IrisVault API - Biometric ATM System", "version": "1.0"}

@api_router.post("/enroll")
async def enroll_user(request: EnrollRequest):
    """Enroll new user with iris biometrics"""
    try:
        # Validate consent
        if not request.consent:
            raise HTTPException(status_code=400, detail="Biometric consent required")
        
        # Check if account exists
        existing = await db.users.find_one({"account_number": request.account_number})
        if existing:
            raise HTTPException(status_code=400, detail="Account already enrolled")
        
        # Validate frames
        if len(request.frames) < 3:
            raise HTTPException(status_code=400, detail="Minimum 3 frames required")
        
        # Check liveness
        liveness_result = bio_engine.check_liveness(request.frames)
        if not liveness_result['is_live']:
            await log_audit(
                "enrollment_failed",
                account_number=request.account_number,
                success=False,
                details={'reason': 'Liveness check failed', 'liveness': liveness_result}
            )
            raise HTTPException(
                status_code=400,
                detail=f"Liveness check failed: {liveness_result.get('reason', 'Unknown')}"
            )
        
        # Create template
        template_data = bio_engine.create_template(request.frames)
        if template_data is None:
            await log_audit(
                "enrollment_failed",
                account_number=request.account_number,
                success=False,
                details={'reason': 'Failed to create template'}
            )
            raise HTTPException(status_code=400, detail="Failed to create biometric template")
        
        # Encrypt template
        encrypted_template = bio_engine.encrypt_template(template_data)
        if encrypted_template is None:
            raise HTTPException(status_code=500, detail="Encryption failed")
        
        # Create user
        user = User(
            name=request.name,
            account_number=request.account_number,
            email=request.email
        )
        user_doc = user.model_dump()
        user_doc['created_at'] = user_doc['created_at'].isoformat()
        await db.users.insert_one(user_doc)
        
        # Store biometric template
        bio_template = BiometricTemplate(
            user_id=user.id,
            account_number=request.account_number,
            template_blob=encrypted_template,
            template_meta={
                'quality_score': template_data['quality_score'],
                'num_frames': template_data['num_frames'],
                'algorithm': 'iris_classical_cv',
                'liveness_confidence': liveness_result.get('confidence', 0)
            }
        )
        bio_doc = bio_template.model_dump()
        bio_doc['created_at'] = bio_doc['created_at'].isoformat()
        await db.biometrics.insert_one(bio_doc)
        
        # Log success
        await log_audit(
            "enrollment_success",
            account_number=request.account_number,
            user_id=user.id,
            success=True,
            details={
                'quality_score': template_data['quality_score'],
                'liveness': liveness_result
            }
        )
        
        return {
            "success": True,
            "enrollment_id": user.id,
            "account_number": request.account_number,
            "quality_score": template_data['quality_score'],
            "message": "Enrollment successful"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enrollment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/verify")
async def verify_user(request: VerifyRequest):
    """Verify user using iris biometrics"""
    try:
        # Find user and template
        user = await db.users.find_one({"account_number": request.account_number})
        if not user:
            await log_audit(
                "verification_failed",
                account_number=request.account_number,
                success=False,
                details={'reason': 'Account not found'}
            )
            raise HTTPException(status_code=404, detail="Account not found")
        
        bio_template = await db.biometrics.find_one({"account_number": request.account_number})
        if not bio_template:
            raise HTTPException(status_code=404, detail="Biometric template not found")
        
        # Validate frames
        if len(request.frames) < 2:
            raise HTTPException(status_code=400, detail="Minimum 2 frames required")
        
        # Check liveness
        liveness_result = bio_engine.check_liveness(request.frames)
        if not liveness_result['is_live']:
            await log_audit(
                "verification_failed",
                account_number=request.account_number,
                user_id=user['id'],
                success=False,
                details={'reason': 'Liveness check failed', 'liveness': liveness_result}
            )
            return {
                "success": False,
                "match": False,
                "confidence": 0.0,
                "reason": "Liveness check failed"
            }
        
        # Create template from verification frames
        verify_template_data = bio_engine.create_template(request.frames)
        if verify_template_data is None:
            await log_audit(
                "verification_failed",
                account_number=request.account_number,
                user_id=user['id'],
                success=False,
                details={'reason': 'Failed to create verification template'}
            )
            return {
                "success": False,
                "match": False,
                "confidence": 0.0,
                "reason": "Failed to process frames"
            }
        
        # Match templates
        match_result = bio_engine.match_templates(
            bio_template['template_blob'],
            verify_template_data['template']
        )
        
        # Log result
        await log_audit(
            "verification_success" if match_result['match'] else "verification_failed",
            account_number=request.account_number,
            user_id=user['id'],
            success=match_result['match'],
            details={
                'confidence': match_result['confidence'],
                'match': match_result['match'],
                'liveness': liveness_result
            }
        )
        
        if match_result['match']:
            return {
                "success": True,
                "match": True,
                "confidence": match_result['confidence'],
                "user_id": user['id'],
                "name": user['name'],
                "account_number": user['account_number']
            }
        else:
            return {
                "success": False,
                "match": False,
                "confidence": match_result['confidence'],
                "reason": "Biometric match failed"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/account/{account_number}/balance")
async def get_balance(account_number: str):
    """Get account balance"""
    try:
        user = await db.users.find_one({"account_number": account_number})
        if not user:
            raise HTTPException(status_code=404, detail="Account not found")
        
        return {
            "account_number": account_number,
            "balance": user.get('balance', 0),
            "name": user['name']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Balance check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/transaction")
async def create_transaction(request: TransactionRequest):
    """Create transaction (withdraw/deposit/check)"""
    try:
        user = await db.users.find_one({"account_number": request.account_number})
        if not user:
            raise HTTPException(status_code=404, detail="Account not found")
        
        current_balance = user.get('balance', 0)
        
        if request.type == 'withdraw':
            if request.amount <= 0:
                raise HTTPException(status_code=400, detail="Invalid amount")
            if current_balance < request.amount:
                raise HTTPException(status_code=400, detail="Insufficient funds")
            new_balance = current_balance - request.amount
            
        elif request.type == 'deposit':
            if request.amount <= 0:
                raise HTTPException(status_code=400, detail="Invalid amount")
            new_balance = current_balance + request.amount
            
        elif request.type == 'check':
            new_balance = current_balance
        else:
            raise HTTPException(status_code=400, detail="Invalid transaction type")
        
        # Update balance
        await db.users.update_one(
            {"account_number": request.account_number},
            {"$set": {"balance": new_balance}}
        )
        
        # Create transaction record
        transaction = Transaction(
            user_id=user['id'],
            account_number=request.account_number,
            type=request.type,
            amount=request.amount,
            balance_after=new_balance
        )
        trans_doc = transaction.model_dump()
        trans_doc['timestamp'] = trans_doc['timestamp'].isoformat()
        await db.transactions.insert_one(trans_doc)
        
        # Log audit
        await log_audit(
            f"transaction_{request.type}",
            account_number=request.account_number,
            user_id=user['id'],
            success=True,
            details={'amount': request.amount, 'balance': new_balance}
        )
        
        return {
            "success": True,
            "transaction_id": transaction.id,
            "type": request.type,
            "amount": request.amount,
            "balance": new_balance
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transaction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/fallback/verify")
async def fallback_verify(request: FallbackRequest):
    """Fallback verification using simulated fingerprint (PIN)"""
    try:
        user = await db.users.find_one({"account_number": request.account_number})
        if not user:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Simulate fingerprint verification with PIN
        # For demo: hash of account_number is the "correct" PIN
        expected_pin = hashlib.md5(request.account_number.encode()).hexdigest()[:6]
        
        if request.fingerprint_pin == expected_pin:
            await log_audit(
                "fallback_verification_success",
                account_number=request.account_number,
                user_id=user['id'],
                success=True,
                details={'method': 'fingerprint_pin'}
            )
            return {
                "success": True,
                "match": True,
                "user_id": user['id'],
                "name": user['name'],
                "method": "fallback_fingerprint"
            }
        else:
            await log_audit(
                "fallback_verification_failed",
                account_number=request.account_number,
                user_id=user['id'],
                success=False,
                details={'method': 'fingerprint_pin', 'reason': 'Invalid PIN'}
            )
            return {
                "success": False,
                "match": False,
                "reason": "Invalid fingerprint PIN"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fallback verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/fallback/pin/{account_number}")
async def get_fallback_pin(account_number: str):
    """Get fallback PIN for demo purposes"""
    pin = hashlib.md5(account_number.encode()).hexdigest()[:6]
    return {"account_number": account_number, "demo_pin": pin}

@api_router.get("/admin/users")
async def get_all_users():
    """Admin: Get all enrolled users"""
    try:
        users = await db.users.find({}, {"_id": 0}).to_list(1000)
        return {"users": users, "count": len(users)}
    except Exception as e:
        logger.error(f"Admin users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/audit-logs")
async def get_audit_logs(limit: int = 100):
    """Admin: Get audit logs"""
    try:
        logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        return {"logs": logs, "count": len(logs)}
    except Exception as e:
        logger.error(f"Admin logs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/biometrics")
async def get_biometrics_metadata():
    """Admin: Get biometric metadata (not raw templates)"""
    try:
        biometrics = await db.biometrics.find(
            {},
            {"_id": 0, "template_blob": 0}  # Exclude encrypted template
        ).to_list(1000)
        return {"biometrics": biometrics, "count": len(biometrics)}
    except Exception as e:
        logger.error(f"Admin biometrics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/transactions/{account_number}")
async def get_transactions(account_number: str, limit: int = 50):
    """Get transaction history"""
    try:
        transactions = await db.transactions.find(
            {"account_number": account_number},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        return {"transactions": transactions, "count": len(transactions)}
    except Exception as e:
        logger.error(f"Transactions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/generate-synthetic-iris")
async def generate_synthetic_iris(seed: Optional[int] = None):
    """Generate synthetic iris image for testing"""
    try:
        img_base64 = SyntheticIrisGenerator.generate(seed=seed)
        return {"image": img_base64}
    except Exception as e:
        logger.error(f"Synthetic generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
