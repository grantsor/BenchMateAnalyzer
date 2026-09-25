from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.models import Configuration, Project

class ProjectService:
    @staticmethod
    async def create_project(session: AsyncSession, data: dict) -> Project:
        project = Project(
            name=data["name"],
            product_name=data.get("product_name"),
            product_category=data.get("product_category"),
            cpu=data.get("cpu"),
            gpu=data.get("gpu"),
            motherboard=data.get("motherboard"),
            ram=data.get("ram"),
            storage=data.get("storage"),
            os=data.get("os"),
            bios_version=data.get("bios_version"),
            driver_version=data.get("driver_version"),
            reviewer=data.get("reviewer"),
            notes=data.get("notes"),
            root_folder_path=data.get("root_folder_path")
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)
        return project

    @staticmethod
    async def get_projects(session: AsyncSession) -> List[Project]:
        stmt = select(Project).options(
            selectinload(Project.configurations),
            selectinload(Project.results)
        ).order_by(Project.created_at.desc())
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_project(session: AsyncSession, project_id: str) -> Optional[Project]:
        stmt = select(Project).options(
            selectinload(Project.configurations).selectinload(Configuration.source_images),
            selectinload(Project.results)
        ).where(Project.id == project_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_project(session: AsyncSession, project_id: str, data: dict) -> Optional[Project]:
        project = await ProjectService.get_project(session, project_id)
        if not project:
            return None

        for k, v in data.items():
            if hasattr(project, k):
                setattr(project, k, v)

        await session.commit()
        await session.refresh(project)
        return project

    @staticmethod
    async def delete_project(session: AsyncSession, project_id: str) -> bool:
        from sqlalchemy import delete
        from app.db.models import Configuration, Result, ResultMetric, SourceImage, SavedChart

        project = await ProjectService.get_project(session, project_id)
        if not project:
            return False

        # Explicitly clean up children to guarantee complete cleanup in SQLite
        stmt_c = select(Configuration.id).where(Configuration.project_id == project_id)
        config_ids = (await session.execute(stmt_c)).scalars().all()

        stmt_r = select(Result.id).where(Result.project_id == project_id)
        result_ids = (await session.execute(stmt_r)).scalars().all()

        if result_ids:
            await session.execute(delete(ResultMetric).where(ResultMetric.result_id.in_(result_ids)))
            await session.execute(delete(Result).where(Result.project_id == project_id))

        if config_ids:
            await session.execute(delete(SourceImage).where(SourceImage.configuration_id.in_(config_ids)))
            await session.execute(delete(Configuration).where(Configuration.project_id == project_id))

        await session.execute(delete(SavedChart).where(SavedChart.project_id == project_id))
        await session.delete(project)
        await session.commit()
        return True

    @staticmethod
    async def update_configuration(
        session: AsyncSession,
        config_id: str,
        display_name: str,
        sort_order: Optional[int] = None
    ) -> Optional[Configuration]:
        stmt = select(Configuration).where(Configuration.id == config_id)
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()
        if not cfg:
            return None

        cfg.display_name = display_name
        if sort_order is not None:
            cfg.sort_order = sort_order

        await session.commit()
        await session.refresh(cfg)
        return cfg
