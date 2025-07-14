"""Main FastAPI server for Aquila S1000D-AI system."""

import base64
import io
import json
import logging
import os
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml
from dotenv import load_dotenv, find_dotenv
from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

from .ai_providers.provider_factory import ProviderFactory
from .brex_rules import apply_brex_rules

# Import models
from .models.base import ProviderEnum, SecurityLevel, SettingsModel, ValidationStatus
from .models.document import (
    ICN,
    DataModule,
    ProcessingTask,
    PublicationModule,
    UploadedDocument,
)
from .models.user import User
from .services.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    verify_password,
)

# Import services
from .services.document_service import DocumentService

# Load environment variables
ROOT_DIR = Path(__file__).parent

# ensures the values from the file replace any existing environment variables
# that may have been defined but left empty by the execution environment. This
# prevents spurious "<VAR> environment variable not set" errors when a blank
# variable already exists.

env_path = find_dotenv("backend/.env", usecwd=True)
if not env_path:
    env_path = ROOT_DIR / ".env"
load_dotenv(env_path, override=True)
=======
load_dotenv(ROOT_DIR / ".env", override=True)


# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Auth configuration
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable not set")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
ALGORITHM = "HS256"
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


# Create FastAPI app
app = FastAPI(
    title="Aquila S1000D-AI API",
    description="AI-powered technical documentation processing system",
    version="1.0.0",
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load default BREX rules
DEFAULT_BREX_RULES_PATH = ROOT_DIR / "default_brex_rules.yaml"
if DEFAULT_BREX_RULES_PATH.exists():
    with open(DEFAULT_BREX_RULES_PATH, "r") as f:
        DEFAULT_BREX_RULES: Dict[str, Any] = yaml.safe_load(f) or {}
else:
    DEFAULT_BREX_RULES = {}

# Load S1000D BREX rule set for XML validation
S1000D_BREX_PATH = ROOT_DIR / "s1000d_brex_rules.json"
ALL_BREX_RULES: List[Dict[str, Any]] = []
S1000D_BREX_RULES: List[Dict[str, Any]] = []
if S1000D_BREX_PATH.exists():
    with open(S1000D_BREX_PATH, "r") as f:
        ALL_BREX_RULES = json.load(f)
    S1000D_BREX_RULES = ALL_BREX_RULES.copy()

# Initialize document service (settings loaded later)
document_service = DocumentService(db=db)

# Cached settings loaded from the database
system_settings: SettingsModel | None = None


@app.on_event("startup")
async def init_settings():
    """Ensure a settings document exists and cache it."""
    global system_settings, S1000D_BREX_RULES
    doc = await db.settings.find_one({})
    if not doc:
        system_settings = SettingsModel(brex_rules=DEFAULT_BREX_RULES)
        await db.settings.insert_one(system_settings.dict())
    else:
        system_settings = SettingsModel(**doc)
    document_service.settings = system_settings

    # Allow overriding the XML BREX rules from settings
    if isinstance(system_settings.brex_rules, list):
        S1000D_BREX_RULES = system_settings.brex_rules


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Retrieve the currently authenticated user from the access token."""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user_data = await db.users.find_one({"username": username})
    if not user_data:
        raise credentials_exception
    return User(**user_data)


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_role(required: str):
    async def _require(current_user: User = Depends(get_current_active_user)) -> User:
        if required not in current_user.roles:
            raise HTTPException(status_code=403, detail="Insufficient privileges")
        return current_user

    return _require


require_admin = require_role("admin")


auth_router = APIRouter(prefix="/auth")


@auth_router.post("/register")
async def register_user(username: str = Form(...), password: str = Form(...)):
    if await db.users.find_one({"username": username}):
        raise HTTPException(400, "Username already exists")
    hashed = get_password_hash(password)
    user = User(username=username, hashed_password=hashed, roles=["user"])
    await db.users.insert_one(user.dict())
    return {"message": "User registered"}


@auth_router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        secret_key=SECRET_KEY,
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


# Create API router (endpoints require authentication)
api_router = APIRouter(prefix="/api", dependencies=[Depends(get_current_active_user)])


def validate_module_dict(
    module: Dict[str, Any], rules: Dict[str, Any]
) -> Tuple[ValidationStatus, List[str], bool, bool]:
    """Validate a data module dictionary against BREX and XSD rules."""
    errors: List[str] = []
    status = ValidationStatus.GREEN

    title_rules = rules.get("title", {})
    title = module.get("title", "")
    if title_rules.get("required") and not title:
        errors.append("Title is required")
        status = ValidationStatus.RED
    if (
        title
        and title_rules.get("maxLength")
        and len(title) > int(title_rules["maxLength"])
    ):
        errors.append("Title exceeds maximum length")
        status = ValidationStatus.RED
    pattern = title_rules.get("pattern")
    if title and pattern and not re.match(pattern, title):
        errors.append("Title does not match pattern")
        status = ValidationStatus.RED

    dmc_rules = rules.get("dmc", {})
    dmc = module.get("dmc", "")
    if dmc_rules.get("required") and not dmc:
        errors.append("DMC is required")
        status = ValidationStatus.RED
    dmc_pattern = dmc_rules.get("pattern")
    if dmc and dmc_pattern and not re.match(dmc_pattern, dmc):
        errors.append("DMC does not match pattern")
        status = ValidationStatus.RED

    content_rules = rules.get("content", {})
    content = module.get("content", "")
    if content_rules.get("required") and not content:
        errors.append("Content is required")
        status = ValidationStatus.RED
    if (
        content
        and content_rules.get("minLength")
        and len(content) < int(content_rules["minLength"])
    ):
        errors.append("Content below minimum length")
        status = ValidationStatus.RED
    if (
        content
        and content_rules.get("maxLength")
        and len(content) > int(content_rules["maxLength"])
    ):
        errors.append("Content exceeds maximum length")
        status = ValidationStatus.RED

    ste_rules = rules.get("ste", {})
    ste_score = float(module.get("ste_score", 0))
    if ste_score < float(ste_rules.get("minScore", 0)):
        status = ValidationStatus.RED
    elif (
        ste_score < float(ste_rules.get("warnBelowScore", 0))
        and status == ValidationStatus.GREEN
    ):
        status = ValidationStatus.AMBER

    security_rules = rules.get("security", {})
    sec_level = module.get("security_level")
    allowed = security_rules.get("allowedClassifications")
    if allowed and sec_level and sec_level not in allowed:
        errors.append("Security classification not allowed")
        status = ValidationStatus.RED

    brex_valid = len(errors) == 0

    xsd_valid = False
    try:
        dm_obj = DataModule(**module)
        xml_str = document_service.render_data_module_xml(dm_obj)
        xsd_valid = document_service.validate_xml(xml_str)
        if not xsd_valid:
            errors.append("XSD validation failed")
            status = ValidationStatus.RED

        # Apply XML BREX rules
        violations = apply_brex_rules(xml_str, S1000D_BREX_RULES)
        if violations:
            errors.extend(violations)
            status = ValidationStatus.RED
            brex_valid = False
    except Exception as exc:  # pragma: no cover - best effort
        errors.append(f"XSD validation error: {exc}")
        status = ValidationStatus.RED
        xsd_valid = False

    return status, errors, brex_valid, xsd_valid


async def async_validate_module_dict(
    module: Dict[str, Any], rules: Dict[str, Any]
) -> Tuple[ValidationStatus, List[str], bool, bool]:
    """Async wrapper that also checks references and performs AI review."""
    status, errors, brex_valid, xsd_valid = validate_module_dict(module, rules)

    if document_service.db is not None and rules.get("references", {}).get(
        "validateDMRefs"
    ):
        for ref in module.get("dm_refs", []):
            exists = await document_service.db.data_modules.find_one({"dmc": ref})
            if not exists and not rules["references"].get("allowBrokenRefs", False):
                errors.append(f"Broken data module reference: {ref}")
                status = ValidationStatus.RED

    if document_service.db is not None and rules.get("references", {}).get(
        "validateICNRefs"
    ):
        for ref in module.get("icn_refs", []):
            exists = await document_service.db.icns.find_one({"lcn": ref})
            if not exists and not rules["references"].get("allowBrokenRefs", False):
                errors.append(f"Broken ICN reference: {ref}")
                status = ValidationStatus.RED

    review = await document_service.review_module_ai(module.get("content", ""))
    issues = review.get("issues", [])
    if issues:
        errors.extend([f"AI: {i}" for i in issues])
        if status == ValidationStatus.GREEN:
            status = ValidationStatus.AMBER

    brex_valid = status != ValidationStatus.RED and brex_valid
    return status, errors, brex_valid, xsd_valid


# API Endpoints


@app.get("/api/")
async def root():
    """Root endpoint."""
    return {"message": "Aquila S1000D-AI API", "version": "1.0.0"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    provider_config = ProviderFactory.validate_provider_config()
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "providers": provider_config,
    }


# Settings endpoints
@api_router.get("/settings")
async def get_settings():
    """Get current system settings."""
    doc = await db.settings.find_one({})
    if not doc:
        raise HTTPException(500, "Settings not initialized")
    return SettingsModel(**doc).dict()


@api_router.get("/brex-default")
async def get_default_brex_rules():
    """Return the built-in default BREX rules."""
    return DEFAULT_BREX_RULES


@api_router.get("/brex-xml-rules")
async def get_xml_brex_rules():
    """Return the loaded XML BREX rules."""
    return ALL_BREX_RULES


@api_router.post("/brex-xml-rules")
async def set_xml_brex_rules(payload: Dict[str, Any]):
    """Set the active XML BREX rules by id list."""
    global S1000D_BREX_RULES
    ids = payload.get("enabled_ids") or []
    if not ids:
        S1000D_BREX_RULES = ALL_BREX_RULES.copy()
    else:
        S1000D_BREX_RULES = [r for r in ALL_BREX_RULES if r.get("id") in ids]
    return {"count": len(S1000D_BREX_RULES)}


@api_router.post("/settings")
async def update_settings(settings: Dict[str, Any]):
    """Partially update system settings."""
    global system_settings

    current_doc = await db.settings.find_one({})
    if current_doc:
        current = SettingsModel(**current_doc).dict()
    else:
        current = SettingsModel(brex_rules=DEFAULT_BREX_RULES).dict()
    current.update(settings)
    system_settings = SettingsModel(**current)
    if current_doc:
        await db.settings.update_one(
            {"id": current_doc["id"]}, {"$set": system_settings.dict()}
        )
    else:
        await db.settings.insert_one(system_settings.dict())

    # Update environment variables if provider values changed
    if "text_provider" in settings:
        os.environ["TEXT_PROVIDER"] = system_settings.text_provider.value
    if "vision_provider" in settings:
        os.environ["VISION_PROVIDER"] = system_settings.vision_provider.value
    if "text_model" in settings:
        os.environ["TEXT_MODEL"] = system_settings.text_model
    if "vision_model" in settings:
        os.environ["VISION_MODEL"] = system_settings.vision_model

    # Update document service settings
    document_service.settings = system_settings

    return {
        "message": "Settings updated successfully",
        "settings": system_settings.dict(),
    }


# AI Provider endpoints
@api_router.get("/providers")
async def get_providers():
    """Get available AI providers and their status."""
    return {
        "available": ProviderFactory.get_available_providers(),
        "current": {
            "text": os.environ.get("TEXT_PROVIDER", "openai"),
            "vision": os.environ.get("VISION_PROVIDER", "openai"),
            "text_model": os.environ.get("TEXT_MODEL", ""),
            "vision_model": os.environ.get("VISION_MODEL", ""),
        },
        "config": ProviderFactory.validate_provider_config(),
    }


@api_router.post("/providers/set")
async def set_providers(
    text_provider: str,
    vision_provider: str,
    text_model: str | None = None,
    vision_model: str | None = None,
    _: User = Depends(require_admin),
):
    """Set AI providers."""
    try:
        # Validate providers
        available = ProviderFactory.get_available_providers()
        if text_provider not in available["text"]:
            raise HTTPException(400, f"Invalid text provider: {text_provider}")
        if vision_provider not in available["vision"]:
            raise HTTPException(400, f"Invalid vision provider: {vision_provider}")

        # Update environment
        os.environ["TEXT_PROVIDER"] = text_provider
        os.environ["VISION_PROVIDER"] = vision_provider
        if text_model is not None:
            os.environ["TEXT_MODEL"] = text_model
            system_settings.text_model = text_model
        if vision_model is not None:
            os.environ["VISION_MODEL"] = vision_model
            system_settings.vision_model = vision_model

        # Update system settings
        system_settings.text_provider = ProviderEnum(text_provider)
        system_settings.vision_provider = ProviderEnum(vision_provider)
        await db.settings.update_one(
            {"id": system_settings.id}, {"$set": system_settings.dict()}
        )

        return {
            "message": "Providers updated successfully",
            "text_provider": text_provider,
            "vision_provider": vision_provider,
            "text_model": os.environ.get("TEXT_MODEL", ""),
            "vision_model": os.environ.get("VISION_MODEL", ""),
        }
    except Exception as e:
        raise HTTPException(500, f"Error updating providers: {str(e)}")


# Document upload endpoints
@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    security_level: SecurityLevel = Form(SecurityLevel.UNCLASSIFIED),
):
    """Upload a document for processing."""
    try:
        # Read file data
        file_data = await file.read()

        # Upload document
        document = await document_service.upload_document(
            file_data=file_data,
            filename=file.filename,
            mime_type=file.content_type,
            security_level=security_level,
        )

        # Store in database
        await db.documents.insert_one(document.dict())

        return {
            "message": "Document uploaded successfully",
            "document_id": document.id,
            "filename": document.filename,
            "size": document.file_size,
        }
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(500, f"Error uploading document: {str(e)}")


@api_router.get("/documents")
async def get_documents():
    """Get all uploaded documents."""
    try:
        documents = await db.documents.find().to_list(1000)
        return [UploadedDocument(**doc) for doc in documents]
    except Exception as e:
        logger.error(f"Error fetching documents: {str(e)}")
        raise HTTPException(500, f"Error fetching documents: {str(e)}")


@api_router.get("/documents/{document_id}")
async def get_document(document_id: str):
    """Get a specific document."""
    try:
        document = await db.documents.find_one({"id": document_id})
        if not document:
            raise HTTPException(404, "Document not found")
        return UploadedDocument(**document)
    except Exception as e:
        logger.error(f"Error fetching document: {str(e)}")
        raise HTTPException(500, f"Error fetching document: {str(e)}")


@api_router.post("/documents/{document_id}/process")
async def process_document(document_id: str, current_user: User = Depends(get_current_active_user)):
    """Process a document to create data modules."""
    try:
        # Get document
        doc_data = await db.documents.find_one({"id": document_id})
        if not doc_data:
            raise HTTPException(404, "Document not found")

        document = UploadedDocument(**doc_data)

        # Extract text content
        text_content = await document_service.extract_text_from_document(document)

        # Extract images
        images = await document_service.extract_images_from_document(document)

        # Process images with AI
        processed_images = []
        for image in images:
            processed_image = await document_service.process_image_with_ai(image)
            processed_images.append(processed_image)
            # Store ICN in database
            await db.icns.insert_one(processed_image.dict())

        # Process document with AI
        data_modules = await document_service.process_document_with_ai(
            document, text_content
        )

        # Store data modules in database
        stored_modules = []
        for dm in data_modules:
            entry = {"action": "create", "dmc": dm.dmc, "source_file": document.filename, "user": current_user.username, "author": "ai"}
            dm.audit_log.append(entry)
            await db.data_modules.insert_one(dm.dict())
            stored_modules.append(dm)
            await document_service.audit_service.log(entry)

        await document_service.refresh_cross_references()

        # Update document status
        await db.documents.update_one(
            {"id": document_id},
            {
                "$set": {
                    "processing_status": "completed",
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        return {
            "message": "Document processed successfully",
            "document_id": document_id,
            "data_modules": len(stored_modules),
            "images": len(processed_images),
            "modules": [dm.dict() for dm in stored_modules],
        }
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        raise HTTPException(500, f"Error processing document: {str(e)}")


# Data Module endpoints
@api_router.get("/data-modules")
async def get_data_modules():
    """Get all data modules."""
    try:
        modules = await db.data_modules.find().to_list(1000)
        return [DataModule(**module) for module in modules]
    except Exception as e:
        logger.error(f"Error fetching data modules: {str(e)}")
        raise HTTPException(500, f"Error fetching data modules: {str(e)}")


@api_router.get("/data-modules/{dmc}")
async def get_data_module(dmc: str):
    """Get a specific data module."""
    try:
        module = await db.data_modules.find_one({"dmc": dmc})
        if not module:
            raise HTTPException(404, "Data module not found")
        return DataModule(**module)
    except Exception as e:
        logger.error(f"Error fetching data module: {str(e)}")
        raise HTTPException(500, f"Error fetching data module: {str(e)}")


@api_router.get("/data-modules/{dmc}/export")
async def export_data_module(dmc: str, format: str = "xml"):
    """Export a data module."""
    try:
        module_data = await db.data_modules.find_one({"dmc": dmc})
        if not module_data:
            raise HTTPException(404, "Data module not found")
        module = DataModule(**module_data)
        if format == "xml":
            xml_str = document_service.render_data_module_xml(module)
            return StreamingResponse(
                io.BytesIO(xml_str.encode("utf-8")), media_type="application/xml"
            )
        else:
            raise HTTPException(400, "Unsupported format")
    except Exception as e:
        logger.error(f"Error exporting data module: {str(e)}")
        raise HTTPException(500, f"Error exporting data module: {str(e)}")


@api_router.put("/data-modules/{dmc}")
async def update_data_module(dmc: str, module_data: Dict[str, Any], current_user: User = Depends(get_current_active_user)):
    """Update a data module."""
    try:
        # Update module in database
        result = await db.data_modules.update_one(
            {"dmc": dmc}, {"$set": {**module_data, "updated_at": datetime.utcnow()}}
        )

        if result.matched_count == 0:
            raise HTTPException(404, "Data module not found")
        entry = {"action": "update", "dmc": dmc, "user": current_user.username, "changes": module_data}
        await db.data_modules.update_one({"dmc": dmc}, {"$push": {"audit_log": entry}})
        await document_service.audit_service.log(entry)

        return {"message": "Data module updated successfully"}
    except Exception as e:
        logger.error(f"Error updating data module: {str(e)}")
        raise HTTPException(500, f"Error updating data module: {str(e)}")


@api_router.delete("/data-modules/{dmc}")
async def delete_data_module(dmc: str):
    """Delete a data module."""
    try:
        result = await db.data_modules.delete_one({"dmc": dmc})
        if result.deleted_count == 0:
            raise HTTPException(404, "Data module not found")
        return {"message": "Data module deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting data module: {str(e)}")
        raise HTTPException(500, f"Error deleting data module: {str(e)}")


# ICN endpoints
@api_router.get("/icns")
async def get_icns():
    """Get all ICNs."""
    try:
        icns = await db.icns.find().to_list(1000)
        return [ICN(**icn) for icn in icns]
    except Exception as e:
        logger.error(f"Error fetching ICNs: {str(e)}")
        raise HTTPException(500, f"Error fetching ICNs: {str(e)}")


@api_router.get("/icns/{icn_id}")
async def get_icn(icn_id: str):
    """Get a specific ICN."""
    try:
        icn = await db.icns.find_one({"icn_id": icn_id})
        if not icn:
            raise HTTPException(404, "ICN not found")
        return ICN(**icn)
    except Exception as e:
        logger.error(f"Error fetching ICN: {str(e)}")
        raise HTTPException(500, f"Error fetching ICN: {str(e)}")


@api_router.get("/icns/{icn_id}/image")
async def get_icn_image(icn_id: str):
    """Get ICN image file."""
    try:
        icn = await db.icns.find_one({"icn_id": icn_id})
        if not icn:
            raise HTTPException(404, "ICN not found")

        icn_obj = ICN(**icn)
        return FileResponse(
            icn_obj.file_path, media_type=icn_obj.mime_type, filename=icn_obj.filename
        )
    except Exception as e:
        logger.error(f"Error fetching ICN image: {str(e)}")
        raise HTTPException(500, f"Error fetching ICN image: {str(e)}")


@api_router.put("/icns/{icn_id}")
async def update_icn(icn_id: str, icn_data: Dict[str, Any]):
    """Update an ICN and propagate changes to referencing data modules."""
    try:
        icn = await db.icns.find_one({"icn_id": icn_id})
        if not icn:
            raise HTTPException(404, "ICN not found")

        lcn = icn.get("lcn")

        result = await db.icns.update_one(
            {"icn_id": icn_id}, {"$set": {**icn_data, "updated_at": datetime.utcnow()}}
        )

        if result.matched_count == 0:
            raise HTTPException(404, "ICN not found")

        if lcn:
            await db.data_modules.update_many(
                {"icn_refs": lcn}, {"$set": {"updated_at": datetime.utcnow()}}
            )

        await document_service.refresh_cross_references()

        return {"message": "ICN updated successfully"}
    except Exception as e:
        logger.error(f"Error updating ICN: {str(e)}")
        raise HTTPException(500, f"Error updating ICN: {str(e)}")


# Validation endpoints
@api_router.post("/validate/{dmc}")
async def validate_data_module(dmc: str):
    """Validate a data module using BREX rules."""
    try:
        module = await db.data_modules.find_one({"dmc": dmc})
        if not module:
            raise HTTPException(404, "Data module not found")

        settings_doc = await db.settings.find_one({})
        if settings_doc and "brex_rules" in settings_doc:
            rules = SettingsModel(**settings_doc).brex_rules
        else:
            rules = DEFAULT_BREX_RULES
        (
            validation_status,
            validation_errors,
            brex_valid,
            xml_valid,
        ) = await async_validate_module_dict(module, rules)

        # Update module validation status
        await db.data_modules.update_one(
            {"dmc": dmc},
            {
                "$set": {
                    "validation_status": validation_status.value,
                    "validation_errors": validation_errors,
                    "xsd_valid": xml_valid,
                    "brex_valid": brex_valid,
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        return {
            "dmc": dmc,
            "status": validation_status.value,
            "errors": validation_errors,
            "xsd_valid": xml_valid,
            "brex_valid": brex_valid,
        }
    except Exception as e:
        logger.error(f"Error validating data module: {str(e)}")
        raise HTTPException(500, f"Error validating data module: {str(e)}")


@api_router.post("/fix-module/{dmc}")
async def fix_data_module(dmc: str, method: str = "ai"):
    """Attempt correction of a data module."""
    try:
        module = await db.data_modules.find_one({"dmc": dmc})
        if not module:
            raise HTTPException(404, "Data module not found")

        dm = DataModule(**module)
        if method == "ai":
            review = await document_service.review_module_ai(dm.content)
            suggested = review.get("suggested_text")
            issues = review.get("issues", [])
            if suggested:
                dm.content = suggested
            dm.ai_suggestions = review
            dm.processing_logs.append({"fix": "ai", "issues": issues, "timestamp": datetime.utcnow()})
        elif method == "manual":
            dm.processing_logs.append({"fix": "manual", "timestamp": datetime.utcnow()})
        await db.data_modules.update_one({"dmc": dmc}, {"$set": dm.dict()})
        await document_service.refresh_cross_references()
        return {"message": "Data module updated", "dmc": dmc}
    except Exception as e:
        logger.error(f"Error fixing data module: {str(e)}")
        raise HTTPException(500, f"Error fixing data module: {str(e)}")


# Publication Module endpoints
@api_router.get("/publication-modules")
async def get_publication_modules():
    """Get all publication modules."""
    try:
        pms = await db.publication_modules.find().to_list(1000)
        return [PublicationModule(**pm) for pm in pms]
    except Exception as e:
        logger.error(f"Error fetching publication modules: {str(e)}")
        raise HTTPException(500, f"Error fetching publication modules: {str(e)}")


@api_router.post("/publication-modules")
async def create_publication_module(pm_data: Dict[str, Any]):
    """Create a new publication module."""
    try:
        pm = PublicationModule(**pm_data)
        await db.publication_modules.insert_one(pm.dict())
        return {
            "message": "Publication module created successfully",
            "pm_code": pm.pm_code,
        }
    except Exception as e:
        logger.error(f"Error creating publication module: {str(e)}")
        raise HTTPException(500, f"Error creating publication module: {str(e)}")


@api_router.get("/publication-modules/{pm_code}")
async def get_publication_module(pm_code: str):
    """Get a specific publication module."""
    try:
        pm = await db.publication_modules.find_one({"pm_code": pm_code})
        if not pm:
            raise HTTPException(404, "Publication module not found")
        return PublicationModule(**pm)
    except Exception as e:
        logger.error(f"Error fetching publication module: {str(e)}")
        raise HTTPException(500, f"Error fetching publication module: {str(e)}")


@api_router.post("/publication-modules/{pm_code}/publish")
async def publish_publication_module(
    pm_code: str,
    publish_options: Dict[str, Any],
    _: User = Depends(require_admin),
):
    """Publish a publication module."""
    try:
        pm = await db.publication_modules.find_one({"pm_code": pm_code})
        if not pm:
            raise HTTPException(404, "Publication module not found")

        pm_obj = PublicationModule(**pm)
        formats = publish_options.get("formats", ["xml"])
        variants = publish_options.get("variants", ["verbatim"])
        publish_result = await document_service.publish_publication_module(
            pm_obj, db, formats=formats, variants=variants
        )
        package_path = publish_result["package"]
        errors = publish_result.get("errors", [])
        return {
            "message": "Publication module published successfully",
            "pm_code": pm_code,
            "package": str(package_path),
            "errors": errors,
            "formats": formats,
            "variants": variants,
        }
    except Exception as e:
        logger.error(f"Error publishing publication module: {str(e)}")
        raise HTTPException(500, f"Error publishing publication module: {str(e)}")


# Test endpoints for AI providers
@api_router.post("/test/text")
async def test_text_provider(text: str, task_type: str = "classify"):
    """Test text provider."""
    try:
        from .ai_providers.base import TextProcessingRequest

        text_provider = ProviderFactory.create_text_provider()
        request = TextProcessingRequest(text=text, task_type=task_type)

        if task_type == "classify":
            response = await text_provider.classify_document(request)
        elif task_type == "extract":
            response = await text_provider.extract_structured_data(request)
        elif task_type == "rewrite":
            response = await text_provider.rewrite_to_ste(request)
        else:
            raise HTTPException(400, "Invalid task type")

        return response.dict()
    except Exception as e:
        logger.error(f"Error testing text provider: {str(e)}")
        raise HTTPException(500, f"Error testing text provider: {str(e)}")


@api_router.post("/test/vision")
async def test_vision_provider(image_data: str, task_type: str = "caption"):
    """Test vision provider."""
    try:
        from .ai_providers.base import VisionProcessingRequest

        vision_provider = ProviderFactory.create_vision_provider()
        request = VisionProcessingRequest(image_data=image_data, task_type=task_type)

        if task_type == "caption":
            response = await vision_provider.generate_caption(request)
        elif task_type == "objects":
            response = await vision_provider.detect_objects(request)
        elif task_type == "hotspots":
            response = await vision_provider.generate_hotspots(request)
        else:
            raise HTTPException(400, "Invalid task type")

        return response.dict()
    except Exception as e:
        logger.error(f"Error testing vision provider: {str(e)}")
        raise HTTPException(500, f"Error testing vision provider: {str(e)}")


# Include the router in the main app
app.include_router(auth_router)
app.include_router(api_router)


# Shutdown event
@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown."""
    client.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
