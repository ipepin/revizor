from __future__ import annotations

from seed_catalog_component_items import main as seed_component_items
from seed_catalogs import main as seed_legacy_catalogs


def main() -> None:
    seed_legacy_catalogs()
    seed_component_items()


if __name__ == "__main__":
    main()
