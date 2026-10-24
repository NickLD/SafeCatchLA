"""Turn raw LDEQ mercury rows into fish-tissue samples.

Averaging rules follow Louisiana's fish advisory protocol (LDH/LDEQ/LDWF 2012, Table 1).
"""
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, replace
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
    sample_number: str | None = None
    duplicate: bool = False  # a QC field duplicate: a second analysis of the same fish/composite


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
            sample_number=r.get("SAMPLE_NUMBER"),
            duplicate=r.get("LAB_SAMPLE_TYPE") == "FD",
        ))
    return samples, skipped


def _base_number(sample_number):
    return re.sub(r"-[A-Z]+$", "", sample_number or "")


def _combine(parent, dups):
    group = [parent, *dups]
    detected = [s.value for s in group if not s.is_nd]
    if detected:
        return replace(parent, value=round(sum(detected) / len(detected), 6), is_nd=False, rl=None)
    rls = [s.rl for s in group if s.rl]
    return replace(parent, rl=max(rls) if rls else None)


def merge_field_duplicates(samples):
    """Fold each field duplicate into the sample it duplicates (same site, species, date and fish size),
    so one fish or composite counts once. Detected results are averaged. A duplicate with no parent, or
    an ambiguous one, is kept as its own sample."""
    key = lambda s: (s.site, s.species, s.date, s.length_cm, s.weight_g)
    parents = defaultdict(list)
    for i, s in enumerate(samples):
        if not s.duplicate:
            parents[key(s)].append(i)
    dups_of = defaultdict(list)
    standalone = set()
    for i, s in enumerate(samples):
        if not s.duplicate:
            continue
        candidates = parents[key(s)]
        if len(candidates) > 1:
            candidates = [j for j in candidates if _base_number(samples[j].sample_number) == _base_number(s.sample_number)]
        if len(candidates) == 1:
            dups_of[candidates[0]].append(s)
        else:
            standalone.add(i)
    return [
        _combine(s, dups_of[i]) if dups_of[i] else s
        for i, s in enumerate(samples)
        if not s.duplicate or i in standalone
    ]


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
