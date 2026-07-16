import csv
import io
import sqlite3
import textwrap
from datetime import date, datetime
from typing import Literal

from .database import Database


ReportType = Literal["tasks", "issues", "feedback", "combined"]
ReportFormat = Literal["pdf", "csv"]

REPORT_COLUMNS: dict[ReportType, list[str]] = {
    "tasks": [
        "date",
        "title",
        "description",
        "category",
        "status",
        "priority",
    ],
    "issues": [
        "date",
        "title",
        "description",
        "severity",
        "status",
        "resolution_notes",
    ],
    "feedback": ["date", "subject", "type", "details"],
    "combined": [
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
}

PDF_COLUMN_WIDTHS: dict[str, int] = {
    "date": 10,
    "record_type": 11,
    "title": 28,
    "subject": 28,
    "title_or_subject": 28,
    "description": 44,
    "details": 44,
    "category": 10,
    "status": 11,
    "priority": 8,
    "severity": 8,
    "resolution_notes": 30,
    "type": 12,
    "feedback_type": 13,
}


def report_filename(
    recruit_id: int,
    report_type: ReportType,
    start_date: date,
    end_date: date,
    report_format: ReportFormat,
) -> str:
    return (
        f"onboarding-diary-{recruit_id}-{report_type}-"
        f"{start_date.isoformat()}-to-{end_date.isoformat()}.{report_format}"
    )


def report_rows(
    database: Database,
    recruit_id: int,
    report_type: ReportType,
    start_date: date,
    end_date: date,
) -> list[dict[str, str]]:
    parameters = (
        recruit_id,
        start_date.isoformat(),
        end_date.isoformat(),
    )
    if report_type == "combined":
        rows = database.fetchall(
            """
            SELECT
                id,
                date,
                'task' AS record_type,
                title AS title_or_subject,
                description AS details,
                category,
                status,
                priority,
                '' AS severity,
                '' AS resolution_notes,
                '' AS feedback_type
            FROM tasks
            WHERE owner_id = ? AND date BETWEEN ? AND ?
            UNION ALL
            SELECT
                id,
                date,
                'issue' AS record_type,
                title AS title_or_subject,
                description AS details,
                '' AS category,
                status,
                '' AS priority,
                severity,
                resolution_notes,
                '' AS feedback_type
            FROM issues
            WHERE owner_id = ? AND date BETWEEN ? AND ?
            UNION ALL
            SELECT
                id,
                date,
                'feedback' AS record_type,
                subject AS title_or_subject,
                details,
                '' AS category,
                '' AS status,
                '' AS priority,
                '' AS severity,
                '' AS resolution_notes,
                type AS feedback_type
            FROM feedback
            WHERE owner_id = ? AND date BETWEEN ? AND ?
            ORDER BY date ASC, record_type ASC, id ASC
            """,
            (*parameters, *parameters, *parameters),
        )
    else:
        columns = REPORT_COLUMNS[report_type]
        rows = database.fetchall(
            f"""
            SELECT id, {", ".join(columns)}
            FROM {report_type}
            WHERE owner_id = ? AND date BETWEEN ? AND ?
            ORDER BY date ASC, id ASC
            """,
            parameters,
        )
    return [_report_row(row, REPORT_COLUMNS[report_type]) for row in rows]


def _report_row(row: sqlite3.Row, columns: list[str]) -> dict[str, str]:
    return {
        column: "" if row[column] is None else str(row[column]) for column in columns
    }


def render_csv(columns: list[str], rows: list[dict[str, str]]) -> bytes:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(
        output,
        fieldnames=columns,
        extrasaction="ignore",
        lineterminator="\r\n",
    )
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode("utf-8")


def render_pdf(
    recruit_name: str,
    report_type: ReportType,
    start_date: date,
    end_date: date,
    generated_at: datetime,
    columns: list[str],
    rows: list[dict[str, str]],
) -> bytes:
    lines = [
        "Onboarding Diary Report",
        f"Report type: {report_type}",
        f"Recruit: {recruit_name}",
        f"Date range: {start_date.isoformat()} to {end_date.isoformat()} (inclusive)",
        f"Generated UTC: {generated_at.isoformat(timespec='seconds')}",
        "",
    ]
    table_header = _table_line(columns, {column: column for column in columns})
    divider = "-+-".join("-" * PDF_COLUMN_WIDTHS[column] for column in columns)
    lines.extend([table_header, divider])
    if rows:
        for row in rows:
            lines.extend(_wrapped_table_row(columns, row))
            lines.append(divider)
    else:
        lines.append("No records found")
    return _pdf_document(_paginate(lines, table_header, divider))


def _table_line(columns: list[str], values: dict[str, str]) -> str:
    return " | ".join(
        values[column][: PDF_COLUMN_WIDTHS[column]].ljust(PDF_COLUMN_WIDTHS[column])
        for column in columns
    )


def _wrapped_table_row(
    columns: list[str],
    row: dict[str, str],
) -> list[str]:
    cells: list[list[str]] = []
    for column in columns:
        width = PDF_COLUMN_WIDTHS[column]
        normalized = " / ".join(row[column].splitlines())
        wrapped = textwrap.wrap(
            normalized,
            width=width,
            break_long_words=True,
            break_on_hyphens=False,
        )
        cells.append(wrapped or [""])
    return [
        " | ".join(
            (cells[index][line] if line < len(cells[index]) else "").ljust(
                PDF_COLUMN_WIDTHS[column]
            )
            for index, column in enumerate(columns)
        )
        for line in range(max(len(cell) for cell in cells))
    ]


def _paginate(
    lines: list[str],
    table_header: str,
    divider: str,
    page_line_limit: int = 82,
) -> list[list[str]]:
    pages: list[list[str]] = []
    remaining = list(lines)
    while remaining:
        page = remaining[:page_line_limit]
        remaining = remaining[page_line_limit:]
        pages.append(page)
        if remaining:
            remaining = [
                "Onboarding Diary Report (continued)",
                "",
                table_header,
                divider,
                *remaining,
            ]
    return pages


def _pdf_document(pages: list[list[str]]) -> bytes:
    page_ids = [4 + index * 2 for index in range(len(pages))]
    content_ids = [page_id + 1 for page_id in page_ids]
    object_count = 3 + len(pages) * 2
    objects: list[bytes] = [b""] * object_count
    objects[0] = b"<< /Type /Catalog /Pages 2 0 R >>"
    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode(
        "ascii"
    )
    objects[2] = (
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier "
        b"/Encoding /WinAnsiEncoding >>"
    )
    for page_id, content_id, lines in zip(page_ids, content_ids, pages, strict=True):
        objects[page_id - 1] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1191 842] "
            f"/Resources << /Font << /F1 3 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        ).encode("ascii")
        stream = _pdf_content_stream(lines)
        objects[content_id - 1] = (
            f"<< /Length {len(stream)} >>\nstream\n".encode("ascii")
            + stream
            + b"\nendstream"
        )

    document = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for object_id, body in enumerate(objects, start=1):
        offsets.append(len(document))
        document.extend(f"{object_id} 0 obj\n".encode("ascii"))
        document.extend(body)
        document.extend(b"\nendobj\n")
    xref_offset = len(document)
    document.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    document.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        document.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    document.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        ).encode("ascii")
    )
    return bytes(document)


def _pdf_content_stream(lines: list[str]) -> bytes:
    commands = [b"BT", b"/F1 7 Tf", b"36 806 Td", b"9 TL"]
    for line in lines:
        commands.extend([_pdf_literal(line) + b" Tj", b"T*"])
    commands.append(b"ET")
    return b"\n".join(commands)


def _pdf_literal(value: str) -> bytes:
    encoded = value.encode("cp1252", errors="replace")
    escaped = (
        encoded.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")
    )
    return b"(" + escaped + b")"
