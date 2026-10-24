from pipeline.national import summarize


def hg(sample_id, amount):
    r = [None] * 17
    r[4], r[9] = sample_id, amount
    return tuple(r)


def info(sample_id, name):
    r = [None] * 19
    r[7], r[12] = sample_id, name
    return tuple(r)


def test_summarize():
    hg_rows = [hg(i, 300) for i in range(5)] + [hg(9, 100)]
    info_rows = [info(i, "Largemouth Bass") for i in range(5)] + [info(9, "Bluegill"), info(9, "Bluegill")]
    s = summarize(hg_rows, info_rows)
    assert s["species"] == {"LARGEMOUTH BASS": {"mean": 0.3, "n": 5}}
    assert s["all"] == {"mean": 0.2667, "n": 6}
    assert s["source"] == "EPA 2022 National Lakes Assessment"


def test_skips_missing_amount_and_unmatched_species():
    s = summarize([hg(1, None), hg(2, 200)], [])
    assert s["all"] == {"mean": 0.2, "n": 1} and s["species"] == {}
