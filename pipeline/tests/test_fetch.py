import pytest

from pipeline.fetch import REQUIRED_FIELDS, FetchError, validate_mercury, validate_sites


def tissue_row():
    r = {k: 1 for k in REQUIRED_FIELDS}
    r.update(PARAMETER="MERCURY", MATRIX="TE")
    return r


def test_rejects_non_list_and_empty():
    for bad in ({}, [], None):
        with pytest.raises(FetchError):
            validate_mercury(bad, None)


def test_rejects_missing_fields():
    with pytest.raises(FetchError, match="LAT_WGS84"):
        validate_mercury([{k: 1 for k in REQUIRED_FIELDS - {"LAT_WGS84"}}], None)


def test_rejects_sharp_drop():
    with pytest.raises(FetchError, match="89"):
        validate_mercury([tissue_row()] * 89, 100)
    validate_mercury([tissue_row()] * 90, 100)  # 90% is OK


def test_accepts_without_previous_count():
    validate_mercury([tissue_row()], None)


def test_validate_sites():
    with pytest.raises(FetchError):
        validate_sites([{"name": "x"}])
    with pytest.raises(FetchError):
        validate_sites([])
    validate_sites([{"id": "0001", "address": "a"}])
