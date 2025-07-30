# scripts/load_components.py
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, ComponentType, Manufacturer, ComponentModel

engine = create_engine("sqlite:///./projects.db")  # nebo vaše URL
Session = sessionmaker(bind=engine)
cd
with open("komponenty.json", encoding="utf-8") as f:
    data = json.load(f)

Base.metadata.create_all(engine)
session = Session()

for type_name, man_dict in data.items():
    # 1) ComponentType
    ct = session.query(ComponentType).filter_by(name=type_name).first()
    if not ct:
        ct = ComponentType(name=type_name)
        session.add(ct)
        session.flush()  # získáme ct.id

    # 2) Manufacturers + Models
    for man_name, models in man_dict.items():
        m = (
            session.query(Manufacturer)
                   .filter_by(name=man_name, type_id=ct.id)
                   .first()
        )
        if not m:
            m = Manufacturer(name=man_name, type=ct)
            session.add(m)
            session.flush()

        for model_name in models:
            exists = (
                session.query(ComponentModel)
                       .filter_by(name=model_name, manufacturer_id=m.id)
                       .first()
            )
            if not exists:
                session.add(ComponentModel(name=model_name, manufacturer=m))

session.commit()
session.close()
