import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import BrandingProfile, ChartTemplate, SavedChart

router = APIRouter(prefix="/charts", tags=["charts"])

class SaveChartRequest(BaseModel):
    project_id: str
    benchmark_id: str
    name: str
    chart_type: str = "horizontal_bar"
    config: dict
    template_id: Optional[str] = None
    branding_profile_id: Optional[str] = None

class TemplateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    chart_type: str = "horizontal_bar"
    config: dict

class BrandingRequest(BaseModel):
    name: str
    logo_path: Optional[str] = None
    logo_position: str = "top-right"
    logo_width: int = 160
    logo_height: int = 60
    primary_font: str = "Inter"
    secondary_font: str = "Roboto"
    primary_color: str = "#e63946"
    secondary_color: str = "#1d3557"
    background_color: str = "#ffffff"
    decorative_elements: Optional[dict] = None

@router.get("/project/{project_id}")
async def get_project_charts(project_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(SavedChart).where(SavedChart.project_id == project_id)
    charts = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": c.id,
            "project_id": c.project_id,
            "benchmark_id": c.benchmark_id,
            "name": c.name,
            "chart_type": c.chart_type,
            "config": json.loads(c.config_json),
            "updated_at": c.updated_at
        }
        for c in charts
    ]

@router.post("")
async def save_chart(data: SaveChartRequest, db: AsyncSession = Depends(get_db)):
    chart = SavedChart(
        project_id=data.project_id,
        benchmark_id=data.benchmark_id,
        name=data.name,
        chart_type=data.chart_type,
        config_json=json.dumps(data.config),
        template_id=data.template_id,
        branding_profile_id=data.branding_profile_id
    )
    db.add(chart)
    await db.commit()
    await db.refresh(chart)
    return {"id": chart.id, "name": chart.name, "status": "saved"}

@router.get("/templates")
async def get_templates(db: AsyncSession = Depends(get_db)):
    stmt = select(ChartTemplate)
    tmpls = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "chart_type": t.chart_type,
            "config": json.loads(t.config_json)
        }
        for t in tmpls
    ]

@router.post("/templates")
async def create_template(data: TemplateRequest, db: AsyncSession = Depends(get_db)):
    tmpl = ChartTemplate(
        name=data.name,
        description=data.description,
        chart_type=data.chart_type,
        config_json=json.dumps(data.config)
    )
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return {"id": tmpl.id, "name": tmpl.name}

@router.get("/branding")
async def get_branding_profiles(db: AsyncSession = Depends(get_db)):
    stmt = select(BrandingProfile)
    profiles = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "logo_path": p.logo_path,
            "logo_position": p.logo_position,
            "primary_color": p.primary_color,
            "secondary_color": p.secondary_color,
            "background_color": p.background_color,
            "primary_font": p.primary_font
        }
        for p in profiles
    ]

@router.post("/branding")
async def save_branding_profile(data: BrandingRequest, db: AsyncSession = Depends(get_db)):
    p = BrandingProfile(
        name=data.name,
        logo_path=data.logo_path,
        logo_position=data.logo_position,
        logo_width=data.logo_width,
        logo_height=data.logo_height,
        primary_font=data.primary_font,
        secondary_font=data.secondary_font,
        primary_color=data.primary_color,
        secondary_color=data.secondary_color,
        background_color=data.background_color,
        decorative_elements_json=json.dumps(data.decorative_elements) if data.decorative_elements else None
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {"id": p.id, "name": p.name}
