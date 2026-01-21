# routers/inspection_templates.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Literal

from database import get_db
from models import (
    InspectionTemplate as InspectionTemplateModel,
    InspectionTemplateScope,
    User as UserModel,
)
from schemas import InspectionTemplateCreate, InspectionTemplateUpdate, InspectionTemplateRead

try:
    from routers.auth import get_current_user
except Exception:  # fallback
    from auth import get_current_user  # type: ignore

router = APIRouter(prefix="/inspection-templates", tags=["inspection-templates"])

DEFAULT_TEMPLATES = [
    (
        "EI",
        "Byt",
        "Byt o velikosti 3+1 se nachází v prvním patře bytového domu. Elektroinstalace je napájena z elektroměrového rozvaděče umístěného v technické místnosti v přízemí. Připojení je realizováno kabelem CYKY 5x6 mm². V bytě je instalována bytová rozvodnice, ze které jsou napájeny zásuvkové i světelné okruhy. Koupelna je vybavena doplňkovým pospojováním, osvětlení je řešeno LED svítidly. Veškeré obvody jsou jištěny proudovými chrániči s vybavovacím proudem 30 mA.",
    ),
    (
        "EI",
        "Rodinný dům",
        "Rodinný dům má dvě nadzemní podlaží a je napájen z hlavního domovního rozvaděče, který je umístěn na fasádě objektu. Vnitřní elektroinstalace je vedena kabely CYKY v PVC chráničkách. V každém podlaží je podružná rozvodnice. Jištění obvodů zajišťují jističe a proudové chrániče. Hromosvod je instalován dle ČSN EN 62305.",
    ),
    (
        "EI",
        "FVE",
        "Fotovoltaická elektrárna je instalována na střeše objektu a připojena k distribuční síti pomocí střídače. DC strana je vedena kabely s dvojitou izolací, přepěťové ochrany jsou instalovány na DC i AC straně. Střídač je uzemněn, výkon systému je 5 kWp. Elektrická schémata a dokumentace byly dodány.",
    ),
    (
        "EI",
        "Wallbox",
        "Nabíjecí stanice pro elektromobil je instalována na vnější zdi garáže a připojena k hlavnímu rozvaděči samostatným kabelem CYKY 5x10 mm². Jištění je provedeno proudovým chráničem typu B. Stanice je osazena přepěťovou ochranou a byla provedena zkouška funkce a komunikace s vozidlem.",
    ),
    (
        "EI",
        "Společné prostory",
        "Společné prostory v bytovém domě zahrnují chodby, sklepy a technické místnosti. Osvětlení je řešeno pomocí LED svítidel s časovým spínačem. Rozvodnice jsou označeny, kryty svorek jsou zajištěny. Veškerá kovová zařízení jsou připojena na pospojování. Revize se týkala funkčnosti, označení a mechanického stavu instalace.",
    ),
    (
        "EI",
        "Odběrné místo",
        "Odběrné místo se nachází na veřejně přístupném místě a je osazeno elektroměrovým rozvaděčem v plastovém provedení s třídou krytí IP44. Vnitřní propoje byly zkontrolovány, hromadné dálkové ovládání je funkční. Hlavní jistič odpovídá velikosti rezervovaného příkonu.",
    ),
    (
        "EI",
        "Nebytové prostory",
        "Nebytové prostory jsou určeny ke komerčnímu využití a elektroinstalace odpovídá provozním nárokům. V místnostech jsou zásuvkové a světelné obvody, připojení klimatizace a elektrospotřebičů. Provedeno kontrolní měření izolačního odporu, propojení pospojování a zajištění označení rozvaděčů.",
    ),
]


def _seed_defaults_for_user(db: Session, user: UserModel, scope: str) -> None:
    defaults = (
        db.query(InspectionTemplateModel)
        .filter(
            InspectionTemplateModel.scope == InspectionTemplateScope(scope),
            InspectionTemplateModel.user_id == None,  # noqa: E711
            InspectionTemplateModel.is_default == True,  # noqa: E712
        )
        .all()
    )

    if not defaults:
        defaults = [
            InspectionTemplateModel(
                scope=InspectionTemplateScope(s),
                label=label,
                body=body,
                user_id=None,
                is_default=True,
            )
            for s, label, body in DEFAULT_TEMPLATES
            if s == scope
        ]
        db.add_all(defaults)
        db.commit()

    clones = [
        InspectionTemplateModel(
            scope=InspectionTemplateScope(scope),
            label=d.label,
            body=d.body,
            user_id=user.id,
            is_default=False,
        )
        for d in defaults
    ]
    db.add_all(clones)
    db.commit()


def _ensure_access(user: UserModel, template: InspectionTemplateModel) -> None:
    is_owner = template.user_id == user.id if template.user_id is not None else False
    is_admin = bool(getattr(user, "is_admin", False))
    if template.user_id is None:
        if not is_admin:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Pouze administrator muze upravit vychozi sablonu.")
    else:
        if not (is_owner or is_admin):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Nemate opravneni k uprave sablony.")


@router.get("", response_model=list[InspectionTemplateRead])
def list_templates(
    scope: Literal["EI", "LPS"] = Query("EI", description="Scope sablon"),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    q = db.query(InspectionTemplateModel).filter(
        InspectionTemplateModel.scope == InspectionTemplateScope(scope),
    )
    is_admin = bool(getattr(user, "is_admin", False))
    if is_admin:
        templates = q.order_by(InspectionTemplateModel.is_default.desc(), InspectionTemplateModel.label.asc()).all()
        return templates

    user_templates = q.filter(InspectionTemplateModel.user_id == user.id).order_by(
        InspectionTemplateModel.label.asc()
    ).all()
    if not user_templates:
        _seed_defaults_for_user(db, user, scope)
        user_templates = q.filter(InspectionTemplateModel.user_id == user.id).order_by(
            InspectionTemplateModel.label.asc()
        ).all()
    return user_templates


@router.post("", response_model=InspectionTemplateRead, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: InspectionTemplateCreate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    t = InspectionTemplateModel(
        scope=InspectionTemplateScope(payload.scope),
        label=payload.label.strip(),
        body=payload.body,
        user_id=user.id,
        is_default=False,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/{template_id}", response_model=InspectionTemplateRead)
def update_template(
    template_id: int,
    payload: InspectionTemplateUpdate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    t = db.query(InspectionTemplateModel).get(template_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sablona nenalezena.")
    _ensure_access(user, t)

    if payload.label is not None:
        t.label = payload.label.strip()
    if payload.body is not None:
        t.body = payload.body
    if payload.scope is not None:
        t.scope = InspectionTemplateScope(payload.scope)

    db.commit()
    db.refresh(t)
    return t


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    t = db.query(InspectionTemplateModel).get(template_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sablona nenalezena.")
    _ensure_access(user, t)
    db.delete(t)
    db.commit()
    return None
