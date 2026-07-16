import csv
import io
import re

import pytest
from fastapi.testclient import TestClient
from httpx import Response


def login_token(client: TestClient, email: str, password: str) -> str:
    client.cookies.clear()
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    token = response.cookies.get("session_id")
    assert token is not None
    client.cookies.clear()
    return token


def auth_headers(token: str) -> dict[str, str]:
    return {"Cookie": f"session_id={token}"}


def create_user(
    client: TestClient,
    admin_token: str,
    email: str,
    role: str,
    name: str,
) -> dict[str, object]:
    response = client.post(
        "/api/admin/users",
        headers=auth_headers(admin_token),
        json={
            "email": email,
            "password": "created-password",
            "name": name,
            "role": role,
            "department": "Engineering",
            "start_date": "2026-07-15",
        },
    )
    assert response.status_code == 201
    return response.json()


def role_fixtures(client: TestClient) -> dict[str, object]:
    admin_token = login_token(client, "admin@example.com", "bootstrap-password")
    recruit = create_user(
        client,
        admin_token,
        "report-recruit@example.com",
        "Recruit",
        "Report Recruit",
    )
    other_recruit = create_user(
        client,
        admin_token,
        "report-other@example.com",
        "Recruit",
        "Other Recruit",
    )
    assigned_manager = create_user(
        client,
        admin_token,
        "report-assigned@example.com",
        "Manager",
        "Assigned Manager",
    )
    create_user(
        client,
        admin_token,
        "report-unassigned@example.com",
        "Manager",
        "Unassigned Manager",
    )
    assignment = client.put(
        f"/api/admin/recruits/{recruit['id']}/manager",
        headers=auth_headers(admin_token),
        json={"manager_id": assigned_manager["id"]},
    )
    assert assignment.status_code == 200
    return {
        "admin_token": admin_token,
        "recruit": recruit,
        "recruit_token": login_token(
            client,
            "report-recruit@example.com",
            "created-password",
        ),
        "other_recruit": other_recruit,
        "other_recruit_token": login_token(
            client,
            "report-other@example.com",
            "created-password",
        ),
        "assigned_manager_token": login_token(
            client,
            "report-assigned@example.com",
            "created-password",
        ),
        "unassigned_manager_token": login_token(
            client,
            "report-unassigned@example.com",
            "created-password",
        ),
    }


def seed_report_records(client: TestClient, owner_id: int) -> None:
    database = client.app.state.database
    database.execute(
        """
        INSERT INTO tasks (
            id, owner_id, date, title, description, category, status,
            priority, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            101,
            owner_id,
            "2026-07-14",
            "Outside task",
            "Before range",
            "Training",
            "Completed",
            "Low",
            "2026-07-14T09:00:00+00:00",
        ),
    )
    database.execute(
        """
        INSERT INTO tasks (
            id, owner_id, date, title, description, category, status,
            priority, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            102,
            owner_id,
            "2026-07-15",
            'CSV, "quoted" task',
            "First line\nSecond line",
            "Setup",
            "In Progress",
            "High",
            "2026-07-15T10:00:00+00:00",
        ),
    )
    database.execute(
        """
        INSERT INTO tasks (
            id, owner_id, date, title, description, category, status,
            priority, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            103,
            owner_id,
            "2026-07-15",
            "Second task",
            "Same day, higher ID",
            "Project",
            "Not Started",
            "Medium",
            "2026-07-15T11:00:00+00:00",
        ),
    )
    database.execute(
        """
        INSERT INTO issues (
            id, owner_id, date, title, description, severity, status,
            resolution_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            201,
            owner_id,
            "2026-07-15",
            "Access issue",
            "VPN unavailable",
            "High",
            "Open",
            "",
            "2026-07-15T08:00:00+00:00",
        ),
    )
    database.execute(
        """
        INSERT INTO issues (
            id, owner_id, date, title, description, severity, status,
            resolution_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            202,
            owner_id,
            "2026-07-16",
            "Resolved issue",
            "Account fixed",
            "Medium",
            "Resolved",
            "Permissions updated",
            "2026-07-16T08:00:00+00:00",
        ),
    )
    database.execute(
        """
        INSERT INTO feedback (
            id, owner_id, date, subject, type, details, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            301,
            owner_id,
            "2026-07-15",
            "Helpful pairing",
            "Positive",
            "Pairing accelerated setup",
            "2026-07-15T07:00:00+00:00",
        ),
    )
    database.execute(
        """
        INSERT INTO feedback (
            id, owner_id, date, subject, type, details, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            302,
            owner_id,
            "2026-07-17",
            "Outside feedback",
            "Suggestion",
            "After range",
            "2026-07-17T07:00:00+00:00",
        ),
    )


def report_request(
    client: TestClient,
    token: str,
    recruit_id: int,
    report_type: str = "combined",
    report_format: str = "csv",
    start_date: str = "2026-07-15",
    end_date: str = "2026-07-16",
) -> Response:
    return client.get(
        "/api/reports",
        headers=auth_headers(token),
        params={
            "recruit_id": recruit_id,
            "type": report_type,
            "start_date": start_date,
            "end_date": end_date,
            "format": report_format,
        },
    )


def parsed_csv(response: Response) -> list[dict[str, str]]:
    return list(csv.DictReader(io.StringIO(response.content.decode("utf-8"))))


@pytest.mark.parametrize(
    ("report_type", "expected_header", "expected_titles"),
    [
        (
            "tasks",
            ["date", "title", "description", "category", "status", "priority"],
            ['CSV, "quoted" task', "Second task"],
        ),
        (
            "issues",
            [
                "date",
                "title",
                "description",
                "severity",
                "status",
                "resolution_notes",
            ],
            ["Access issue", "Resolved issue"],
        ),
        (
            "feedback",
            ["date", "subject", "type", "details"],
            ["Helpful pairing"],
        ),
        (
            "combined",
            [
                "date",
                "record_type",
                "title_or_subject",
                "details",
                "category",
                "status",
                "priority",
                "severity",
                "resolution_notes",
                "feedback_type",
            ],
            [
                "Helpful pairing",
                "Access issue",
                'CSV, "quoted" task',
                "Second task",
                "Resolved issue",
            ],
        ),
    ],
)
def test_csv_reports_use_exact_columns_inclusive_range_and_stable_order(
    client: TestClient,
    report_type: str,
    expected_header: list[str],
    expected_titles: list[str],
) -> None:
    fixtures = role_fixtures(client)
    recruit_id = int(fixtures["recruit"]["id"])
    seed_report_records(client, recruit_id)

    response = report_request(
        client,
        str(fixtures["recruit_token"]),
        recruit_id,
        report_type,
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["content-disposition"] == (
        f'attachment; filename="onboarding-diary-{recruit_id}-{report_type}-'
        '2026-07-15-to-2026-07-16.csv"'
    )
    reader = csv.DictReader(io.StringIO(response.content.decode("utf-8")))
    rows = list(reader)
    assert reader.fieldnames == expected_header
    title_field = (
        "title_or_subject"
        if report_type == "combined"
        else "subject"
        if report_type == "feedback"
        else "title"
    )
    assert [row[title_field] for row in rows] == expected_titles
    if report_type == "tasks":
        assert rows[0]["description"] == "First line\nSecond line"
        assert b"\r\n" in response.content
    if report_type == "combined":
        assert [row["record_type"] for row in rows] == [
            "feedback",
            "issue",
            "task",
            "task",
            "issue",
        ]


def test_report_date_boundaries_and_validation_are_strict(
    client: TestClient,
) -> None:
    fixtures = role_fixtures(client)
    recruit_id = int(fixtures["recruit"]["id"])
    token = str(fixtures["recruit_token"])
    seed_report_records(client, recruit_id)

    equal = report_request(
        client,
        token,
        recruit_id,
        "combined",
        "csv",
        "2026-07-15",
        "2026-07-15",
    )
    assert equal.status_code == 200
    assert [row["title_or_subject"] for row in parsed_csv(equal)] == [
        "Helpful pairing",
        "Access issue",
        'CSV, "quoted" task',
        "Second task",
    ]

    reversed_range = report_request(
        client,
        token,
        recruit_id,
        start_date="2026-07-16",
        end_date="2026-07-15",
    )
    assert reversed_range.status_code == 422
    assert reversed_range.json()["error"]["fields"] == {
        "start_date": "Start date must be on or before end date"
    }

    missing = client.get(
        "/api/reports",
        headers=auth_headers(token),
        params={
            "recruit_id": recruit_id,
            "type": "tasks",
            "end_date": "2026-07-15",
            "format": "csv",
        },
    )
    assert missing.status_code == 422
    assert "start_date" in missing.json()["error"]["fields"]

    for invalid_date in [
        "2026-7-15",
        "2026-07-15T00:00:00",
        "2026-02-29",
        " 2026-07-15",
    ]:
        invalid = report_request(
            client,
            token,
            recruit_id,
            start_date=invalid_date,
        )
        assert invalid.status_code == 422
        assert "start_date" in invalid.json()["error"]["fields"]


def assert_access_denied(response: Response) -> None:
    assert response.status_code == 403
    assert response.json() == {
        "error": {
            "code": "access_denied",
            "message": "Access denied",
        }
    }
    assert "Report Recruit" not in response.text
    assert "CSV" not in response.text


def test_request_level_report_authorization_matrix_has_uniform_no_leak_denials(
    client: TestClient,
) -> None:
    fixtures = role_fixtures(client)
    recruit_id = int(fixtures["recruit"]["id"])
    other_id = int(fixtures["other_recruit"]["id"])
    seed_report_records(client, recruit_id)

    for token in [
        fixtures["recruit_token"],
        fixtures["assigned_manager_token"],
        fixtures["admin_token"],
    ]:
        response = report_request(client, str(token), recruit_id)
        assert response.status_code == 200
        assert "Access issue" in response.text

    denied_requests = [
        (fixtures["other_recruit_token"], recruit_id),
        (fixtures["assigned_manager_token"], other_id),
        (fixtures["unassigned_manager_token"], recruit_id),
        (fixtures["recruit_token"], 999999),
        (fixtures["assigned_manager_token"], 999999),
        (fixtures["admin_token"], 999999),
    ]
    for token, target_id in denied_requests:
        assert_access_denied(report_request(client, str(token), int(target_id)))

    unauthenticated = client.get(
        "/api/reports",
        params={
            "recruit_id": recruit_id,
            "type": "combined",
            "start_date": "2026-07-15",
            "end_date": "2026-07-16",
            "format": "csv",
        },
    )
    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["error"]["code"] == "authentication_required"


def pdf_text(content: bytes) -> str:
    literals = re.findall(rb"\(((?:\\.|[^\\)])*)\) Tj", content)
    decoded: list[str] = []
    for literal in literals:
        unescaped = (
            literal.replace(b"\\(", b"(").replace(b"\\)", b")").replace(b"\\\\", b"\\")
        )
        decoded.append(unescaped.decode("cp1252"))
    return "\n".join(decoded)


def assert_pdf_structure(content: bytes) -> None:
    assert content.startswith(b"%PDF-1.4")
    assert content.endswith(b"%%EOF\n")
    startxref = re.search(rb"startxref\n(\d+)\n%%EOF", content)
    assert startxref is not None
    xref_offset = int(startxref.group(1))
    assert content[xref_offset:].startswith(b"xref\n")
    object_offsets = {
        int(match.group(1)): match.start()
        for match in re.finditer(rb"(\d+) 0 obj\n", content)
    }
    xref_entries = re.findall(rb"(\d{10}) 00000 n", content[xref_offset:])
    assert len(xref_entries) == len(object_offsets)
    assert [int(offset) for offset in xref_entries] == list(object_offsets.values())


def test_pdf_report_has_parseable_structure_metadata_columns_and_content(
    client: TestClient,
) -> None:
    fixtures = role_fixtures(client)
    recruit_id = int(fixtures["recruit"]["id"])
    seed_report_records(client, recruit_id)

    response = report_request(
        client,
        str(fixtures["assigned_manager_token"]),
        recruit_id,
        "combined",
        "pdf",
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == (
        f'attachment; filename="onboarding-diary-{recruit_id}-combined-'
        '2026-07-15-to-2026-07-16.pdf"'
    )
    assert_pdf_structure(response.content)
    text = pdf_text(response.content)
    assert "Onboarding Diary Report" in text
    assert "Report type: combined" in text
    assert "Recruit: Report Recruit" in text
    assert "Date range: 2026-07-15 to 2026-07-16 (inclusive)" in text
    assert "Generated UTC:" in text
    assert "record_type" in text
    assert "title_or_subject" in text
    assert "Helpful pairing" in text
    assert "Access issue" in text
    assert 'CSV, "quoted" task' in text


@pytest.mark.parametrize("report_format", ["csv", "pdf"])
def test_empty_reports_still_download_valid_artifacts(
    client: TestClient,
    report_format: str,
) -> None:
    fixtures = role_fixtures(client)
    recruit_id = int(fixtures["recruit"]["id"])
    response = report_request(
        client,
        str(fixtures["admin_token"]),
        recruit_id,
        "feedback",
        report_format,
        "2026-08-01",
        "2026-08-31",
    )

    assert response.status_code == 200
    if report_format == "csv":
        assert response.content == b"date,subject,type,details\r\n"
    else:
        assert_pdf_structure(response.content)
        text = pdf_text(response.content)
        assert "Recruit: Report Recruit" in text
        assert "No records found" in text


def test_report_generation_failure_returns_safe_json_without_partial_download(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixtures = role_fixtures(client)
    recruit_id = int(fixtures["recruit"]["id"])

    def fail_pdf(*_: object) -> bytes:
        raise RuntimeError("protected report content")

    monkeypatch.setattr("app.main.render_pdf", fail_pdf)
    response = report_request(
        client,
        str(fixtures["recruit_token"]),
        recruit_id,
        "combined",
        "pdf",
    )

    assert response.status_code == 500
    assert response.headers["content-type"] == "application/json"
    assert "content-disposition" not in response.headers
    assert response.json() == {
        "error": {
            "code": "server_error",
            "message": "An unexpected error occurred; please retry",
        }
    }
    assert "protected report content" not in response.text
