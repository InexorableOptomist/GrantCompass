from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.config import settings

engine = create_engine(settings.database_url, connect_args={'check_same_thread': False})


@event.listens_for(engine, 'connect')
def _enable_sqlite_foreign_keys(connection, _record) -> None:
    cursor = connection.cursor()
    cursor.execute('PRAGMA foreign_keys=ON')
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
