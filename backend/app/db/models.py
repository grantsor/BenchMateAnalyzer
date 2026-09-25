import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime
)
from sqlalchemy.orm import relationship, foreign
from app.db.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    product_name = Column(String(255), nullable=True)
    product_category = Column(String(100), nullable=True)
    cpu = Column(String(255), nullable=True)
    gpu = Column(String(255), nullable=True)
    motherboard = Column(String(255), nullable=True)
    ram = Column(String(255), nullable=True)
    storage = Column(String(255), nullable=True)
    os = Column(String(255), nullable=True)
    bios_version = Column(String(100), nullable=True)
    driver_version = Column(String(100), nullable=True)
    reviewer = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    root_folder_path = Column(String(1024), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    configurations = relationship("Configuration", back_populates="project", cascade="all, delete-orphan")
    results = relationship("Result", back_populates="project", cascade="all, delete-orphan")
    saved_charts = relationship("SavedChart", back_populates="project", cascade="all, delete-orphan")


class Configuration(Base):
    __tablename__ = "configurations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    folder_name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="configurations")
    source_images = relationship("SourceImage", back_populates="configuration", cascade="all, delete-orphan")
    results = relationship("Result", back_populates="configuration", cascade="all, delete-orphan")


class Benchmark(Base):
    __tablename__ = "benchmarks"

    id = Column(String(100), primary_key=True)  # e.g. geekbench6, cinebench_r26
    name = Column(String(255), nullable=False)
    version = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    file_patterns_json = Column(Text, nullable=True)  # JSON array of regex/globs
    parser_id = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    metrics = relationship("BenchmarkMetric", back_populates="benchmark", cascade="all, delete-orphan")
    aliases = relationship("BenchmarkAlias", back_populates="benchmark", cascade="all, delete-orphan")
    results = relationship("Result", back_populates="benchmark")


class BenchmarkMetric(Base):
    __tablename__ = "benchmark_metrics"

    id = Column(String(100), primary_key=True)  # e.g. single_core, multi_core
    benchmark_id = Column(String(100), ForeignKey("benchmarks.id", ondelete="CASCADE"), primary_key=True)
    name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    unit = Column(String(50), default="score")
    higher_is_better = Column(Boolean, default=True)
    decimal_places = Column(Integer, default=0)
    range_min = Column(Float, nullable=True)
    range_max = Column(Float, nullable=True)
    sort_order = Column(Integer, default=0)

    benchmark = relationship("Benchmark", back_populates="metrics")
    result_metrics = relationship(
        "ResultMetric",
        primaryjoin="and_(BenchmarkMetric.id==foreign(ResultMetric.metric_id), BenchmarkMetric.benchmark_id==foreign(ResultMetric.benchmark_id))",
        back_populates="metric_definition"
    )


class BenchmarkAlias(Base):
    __tablename__ = "benchmark_aliases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    benchmark_id = Column(String(100), ForeignKey("benchmarks.id", ondelete="CASCADE"), nullable=False)
    alias = Column(String(255), nullable=False, index=True)

    benchmark = relationship("Benchmark", back_populates="aliases")


class SourceImage(Base):
    __tablename__ = "source_images"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    configuration_id = Column(String(36), ForeignKey("configurations.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(1024), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_hash_sha256 = Column(String(64), nullable=False, index=True)
    perceptual_hash = Column(String(64), nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    configuration = relationship("Configuration", back_populates="source_images")
    results = relationship("Result", back_populates="source_image")


class Result(Base):
    __tablename__ = "results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    configuration_id = Column(String(36), ForeignKey("configurations.id", ondelete="CASCADE"), nullable=False)
    benchmark_id = Column(String(100), ForeignKey("benchmarks.id"), nullable=False)
    source_image_id = Column(String(36), ForeignKey("source_images.id"), nullable=True)
    parser_id = Column(String(100), nullable=False)
    parser_version = Column(String(50), default="1.0")
    overall_confidence = Column(Float, default=0.0)
    status = Column(String(50), default="needs_review")  # verified, needs_review, manual_override, ignored
    is_duplicate = Column(Boolean, default=False)
    run_number = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="results")
    configuration = relationship("Configuration", back_populates="results")
    benchmark = relationship("Benchmark", back_populates="results")
    source_image = relationship("SourceImage", back_populates="results")
    metrics = relationship("ResultMetric", back_populates="result", cascade="all, delete-orphan")


class ResultMetric(Base):
    __tablename__ = "result_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    result_id = Column(String(36), ForeignKey("results.id", ondelete="CASCADE"), nullable=False)
    metric_id = Column(String(100), nullable=False)
    benchmark_id = Column(String(100), nullable=False)
    raw_ocr_value = Column(String(255), nullable=True)
    normalized_value = Column(Float, nullable=True)
    confidence = Column(Float, default=0.0)
    ocr_region_json = Column(Text, nullable=True)  # [x, y, w, h] or polygon
    created_at = Column(DateTime, default=datetime.utcnow)

    result = relationship("Result", back_populates="metrics")
    metric_definition = relationship(
        "BenchmarkMetric",
        primaryjoin="and_(ResultMetric.metric_id==BenchmarkMetric.id, ResultMetric.benchmark_id==BenchmarkMetric.benchmark_id)",
        foreign_keys=[metric_id, benchmark_id],
        back_populates="result_metrics"
    )
    manual_overrides = relationship("ManualOverride", back_populates="result_metric", cascade="all, delete-orphan")
    ocr_runs = relationship("OCRRun", back_populates="result_metric", cascade="all, delete-orphan")


class ManualOverride(Base):
    __tablename__ = "manual_overrides"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    result_metric_id = Column(String(36), ForeignKey("result_metrics.id", ondelete="CASCADE"), nullable=False)
    original_value = Column(Float, nullable=True)
    corrected_value = Column(Float, nullable=False)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    result_metric = relationship("ResultMetric", back_populates="manual_overrides")


class OCRRun(Base):
    __tablename__ = "ocr_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    result_metric_id = Column(String(36), ForeignKey("result_metrics.id", ondelete="CASCADE"), nullable=False)
    engine = Column(String(100), default="rapidocr_ppocrv4")
    engine_version = Column(String(50), default="1.2.3")
    raw_text = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    region_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    result_metric = relationship("ResultMetric", back_populates="ocr_runs")


class SavedChart(Base):
    __tablename__ = "saved_charts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    benchmark_id = Column(String(100), ForeignKey("benchmarks.id"), nullable=False)
    name = Column(String(255), nullable=False)
    chart_type = Column(String(50), default="horizontal_bar")
    config_json = Column(Text, nullable=False)  # Complete chart styling, titles, layout
    template_id = Column(String(36), nullable=True)
    branding_profile_id = Column(String(36), ForeignKey("branding_profiles.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="saved_charts")
    benchmark = relationship("Benchmark")
    branding_profile = relationship("BrandingProfile", back_populates="saved_charts")


class BrandingProfile(Base):
    __tablename__ = "branding_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    logo_path = Column(String(1024), nullable=True)
    logo_position = Column(String(50), default="top-right")
    logo_width = Column(Integer, default=160)
    logo_height = Column(Integer, default=60)
    primary_font = Column(String(100), default="Inter")
    secondary_font = Column(String(100), default="Roboto")
    primary_color = Column(String(50), default="#e63946")
    secondary_color = Column(String(50), default="#1d3557")
    background_color = Column(String(50), default="#ffffff")
    decorative_elements_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    saved_charts = relationship("SavedChart", back_populates="branding_profile")


class ChartTemplate(Base):
    __tablename__ = "chart_templates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    chart_type = Column(String(50), default="horizontal_bar")
    config_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class SSDModel(Base):
    __tablename__ = "ssd_models"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_name = Column(String(255), nullable=False, unique=True, index=True)
    brand = Column(String(100), nullable=True)
    capacity = Column(String(50), nullable=True)
    interface = Column(String(100), nullable=True)
    form_factor = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    source_folder = Column(String(512), nullable=True)
    aliases = Column(Text, nullable=True)  # Comma-separated list of historical folder/model aliases
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    scores = relationship("SSDBenchmarkScore", back_populates="ssd_model", cascade="all, delete-orphan")


class SSDBenchmarkScore(Base):
    __tablename__ = "ssd_benchmark_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_id = Column(String(36), ForeignKey("ssd_models.id", ondelete="CASCADE"), nullable=False, index=True)
    benchmark_id = Column(String(100), nullable=False, index=True)  # crystaldiskmark_1gb, as_ssd_1gb, etc.
    metric_id = Column(String(100), nullable=False, index=True)     # seq_read, score, iso_speed, etc.
    value = Column(Float, nullable=False)
    unit = Column(String(50), default="MB/s")
    source_file = Column(String(512), nullable=True)
    is_manual = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ssd_model = relationship("SSDModel", back_populates="scores")
