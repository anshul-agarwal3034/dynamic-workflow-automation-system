import sys
import json
from sqlalchemy import text
from app.database import engine

def audit():
    print("=" * 70)
    print("      FORM PILOT X — POSTGRESQL DATABASE HEALTH & SCHEMA AUDIT      ")
    print("=" * 70)

    with engine.connect() as conn:
        # 1. List of Tables
        tables_res = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)).fetchall()
        
        tables = [r[0] for r in tables_res]
        print(f"\n[1] PUBLIC TABLES ({len(tables)} total):")
        for t in tables:
            print(f"  - {t}")

        # 2. Columns for Core Domain Models
        target_tables = ['users', 'forms', 'form_versions', 'fields', 'field_options', 'conditional_rules', 'submissions', 'response_values']
        print("\n[2] COLUMN & CONSTRAINT DETAILS:")
        for tbl in target_tables:
            if tbl in tables:
                cols_res = conn.execute(text(f"""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = '{tbl}'
                    ORDER BY ordinal_position;
                """)).fetchall()
                print(f"\n  Table '{tbl}':")
                for c_name, d_type, nullable in cols_res:
                    print(f"    - {c_name} ({d_type}, Nullable: {nullable})")

        # 3. Row Counts Across All Tables
        print("\n[3] CURRENT TABLE ROW COUNTS:")
        for tbl in target_tables:
            if tbl in tables:
                count_res = conn.execute(text(f"SELECT COUNT(*) FROM {tbl};")).scalar()
                print(f"  - {tbl}: {count_res} rows")

        # 4. Foreign Key Constraints & Cascade Integrity
        fk_res = conn.execute(text("""
            SELECT
                tc.table_name AS child_table,
                kcu.column_name AS child_column,
                ccu.table_name AS parent_table,
                ccu.column_name AS parent_column,
                rc.delete_rule AS on_delete
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON tc.constraint_name = rc.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = rc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
            ORDER BY tc.table_name;
        """)).fetchall()

        print("\n[4] FOREIGN KEY & CASCADE RULES:")
        for child, c_col, parent, p_col, on_del in fk_res:
            print(f"  - {child}.{c_col} -> {parent}.{p_col} (ON DELETE {on_del})")

    print("\n" + "=" * 70)
    print("                 DATABASE AUDIT COMPLETE                 ")
    print("=" * 70)

if __name__ == "__main__":
    audit()
