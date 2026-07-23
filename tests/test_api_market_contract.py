"""Golden-case parity tests for the public area-market API contract."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import duckdb
from fastapi.testclient import TestClient

from api import data
from api.main import app
from scripts import build_decision_db

ROOT = Path(__file__).resolve().parent.parent
client = TestClient(app)


class ApiAreaMarketContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.contract = json.loads(
            (ROOT / "contracts" / "area-market-api-golden-cases.json").read_text()
        )
        cls.original_db_path = data.DB_PATH
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.source_db_path = Path(cls.temp_dir.name) / "warehouse.duckdb"
        cls.test_db_path = Path(cls.temp_dir.name) / "decision.duckdb"
        with duckdb.connect(str(cls.source_db_path)) as connection:
            connection.execute(f"attach '{cls.original_db_path.as_posix()}' as fixture (read_only)")
            connection.execute("create schema main_decision")
            for _, table in build_decision_db.TABLES_TO_EXPORT:
                connection.execute(
                    f"create table main_decision.{table} as "
                    f"select * from fixture.app.{table}"
                )
            columns = {
                row[0]
                for row in connection.execute(
                    """
                    select column_name
                    from information_schema.columns
                    where table_schema = 'main_decision'
                      and table_name = 'rpt_area_profile_mvp'
                    """
                ).fetchall()
            }
            if "sale_price_reference_year" not in columns:
                connection.execute(
                    """
                    alter table main_decision.rpt_area_profile_mvp
                    add column sale_price_reference_year integer
                    """
                )
                connection.execute(
                    """
                    update main_decision.rpt_area_profile_mvp
                    set sale_price_reference_year = ?
                    """,
                    [cls.contract["period"]["sale_price_reference_year"]],
                )
            connection.execute("detach fixture")
        if build_decision_db.build(
            source_db=cls.source_db_path,
            target_db=cls.test_db_path,
        ) != 0:
            raise RuntimeError("Temporary decision-extract export failed.")
        data.DB_PATH = cls.test_db_path
        data.areas.cache_clear()
        data._by_id.cache_clear()

    @classmethod
    def tearDownClass(cls) -> None:
        data.DB_PATH = cls.original_db_path
        data.areas.cache_clear()
        data._by_id.cache_clear()
        cls.temp_dir.cleanup()

    def test_golden_area_market_cases_match_the_public_api(self) -> None:
        for case in self.contract["cases"]:
            with self.subTest(area_id=case["area_id"]):
                response = client.get(f"/v2/areas/{case['area_id']}")
                self.assertEqual(response.status_code, 200)
                body = response.json()
                for field in (
                    "median_sale_price_gbp",
                    "sales_count_latest_year",
                    "sale_price_reference_year",
                    "median_sale_price_confidence",
                ):
                    self.assertEqual(body[field], case[field])

    def test_openapi_declares_the_area_market_context_fields(self) -> None:
        area_schema = client.get("/openapi.json").json()["components"]["schemas"]["Area"]
        properties = area_schema["properties"]
        self.assertIn({"type": "integer"}, properties["sales_count_latest_year"]["anyOf"])
        self.assertIn({"type": "integer"}, properties["sale_price_reference_year"]["anyOf"])

    def test_export_preserves_the_model_contract_fields(self) -> None:
        with duckdb.connect(str(self.test_db_path), read_only=True) as connection:
            columns = {
                row[0]
                for row in connection.execute(
                    """
                    select column_name
                    from information_schema.columns
                    where table_schema = 'app'
                      and table_name = 'rpt_area_profile_mvp'
                    """
                ).fetchall()
            }
        self.assertTrue(
            {
                "median_sale_price_gbp",
                "sales_count_latest_year",
                "sale_price_reference_year",
                "median_sale_price_confidence",
            }.issubset(columns)
        )


if __name__ == "__main__":
    unittest.main()
