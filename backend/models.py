from sqlalchemy import Column, String, Text, JSON, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from db import Base

def gen_uuid():
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    project_id = Column(String(64), nullable=False, index=True)
    # Store snapshot of uploaded CSV as JSON rows and columns meta
    columns = Column(JSON, nullable=True)
    rows = Column(JSON, nullable=True)  # Consider storing in object storage for very large files
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    project_id = Column(String(64), nullable=False, index=True)
    summary = Column(JSON, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProcessingHistory(Base):
    __tablename__ = "processing_history"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    project_id = Column(String(64), nullable=False, index=True)
    steps = Column(JSON, nullable=True)
    result_preview = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
