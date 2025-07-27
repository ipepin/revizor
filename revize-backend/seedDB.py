import json
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import ComponentType, Manufacturer, ComponentModel

# Create tables if they don't exist
def init_db():
    Base.metadata.create_all(bind=engine)


def seed_catalog(json_path: str = "komponenty.json"):
    """
    Seed the database with component types, manufacturers, and models
    based on the provided JSON file.
    """
    # Initialize DB schema
    init_db()

    # Open a DB session
    session: Session = SessionLocal()

    # Load JSON data
    with open(json_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    for type_name, makers in catalog.items():
        # Create or get ComponentType
        type_obj = session.query(ComponentType).filter_by(name=type_name).first()
        if not type_obj:
            type_obj = ComponentType(name=type_name)
            session.add(type_obj)
            session.commit()
        
        for maker_name, models in makers.items():
            # Create or get Manufacturer
            manu_obj = (
                session.query(Manufacturer)
                .filter_by(name=maker_name, type_id=type_obj.id)
                .first()
            )
            if not manu_obj:
                manu_obj = Manufacturer(name=maker_name, type=type_obj)
                session.add(manu_obj)
                session.commit()

            # Iterate over model names
            for model_name in models:
                # Check if model exists
                model_obj = (
                    session.query(ComponentModel)
                    .filter_by(name=model_name, manufacturer_id=manu_obj.id)
                    .first()
                )
                if not model_obj:
                    model_obj = ComponentModel(name=model_name, manufacturer=manu_obj)
                    session.add(model_obj)
            # Commit all added models for this manufacturer
            session.commit()

    # Close session
    session.close()
    print("Seeding complete.")


if __name__ == '__main__':
    seed_catalog()
