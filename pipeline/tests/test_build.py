import json
from datetime import date

from pipeline.build import build
from pipeline.tests.test_rules import row


def site1(**kw):
    return row(SITE="0001", SITE_NAME="Vermilion River North of Perry", LAT_WGS84=29.95, LON_WGS84=-92.15, **kw)


ROWS = [
    site1(RESULT=0.4, COLLECTION_DATE="2010-05-01T00:00:00"),
    site1(RESULT=0.6, COLLECTION_DATE="2010-06-01T00:00:00"),
    site1(RESULT=None, LAB_FIELD_QUALIFIER="U", PRACTICAL_QUANTITATION_LIMIT=0.002, COLLECTION_DATE="2016-05-01T00:00:00"),
    row(SITE="0002", SITE_NAME="Lake X", LAT_WGS84=31.0, LON_WGS84=-92.0, SUBSEGMENT_NUMBER="LA000000_00",
        TAXA_COMMON_NAME="BOWFIN", RESULT=1.0, COLLECTION_DATE="2020-07-01T00:00:00"),
    site1(PARAMETER="PH", MATRIX="W", RESULT=7.1),
]
EXTRA_ROW = site1(RESULT=0.3, COLLECTION_DATE="2018-05-01T00:00:00")
SITE_ROWS = [{"id": "0001", "address": "2.1 miles south of Abbeville"}]


def test_sites_json(tmp_path):
    build(ROWS, SITE_ROWS, tmp_path, date(2026, 10, 24))
    d = json.loads((tmp_path / "sites.json").read_text())
    assert d["latestYear"] == 2020
    s1 = d["sites"][0]
    assert (s1["id"], s1["basin"], s1["address"], s1["n"], s1["last"]) == ("0001", "05", "2.1 miles south of Abbeville", 3, "2016-05-01")
    assert (s1["name"], s1["lat"], s1["lon"]) == ("Vermilion River North of Perry", 29.95, -92.15)
    bass = s1["species"]["LARGEMOUTH BASS"]
    assert bass["years"] == {"2010": [1.0, 2], "2016": [0.001, 1]}  # 2 of 3 detects -> half RL
    assert bass["latest"] == ["2016-05-01", 0.001, 1]
    assert bass["n"] == 3
    assert d["sites"][1]["address"] == ""
    assert d["sites"][1]["basin"] is None


def test_site_detail_file(tmp_path):
    build(ROWS, SITE_ROWS, tmp_path, date(2026, 10, 24))
    d = json.loads((tmp_path / "sites" / "0001.json").read_text())
    bass = d["species"]["LARGEMOUTH BASS"]
    assert [x["value"] for x in bass] == [0.4, 0.6, 0.001]
    assert bass[2]["nd"] is True
    assert bass[0] == {"date": "2010-05-01", "value": 0.4, "nd": False, "weightG": 400.0,
                       "lengthCm": 30.0, "nFish": 5, "composite": True}


def test_deterministic_and_updated_only_on_change(tmp_path):
    m1 = build(ROWS, SITE_ROWS, tmp_path, date(2026, 10, 24))
    before = (tmp_path / "sites.json").read_bytes()
    m2 = build(ROWS, SITE_ROWS, tmp_path, date(2026, 11, 1))
    assert (tmp_path / "sites.json").read_bytes() == before
    assert m2["updated"] == m1["updated"] == "2026-10-24"
    m3 = build(ROWS + [EXTRA_ROW], SITE_ROWS, tmp_path, date(2026, 11, 1))
    assert m3["updated"] == "2026-11-01"


def test_meta_counts(tmp_path):
    m = build(ROWS, SITE_ROWS, tmp_path, date(2026, 10, 24))
    assert (m["rawTissueRows"], m["samples"], m["sites"], m["guidelinePpm"]) == (4, 4, 2, 0.3)
    assert json.loads((tmp_path / "meta.json").read_text()) == m


def test_removes_stale_site_files(tmp_path):
    (tmp_path / "sites").mkdir()
    (tmp_path / "sites" / "9999.json").write_text("{}")
    build(ROWS, SITE_ROWS, tmp_path, date(2026, 10, 24))
    assert not (tmp_path / "sites" / "9999.json").exists()


def test_preserves_other_files_in_out_dir(tmp_path):
    (tmp_path / "national.json").write_text("{}")
    build(ROWS, SITE_ROWS, tmp_path, date(2026, 10, 24))
    assert (tmp_path / "national.json").exists()


def test_size_class_cutoffs_are_species_thirds(tmp_path):
    rows = [row(SITE="0001", SITE_NAME="A", LAT_WGS84=30.0, LON_WGS84=-91.0, AVERAGE_FISH_LENGTH=float(n)) for n in range(1, 10)]
    rows += [row(SITE="0001", SITE_NAME="A", LAT_WGS84=30.0, LON_WGS84=-91.0, TAXA_COMMON_NAME="BOWFIN", AVERAGE_FISH_LENGTH=40.0)]
    build(rows, [], tmp_path, date(2026, 10, 24))
    d = json.loads((tmp_path / "sites.json").read_text())
    assert d["sizeClasses"] == {"LARGEMOUTH BASS": [4.0, 6.0]}  # BOWFIN has too few lengths


def test_build_merges_field_duplicates(tmp_path):
    rows = [site1(RESULT=2.31, SAMPLE_NUMBER="1-A", LAB_SAMPLE_TYPE="TRG"),
            site1(RESULT=2.22, SAMPLE_NUMBER="1-D", LAB_SAMPLE_TYPE="FD")]
    build(rows, SITE_ROWS, tmp_path, date(2026, 10, 24))
    bass = json.loads((tmp_path / "sites.json").read_text())["sites"][0]["species"]["LARGEMOUTH BASS"]
    assert (bass["n"], bass["years"]) == (1, {"2010": [2.265, 1]})
    m = json.loads((tmp_path / "meta.json").read_text())
    assert m["mergedDuplicates"] == 1
