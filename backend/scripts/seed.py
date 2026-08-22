import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select  # noqa: E402

from app.auth.security import hash_password  # noqa: E402
from app.db.session import AsyncSessionLocal  # noqa: E402
from app.events.dispatcher import event_dispatcher  # noqa: E402
from app.events.events import DomainEvent  # noqa: E402
from app.models.base import Base  # noqa: E402
from app.models.book import Book  # noqa: E402
from app.models.lending import Lending  # noqa: E402
from app.models.shelf import Shelf, ShelfBook, ShelfCollaborator  # noqa: E402
from app.models.user import User  # noqa: E402
from app.schemas.book import BookStatusEnum  # noqa: E402
from app.schemas.shelf import ShelfRoleEnum  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_data():
    logger.info("Starting database seeding process...")

    # Determine session factory (PostgreSQL or SQLite fallback)
    try:
        session_factory = AsyncSessionLocal
        async with session_factory() as test_sess:
            await test_sess.execute(select(1))
    except Exception:
        logger.info("PostgreSQL unavailable, initializing local SQLite seed database at ./app.db")
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

        engine = create_async_engine("sqlite+aiosqlite:///./app.db", echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        session_factory = async_sessionmaker(
            bind=engine, class_=AsyncSession, expire_on_commit=False
        )

    async with session_factory() as session:
        # Check if already seeded
        res = await session.execute(select(User).where(User.email == "alice@example.com"))

        existing_alice = res.scalar()
        if existing_alice:
            logger.info("Database already seeded with Alice. Skipping seed execution.")
            return

        password_hash = hash_password("Password123!")

        # 1. Create Users
        alice = User(email="alice@example.com", password_hash=password_hash, name="Alice Owner")
        bob = User(email="bob@example.com", password_hash=password_hash, name="Bob Borrower")
        charlie = User(
            email="charlie@example.com", password_hash=password_hash, name="Charlie Viewer"
        )

        session.add_all([alice, bob, charlie])
        await session.flush()

        logger.info(f"Created Users: Alice ({alice.id}), Bob ({bob.id}), Charlie ({charlie.id})")

        # 2. Create Books for Alice
        ddia = Book(
            owner_id=alice.id,
            title="Designing Data-Intensive Applications",
            author="Martin Kleppmann",
            total_pages=560,
            current_page=560,
            status=BookStatusEnum.FINISHED,
            rating=5.0,
            notes="Masterpiece on distributed systems, storage engines, and consensus.",
        )
        clean_arch = Book(
            owner_id=alice.id,
            title="Clean Architecture",
            author="Robert C. Martin",
            total_pages=432,
            current_page=210,
            status=BookStatusEnum.READING,
            rating=4.0,
            notes="Solid software design principles and dependency inversion.",
        )
        pragmatic = Book(
            owner_id=alice.id,
            title="The Pragmatic Programmer",
            author="David Thomas",
            total_pages=352,
            current_page=0,
            status=BookStatusEnum.WANT_TO_READ,
        )
        refactoring = Book(
            owner_id=alice.id,
            title="Refactoring",
            author="Martin Fowler",
            total_pages=448,
            current_page=100,
            status=BookStatusEnum.READING,
            rating=4.5,
        )
        ddd = Book(
            owner_id=alice.id,
            title="Domain-Driven Design",
            author="Eric Evans",
            total_pages=560,
            current_page=560,
            status=BookStatusEnum.FINISHED,
            rating=5.0,
            notes="Ubiquitous language and bounded contexts.",
        )

        # Books for Bob
        sre = Book(
            owner_id=bob.id,
            title="Site Reliability Engineering",
            author="Betsy Beyer",
            total_pages=550,
            current_page=180,
            status=BookStatusEnum.READING,
            rating=4.5,
        )
        microservices = Book(
            owner_id=bob.id,
            title="Building Microservices",
            author="Sam Newman",
            total_pages=280,
            current_page=280,
            status=BookStatusEnum.FINISHED,
            rating=5.0,
        )
        csapp = Book(
            owner_id=bob.id,
            title="Computer Systems: A Programmer's Perspective",
            author="Randal E. Bryant",
            total_pages=1080,
            current_page=0,
            status=BookStatusEnum.WANT_TO_READ,
        )

        session.add_all([ddia, clean_arch, pragmatic, refactoring, ddd, sre, microservices, csapp])
        await session.flush()

        logger.info("Created sample books for Alice and Bob.")

        # 3. Create Shelves
        tech_shelf = Shelf(
            owner_id=alice.id, name="Tech Classics", description="Must-read engineering books"
        )
        sys_shelf = Shelf(
            owner_id=alice.id,
            name="System Design",
            description="Distributed systems & architecture",
        )
        fav_shelf = Shelf(
            owner_id=alice.id, name="Alice's Favorites", description="Top rated personal books"
        )
        devops_shelf = Shelf(
            owner_id=bob.id, name="DevOps Essentials", description="SRE and Cloud Native"
        )

        session.add_all([tech_shelf, sys_shelf, fav_shelf, devops_shelf])
        await session.flush()

        # Add books to shelves
        session.add_all(
            [
                ShelfBook(shelf_id=tech_shelf.id, book_id=ddia.id),
                ShelfBook(shelf_id=tech_shelf.id, book_id=clean_arch.id),
                ShelfBook(shelf_id=tech_shelf.id, book_id=refactoring.id),
                ShelfBook(shelf_id=sys_shelf.id, book_id=ddia.id),
                ShelfBook(shelf_id=sys_shelf.id, book_id=microservices.id),
                ShelfBook(shelf_id=fav_shelf.id, book_id=ddd.id),
                ShelfBook(shelf_id=devops_shelf.id, book_id=sre.id),
                ShelfBook(shelf_id=devops_shelf.id, book_id=microservices.id),
            ]
        )

        # Add Collaborators
        # Tech Classics: Bob (EDITOR), Charlie (VIEWER)
        # System Design: Bob (VIEWER)
        # DevOps Essentials: Alice (EDITOR)
        session.add_all(
            [
                ShelfCollaborator(
                    shelf_id=tech_shelf.id, user_id=bob.id, role=ShelfRoleEnum.EDITOR
                ),
                ShelfCollaborator(
                    shelf_id=tech_shelf.id, user_id=charlie.id, role=ShelfRoleEnum.VIEWER
                ),
                ShelfCollaborator(shelf_id=sys_shelf.id, user_id=bob.id, role=ShelfRoleEnum.VIEWER),
                ShelfCollaborator(
                    shelf_id=devops_shelf.id, user_id=alice.id, role=ShelfRoleEnum.EDITOR
                ),
            ]
        )
        await session.flush()

        logger.info("Created shelves and configured RBAC collaborators.")

        # 4. Create Active Lending: Alice lends "Refactoring" to Bob
        lending = Lending(
            book_id=refactoring.id,
            owner_id=alice.id,
            borrower_id=bob.id,
        )
        session.add(lending)
        await session.flush()

        logger.info(f"Created active lending: Alice lent '{refactoring.title}' to Bob.")

        # 5. Populate Activity Events
        events = [
            DomainEvent(
                event_type="BOOK_ADDED",
                entity_type="book",
                entity_id=ddia.id,
                actor_id=alice.id,
                book_id=ddia.id,
                payload={"title": ddia.title, "author": ddia.author, "status": ddia.status},
            ),
            DomainEvent(
                event_type="SHELF_CREATED",
                entity_type="shelf",
                entity_id=tech_shelf.id,
                actor_id=alice.id,
                shelf_id=tech_shelf.id,
                payload={"name": tech_shelf.name},
            ),
            DomainEvent(
                event_type="SHELF_SHARED",
                entity_type="shelf",
                entity_id=tech_shelf.id,
                actor_id=alice.id,
                target_user_id=bob.id,
                shelf_id=tech_shelf.id,
                payload={
                    "shelf_name": tech_shelf.name,
                    "collaborator_email": bob.email,
                    "collaborator_name": bob.name,
                    "role": "EDITOR",
                },
            ),
            DomainEvent(
                event_type="BOOK_ADDED_TO_SHELF",
                entity_type="shelf",
                entity_id=tech_shelf.id,
                actor_id=alice.id,
                book_id=ddia.id,
                shelf_id=tech_shelf.id,
                payload={"shelf_name": tech_shelf.name, "book_title": ddia.title},
            ),
            DomainEvent(
                event_type="BOOK_LENT",
                entity_type="lending",
                entity_id=lending.id,
                actor_id=alice.id,
                target_user_id=bob.id,
                book_id=refactoring.id,
                payload={
                    "book_title": refactoring.title,
                    "borrower_name": bob.name,
                    "borrower_email": bob.email,
                },
            ),
        ]

        for evt in events:
            await event_dispatcher.publish(session, evt)

        await session.commit()
        logger.info("Successfully committed all seed data and activity events to PostgreSQL!")


if __name__ == "__main__":
    asyncio.run(seed_data())
