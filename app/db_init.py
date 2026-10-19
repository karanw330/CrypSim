import sqlite3
import os
import subprocess
import sys

DB_NAME = os.getenv("DB_PATH", "cryptosim.db")

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()

    # Users Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            full_name TEXT,
            email TEXT,
            hashed_password TEXT,
            disabled INTEGER DEFAULT 0,
            balance_usd REAL DEFAULT 100000.0
        )
    ''')

    # Portfolio Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS portfolio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            symbol TEXT,
            amount REAL DEFAULT 0.0,
            FOREIGN KEY(user_id) REFERENCES users(username),
            UNIQUE(user_id, symbol)
        )
    ''')

    # Orders Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            order_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            symbol TEXT,
            order_type TEXT,
            side TEXT,
            quantity REAL,
            price REAL,
            limit_value REAL,
            stop_value REAL,
            status TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(username)
        )
    ''')
    
    # Trades Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS trades (
            trade_id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT,
            price REAL,
            quantity REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()
    print("Base database initialized.")

    # --- Run Migrations ---
    print("Running migrations from app/db_migrations...")
    migration_dir = os.path.join("app", "db_migrations")
    if os.path.exists(migration_dir):
        # Sort migrations to run in order (0001, 0002, etc.)
        migrations = sorted([f for f in os.listdir(migration_dir) if f.endswith(".py") and f != "__init__.py"])
        for migration in migrations:
            print(f"Executing migration: {migration}")
            migration_path = os.path.join(migration_dir, migration)
            try:
                # Use sys.executable to ensure we use the same python environment
                subprocess.run([sys.executable, "-m", f"app.db_migrations.{migration[:-3]}"], check=True)
            except subprocess.CalledProcessError as e:
                print(f"Error running migration {migration}: {e}")
            except Exception as e:
                print(f"Unexpected error running {migration}: {e}")
    
    print("All migrations checked/completed.")

if __name__ == "__main__":
    init_db()
