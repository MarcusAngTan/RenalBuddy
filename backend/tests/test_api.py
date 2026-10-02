from datetime import date, timedelta


def _auth(client, email="ada@example.com"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "password123",
            "display_name": "Ada",
            "disclaimer_accepted": True,
        },
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_register_requires_disclaimer(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "nope@example.com",
            "password": "password123",
            "display_name": "No",
            "disclaimer_accepted": False,
        },
    )
    assert response.status_code == 400


def test_visit_loop(client):
    headers = _auth(client)
    today = date.today()
    yesterday = today - timedelta(days=1)
    profile = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "last_appointment_on": (today - timedelta(days=5)).isoformat(),
            "next_appointment_on": (today + timedelta(days=10)).isoformat(),
            "coping_interests": ["music", "walking"],
        },
    )
    assert profile.status_code == 200, profile.text

    med = client.post(
        "/api/medications",
        headers=headers,
        json={"name": "Lisinopril", "dose_amount": "5", "dose_unit": "mg", "schedule": "daily"},
    )
    assert med.status_code == 200, med.text
    med_id = med.json()["id"]

    changed = client.patch(
        f"/api/medications/{med_id}",
        headers=headers,
        json={"dose_amount": "10"},
    )
    assert changed.status_code == 200
    assert changed.json()["dose_amount"] == 10

    taper = client.post(
        "/api/taper-plans",
        headers=headers,
        json={
            "title": "Prednisolone taper",
            "medication_name": "Prednisolone",
            "dose_unit": "mg",
            "prescribed_note": "Clinic plan",
            "steps": [
                {
                    "dose_amount": "40",
                    "start_on": (today - timedelta(days=10)).isoformat(),
                    "end_on": yesterday.isoformat(),
                    "instruction": "Once each morning",
                },
                {
                    "dose_amount": "30",
                    "start_on": today.isoformat(),
                    "end_on": (today + timedelta(days=6)).isoformat(),
                    "instruction": "Once each morning",
                },
                {
                    "dose_amount": "20",
                    "start_on": (today + timedelta(days=7)).isoformat(),
                    "end_on": (today + timedelta(days=13)).isoformat(),
                },
            ],
        },
    )
    assert taper.status_code == 200, taper.text
    steps = taper.json()["steps"]
    yesterday_step = next(step for step in steps if step["dose_amount"] == 40)
    today_step = next(step for step in steps if step["dose_amount"] == 30)

    overlap = client.post(
        "/api/taper-plans",
        headers=headers,
        json={
            "title": "Bad",
            "medication_name": "Prednisolone",
            "dose_unit": "mg",
            "steps": [
                {"dose_amount": "10", "start_on": today.isoformat(), "end_on": (today + timedelta(days=2)).isoformat()},
                {"dose_amount": "5", "start_on": (today + timedelta(days=2)).isoformat(), "end_on": (today + timedelta(days=4)).isoformat()},
            ],
        },
    )
    assert overlap.status_code == 400

    yesterday_log = client.post(
        "/api/daily-check",
        headers=headers,
        json={
            "on": yesterday.isoformat(),
            "doses": [
                {"taper_step_id": yesterday_step["id"], "slot": "daily", "status": "different_dose", "taken_dose": "20"}
            ],
            "dipstick_result": "3+",
            "weight_kg": "62.4",
            "oedema_score": 2,
            "side_effects": [{"effect_code": "sleep", "severity": 2}],
            "mood": 2,
            "energy": 2,
            "sleep_quality": 2,
        },
    )
    assert yesterday_log.status_code == 200, yesterday_log.text
    assert yesterday_log.json()["taper"]["prescribed_dose"] == 40

    today_log = client.post(
        "/api/daily-check",
        headers=headers,
        json={
            "on": today.isoformat(),
            "doses": [
                {"medication_id": med_id, "slot": "daily", "status": "taken"},
                {"taper_step_id": today_step["id"], "slot": "daily", "status": "missed"},
            ],
            "dipstick_result": "2+",
            "weight_kg": "63.0",
            "oedema_score": 1,
            "side_effects": [{"effect_code": "mood", "severity": 1}],
            "mood": 3,
            "energy": 3,
            "sleep_quality": 4,
        },
    )
    assert today_log.status_code == 200, today_log.text
    assert today_log.json()["taper"]["log_status"] == "missed"
    assert today_log.json()["dipstick_result"] == "2+"

    missing_amount = client.post(
        "/api/daily-check",
        headers=headers,
        json={
            "on": today.isoformat(),
            "doses": [{"taper_step_id": today_step["id"], "slot": "daily", "status": "different_dose"}],
        },
    )
    assert missing_amount.status_code == 400

    note = client.post(
        "/api/journal",
        headers=headers,
        json={"body": "Ankles were puffier after lunch.", "include_in_summary": True},
    )
    assert note.status_code == 200
    question = client.post(
        "/api/questions",
        headers=headers,
        json={"body": "Should the taper stay at 30 mg while protein is 2+?"},
    )
    assert question.status_code == 200

    coping = client.get("/api/coping", headers=headers)
    assert coping.status_code == 200
    titles = {item["title"] for item in coping.json()["suggestions"]}
    assert "A short walk" in titles
    assert "One song you like" in titles
    assert coping.json()["using_defaults"] is False

    preview = client.get("/api/summaries/preview", headers=headers)
    assert preview.status_code == 200, preview.text
    text = preview.json()["summary_text"]
    assert "prescribed 40 mg" in text
    assert "logged 20" in text
    assert "missed 1 day" in text
    assert "Highest 3+" in text
    assert "Ankles were puffier after lunch." in text
    assert "Should the taper stay at 30 mg" in text
    assert "dose changed for Lisinopril to 10 mg" in text
    assert "relapse" not in text.lower()
    assert "recommended" not in text.lower()
    assert "remission" not in text.lower()
    assert "you should" not in text.lower()
    assert "This pack is incomplete." in text
    narration = preview.json().get("narration") or preview.json()["summary_json"].get("narration")
    assert narration
    assert narration["verified"] is True
    assert "relapse" not in narration["text"].lower()
    assert narration.get("blocks")
    assert any(block["title"] == "Steroid taper" for block in narration["blocks"])

    saved = client.post("/api/summaries", headers=headers, json={})
    assert saved.status_code == 200
    summary_id = saved.json()["id"]
    assert summary_id

    closed = client.post("/api/appointments/close", headers=headers, json={})
    assert closed.status_code == 200, closed.text
    assert closed.json()["last_appointment_on"] == today.isoformat()
    me = client.get("/api/auth/me", headers=headers)
    assert me.json()["last_appointment_on"] == today.isoformat()

    resources = client.get("/api/resources", headers=headers)
    assert resources.status_code == 200
    assert any(item["title"] == "NephCure" for item in resources.json())
    assert any("NUH" in item["title"] for item in resources.json())


def test_sample_week_then_blocks_a_second_load(client):
    headers = _auth(client, "sam@example.com")
    loaded = client.post("/api/demo/sample-week", headers=headers)
    assert loaded.status_code == 200, loaded.text
    today = client.get("/api/today", headers=headers)
    assert today.status_code == 200
    assert today.json()["taper"]["medication_name"] == "Prednisolone"
    assert today.json()["taper"]["prescribed_dose"] == 30
    plans = client.get("/api/taper-plans", headers=headers)
    assert plans.status_code == 200
    active = [plan for plan in plans.json() if plan["status"] == "active"]
    pred = next(plan for plan in active if plan["medication_name"] == "Prednisolone")
    liso = next(plan for plan in active if plan["medication_name"] == "Cyclosporine")
    assert pred["steps"][0]["start_on"] == liso["steps"][0]["start_on"]
    assert pred["steps"][1]["start_on"] == liso["steps"][1]["start_on"]
    preview = client.get("/api/summaries/preview", headers=headers)
    text = preview.json()["summary_text"]
    assert "missed 1 day" in text
    assert "3+" in text
    assert "Face looked puffier" in text
    again = client.post("/api/demo/sample-week", headers=headers)
    assert again.status_code == 400


def test_medicine_explainer_and_question_suggestions(client):
    headers = _auth(client, "lex@example.com")
    known = client.get("/api/medicines/explain", headers=headers, params={"name": "Prednisolone"})
    assert known.status_code == 200
    assert known.json()["known"] is True
    assert "typed plan" in known.json()["dose_note"].lower()
    unknown = client.get("/api/medicines/explain", headers=headers, params={"name": "Unobtainium"})
    assert unknown.status_code == 200
    assert unknown.json()["known"] is False
    assert "pharmacist" in unknown.json()["purpose"].lower()
    loaded = client.post("/api/demo/sample-week", headers=headers)
    assert loaded.status_code == 200
    suggestions = client.get("/api/questions/suggestions", headers=headers)
    assert suggestions.status_code == 200
    bodies = [item["body"] for item in suggestions.json()]
    assert any("vaccines" in body.lower() for body in bodies)
    assert any("3+" in body or "dipstick" in body.lower() for body in bodies)
    assert all("relapse" not in body.lower() for body in bodies)


def test_account_export_and_delete(client):
    headers = _auth(client, "gone@example.com")
    client.post("/api/demo/sample-week", headers=headers)
    exported = client.get("/api/account/export", headers=headers)
    assert exported.status_code == 200
    payload = exported.json()
    assert payload["user"]["email"] == "gone@example.com"
    assert any(med["name"] == "Cyclosporine" for med in payload["medications"])
    deleted = client.delete("/api/account", headers=headers)
    assert deleted.status_code == 200
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 401


def test_crisis_copy_is_hard_coded():
    from app.constants import CRISIS_COPY

    assert "995" in CRISIS_COPY
    assert "1767" in CRISIS_COPY
    assert "iasp.info" in CRISIS_COPY.lower()


def test_narrate_structured_blocks_skip_empty_sections():
    from app.services.narrator import narrate

    payload = {
        "period_start": "2026-09-01",
        "period_end": "2026-09-10",
        "coverage": {"days_logged": 3, "days_in_interval": 10, "incomplete": True},
        "sections": [
            {"key": "coverage", "title": "How complete this pack is", "lines": ["Logged 3 of 10 days in this interval."]},
            {"key": "medicines", "title": "Medicines", "lines": ["Not logged."]},
            {"key": "dipstick", "title": "Urine dipstick", "lines": ["1 Sep 2026: 2+."]},
        ],
    }
    result = narrate(payload)
    titles = [block["title"] for block in result["blocks"]]
    assert "Medicines" not in titles
    assert "Urine dipstick" in titles
    assert result["blocks"][0]["lines"] == ["Logged 3 of 10 days in this interval."]


def test_narrator_discards_invented_numbers():
    from app.services.narrator import verify_narration

    payload = {
        "period_start": "2026-09-01",
        "period_end": "2026-09-10",
        "coverage": {"days_logged": 3, "days_in_interval": 10, "incomplete": True},
        "sections": [{"title": "Urine dipstick", "lines": ["1 Sep 2026: 2+."]}],
    }
    assert verify_narration("Logged 3 of 10 days. Urine dipstick: 1 Sep 2026: 2+.", payload) is True
    assert verify_narration("Protein 99 means relapse.", payload) is False

