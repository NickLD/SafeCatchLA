from datetime import date

from pipeline.rules import Sample, basin_code, merge_field_duplicates, parse_samples, substitute_nondetects


def row(**kw):
    base = dict(
        PARAMETER="MERCURY",
        MATRIX="TE",
        RESULT=0.5,
        UNITS="ppm",
        SITE="0001",
        TAXA_COMMON_NAME="LARGEMOUTH BASS",
        COLLECTION_DATE="2010-05-01T00:00:00",
        LAB_FIELD_QUALIFIER=None,
        INTERPRETED_QUALIFIER=None,
        VALIDATION_QUALIFIER=None,
        MDL=None,
        PRACTICAL_QUANTITATION_LIMIT=None,
        SUBSEGMENT_NUMBER="LA050401_00",
        AVERAGE_FISH_WEIGHT=400.0,
        AVERAGE_FISH_LENGTH=30.0,
        NUMBEROFFISH="Composite",
        NUMBER_OF_FISH=5.0,
    )
    base.update(kw)
    return base


def nd(rl):
    return Sample("0001", "X", date(2010, 1, 1), None, True, rl, None, None, None, False)


def det(v):
    return Sample("0001", "X", date(2010, 1, 1), v, False, None, None, None, None, False)


def test_keeps_only_tissue_mercury():
    s, skipped = parse_samples([row(), row(PARAMETER="PH"), row(MATRIX="W")])
    assert len(s) == 1 and skipped["not_tissue_mercury"] == 2


def test_excludes_rejected():
    s, skipped = parse_samples([row(VALIDATION_QUALIFIER="R")])
    assert s == [] and skipped["rejected"] == 1


def test_equivalent_units_and_unknown_unit():
    s, skipped = parse_samples([row(UNITS="ug/g", RESULT=0.4), row(UNITS="mg/kg"), row(UNITS="ug/kg")])
    assert [x.value for x in s] == [0.4, 0.5] and skipped["unit"] == 1


def test_null_result_with_U_is_nondetect_with_fallback_rl():
    [s], _ = parse_samples([row(RESULT=None, LAB_FIELD_QUALIFIER="U", PRACTICAL_QUANTITATION_LIMIT=0.0, MDL=0.001)])
    assert s.is_nd and s.value is None and s.rl == 0.001


def test_numeric_result_with_U_uses_result_as_rl():
    [s], _ = parse_samples([row(RESULT=0.002, INTERPRETED_QUALIFIER="U")])
    assert s.is_nd and s.rl == 0.002


def test_null_without_qualifier_dropped():
    s, skipped = parse_samples([row(RESULT=None)])
    assert s == [] and skipped["null_no_qualifier"] == 1


def test_parses_fish_fields():
    [s], _ = parse_samples([row()])
    assert (s.date.isoformat(), s.weight_g, s.length_cm, s.n_fish, s.composite) == ("2010-05-01", 400.0, 30.0, 5, True)


def test_substitution_more_than_half_detects_uses_half_rl():
    assert substitute_nondetects([det(0.4), det(0.6), nd(0.002)]) == [0.4, 0.6, 0.001]
    assert substitute_nondetects([det(0.4), nd(0.002)]) == [0.4, 0.0]  # exactly half -> zero
    assert substitute_nondetects([det(0.4), nd(0.002), nd(0.002)]) == [0.4, 0.0, 0.0]


def test_all_nondetects_become_zero():
    assert substitute_nondetects([nd(None)]) == [0.0]


def test_basin_code():
    assert basin_code("LA050401_00") == "05"
    assert basin_code("LA120101_00") == "12"
    assert basin_code("LA000000_00") is None
    assert basin_code(None) is None


def test_excludes_shellfish():
    rows = [row(TAXA_COMMON_NAME=t) for t in ("BLUE CRAB", "EASTERN OYSTER", "WHITE SHRIMP", "RED SWAMP CRAWFISH", "CRAWFISH FAT")]
    s, skipped = parse_samples(rows + [row(TAXA_COMMON_NAME="BOWFIN EGGS")])
    assert [x.species for x in s] == ["BOWFIN EGGS"] and skipped["shellfish"] == 5


def test_parses_field_duplicate_flag():
    [s], _ = parse_samples([row(LAB_SAMPLE_TYPE="FD", SAMPLE_NUMBER="354-030615-08-D")])
    assert s.duplicate and s.sample_number == "354-030615-08-D"


def test_field_duplicate_merges_into_its_parent():
    parent = row(RESULT=2.31, LAB_SAMPLE_TYPE="TRG", SAMPLE_NUMBER="354-030615-08-A")
    dup = row(RESULT=2.22, LAB_SAMPLE_TYPE="FD", SAMPLE_NUMBER="354-030615-08-D")
    other = row(RESULT=0.5, AVERAGE_FISH_LENGTH=99.0, SAMPLE_NUMBER="354-030615-09-A")
    samples, _ = parse_samples([parent, dup, other])
    merged = merge_field_duplicates(samples)
    assert [(s.value, s.duplicate) for s in merged] == [(2.265, False), (0.5, False)]


def test_field_duplicate_nondetect_rules():
    parent_nd = row(RESULT=None, LAB_FIELD_QUALIFIER="U", MDL=0.001, SAMPLE_NUMBER="1-A")
    dup_det = row(RESULT=0.2, LAB_SAMPLE_TYPE="FD", SAMPLE_NUMBER="1-D")
    [m] = merge_field_duplicates(parse_samples([parent_nd, dup_det])[0])
    assert (m.value, m.is_nd) == (0.2, False)
    dup_nd = row(RESULT=None, LAB_FIELD_QUALIFIER="U", MDL=0.002, LAB_SAMPLE_TYPE="FD", SAMPLE_NUMBER="1-D")
    [m] = merge_field_duplicates(parse_samples([parent_nd, dup_nd])[0])
    assert (m.value, m.is_nd, m.rl) == (None, True, 0.002)


def test_unmatched_or_ambiguous_duplicate_is_kept():
    orphan = row(RESULT=0.4, LAB_SAMPLE_TYPE="FD", SAMPLE_NUMBER="9-D")
    assert len(merge_field_duplicates(parse_samples([orphan])[0])) == 1
    a, b = row(RESULT=0.4, SAMPLE_NUMBER="7-A"), row(RESULT=0.6, SAMPLE_NUMBER="8-A")
    dup = row(RESULT=0.5, LAB_SAMPLE_TYPE="FD", SAMPLE_NUMBER="5-D")
    assert len(merge_field_duplicates(parse_samples([a, b, dup])[0])) == 3
