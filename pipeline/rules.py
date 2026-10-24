"""Turn raw LDEQ mercury rows into fish-tissue samples.

Averaging rules follow Louisiana's fish advisory protocol (LDH/LDEQ/LDWF 2012, Table 1).
"""
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime

PPM_UNITS = {"ppm", "ug/g", "mg/kg"}
VALID_BASINS = {f"{n:02d}" for n in range(1, 13)}
# The app is about fish; these tissue samples are shellfish.
SHELLFISH = {"BLUE CRAB", "EASTERN OYSTER", "WHITE SHRIMP", "RED SWAMP CRAWFISH", "CRAWFISH FAT"}


@dataclass(frozen=True)
class Sample:
    site: str
    species: str
    date: date
    value: float | None  # None for a non-detect, before substitution
    is_nd: bool
    rl: float | None  # reporting limit, for non-detects
    weight_g: float | None
    length_cm: float | None
    n_fish: int | None
    composite: bool


def _positive(v):
    return v if v is not None and v > 0 else None


def _is_u(row):
    return row.get("LAB_FIELD_QUALIFIER") == "U" or row.get("INTERPRETED_QUALIFIER") == "U"


def parse_samples(rows):
    samples, skipped = [], Counter()
    for r in rows:
        if r.get("PARAMETER") != "MERCURY" or r.get("MATRIX") != "TE":
            skipped["not_tissue_mercury"] += 1
            continue
        if r.get("VALIDATION_QUALIFIER") == "R":
            skipped["rejected"] += 1
            continue
        if not r.get("TAXA_COMMON_NAME"):
            skipped["no_species"] += 1
            continue
        if r["TAXA_COMMON_NAME"] in SHELLFISH:
            skipped["shellfish"] += 1
            continue
        if (r.get("UNITS") or "").lower() not in PPM_UNITS:
            skipped["unit"] += 1
            continue
        result = r.get("RESULT")
        if _is_u(r):
            is_nd, value = True, None
            rl = result if result is not None else (
                _positive(r.get("PRACTICAL_QUANTITATION_LIMIT")) or _positive(r.get("MDL")))
        elif result is None:
            skipped["null_no_qualifier"] += 1
            continue
        else:
            is_nd, value, rl = False, float(result), None
        n_fish = r.get("NUMBER_OF_FISH")
        samples.append(Sample(
            site=r["SITE"],
            species=r["TAXA_COMMON_NAME"],
            date=datetime.fromisoformat(r["COLLECTION_DATE"]).date(),
            value=value,
            is_nd=is_nd,
            rl=rl,
            weight_g=r.get("AVERAGE_FISH_WEIGHT"),
            length_cm=r.get("AVERAGE_FISH_LENGTH"),
            n_fish=int(n_fish) if n_fish is not None else None,
            composite=r.get("NUMBEROFFISH") == "Composite",
        ))
    return samples, skipped


def substitute_nondetects(samples):
    """Values for one site+species group: non-detects are 0, or RL/2 when more than half are detects."""
    detects = sum(not s.is_nd for s in samples)
    half_rl = detects * 2 > len(samples)
    return [
        s.value if not s.is_nd else (s.rl / 2 if half_rl and s.rl else 0.0)
        for s in samples
    ]


def basin_code(subsegment):
    if not subsegment or len(subsegment) < 4:
        return None
    code = subsegment[2:4]
    return code if code in VALID_BASINS else None
