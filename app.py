import streamlit as st
import sqlite3
import pandas as pd
import plotly.express as px
from datetime import datetime, date, timedelta
import os
import io
import hashlib
import base64

# ─── CONFIG ───────────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "barroquillo.db")
BIZ_NAME = "L.E. Barroquillo Funeral Homes"
BIZ_SHORT = "Barroquillo FH"

st.set_page_config(
    page_title=f"{BIZ_SHORT} Management",
    page_icon="🕊️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── LOGO ─────────────────────────────────────────────────────────────────────
LOGO_PATH = os.path.join(os.path.dirname(__file__), "assets", "logo.png")

def get_logo_base64():
    if os.path.exists(LOGO_PATH):
        with open(LOGO_PATH, "rb") as f:
            return base64.b64encode(f.read()).decode()
    return None

LOGO_B64 = get_logo_base64()

# ─── CUSTOM CSS ───────────────────────────────────────────────────────────────
st.markdown("""
<style>
    /* ── Brand Colors: Navy #0a1e5e, Blue #1a4fcf, Orange #e8872a, Gold #d4a843 ── */

    /* Metric cards — navy to blue gradient */
    div[data-testid="stMetric"] {
        background: linear-gradient(135deg, #0a1e5e 0%, #1a4fcf 100%);
        padding: 20px;
        border-radius: 14px;
        color: white;
        box-shadow: 0 6px 20px rgba(10,30,94,0.3);
        border-bottom: 3px solid #e8872a;
    }
    div[data-testid="stMetric"] label {
        color: rgba(255,255,255,0.9) !important;
        font-size: 13px !important;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    div[data-testid="stMetric"] [data-testid="stMetricValue"] {
        color: white !important;
        font-size: 28px !important;
        font-weight: 700 !important;
    }
    div[data-testid="stMetric"] [data-testid="stMetricDelta"] {
        color: #e8872a !important;
    }

    /* Tabs */
    .stTabs [data-baseweb="tab-list"] {
        gap: 4px;
        border-bottom: 3px solid #0a1e5e;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 8px 8px 0 0;
        padding: 10px 24px;
        font-weight: 600;
    }
    .stTabs [aria-selected="true"] {
        background: #0a1e5e !important;
        color: white !important;
    }

    /* Sidebar */
    section[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #071442 0%, #0a1e5e 40%, #0d2870 100%);
    }
    section[data-testid="stSidebar"] .stRadio label {
        font-size: 16px !important;
        padding: 6px 0 !important;
    }
    section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p {
        color: #c8d6f0 !important;
    }

    /* Buttons */
    .stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #e8872a, #d4a843) !important;
        border: none !important;
        color: white !important;
        font-weight: 700 !important;
        letter-spacing: 0.5px;
        border-radius: 8px;
    }
    .stButton > button[kind="primary"]:hover {
        background: linear-gradient(135deg, #d4781e, #c49a35) !important;
    }

    /* Form submit buttons */
    .stFormSubmitButton > button {
        background: linear-gradient(135deg, #e8872a, #d4a843) !important;
        border: none !important;
        color: white !important;
        font-weight: 700 !important;
        border-radius: 8px;
    }

    /* Expanders */
    .streamlit-expanderHeader {
        font-size: 16px !important;
        font-weight: 600 !important;
    }

    /* Dataframes */
    .stDataFrame [data-testid="stDataFrameResizable"] {
        border-radius: 8px;
        overflow: hidden;
    }

    /* Headers */
    h1 { color: #0a1e5e !important; }
    h2 { color: #0d2870 !important; }
    h3 { color: #1a4fcf !important; }

    /* Status badges */
    .status-active { color: #27ae60; font-weight: bold; }
    .status-completed { color: #1a4fcf; font-weight: bold; }
    .status-cancelled { color: #e74c3c; font-weight: bold; }
</style>
""", unsafe_allow_html=True)


# ─── DATABASE ─────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    # Clients = the family / contact person arranging the service
    c.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            -- Deceased info
            deceased_first_name TEXT NOT NULL,
            deceased_last_name TEXT NOT NULL,
            deceased_middle_name TEXT,
            deceased_birthday TEXT,
            deceased_age INTEGER,
            deceased_gender TEXT,
            deceased_date_of_death TEXT,
            deceased_cause_of_death TEXT,
            deceased_address TEXT,
            -- Contact / family info
            contact_name TEXT NOT NULL,
            contact_relationship TEXT,
            contact_phone TEXT,
            contact_email TEXT,
            contact_address TEXT,
            -- Notes
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Service packages (templates)
    c.execute("""
        CREATE TABLE IF NOT EXISTS service_packages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            base_price REAL NOT NULL DEFAULT 0,
            is_active INTEGER DEFAULT 1
        )
    """)

    # Service records — links a client to a service, tracks status
    c.execute("""
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            package_id INTEGER,
            custom_service_name TEXT,
            -- Schedule
            wake_start_date TEXT,
            wake_end_date TEXT,
            burial_date TEXT,
            burial_location TEXT,
            -- Pricing
            total_amount REAL NOT NULL DEFAULT 0,
            discount REAL DEFAULT 0,
            -- Status: active, completed, cancelled
            status TEXT DEFAULT 'active',
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id),
            FOREIGN KEY (package_id) REFERENCES service_packages(id)
        )
    """)

    # Payments from clients
    c.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            method TEXT DEFAULT 'cash',
            reference TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_id) REFERENCES services(id)
        )
    """)

    # Bank / cash accounts
    c.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'bank',
            description TEXT,
            opening_balance REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Expense categories
    c.execute("""
        CREATE TABLE IF NOT EXISTS expense_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#6c757d',
            is_active INTEGER DEFAULT 1
        )
    """)

    # Business expenses
    c.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            category_id INTEGER,
            account_id INTEGER,
            amount REAL NOT NULL,
            description TEXT,
            reference TEXT,
            service_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES expense_categories(id),
            FOREIGN KEY (account_id) REFERENCES accounts(id),
            FOREIGN KEY (service_id) REFERENCES services(id)
        )
    """)

    # Liabilities
    c.execute("""
        CREATE TABLE IF NOT EXISTS liabilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'loan',
            creditor TEXT,
            principal_amount REAL NOT NULL,
            remaining_balance REAL NOT NULL,
            interest_rate REAL DEFAULT 0,
            due_date TEXT,
            monthly_payment REAL DEFAULT 0,
            status TEXT DEFAULT 'active',
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS liability_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            liability_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (liability_id) REFERENCES liabilities(id)
        )
    """)

    # Inventory categories
    c.execute("""
        CREATE TABLE IF NOT EXISTS inventory_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            is_active INTEGER DEFAULT 1
        )
    """)

    # Inventory items
    c.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            unit TEXT DEFAULT 'pcs',
            quantity REAL NOT NULL DEFAULT 0,
            reorder_level REAL DEFAULT 0,
            cost_per_unit REAL DEFAULT 0,
            selling_price REAL DEFAULT 0,
            location TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES inventory_categories(id)
        )
    """)

    # Inventory movements (stock in / stock out / adjustments)
    c.execute("""
        CREATE TABLE IF NOT EXISTS inventory_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_cost REAL DEFAULT 0,
            service_id INTEGER,
            reference TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES inventory(id),
            FOREIGN KEY (service_id) REFERENCES services(id)
        )
    """)

    # Suppliers
    c.execute("""
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            -- Bank details for payments
            bank_name TEXT,
            bank_account_name TEXT,
            bank_account_number TEXT,
            gcash_number TEXT,
            maya_number TEXT,
            -- What they supply
            products_supplied TEXT,
            payment_terms TEXT,
            notes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Users (auth)
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Employees
    c.execute("""
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            position TEXT,
            employment_type TEXT DEFAULT 'regular',
            rate_type TEXT DEFAULT 'monthly',
            rate_amount REAL NOT NULL DEFAULT 0,
            phone TEXT,
            address TEXT,
            sss_number TEXT,
            philhealth_number TEXT,
            pagibig_number TEXT,
            tin_number TEXT,
            date_hired TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Payroll periods
    c.execute("""
        CREATE TABLE IF NOT EXISTS payroll_periods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period_name TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            pay_date TEXT,
            status TEXT DEFAULT 'draft',
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Payroll entries (one per employee per period)
    c.execute("""
        CREATE TABLE IF NOT EXISTS payroll_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period_id INTEGER NOT NULL,
            employee_id INTEGER NOT NULL,
            -- Earnings
            basic_pay REAL DEFAULT 0,
            overtime_pay REAL DEFAULT 0,
            holiday_pay REAL DEFAULT 0,
            bonus REAL DEFAULT 0,
            other_earnings REAL DEFAULT 0,
            other_earnings_note TEXT,
            -- Deductions
            sss REAL DEFAULT 0,
            philhealth REAL DEFAULT 0,
            pagibig REAL DEFAULT 0,
            tax REAL DEFAULT 0,
            cash_advance REAL DEFAULT 0,
            absences REAL DEFAULT 0,
            late_deductions REAL DEFAULT 0,
            other_deductions REAL DEFAULT 0,
            other_deductions_note TEXT,
            -- Computed
            gross_pay REAL DEFAULT 0,
            total_deductions REAL DEFAULT 0,
            net_pay REAL DEFAULT 0,
            -- Status
            is_paid INTEGER DEFAULT 0,
            paid_via TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (period_id) REFERENCES payroll_periods(id),
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        )
    """)

    # ─── SEED DATA ────────────────────────────────────────────────────────────

    # Default admin user (password: admin123 — change after first login!)
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] == 0:
        admin_hash = hashlib.sha256("admin123".encode()).hexdigest()
        c.execute("INSERT INTO users (username, password_hash, display_name, role) VALUES (?,?,?,?)",
                  ("admin", admin_hash, "Administrator", "admin"))

    # Service packages
    c.execute("SELECT COUNT(*) FROM service_packages")
    if c.fetchone()[0] == 0:
        pkgs = [
            ("Basic Package", "Casket, embalming, basic chapel use (1-2 days wake)", 25000),
            ("Standard Package", "Casket, embalming, chapel (3 days wake), hearse, flowers", 45000),
            ("Premium Package", "Premium casket, embalming, chapel (3-5 days), hearse, flowers, memorial program, food service", 75000),
            ("Cremation Package", "Cremation service with urn, basic chapel use", 20000),
            ("Chapel Rental Only", "Chapel rental per day (no casket/embalming)", 5000),
            ("Custom", "Custom service — price varies", 0),
        ]
        c.executemany("INSERT INTO service_packages (name, description, base_price) VALUES (?, ?, ?)", pkgs)

    # Expense categories
    c.execute("SELECT COUNT(*) FROM expense_categories")
    if c.fetchone()[0] == 0:
        cats = [
            ("Caskets & Urns", "#e74c3c"),
            ("Embalming Supplies", "#e67e22"),
            ("Chapel Utilities", "#f39c12"),
            ("Staff Wages", "#9b59b6"),
            ("Vehicle / Hearse", "#3498db"),
            ("Flowers & Decorations", "#1abc9c"),
            ("Food & Catering", "#2ecc71"),
            ("Permits & Documents", "#34495e"),
            ("Maintenance & Repairs", "#d35400"),
            ("Rent / Lease", "#8e44ad"),
            ("Marketing", "#2980b9"),
            ("Miscellaneous", "#95a5a6"),
        ]
        c.executemany("INSERT INTO expense_categories (name, color) VALUES (?, ?)", cats)

    # Inventory categories
    c.execute("SELECT COUNT(*) FROM inventory_categories")
    if c.fetchone()[0] == 0:
        inv_cats = [
            ("Caskets",), ("Urns",), ("Embalming Chemicals",), ("Preservation Supplies",),
            ("Clothing & Accessories",), ("Flowers & Decorations",), ("Chapel Supplies",),
            ("Candles & Lighting",), ("Documents & Forms",), ("Cleaning Supplies",),
            ("Miscellaneous",),
        ]
        c.executemany("INSERT INTO inventory_categories (name) VALUES (?)", inv_cats)

    # Default accounts
    c.execute("SELECT COUNT(*) FROM accounts")
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO accounts (name, type, description, opening_balance) VALUES (?, ?, ?, ?)",
                  ("Main Bank Account", "bank", "Primary business bank account", 0))
        c.execute("INSERT INTO accounts (name, type, description, opening_balance) VALUES (?, ?, ?, ?)",
                  ("Cash on Hand", "cash", "Cash collections", 0))
        c.execute("INSERT INTO accounts (name, type, description, opening_balance) VALUES (?, ?, ?, ?)",
                  ("GCash", "gcash", "GCash account", 0))

    conn.commit()
    conn.close()


init_db()


# ─── HELPERS ──────────────────────────────────────────────────────────────────
def run_query(query, params=(), fetch=True):
    conn = get_db()
    if fetch:
        df = pd.read_sql_query(query, conn, params=params)
        conn.close()
        return df
    else:
        conn.execute(query, params)
        conn.commit()
        conn.close()


def run_insert(query, params=()):
    conn = get_db()
    c = conn.cursor()
    c.execute(query, params)
    conn.commit()
    last_id = c.lastrowid
    conn.close()
    return last_id


def fmt(amount):
    if amount is None:
        return "₱0.00"
    return f"₱{amount:,.2f}"


def get_service_balance(service_id):
    """How much the client still owes."""
    svc = run_query("SELECT total_amount, discount FROM services WHERE id=?", (service_id,))
    if len(svc) == 0:
        return 0
    net = svc.iloc[0]["total_amount"] - svc.iloc[0]["discount"]
    paid = run_query("SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE service_id=?",
                     (service_id,)).iloc[0]["t"]
    return net - paid


def get_account_balance(account_id):
    df = run_query("SELECT opening_balance FROM accounts WHERE id=?", (account_id,))
    opening = df.iloc[0]["opening_balance"] if len(df) > 0 else 0
    income = run_query(
        "SELECT COALESCE(SUM(p.amount),0) as t FROM payments p JOIN services s ON p.service_id = s.id WHERE 1=1",
        ()).iloc[0]["t"]  # simplified — all payments go to the business
    outflow = run_query(
        "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE account_id=?",
        (account_id,)).iloc[0]["t"]
    return opening - outflow  # payments tracked separately at service level


def print_html(title, body_html):
    """Render a printable HTML page in a popup iframe that auto-triggers print."""
    import streamlit.components.v1 as components
    logo_img = ""
    if LOGO_B64:
        logo_img = f'<img src="data:image/png;base64,{LOGO_B64}" style="height:60px; border-radius:8px; margin-right:15px;">'
    html = f"""
    <html>
    <head>
    <title>{title}</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #222; padding: 20px; margin: 0; font-size: 13px; }}
        h1 {{ color: #0a1e5e; font-size: 22px; margin-bottom: 4px; }}
        h2 {{ color: #0a1e5e; font-size: 17px; border-bottom: 3px solid #e8872a; padding-bottom: 4px; margin-top: 18px; }}
        h3 {{ color: #1a4fcf; font-size: 14px; margin-top: 14px; }}
        .header {{ display: flex; align-items: center; justify-content: center; margin-bottom: 15px;
                   border-bottom: 4px solid #e8872a; padding-bottom: 12px; }}
        .header-text {{ text-align: center; }}
        .header-text h1 {{ margin: 0; color: #0a1e5e; }}
        .header-text .sub {{ color: #e8872a; font-size: 12px; letter-spacing: 1px; }}
        table {{ border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 12px; }}
        th {{ background: #0a1e5e; color: white; padding: 7px 10px; text-align: left; font-size: 11px; }}
        td {{ border: 1px solid #ddd; padding: 5px 10px; }}
        tr:nth-child(even) {{ background: #f0f4ff; }}
        .row {{ display: flex; gap: 30px; }}
        .col {{ flex: 1; }}
        .label {{ color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }}
        .value {{ font-weight: bold; margin-bottom: 6px; color: #0a1e5e; }}
        .footer {{ text-align: center; color: #999; font-size: 10px; margin-top: 25px;
                   border-top: 3px solid #e8872a; padding-top: 8px; }}
        .badge {{ display: inline-block; background: #0a1e5e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; }}
        .amount {{ font-weight: bold; color: #0a1e5e; }}
        @media print {{
            body {{ padding: 10px; }}
            button {{ display: none !important; }}
        }}
    </style>
    </head>
    <body>
        <div class="header">
            {logo_img}
            <div class="header-text">
                <h1>L.E. Barroquillo Funeral Homes</h1>
                <div class="sub">MANAGEMENT SYSTEM</div>
            </div>
        </div>
        {body_html}
        <div class="footer">
            L.E. Barroquillo Funeral Homes &bull; Printed {date.today().strftime('%B %d, %Y %I:%M %p')}
        </div>
        <script>
            window.onload = function() {{ window.print(); }};
        </script>
    </body>
    </html>
    """
    components.html(html, height=800, scrolling=True)


def df_to_html_table(df):
    """Convert a pandas DataFrame to a styled HTML table string."""
    if len(df) == 0:
        return "<p><em>No data</em></p>"
    cols = df.columns.tolist()
    rows_html = "<table><tr>" + "".join(f"<th>{c}</th>" for c in cols) + "</tr>"
    for _, row in df.iterrows():
        rows_html += "<tr>" + "".join(f"<td>{row[c]}</td>" for c in cols) + "</tr>"
    rows_html += "</table>"
    return rows_html


# ─── AUTH & ROLES ─────────────────────────────────────────────────────────────

# Role -> allowed pages
ROLE_PAGES = {
    "admin": [
        "Dashboard", "Clients & Deceased", "Services", "Payments",
        "Inventory", "Suppliers", "Expenses", "Payroll", "Liabilities",
        "Service Packages", "Reports", "Admin Panel",
    ],
    "manager": [
        "Dashboard", "Clients & Deceased", "Services", "Payments",
        "Inventory", "Suppliers", "Expenses", "Liabilities",
        "Service Packages", "Reports",
    ],
    "staff": [
        "Dashboard", "Clients & Deceased", "Services", "Payments", "Inventory",
    ],
}


def hash_pw(password):
    return hashlib.sha256(password.encode()).hexdigest()


def check_login():
    if "logged_in" not in st.session_state:
        st.session_state["logged_in"] = False

    if not st.session_state["logged_in"]:
        logo_html = ""
        if LOGO_B64:
            logo_html = '<img src="data:image/png;base64,' + LOGO_B64 + '" style="width:150px; margin-bottom:10px; border-radius:12px;">'

        login_header = '<div style="text-align:center; padding: 2.5rem 0 1rem 0;">' + logo_html + '<div style="color: #0a1e5e; margin:0; font-size:2rem; font-weight:700;">L.E. Barroquillo</div><div style="color: #e8872a; margin:0; font-size:1.2rem; font-weight:400;">Funeral Homes</div><div style="color: #888; font-size:0.85rem; margin-top:8px;">Management System</div></div>'
        st.markdown(login_header, unsafe_allow_html=True)

        col_spacer1, col_form, col_spacer2 = st.columns([1, 2, 1])
        with col_form:
            with st.form("login_form"):
                username = st.text_input("Username")
                password = st.text_input("Password", type="password")
                submitted = st.form_submit_button("Login", type="primary", use_container_width=True)

                if submitted:
                    pw_hash = hash_pw(password)
                    user = run_query(
                        "SELECT id, username, display_name, role FROM users WHERE username=? AND password_hash=? AND is_active=1",
                        (username.strip().lower(), pw_hash))
                    if len(user) > 0:
                        u = user.iloc[0]
                        st.session_state["logged_in"] = True
                        st.session_state["user_id"] = int(u["id"])
                        st.session_state["username"] = u["username"]
                        st.session_state["display_name"] = u["display_name"]
                        st.session_state["role"] = u["role"]
                        st.rerun()
                    else:
                        st.error("Invalid username or password.")

            st.caption("Default login: admin / admin123")
        st.stop()


check_login()

# Current user info
USER_ROLE = st.session_state.get("role", "staff")
USER_NAME = st.session_state.get("display_name", "User")
ALLOWED_PAGES = ROLE_PAGES.get(USER_ROLE, ROLE_PAGES["staff"])


# ─── PAGE ICONS ───────────────────────────────────────────────────────────────
PAGE_ICONS = {
    "Dashboard": "📊",
    "Clients & Deceased": "👤",
    "Services": "⚰️",
    "Payments": "💳",
    "Inventory": "📦",
    "Suppliers": "🏪",
    "Expenses": "💸",
    "Payroll": "💰",
    "Liabilities": "📋",
    "Service Packages": "📑",
    "Reports": "📈",
    "Admin Panel": "⚙️",
}

# ─── SIDEBAR NAV ──────────────────────────────────────────────────────────────
with st.sidebar:
    # Logo + brand
    if LOGO_B64:
        st.markdown('<div style="text-align:center; padding: 10px 0 5px 0;"><img src="data:image/png;base64,' + LOGO_B64 + '" style="width:100px; border-radius:10px;"></div>', unsafe_allow_html=True)

    st.markdown('<div style="text-align:center; padding-bottom:5px;"><div style="color:white; font-size:18px; font-weight:700; letter-spacing:0.5px;">L.E. Barroquillo</div><div style="color:#e8872a; font-size:13px; font-weight:500;">Funeral Homes</div><div style="color:#8899bb; font-size:10px; margin-top:2px;">Management System</div></div>', unsafe_allow_html=True)

    st.markdown('<hr style="border-color:#1a3a7a; margin:10px 0;">', unsafe_allow_html=True)

    # User info
    st.markdown('<div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:10px 14px; margin-bottom:5px;"><div style="color:white; font-size:14px; font-weight:600;">' + USER_NAME + '</div><div style="color:#e8872a; font-size:11px;">' + USER_ROLE.title() + '</div></div>', unsafe_allow_html=True)

    if st.button("Logout", use_container_width=True):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.rerun()

    st.markdown('<hr style="border-color:#1a3a7a; margin:10px 0;">', unsafe_allow_html=True)

    # Navigation with icons
    nav_options = [f"{PAGE_ICONS.get(p, '📄')}  {p}" for p in ALLOWED_PAGES]
    nav_map = dict(zip(nav_options, ALLOWED_PAGES))

    selected_nav = st.radio(
        "Navigation",
        nav_options,
        label_visibility="collapsed",
    )
    page = nav_map[selected_nav]

    st.markdown('<hr style="border-color:#1a3a7a; margin:10px 0;">', unsafe_allow_html=True)
    st.markdown('<div style="color:#5a7ab5; font-size:11px; text-align:center;">' + date.today().strftime("%B %d, %Y") + '</div>', unsafe_allow_html=True)


# ─── BRANDED HEADER ───────────────────────────────────────────────────────────
logo_header = ""
if LOGO_B64:
    logo_header = '<img src="data:image/png;base64,' + LOGO_B64 + '" style="height:45px; border-radius:6px; margin-right:15px;">'

page_icon = PAGE_ICONS.get(page, "")
header_html = (
    '<div style="background: linear-gradient(135deg, #0a1e5e, #1a4fcf); padding: 12px 25px; border-radius: 10px;'
    ' margin-bottom: 20px; display:flex; align-items:center; justify-content:space-between;'
    ' border-bottom: 4px solid #e8872a; box-shadow: 0 4px 15px rgba(10,30,94,0.3);">'
    '<div style="display:flex; align-items:center;">'
    + logo_header +
    '<div><span style="color:white; font-size:20px; font-weight:700;">L.E. Barroquillo Funeral Homes</span><br>'
    '<span style="color:#e8872a; font-size:11px; letter-spacing:1px;">MANAGEMENT SYSTEM</span></div></div>'
    '<div style="color:#8899cc; font-size:12px; text-align:right;">' + page_icon + ' ' + page + '</div></div>'
)
st.markdown(header_html, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
#  DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════
# ─── NOTIFICATIONS / ALERTS ───────────────────────────────────────────────────
_today = date.today().isoformat()
_tomorrow = (date.today() + timedelta(days=1)).isoformat()
_in3days = (date.today() + timedelta(days=3)).isoformat()

# Burials today
_burials_today = run_query("""
    SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
           c.contact_name, c.contact_phone, s.burial_date, s.burial_location,
           sp.name as package
    FROM services s
    JOIN clients c ON s.client_id = c.id
    LEFT JOIN service_packages sp ON s.package_id = sp.id
    WHERE s.status = 'active' AND s.burial_date = ?
""", (_today,))

# Burials tomorrow
_burials_tomorrow = run_query("""
    SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
           c.contact_name, c.contact_phone, s.burial_date, s.burial_location
    FROM services s
    JOIN clients c ON s.client_id = c.id
    WHERE s.status = 'active' AND s.burial_date = ?
""", (_tomorrow,))

# Burials in next 3 days (excluding today & tomorrow)
_burials_upcoming = run_query("""
    SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
           c.contact_name, s.burial_date, s.burial_location
    FROM services s
    JOIN clients c ON s.client_id = c.id
    WHERE s.status = 'active' AND s.burial_date > ? AND s.burial_date <= ?
""", (_tomorrow, _in3days))

# Wake happening today
_wakes_today = run_query("""
    SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
           c.contact_name, s.wake_start_date, s.wake_end_date
    FROM services s
    JOIN clients c ON s.client_id = c.id
    WHERE s.status = 'active' AND ? BETWEEN s.wake_start_date AND s.wake_end_date
""", (_today,))

# Outstanding balances with burial approaching (unpaid & burial within 2 days)
_unpaid_urgent = run_query("""
    SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
           c.contact_name, s.burial_date, s.total_amount, s.discount
    FROM services s
    JOIN clients c ON s.client_id = c.id
    WHERE s.status = 'active' AND s.burial_date BETWEEN ? AND ?
""", (_today, _in3days))

# Show alerts
if len(_burials_today) > 0:
    for _, b in _burials_today.iterrows():
        st.error(
            "**🚨 BURIAL TODAY!** — **" + b["deceased"] + "**  \n"
            "Location: " + (b["burial_location"] or "TBD") +
            " | Contact: " + b["contact_name"] + " " + (b["contact_phone"] or "") +
            " | Package: " + (b["package"] or "Custom")
        )

if len(_burials_tomorrow) > 0:
    for _, b in _burials_tomorrow.iterrows():
        st.warning(
            "**⚠️ Burial TOMORROW** — **" + b["deceased"] + "**  \n"
            "Location: " + (b["burial_location"] or "TBD") +
            " | Contact: " + b["contact_name"] + " " + (b["contact_phone"] or "")
        )

if len(_wakes_today) > 0:
    for _, w in _wakes_today.iterrows():
        st.info(
            "**🕯️ Wake ongoing today** — **" + w["deceased"] + "**  \n"
            "Wake: " + (w["wake_start_date"] or "") + " to " + (w["wake_end_date"] or "") +
            " | Contact: " + w["contact_name"]
        )

if len(_burials_upcoming) > 0:
    for _, b in _burials_upcoming.iterrows():
        st.info(
            "**📅 Upcoming burial** — **" + b["deceased"] + "** on " + b["burial_date"] +
            " at " + (b["burial_location"] or "TBD")
        )

# Check unpaid with imminent burial
for _, u in _unpaid_urgent.iterrows():
    bal = get_service_balance(u["id"])
    if bal > 0:
        if u["burial_date"] == _today:
            st.error(
                "**🚨 POLICY ALERT: UNPAID — BURIAL TODAY!** — **" + u["deceased"] + "** still owes **" + fmt(bal) +
                "**. Policy: Full payment must be settled on or before interment. Contact: " + u["contact_name"]
            )
        elif u["burial_date"] == _tomorrow:
            st.error(
                "**⚠️ PAYMENT DUE TOMORROW** — **" + u["deceased"] + "** still owes **" + fmt(bal) +
                "**. Burial is tomorrow — payment must be settled before interment. Contact: " + u["contact_name"]
            )
        else:
            st.warning(
                "**💳 Unpaid balance** — **" + u["deceased"] + "** has **" + fmt(bal) +
                "** remaining, burial on " + u["burial_date"] +
                ". Reminder: Payment must be settled on or before interment. Contact: " + u["contact_name"]
            )


if page == "Dashboard":
    st.title("Dashboard")

    # Active services
    active_svc = run_query("SELECT COUNT(*) as c FROM services WHERE status='active'").iloc[0]["c"]
    completed_svc = run_query("SELECT COUNT(*) as c FROM services WHERE status='completed'").iloc[0]["c"]
    total_clients = run_query("SELECT COUNT(*) as c FROM clients").iloc[0]["c"]

    # This month financials
    ms = date.today().replace(day=1).isoformat()
    me = date.today().isoformat()
    month_revenue = run_query(
        "SELECT COALESCE(SUM(p.amount),0) as t FROM payments p WHERE p.date BETWEEN ? AND ?",
        (ms, me)).iloc[0]["t"]
    month_expenses = run_query(
        "SELECT COALESCE(SUM(e.amount),0) as t FROM expenses e WHERE e.date BETWEEN ? AND ?",
        (ms, me)).iloc[0]["t"]
    total_receivables = run_query("""
        SELECT COALESCE(SUM(s.total_amount - s.discount),0) -
               COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.service_id = s.id),0) as bal
        FROM services s WHERE s.status='active'
    """)
    # Compute receivables properly
    active_services = run_query("SELECT id FROM services WHERE status='active'")
    total_recv = sum(max(0, get_service_balance(r["id"])) for _, r in active_services.iterrows())

    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Active Services", int(active_svc))
    c2.metric("Total Clients", int(total_clients))
    c3.metric("Revenue (This Month)", fmt(month_revenue))
    c4.metric("Expenses (This Month)", fmt(month_expenses))
    c5.metric("Outstanding Balance", fmt(total_recv))

    st.markdown("---")

    # Active services list
    ch1, ch2 = st.columns(2)

    with ch1:
        st.subheader("Active Services")
        active = run_query("""
            SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
                   c.contact_name, sp.name as package, s.total_amount, s.status,
                   s.wake_start_date, s.burial_date
            FROM services s
            JOIN clients c ON s.client_id = c.id
            LEFT JOIN service_packages sp ON s.package_id = sp.id
            WHERE s.status = 'active'
            ORDER BY s.created_at DESC
        """)
        if len(active) > 0:
            for _, svc in active.iterrows():
                bal = get_service_balance(svc["id"])
                bal_text = f"Balance: {fmt(bal)}" if bal > 0 else "FULLY PAID"
                st.markdown(
                    f"**{svc['deceased']}** — {svc['package'] or 'Custom'}\n\n"
                    f"Contact: {svc['contact_name']} | {bal_text}\n\n"
                    f"Wake: {svc['wake_start_date'] or 'TBD'} | Burial: {svc['burial_date'] or 'TBD'}"
                )
                st.markdown("---")
        else:
            st.info("No active services.")

    with ch2:
        st.subheader("Revenue vs Expenses (Monthly)")
        trend = run_query("""
            SELECT month, 'Revenue' as type, total FROM (
                SELECT strftime('%Y-%m', date) as month, SUM(amount) as total FROM payments GROUP BY month
            )
            UNION ALL
            SELECT month, 'Expenses' as type, total FROM (
                SELECT strftime('%Y-%m', date) as month, SUM(amount) as total FROM expenses GROUP BY month
            )
            ORDER BY month
        """)
        if len(trend) > 0:
            fig = px.bar(trend, x="month", y="total", color="type", barmode="group",
                         color_discrete_map={"Revenue": "#27ae60", "Expenses": "#e74c3c"})
            fig.update_layout(margin=dict(t=20, b=20, l=20, r=20), height=350,
                              xaxis_title="", yaxis_title="Amount (₱)")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No financial data yet.")

    # Recent payments
    st.subheader("Recent Payments Received")
    recent_pay = run_query("""
        SELECT p.date, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
               c.contact_name, p.amount, p.method, p.reference, p.notes
        FROM payments p
        JOIN services s ON p.service_id = s.id
        JOIN clients c ON s.client_id = c.id
        ORDER BY p.date DESC, p.id DESC LIMIT 10
    """)
    if len(recent_pay) > 0:
        st.dataframe(recent_pay, use_container_width=True, hide_index=True)
    else:
        st.info("No payments recorded yet.")


# ═══════════════════════════════════════════════════════════════════════════════
#  CLIENTS & DECEASED
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Clients & Deceased":
    st.title("Clients & Deceased Records")
    tab_add, tab_view = st.tabs(["New Record", "View All"])

    with tab_add:
        with st.form("add_client", clear_on_submit=True):
            st.subheader("Deceased Information")
            d1, d2, d3 = st.columns(3)
            with d1:
                d_fname = st.text_input("First Name *")
                d_lname = st.text_input("Last Name *")
                d_mname = st.text_input("Middle Name")
            with d2:
                d_bday = st.date_input("Birthday", value=None, key="dob")
                d_age = st.number_input("Age", min_value=0, max_value=150, value=0,
                                         help="Auto-calculated if birthday is set")
                d_gender = st.selectbox("Gender", ["Male", "Female"])
                d_dod = st.date_input("Date of Death", date.today(), key="dod")
            with d3:
                d_cause = st.text_input("Cause of Death")
                d_address = st.text_area("Address of Deceased", height=80)

            st.markdown("---")
            st.subheader("Contact Person / Family")
            f1, f2 = st.columns(2)
            with f1:
                c_name = st.text_input("Contact Name *")
                c_rel = st.text_input("Relationship to Deceased", placeholder="e.g., Son, Daughter, Spouse")
                c_phone = st.text_input("Phone Number")
            with f2:
                c_email = st.text_input("Email (optional)")
                c_address = st.text_area("Contact Address", height=80)

            c_notes = st.text_area("Additional Notes", height=60)

            if st.form_submit_button("Save Record", type="primary", use_container_width=True):
                if d_fname and d_lname and c_name:
                    # Auto-calculate age from birthday if provided
                    calc_age = d_age
                    if d_bday and calc_age == 0:
                        calc_age = d_dod.year - d_bday.year - ((d_dod.month, d_dod.day) < (d_bday.month, d_bday.day))
                    run_insert("""
                        INSERT INTO clients (deceased_first_name, deceased_last_name, deceased_middle_name,
                            deceased_birthday, deceased_age, deceased_gender, deceased_date_of_death,
                            deceased_cause_of_death, deceased_address, contact_name, contact_relationship,
                            contact_phone, contact_email, contact_address, notes)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (d_fname.strip().title(), d_lname.strip().title(), d_mname.strip().title() if d_mname else None,
                          d_bday.isoformat() if d_bday else None,
                          calc_age if calc_age > 0 else None, d_gender, d_dod.isoformat(), d_cause,
                          d_address, c_name.strip().title(), c_rel, c_phone, c_email, c_address, c_notes))
                    st.success(f"Record saved for {d_fname} {d_lname}")
                    st.rerun()
                else:
                    st.error("Fill in required fields: First Name, Last Name, Contact Name")

    with tab_view:
        search = st.text_input("Search by name, contact, or phone", key="client_search")

        where = "1=1"
        params = []
        if search:
            where = "(deceased_first_name LIKE ? OR deceased_last_name LIKE ? OR contact_name LIKE ? OR contact_phone LIKE ?)"
            params = [f"%{search}%"] * 4

        clients = run_query(f"""
            SELECT id, deceased_first_name || ' ' || deceased_last_name as deceased_name,
                   deceased_age, deceased_gender, deceased_date_of_death,
                   contact_name, contact_phone, contact_relationship, created_at
            FROM clients
            WHERE {where}
            ORDER BY created_at DESC
        """, tuple(params))

        if len(clients) > 0:
            st.caption(f"{len(clients)} records")
            st.dataframe(clients, use_container_width=True, hide_index=True)

            # View full details
            with st.expander("View Full Details"):
                client_map = dict(zip(
                    clients.apply(lambda r: f"#{r['id']} — {r['deceased_name']}", axis=1),
                    clients["id"]))
                sel = st.selectbox("Select Record", list(client_map.keys()))
                cid = int(client_map[sel])
                detail = run_query("SELECT * FROM clients WHERE id=?", (cid,))
                if len(detail) > 0:
                    r = detail.iloc[0]
                    dc1, dc2 = st.columns(2)
                    with dc1:
                        st.markdown("**Deceased:**")
                        st.markdown(f"- Name: {r['deceased_first_name']} {r.get('deceased_middle_name') or ''} {r['deceased_last_name']}")
                        st.markdown(f"- Birthday: {r.get('deceased_birthday') or 'N/A'}")
                        st.markdown(f"- Age: {r['deceased_age'] or 'N/A'} | Gender: {r['deceased_gender'] or 'N/A'}")
                        st.markdown(f"- Date of Death: {r['deceased_date_of_death'] or 'N/A'}")
                        st.markdown(f"- Cause: {r['deceased_cause_of_death'] or 'N/A'}")
                        st.markdown(f"- Address: {r['deceased_address'] or 'N/A'}")
                    with dc2:
                        st.markdown("**Contact Person:**")
                        st.markdown(f"- Name: {r['contact_name']}")
                        st.markdown(f"- Relationship: {r['contact_relationship'] or 'N/A'}")
                        st.markdown(f"- Phone: {r['contact_phone'] or 'N/A'}")
                        st.markdown(f"- Email: {r['contact_email'] or 'N/A'}")
                        st.markdown(f"- Address: {r['contact_address'] or 'N/A'}")
                    if r["notes"]:
                        st.markdown(f"**Notes:** {r['notes']}")

                    # Get linked service info
                    svc_info = run_query("""
                        SELECT s.id, sp.name as package, s.total_amount, s.discount, s.status,
                               s.wake_start_date, s.burial_date, s.burial_location
                        FROM services s
                        LEFT JOIN service_packages sp ON s.package_id = sp.id
                        WHERE s.client_id = ?
                        ORDER BY s.created_at DESC LIMIT 1
                    """, (cid,))

                    pay_info = None
                    if len(svc_info) > 0:
                        sv = svc_info.iloc[0]
                        bal = get_service_balance(sv["id"])
                        paid = (sv["total_amount"] - sv["discount"]) - bal
                        pay_info = run_query(
                            "SELECT date, amount, method, reference FROM payments WHERE service_id=? ORDER BY date DESC",
                            (int(sv["id"]),))

                    # Print button
                    if st.button("Print Client Record", key=f"print_client_{cid}"):
                        full_name = f"{r['deceased_first_name']} {r.get('deceased_middle_name') or ''} {r['deceased_last_name']}".replace("  ", " ")
                        body = f"""
                        <h2>Deceased Information</h2>
                        <div class="row">
                            <div class="col">
                                <div class="label">Full Name</div><div class="value">{full_name}</div>
                                <div class="label">Birthday</div><div class="value">{r.get('deceased_birthday') or 'N/A'}</div>
                                <div class="label">Age</div><div class="value">{r['deceased_age'] or 'N/A'}</div>
                                <div class="label">Gender</div><div class="value">{r['deceased_gender'] or 'N/A'}</div>
                                <div class="label">Date of Death</div><div class="value">{r['deceased_date_of_death'] or 'N/A'}</div>
                            </div>
                            <div class="col">
                                <div class="label">Cause of Death</div><div class="value">{r['deceased_cause_of_death'] or 'N/A'}</div>
                                <div class="label">Address</div><div class="value">{r['deceased_address'] or 'N/A'}</div>
                            </div>
                        </div>
                        <h2>Contact Person / Family</h2>
                        <div class="row">
                            <div class="col">
                                <div class="label">Name</div><div class="value">{r['contact_name']}</div>
                                <div class="label">Relationship</div><div class="value">{r['contact_relationship'] or 'N/A'}</div>
                                <div class="label">Phone</div><div class="value">{r['contact_phone'] or 'N/A'}</div>
                            </div>
                            <div class="col">
                                <div class="label">Email</div><div class="value">{r['contact_email'] or 'N/A'}</div>
                                <div class="label">Address</div><div class="value">{r['contact_address'] or 'N/A'}</div>
                            </div>
                        </div>
                        """
                        if r["notes"]:
                            body += f"<h3>Notes</h3><p>{r['notes']}</p>"

                        if len(svc_info) > 0:
                            sv = svc_info.iloc[0]
                            bal = get_service_balance(sv["id"])
                            paid_amt = (sv["total_amount"] - sv["discount"]) - bal
                            body += f"""
                            <h2>Service Details</h2>
                            <div class="row">
                                <div class="col">
                                    <div class="label">Package</div><div class="value">{sv['package'] or 'Custom'}</div>
                                    <div class="label">Total Amount</div><div class="value amount">{fmt(sv['total_amount'])}</div>
                                    <div class="label">Discount</div><div class="value">{fmt(sv['discount'])}</div>
                                </div>
                                <div class="col">
                                    <div class="label">Net Amount</div><div class="value amount">{fmt(sv['total_amount'] - sv['discount'])}</div>
                                    <div class="label">Paid</div><div class="value">{fmt(paid_amt)}</div>
                                    <div class="label">Balance</div><div class="value amount">{fmt(bal)}</div>
                                    <div class="label">Status</div><div class="value"><span class="badge">{sv['status'].upper()}</span></div>
                                </div>
                            </div>
                            <div class="row" style="margin-top:8px;">
                                <div class="col">
                                    <div class="label">Wake</div><div class="value">{sv['wake_start_date'] or 'TBD'}</div>
                                </div>
                                <div class="col">
                                    <div class="label">Burial Date</div><div class="value">{sv['burial_date'] or 'TBD'}</div>
                                    <div class="label">Burial Location</div><div class="value">{sv['burial_location'] or 'TBD'}</div>
                                </div>
                            </div>
                            """
                            if pay_info is not None and len(pay_info) > 0:
                                body += "<h2>Payment History</h2>" + df_to_html_table(pay_info)

                        print_html(f"Client Record — {full_name}", body)
        else:
            st.info("No records found.")


# ═══════════════════════════════════════════════════════════════════════════════
#  SERVICES
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Services":
    st.title("Service Records")
    tab_new, tab_active, tab_all = st.tabs(["New Service", "Active", "All Services"])

    with tab_new:
        clients_df = run_query(
            "SELECT id, deceased_first_name || ' ' || deceased_last_name as name FROM clients ORDER BY created_at DESC")
        pkgs_df = run_query("SELECT id, name, base_price FROM service_packages WHERE is_active=1")

        if len(clients_df) == 0:
            st.warning("Add a client record first in **Clients & Deceased**.")
        else:
            with st.form("new_service", clear_on_submit=True):
                st.subheader("Create Service Record")

                client_map = dict(zip(
                    clients_df.apply(lambda r: f"#{r['id']} — {r['name']}", axis=1),
                    clients_df["id"]))
                sel_client = st.selectbox("Client (Deceased) *", list(client_map.keys()))

                s1, s2 = st.columns(2)
                with s1:
                    pkg_map = dict(zip(pkgs_df["name"], pkgs_df["id"])) if len(pkgs_df) > 0 else {}
                    pkg_prices = dict(zip(pkgs_df["name"], pkgs_df["base_price"])) if len(pkgs_df) > 0 else {}
                    sel_pkg = st.selectbox("Service Package", list(pkg_map.keys()) if pkg_map else ["None"])
                    base = pkg_prices.get(sel_pkg, 0)
                    total_amt = st.number_input("Total Amount (₱) *", min_value=0.0, value=float(base),
                                                step=100.0, format="%.2f")
                    discount = st.number_input("Discount (₱)", min_value=0.0, step=100.0, format="%.2f")
                with s2:
                    wake_start = st.date_input("Wake Start Date", date.today(), key="ws")
                    wake_end = st.date_input("Wake End Date", date.today() + timedelta(days=3), key="we")
                    burial_date = st.date_input("Burial / Cremation Date", date.today() + timedelta(days=3), key="bd")
                    burial_loc = st.text_input("Burial Location", placeholder="e.g., Roxas City Public Cemetery")

                svc_notes = st.text_area("Service Notes", height=80)

                if st.form_submit_button("Create Service", type="primary", use_container_width=True):
                    if total_amt > 0:
                        run_insert("""
                            INSERT INTO services (client_id, package_id, total_amount, discount,
                                wake_start_date, wake_end_date, burial_date, burial_location, notes)
                            VALUES (?,?,?,?,?,?,?,?,?)
                        """, (int(client_map[sel_client]),
                              int(pkg_map[sel_pkg]) if pkg_map else None,
                              total_amt, discount,
                              wake_start.isoformat(), wake_end.isoformat(),
                              burial_date.isoformat(), burial_loc, svc_notes))
                        st.success("Service record created!")
                        st.rerun()
                    else:
                        st.error("Enter a total amount.")

    with tab_active:
        active = run_query("""
            SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
                   c.contact_name, c.contact_phone,
                   sp.name as package, s.total_amount, s.discount,
                   s.wake_start_date, s.wake_end_date, s.burial_date, s.burial_location,
                   s.status, s.notes
            FROM services s
            JOIN clients c ON s.client_id = c.id
            LEFT JOIN service_packages sp ON s.package_id = sp.id
            WHERE s.status = 'active'
            ORDER BY s.created_at DESC
        """)

        if len(active) > 0:
            for _, svc in active.iterrows():
                bal = get_service_balance(svc["id"])
                paid = (svc["total_amount"] - svc["discount"]) - bal
                pct = paid / (svc["total_amount"] - svc["discount"]) if (svc["total_amount"] - svc["discount"]) > 0 else 0

                with st.expander(f"🟢 {svc['deceased']} — {svc['package'] or 'Custom'} | Balance: {fmt(bal)}"):
                    sc1, sc2 = st.columns(2)
                    with sc1:
                        st.markdown(f"**Package:** {svc['package'] or 'Custom'}")
                        st.markdown(f"**Total:** {fmt(svc['total_amount'])} | Discount: {fmt(svc['discount'])}")
                        st.markdown(f"**Net Amount:** {fmt(svc['total_amount'] - svc['discount'])}")
                        st.markdown(f"**Paid:** {fmt(paid)} | **Balance:** {fmt(bal)}")
                    with sc2:
                        st.markdown(f"**Contact:** {svc['contact_name']} ({svc['contact_phone'] or 'No phone'})")
                        st.markdown(f"**Wake:** {svc['wake_start_date'] or 'TBD'} to {svc['wake_end_date'] or 'TBD'}")
                        st.markdown(f"**Burial:** {svc['burial_date'] or 'TBD'} at {svc['burial_location'] or 'TBD'}")

                    st.progress(min(pct, 1.0), text=f"{pct:.0%} paid")

                    if svc["notes"]:
                        st.markdown(f"**Notes:** {svc['notes']}")

                    # Payment history for this service
                    pays = run_query("""
                        SELECT date, amount, method, reference, notes
                        FROM payments WHERE service_id=? ORDER BY date DESC
                    """, (int(svc["id"]),))
                    if len(pays) > 0:
                        st.markdown("**Payments:**")
                        st.dataframe(pays, use_container_width=True, hide_index=True)

                    # Mark complete
                    bc1, bc2 = st.columns(2)
                    with bc1:
                        if st.button("Mark as Completed", key=f"comp_{svc['id']}"):
                            run_query("UPDATE services SET status='completed' WHERE id=?",
                                      (int(svc["id"]),), fetch=False)
                            st.success("Service marked as completed."); st.rerun()
                    with bc2:
                        if st.button("Cancel Service", key=f"cancel_{svc['id']}"):
                            run_query("UPDATE services SET status='cancelled' WHERE id=?",
                                      (int(svc["id"]),), fetch=False)
                            st.warning("Service cancelled."); st.rerun()
        else:
            st.info("No active services.")

    with tab_all:
        all_svc = run_query("""
            SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
                   c.contact_name, sp.name as package, s.total_amount, s.discount,
                   s.status, s.burial_date, s.created_at
            FROM services s
            JOIN clients c ON s.client_id = c.id
            LEFT JOIN service_packages sp ON s.package_id = sp.id
            ORDER BY s.created_at DESC
        """)
        if len(all_svc) > 0:
            st.dataframe(all_svc, use_container_width=True, hide_index=True)
        else:
            st.info("No services recorded yet.")


# ═══════════════════════════════════════════════════════════════════════════════
#  PAYMENTS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Payments":
    st.title("Payments")
    tab_add, tab_view, tab_balances = st.tabs(["Record Payment", "Payment History", "Outstanding Balances"])

    with tab_add:
        # Get services with balances
        svc_df = run_query("""
            SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
                   s.total_amount, s.discount
            FROM services s JOIN clients c ON s.client_id = c.id
            WHERE s.status = 'active'
            ORDER BY s.created_at DESC
        """)

        if len(svc_df) > 0:
            with st.form("add_payment", clear_on_submit=True):
                st.subheader("Record Client Payment")

                svc_options = {}
                for _, r in svc_df.iterrows():
                    bal = get_service_balance(r["id"])
                    label = f"#{r['id']} — {r['deceased']} (Balance: {fmt(bal)})"
                    svc_options[label] = r["id"]

                sel_svc = st.selectbox("Service *", list(svc_options.keys()))

                p1, p2 = st.columns(2)
                with p1:
                    pay_date = st.date_input("Payment Date", date.today(), key="pay_date")
                    pay_amount = st.number_input("Amount (₱) *", min_value=0.01, step=100.0, format="%.2f")
                with p2:
                    pay_method = st.selectbox("Payment Method", ["cash", "bank_transfer", "gcash", "maya", "check", "other"])
                    pay_ref = st.text_input("Reference / Receipt #")

                pay_notes = st.text_input("Notes")

                if st.form_submit_button("Record Payment", type="primary", use_container_width=True):
                    run_insert(
                        "INSERT INTO payments (service_id, date, amount, method, reference, notes) VALUES (?,?,?,?,?,?)",
                        (int(svc_options[sel_svc]), pay_date.isoformat(), pay_amount, pay_method, pay_ref, pay_notes))
                    st.success(f"Payment of {fmt(pay_amount)} recorded!")
                    st.rerun()
        else:
            st.info("No active services. Create a service record first.")

    with tab_view:
        fc1, fc2 = st.columns(2)
        with fc1:
            pf_start = st.date_input("From", date.today().replace(day=1), key="pf")
        with fc2:
            pf_end = st.date_input("To", date.today(), key="pe")

        pay_hist = run_query("""
            SELECT p.id, p.date, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
                   c.contact_name, p.amount, p.method, p.reference, p.notes
            FROM payments p
            JOIN services s ON p.service_id = s.id
            JOIN clients c ON s.client_id = c.id
            WHERE p.date BETWEEN ? AND ?
            ORDER BY p.date DESC, p.id DESC
        """, (pf_start.isoformat(), pf_end.isoformat()))

        if len(pay_hist) > 0:
            total_collected = pay_hist["amount"].sum()
            st.caption(f"{len(pay_hist)} payments | Total collected: {fmt(total_collected)}")
            st.dataframe(pay_hist, use_container_width=True, hide_index=True)
        else:
            st.info("No payments found for this period.")

    with tab_balances:
        st.subheader("Outstanding Balances")
        st.caption("Policy: Full payment must be settled on or before interment.")

        all_active_svc = run_query("""
            SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
                   c.contact_name, c.contact_phone,
                   sp.name as package, s.total_amount, s.discount,
                   s.burial_date, s.status
            FROM services s
            JOIN clients c ON s.client_id = c.id
            LEFT JOIN service_packages sp ON s.package_id = sp.id
            WHERE s.status IN ('active', 'completed')
            ORDER BY s.status ASC, s.burial_date ASC
        """)

        if len(all_active_svc) > 0:
            balance_rows = []
            for _, svc in all_active_svc.iterrows():
                bal = get_service_balance(svc["id"])
                net = svc["total_amount"] - svc["discount"]
                paid = net - bal

                # Get payment history for this service
                pays = run_query(
                    "SELECT date, amount, method FROM payments WHERE service_id=? ORDER BY date DESC",
                    (int(svc["id"]),))
                pay_count = len(pays)
                last_pay = pays.iloc[0]["date"] if pay_count > 0 else "No payments"

                # Determine urgency
                if bal <= 0:
                    urgency = "FULLY PAID"
                elif svc["burial_date"] and svc["burial_date"] <= _today:
                    urgency = "OVERDUE"
                elif svc["burial_date"] and svc["burial_date"] <= _in3days:
                    urgency = "DUE SOON"
                else:
                    urgency = "PENDING"

                balance_rows.append({
                    "ID": svc["id"],
                    "Deceased": svc["deceased"],
                    "Contact": svc["contact_name"],
                    "Phone": svc["contact_phone"] or "",
                    "Package": svc["package"] or "Custom",
                    "Total": fmt(net),
                    "Paid": fmt(paid),
                    "Balance": fmt(bal),
                    "Payments": pay_count,
                    "Last Payment": last_pay,
                    "Burial Date": svc["burial_date"] or "TBD",
                    "Status": urgency,
                    "_bal_raw": bal,
                    "_svc_id": svc["id"],
                })

            bal_df = pd.DataFrame(balance_rows)

            # Summary metrics
            with_balance = bal_df[bal_df["_bal_raw"] > 0]
            fully_paid = bal_df[bal_df["_bal_raw"] <= 0]
            overdue = bal_df[bal_df["Status"] == "OVERDUE"]

            bm1, bm2, bm3, bm4 = st.columns(4)
            bm1.metric("With Balance", len(with_balance))
            bm2.metric("Fully Paid", len(fully_paid))
            bm3.metric("Overdue", len(overdue))
            bm4.metric("Total Outstanding", fmt(with_balance["_bal_raw"].sum()))

            # Show overdue first
            if len(overdue) > 0:
                st.error("**OVERDUE — Burial date passed, payment not settled:**")
                st.dataframe(
                    overdue[["Deceased", "Contact", "Phone", "Total", "Paid", "Balance", "Burial Date", "Last Payment"]],
                    use_container_width=True, hide_index=True)

            # Clients with balance
            if len(with_balance) > 0:
                st.markdown("---")
                st.markdown("**All Clients with Outstanding Balance:**")
                st.dataframe(
                    with_balance[["Deceased", "Contact", "Phone", "Package", "Total", "Paid", "Balance", "Payments", "Last Payment", "Burial Date", "Status"]],
                    use_container_width=True, hide_index=True)

            # Fully paid
            if len(fully_paid) > 0:
                with st.expander(f"Fully Paid ({len(fully_paid)} clients)"):
                    st.dataframe(
                        fully_paid[["Deceased", "Contact", "Package", "Total", "Paid", "Payments", "Last Payment"]],
                        use_container_width=True, hide_index=True)

            # Print button
            if st.button("Print Balance Summary", key="print_bal"):
                body = '<div style="text-align:center; margin-bottom:10px; padding:8px; background:#0a1e5e; color:white; border-radius:4px;"><strong>POLICY: Full payment must be settled on or before interment</strong></div>'
                body += "<p><strong>With Balance:</strong> " + str(len(with_balance)) + " | <strong>Fully Paid:</strong> " + str(len(fully_paid)) + " | <strong>Overdue:</strong> " + str(len(overdue)) + " | <strong>Total Outstanding:</strong> " + fmt(with_balance["_bal_raw"].sum()) + "</p>"
                if len(with_balance) > 0:
                    body += "<h2>Outstanding Balances</h2>"
                    print_bal = with_balance[["Deceased", "Contact", "Phone", "Package", "Total", "Paid", "Balance", "Burial Date", "Status"]].copy()
                    body += df_to_html_table(print_bal)
                if len(overdue) > 0:
                    body += '<h2 style="color:#e74c3c;">Overdue Accounts</h2>'
                    print_od = overdue[["Deceased", "Contact", "Phone", "Total", "Paid", "Balance", "Burial Date"]].copy()
                    body += df_to_html_table(print_od)
                print_html("Outstanding Balances", body)
        else:
            st.info("No services recorded yet.")


# ═══════════════════════════════════════════════════════════════════════════════
#  SUPPLIERS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Suppliers":
    st.title("Suppliers")
    tab_view, tab_add = st.tabs(["Supplier Directory", "Add Supplier"])

    with tab_view:
        search_sup = st.text_input("Search suppliers", key="sup_search")
        where_sup = "is_active=1"
        params_sup = []
        if search_sup:
            where_sup += " AND (business_name LIKE ? OR contact_person LIKE ? OR products_supplied LIKE ? OR phone LIKE ?)"
            params_sup = [f"%{search_sup}%"] * 4

        suppliers = run_query(f"""
            SELECT * FROM suppliers WHERE {where_sup} ORDER BY business_name
        """, tuple(params_sup))

        if len(suppliers) > 0:
            st.caption(f"{len(suppliers)} suppliers")

            for _, sup in suppliers.iterrows():
                with st.expander(f"**{sup['business_name']}** — {sup['products_supplied'] or 'General'}"):
                    sc1, sc2 = st.columns(2)
                    with sc1:
                        st.markdown("**Contact Details**")
                        st.markdown(f"- **Contact Person:** {sup['contact_person'] or 'N/A'}")
                        st.markdown(f"- **Phone:** {sup['phone'] or 'N/A'}")
                        st.markdown(f"- **Email:** {sup['email'] or 'N/A'}")
                        st.markdown(f"- **Address:** {sup['address'] or 'N/A'}")
                        st.markdown(f"- **Products:** {sup['products_supplied'] or 'N/A'}")
                        st.markdown(f"- **Payment Terms:** {sup['payment_terms'] or 'N/A'}")
                    with sc2:
                        if USER_ROLE == "admin":
                            st.markdown("**Payment / Bank Details**")
                            if sup['bank_name']:
                                st.markdown(f"- **Bank:** {sup['bank_name']}")
                                st.markdown(f"- **Account Name:** {sup['bank_account_name'] or 'N/A'}")
                                st.markdown(f"- **Account #:** {sup['bank_account_number'] or 'N/A'}")
                            else:
                                st.markdown("- *No bank details on file*")
                            if sup['gcash_number']:
                                st.markdown(f"- **GCash:** {sup['gcash_number']}")
                            if sup['maya_number']:
                                st.markdown(f"- **Maya:** {sup['maya_number']}")
                        else:
                            st.markdown("**Payment / Bank Details**")
                            st.markdown("*Restricted — Admin only*")
                    if sup["notes"]:
                        st.markdown(f"**Notes:** {sup['notes']}")

                    # Print supplier details
                    bc1, bc2 = st.columns(2)
                    with bc1:
                        if st.button("Print Details", key=f"print_sup_{sup['id']}"):
                            body = f"<h2>Supplier Details</h2>"
                            body += f"<h3>{sup['business_name']}</h3>"
                            body += '<div class="row"><div class="col">'
                            body += '<div class="label">Contact Person</div><div class="value">' + (sup['contact_person'] or 'N/A') + '</div>'
                            body += '<div class="label">Phone</div><div class="value">' + (sup['phone'] or 'N/A') + '</div>'
                            body += '<div class="label">Email</div><div class="value">' + (sup['email'] or 'N/A') + '</div>'
                            body += '<div class="label">Address</div><div class="value">' + (sup['address'] or 'N/A') + '</div>'
                            body += '<div class="label">Products Supplied</div><div class="value">' + (sup['products_supplied'] or 'N/A') + '</div>'
                            body += '<div class="label">Payment Terms</div><div class="value">' + (sup['payment_terms'] or 'N/A') + '</div>'
                            body += '</div><div class="col">'
                            body += '<div class="label">Bank</div><div class="value">' + (sup['bank_name'] or 'N/A') + '</div>'
                            body += '<div class="label">Account Name</div><div class="value">' + (sup['bank_account_name'] or 'N/A') + '</div>'
                            body += '<div class="label">Account Number</div><div class="value">' + (sup['bank_account_number'] or 'N/A') + '</div>'
                            body += '<div class="label">GCash</div><div class="value">' + (sup['gcash_number'] or 'N/A') + '</div>'
                            body += '<div class="label">Maya</div><div class="value">' + (sup['maya_number'] or 'N/A') + '</div>'
                            body += '</div></div>'
                            if sup['notes']:
                                body += f"<h3>Notes</h3><p>{sup['notes']}</p>"
                            print_html(f"Supplier — {sup['business_name']}", body)
                    with bc2:
                        if st.button("Deactivate", key=f"deact_sup_{sup['id']}"):
                            run_query("UPDATE suppliers SET is_active=0 WHERE id=?", (int(sup['id']),), fetch=False)
                            st.success("Supplier deactivated."); st.rerun()
        else:
            st.info("No suppliers found. Add one in the **Add Supplier** tab.")

    with tab_add:
        with st.form("add_supplier", clear_on_submit=True):
            st.subheader("New Supplier")

            st.markdown("**Business Information**")
            sa1, sa2 = st.columns(2)
            with sa1:
                sup_name = st.text_input("Business Name *", placeholder="e.g., Manila Casket Supply Co.")
                sup_contact = st.text_input("Contact Person", placeholder="e.g., Juan Dela Cruz")
                sup_phone = st.text_input("Phone Number", placeholder="e.g., 0917-xxx-xxxx")
                sup_email = st.text_input("Email")
            with sa2:
                sup_address = st.text_area("Address", height=80)
                sup_products = st.text_input("Products / Services Supplied",
                                              placeholder="e.g., Caskets, Urns, Embalming chemicals")
                sup_terms = st.text_input("Payment Terms", placeholder="e.g., COD, Net 30, 50% down")

            st.markdown("---")
            st.markdown("**Payment / Bank Details**")
            sb1, sb2 = st.columns(2)
            with sb1:
                sup_bank = st.text_input("Bank Name", placeholder="e.g., BDO, BPI, Metrobank")
                sup_acc_name = st.text_input("Account Name", placeholder="Name on the bank account")
                sup_acc_num = st.text_input("Account Number")
            with sb2:
                sup_gcash = st.text_input("GCash Number")
                sup_maya = st.text_input("Maya Number")

            sup_notes = st.text_area("Notes", height=80, key="sup_notes")

            if st.form_submit_button("Save Supplier", type="primary", use_container_width=True):
                if sup_name:
                    run_insert("""
                        INSERT INTO suppliers (business_name, contact_person, phone, email, address,
                            bank_name, bank_account_name, bank_account_number, gcash_number, maya_number,
                            products_supplied, payment_terms, notes)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (sup_name.strip(), sup_contact, sup_phone, sup_email, sup_address,
                          sup_bank, sup_acc_name, sup_acc_num, sup_gcash, sup_maya,
                          sup_products, sup_terms, sup_notes))
                    st.success(f"Supplier '{sup_name}' added!")
                    st.rerun()
                else:
                    st.error("Business name is required.")


# ═══════════════════════════════════════════════════════════════════════════════
#  EXPENSES
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Expenses":
    st.title("Business Expenses")
    tab_add, tab_view, tab_cats = st.tabs(["Add Expense", "View Expenses", "Manage Categories"])

    with tab_add:
        with st.form("add_expense", clear_on_submit=True):
            st.subheader("Record Expense")

            e1, e2 = st.columns(2)
            with e1:
                exp_date = st.date_input("Date", date.today(), key="exp_date")
                cats = run_query("SELECT id, name FROM expense_categories WHERE is_active=1")
                cat_map = dict(zip(cats["name"], cats["id"])) if len(cats) > 0 else {}
                cat_choices = list(cat_map.keys()) + ["-- Others (type below) --"]
                exp_cat = st.selectbox("Category", cat_choices)
                exp_cat_custom = st.text_input("New category name (if Others)",
                                                placeholder="e.g., Transportation, Insurance...",
                                                help="Only used when 'Others' is selected above")
                exp_amount = st.number_input("Amount (₱) *", min_value=0.01, step=10.0, format="%.2f")
            with e2:
                acc_df = run_query("SELECT id, name FROM accounts WHERE is_active=1")
                acc_map = dict(zip(acc_df["name"], acc_df["id"])) if len(acc_df) > 0 else {}
                exp_acc = st.selectbox("Paid From", list(acc_map.keys()) if acc_map else ["None"])
                exp_ref = st.text_input("Reference / Receipt #")

                # Optionally link to a service
                svc_df = run_query("""
                    SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as d
                    FROM services s JOIN clients c ON s.client_id = c.id WHERE s.status='active'
                """)
                svc_map = {"(None — general expense)": None}
                for _, r in svc_df.iterrows():
                    svc_map[f"#{r['id']} — {r['d']}"] = r["id"]
                exp_svc = st.selectbox("Link to Service (optional)", list(svc_map.keys()))

            exp_desc = st.text_area("Description", height=80)

            if st.form_submit_button("Save Expense", type="primary", use_container_width=True):
                # Resolve category — create new one if "Others" selected
                if exp_cat == "-- Others (type below) --":
                    if not exp_cat_custom.strip():
                        st.error("Please type a category name when selecting Others.")
                        st.stop()
                    # Check if it already exists
                    existing = run_query("SELECT id FROM expense_categories WHERE name=?",
                                         (exp_cat_custom.strip(),))
                    if len(existing) > 0:
                        final_cat_id = int(existing.iloc[0]["id"])
                    else:
                        final_cat_id = run_insert(
                            "INSERT INTO expense_categories (name, color) VALUES (?,?)",
                            (exp_cat_custom.strip(), "#6c757d"))
                elif cat_map:
                    final_cat_id = cat_map[exp_cat]
                else:
                    st.error("No categories available.")
                    st.stop()

                if acc_map:
                    svc_id = svc_map[exp_svc]
                    run_insert(
                        "INSERT INTO expenses (date, category_id, account_id, amount, description, reference, service_id) VALUES (?,?,?,?,?,?,?)",
                        (exp_date.isoformat(), final_cat_id, acc_map[exp_acc],
                         exp_amount, exp_desc, exp_ref, svc_id))
                    st.success(f"Expense of {fmt(exp_amount)} recorded!")
                    st.rerun()

    with tab_view:
        ef1, ef2 = st.columns(2)
        with ef1:
            efs = st.date_input("From", date.today().replace(day=1), key="efs")
        with ef2:
            efe = st.date_input("To", date.today(), key="efe")

        exps = run_query("""
            SELECT e.id, e.date, ec.name as category, a.name as account, e.amount,
                   e.description, e.reference
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category_id = ec.id
            LEFT JOIN accounts a ON e.account_id = a.id
            WHERE e.date BETWEEN ? AND ?
            ORDER BY e.date DESC, e.id DESC
        """, (efs.isoformat(), efe.isoformat()))

        if len(exps) > 0:
            st.caption(f"{len(exps)} expenses | Total: {fmt(exps['amount'].sum())}")
            st.dataframe(exps, use_container_width=True, hide_index=True)

            # Summary by category
            st.subheader("By Category")
            summ = run_query("""
                SELECT ec.name as category, ec.color, SUM(e.amount) as total, COUNT(*) as count
                FROM expenses e JOIN expense_categories ec ON e.category_id = ec.id
                WHERE e.date BETWEEN ? AND ?
                GROUP BY ec.name, ec.color ORDER BY total DESC
            """, (efs.isoformat(), efe.isoformat()))
            if len(summ) > 0:
                fig = px.bar(summ, x="total", y="category", orientation="h",
                             color="category", color_discrete_sequence=summ["color"].tolist())
                fig.update_layout(showlegend=False, margin=dict(t=10, b=10), height=300,
                                  xaxis_title="Amount (₱)", yaxis_title="")
                st.plotly_chart(fig, use_container_width=True)

            with st.expander("Delete an Expense"):
                del_id = st.number_input("Expense ID", min_value=1, step=1, key="del_exp")
                if st.button("Delete", key="del_exp_btn"):
                    run_query("DELETE FROM expenses WHERE id=?", (int(del_id),), fetch=False)
                    st.success("Deleted."); st.rerun()
        else:
            st.info("No expenses for this period.")

    with tab_cats:
        st.subheader("Expense Categories")
        all_cats = run_query("SELECT * FROM expense_categories ORDER BY name")

        if len(all_cats) > 0:
            for _, cat in all_cats.iterrows():
                st.markdown(f"{'🟢' if cat['is_active'] else '🔴'} **{cat['name']}**")

            with st.expander("Enable / Disable Category"):
                cat_map = dict(zip(all_cats["name"], all_cats["id"]))
                sel_cat = st.selectbox("Select Category", list(cat_map.keys()), key="toggle_exp_cat")
                if st.button("Toggle Active", key="toggle_exp_cat_btn"):
                    run_query(
                        "UPDATE expense_categories SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?",
                        (int(cat_map[sel_cat]),), fetch=False)
                    st.success("Updated!"); st.rerun()

        st.markdown("---")
        with st.form("add_exp_cat", clear_on_submit=True):
            st.subheader("Add New Category")
            new_cat_name = st.text_input("Category Name *", placeholder="e.g., Transportation, Insurance, etc.")
            new_cat_color = st.color_picker("Color", "#6c757d")
            if st.form_submit_button("Add Category", type="primary", use_container_width=True):
                if new_cat_name:
                    existing = run_query("SELECT id FROM expense_categories WHERE name=?", (new_cat_name.strip(),))
                    if len(existing) > 0:
                        st.error("Category already exists.")
                    else:
                        run_insert("INSERT INTO expense_categories (name, color) VALUES (?,?)",
                                   (new_cat_name.strip(), new_cat_color))
                        st.success(f"Category '{new_cat_name}' added!")
                        st.rerun()
                else:
                    st.error("Name required.")


# ═══════════════════════════════════════════════════════════════════════════════
#  PAYROLL
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Payroll":
    st.title("Payroll")
    tab_employees, tab_add_emp, tab_run_payroll, tab_history, tab_payslip = st.tabs([
        "Employees", "Add Employee", "Run Payroll", "Payroll History", "Payslips"])

    # ── EMPLOYEES TAB ──
    with tab_employees:
        emps = run_query("SELECT * FROM employees WHERE is_active=1 ORDER BY last_name, first_name")
        if len(emps) > 0:
            st.caption(str(len(emps)) + " active employees")
            for _, emp in emps.iterrows():
                rate_label = fmt(emp["rate_amount"]) + "/" + ("mo" if emp["rate_type"] == "monthly" else "day")
                with st.expander(emp["last_name"] + ", " + emp["first_name"] + " — " + (emp["position"] or "Staff") + " | " + rate_label):
                    ec1, ec2 = st.columns(2)
                    with ec1:
                        st.markdown("**Personal Info**")
                        st.markdown("- **Name:** " + emp["first_name"] + " " + emp["last_name"])
                        st.markdown("- **Position:** " + (emp["position"] or "N/A"))
                        st.markdown("- **Type:** " + (emp["employment_type"] or "Regular").title())
                        st.markdown("- **Rate:** " + rate_label)
                        st.markdown("- **Phone:** " + (emp["phone"] or "N/A"))
                        st.markdown("- **Date Hired:** " + (emp["date_hired"] or "N/A"))
                    with ec2:
                        st.markdown("**Government IDs**")
                        st.markdown("- **SSS:** " + (emp["sss_number"] or "N/A"))
                        st.markdown("- **PhilHealth:** " + (emp["philhealth_number"] or "N/A"))
                        st.markdown("- **Pag-IBIG:** " + (emp["pagibig_number"] or "N/A"))
                        st.markdown("- **TIN:** " + (emp["tin_number"] or "N/A"))
                        st.markdown("- **Address:** " + (emp["address"] or "N/A"))

                    if st.button("Deactivate Employee", key="deact_emp_" + str(emp["id"])):
                        run_query("UPDATE employees SET is_active=0 WHERE id=?", (int(emp["id"]),), fetch=False)
                        st.success("Employee deactivated."); st.rerun()
        else:
            st.info("No employees. Add one in the **Add Employee** tab.")

    # ── ADD EMPLOYEE TAB ──
    with tab_add_emp:
        with st.form("add_employee", clear_on_submit=True):
            st.subheader("New Employee")
            ae1, ae2 = st.columns(2)
            with ae1:
                emp_fname = st.text_input("First Name *")
                emp_lname = st.text_input("Last Name *")
                emp_position = st.text_input("Position", placeholder="e.g., Embalmer, Driver, Chapel Staff")
                emp_type = st.selectbox("Employment Type", ["regular", "contractual", "part_time"])
                emp_rate_type = st.selectbox("Rate Type", ["monthly", "daily"])
                emp_rate = st.number_input("Rate Amount (₱) *", min_value=0.0, step=100.0, format="%.2f")
            with ae2:
                emp_phone = st.text_input("Phone")
                emp_address = st.text_area("Address", height=68)
                emp_sss = st.text_input("SSS Number")
                emp_philhealth = st.text_input("PhilHealth Number")
                emp_pagibig = st.text_input("Pag-IBIG Number")
                emp_tin = st.text_input("TIN")
            emp_hired = st.date_input("Date Hired", value=None, key="emp_hired")

            if st.form_submit_button("Save Employee", type="primary", use_container_width=True):
                if emp_fname and emp_lname and emp_rate > 0:
                    run_insert("""
                        INSERT INTO employees (first_name, last_name, position, employment_type,
                            rate_type, rate_amount, phone, address, sss_number, philhealth_number,
                            pagibig_number, tin_number, date_hired)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (emp_fname.strip().title(), emp_lname.strip().title(), emp_position,
                          emp_type, emp_rate_type, emp_rate, emp_phone, emp_address,
                          emp_sss, emp_philhealth, emp_pagibig, emp_tin,
                          emp_hired.isoformat() if emp_hired else None))
                    st.success("Employee added!"); st.rerun()
                else:
                    st.error("Fill in First Name, Last Name, and Rate.")

    # ── RUN PAYROLL TAB ──
    with tab_run_payroll:
        st.subheader("Run Payroll")

        active_emps = run_query("SELECT id, first_name, last_name, position, rate_type, rate_amount FROM employees WHERE is_active=1 ORDER BY last_name")

        if len(active_emps) == 0:
            st.info("Add employees first.")
        else:
            with st.form("run_payroll_form"):
                st.markdown("**Pay Period**")
                rp1, rp2, rp3 = st.columns(3)
                with rp1:
                    period_name = st.text_input("Period Name *", placeholder="e.g., April 1-15, 2026")
                with rp2:
                    period_start = st.date_input("Start Date", date.today().replace(day=1), key="pp_start")
                with rp3:
                    period_end = st.date_input("End Date", date.today(), key="pp_end")

                pay_date = st.date_input("Pay Date", date.today(), key="pp_paydate")

                st.markdown("---")
                st.markdown("**Employee Earnings & Deductions**")
                st.caption("Fill in for each employee. Basic pay is auto-calculated from rate.")

                payroll_data = {}
                for _, emp in active_emps.iterrows():
                    eid = int(emp["id"])
                    name = emp["last_name"] + ", " + emp["first_name"]
                    rate_info = fmt(emp["rate_amount"]) + "/" + ("mo" if emp["rate_type"] == "monthly" else "day")

                    with st.expander(name + " — " + (emp["position"] or "Staff") + " | " + rate_info):
                        # Auto-calc basic pay
                        if emp["rate_type"] == "monthly":
                            default_basic = float(emp["rate_amount"])
                        else:
                            days_in_period = (period_end - period_start).days + 1
                            work_days = min(days_in_period, 26)  # approx work days
                            default_basic = float(emp["rate_amount"]) * work_days

                        pc1, pc2 = st.columns(2)
                        with pc1:
                            st.markdown("**Earnings**")
                            basic = st.number_input("Basic Pay (₱)", value=default_basic, step=100.0, format="%.2f", key="basic_" + str(eid))
                            ot = st.number_input("Overtime (₱)", value=0.0, step=50.0, format="%.2f", key="ot_" + str(eid))
                            holiday = st.number_input("Holiday Pay (₱)", value=0.0, step=50.0, format="%.2f", key="hol_" + str(eid))
                            bonus = st.number_input("Bonus (₱)", value=0.0, step=100.0, format="%.2f", key="bonus_" + str(eid))
                            other_earn = st.number_input("Other Earnings (₱)", value=0.0, step=50.0, format="%.2f", key="oear_" + str(eid))
                            other_earn_note = st.text_input("Other Earnings Note", key="oearn_" + str(eid))
                        with pc2:
                            st.markdown("**Deductions**")
                            d_sss = st.number_input("SSS (₱)", value=0.0, step=10.0, format="%.2f", key="sss_" + str(eid))
                            d_phil = st.number_input("PhilHealth (₱)", value=0.0, step=10.0, format="%.2f", key="phil_" + str(eid))
                            d_pag = st.number_input("Pag-IBIG (₱)", value=0.0, step=10.0, format="%.2f", key="pag_" + str(eid))
                            d_tax = st.number_input("Tax (₱)", value=0.0, step=10.0, format="%.2f", key="tax_" + str(eid))
                            d_ca = st.number_input("Cash Advance (₱)", value=0.0, step=100.0, format="%.2f", key="ca_" + str(eid))
                            d_abs = st.number_input("Absences (₱)", value=0.0, step=50.0, format="%.2f", key="abs_" + str(eid))
                            d_late = st.number_input("Late Deductions (₱)", value=0.0, step=10.0, format="%.2f", key="late_" + str(eid))
                            d_other = st.number_input("Other Deductions (₱)", value=0.0, step=50.0, format="%.2f", key="oded_" + str(eid))
                            d_other_note = st.text_input("Other Deductions Note", key="odedn_" + str(eid))

                        gross = basic + ot + holiday + bonus + other_earn
                        total_ded = d_sss + d_phil + d_pag + d_tax + d_ca + d_abs + d_late + d_other
                        net = gross - total_ded

                        st.markdown("**Gross:** " + fmt(gross) + " | **Deductions:** " + fmt(total_ded) + " | **Net Pay:** " + fmt(net))

                        payroll_data[eid] = {
                            "basic": basic, "ot": ot, "holiday": holiday, "bonus": bonus,
                            "other_earn": other_earn, "other_earn_note": other_earn_note,
                            "sss": d_sss, "phil": d_phil, "pag": d_pag, "tax": d_tax,
                            "ca": d_ca, "abs": d_abs, "late": d_late,
                            "other_ded": d_other, "other_ded_note": d_other_note,
                            "gross": gross, "total_ded": total_ded, "net": net,
                        }

                if st.form_submit_button("Process Payroll", type="primary", use_container_width=True):
                    if not period_name:
                        st.error("Enter a period name.")
                    else:
                        # Create period
                        pid = run_insert(
                            "INSERT INTO payroll_periods (period_name, start_date, end_date, pay_date, status) VALUES (?,?,?,?,?)",
                            (period_name, period_start.isoformat(), period_end.isoformat(),
                             pay_date.isoformat(), "processed"))

                        # Insert entries
                        for eid, d in payroll_data.items():
                            run_insert("""
                                INSERT INTO payroll_entries (period_id, employee_id, basic_pay, overtime_pay,
                                    holiday_pay, bonus, other_earnings, other_earnings_note,
                                    sss, philhealth, pagibig, tax, cash_advance, absences,
                                    late_deductions, other_deductions, other_deductions_note,
                                    gross_pay, total_deductions, net_pay)
                                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                            """, (pid, eid, d["basic"], d["ot"], d["holiday"], d["bonus"],
                                  d["other_earn"], d["other_earn_note"],
                                  d["sss"], d["phil"], d["pag"], d["tax"], d["ca"], d["abs"],
                                  d["late"], d["other_ded"], d["other_ded_note"],
                                  d["gross"], d["total_ded"], d["net"]))

                        st.success("Payroll processed for " + period_name + "!")
                        st.rerun()

    # ── PAYROLL HISTORY TAB ──
    with tab_history:
        st.subheader("Payroll History")
        periods = run_query("SELECT * FROM payroll_periods ORDER BY start_date DESC")

        if len(periods) > 0:
            for _, per in periods.iterrows():
                entries = run_query("""
                    SELECT e.first_name || ' ' || e.last_name as employee, e.position,
                           pe.basic_pay, pe.overtime_pay, pe.holiday_pay, pe.bonus, pe.other_earnings,
                           pe.gross_pay, pe.sss, pe.philhealth, pe.pagibig, pe.tax,
                           pe.cash_advance, pe.absences, pe.late_deductions, pe.other_deductions,
                           pe.total_deductions, pe.net_pay, pe.is_paid
                    FROM payroll_entries pe
                    JOIN employees e ON pe.employee_id = e.id
                    WHERE pe.period_id = ?
                    ORDER BY e.last_name
                """, (int(per["id"]),))

                total_gross = entries["gross_pay"].sum() if len(entries) > 0 else 0
                total_net = entries["net_pay"].sum() if len(entries) > 0 else 0
                total_ded = entries["total_deductions"].sum() if len(entries) > 0 else 0

                with st.expander(per["period_name"] + " | " + per["start_date"] + " to " + per["end_date"] + " | Net: " + fmt(total_net)):
                    hm1, hm2, hm3, hm4 = st.columns(4)
                    hm1.metric("Employees", len(entries))
                    hm2.metric("Gross", fmt(total_gross))
                    hm3.metric("Deductions", fmt(total_ded))
                    hm4.metric("Net Payroll", fmt(total_net))

                    if len(entries) > 0:
                        display_entries = entries.copy()
                        for col in ["basic_pay", "overtime_pay", "gross_pay", "total_deductions", "net_pay"]:
                            display_entries[col] = display_entries[col].apply(fmt)
                        st.dataframe(
                            display_entries[["employee", "position", "basic_pay", "overtime_pay", "gross_pay", "total_deductions", "net_pay"]],
                            use_container_width=True, hide_index=True)

                    # Print payroll summary
                    if st.button("Print Payroll Summary", key="print_pr_" + str(per["id"])):
                        body = '<p><strong>Period:</strong> ' + per["period_name"] + ' (' + per["start_date"] + ' to ' + per["end_date"] + ')</p>'
                        body += '<p><strong>Employees:</strong> ' + str(len(entries)) + ' | <strong>Gross:</strong> ' + fmt(total_gross) + ' | <strong>Deductions:</strong> ' + fmt(total_ded) + ' | <strong>Net:</strong> ' + fmt(total_net) + '</p>'
                        if len(entries) > 0:
                            pr_df = entries[["employee", "position", "basic_pay", "overtime_pay", "holiday_pay", "bonus", "gross_pay", "sss", "philhealth", "pagibig", "tax", "cash_advance", "absences", "total_deductions", "net_pay"]].copy()
                            for col in pr_df.columns:
                                if pr_df[col].dtype in ["float64", "int64"]:
                                    pr_df[col] = pr_df[col].apply(fmt)
                            body += df_to_html_table(pr_df)
                        print_html("Payroll Summary — " + per["period_name"], body)
        else:
            st.info("No payroll records yet. Run payroll in the **Run Payroll** tab.")

    # ── PAYSLIPS TAB ──
    with tab_payslip:
        st.subheader("Generate Payslip")

        periods_df = run_query("SELECT id, period_name, start_date, end_date FROM payroll_periods ORDER BY start_date DESC")
        emps_df = run_query("SELECT id, first_name, last_name FROM employees WHERE is_active=1 ORDER BY last_name")

        if len(periods_df) == 0 or len(emps_df) == 0:
            st.info("Run payroll first to generate payslips.")
        else:
            ps1, ps2 = st.columns(2)
            with ps1:
                per_map = dict(zip(
                    periods_df.apply(lambda r: r["period_name"] + " (" + r["start_date"] + " to " + r["end_date"] + ")", axis=1),
                    periods_df["id"]))
                sel_period = st.selectbox("Pay Period", list(per_map.keys()))
            with ps2:
                emp_map = dict(zip(
                    emps_df.apply(lambda r: r["last_name"] + ", " + r["first_name"], axis=1),
                    emps_df["id"]))
                sel_emp = st.selectbox("Employee", list(emp_map.keys()))

            if st.button("Generate Payslip", type="primary", use_container_width=True):
                pid = int(per_map[sel_period])
                eid = int(emp_map[sel_emp])

                entry = run_query("""
                    SELECT pe.*, e.first_name, e.last_name, e.position, e.rate_type, e.rate_amount,
                           e.sss_number, e.philhealth_number, e.pagibig_number, e.tin_number,
                           pp.period_name, pp.start_date, pp.end_date, pp.pay_date
                    FROM payroll_entries pe
                    JOIN employees e ON pe.employee_id = e.id
                    JOIN payroll_periods pp ON pe.period_id = pp.id
                    WHERE pe.period_id = ? AND pe.employee_id = ?
                """, (pid, eid))

                if len(entry) == 0:
                    st.warning("No payroll entry found for this employee in this period.")
                else:
                    e = entry.iloc[0]
                    emp_name = e["first_name"] + " " + e["last_name"]

                    # Display payslip
                    st.markdown("---")
                    st.markdown("### Payslip: " + emp_name)
                    st.caption(e["period_name"] + " | " + e["start_date"] + " to " + e["end_date"])

                    ps_c1, ps_c2 = st.columns(2)
                    with ps_c1:
                        st.markdown("**Earnings**")
                        st.markdown("- Basic Pay: " + fmt(e["basic_pay"]))
                        if e["overtime_pay"] > 0: st.markdown("- Overtime: " + fmt(e["overtime_pay"]))
                        if e["holiday_pay"] > 0: st.markdown("- Holiday Pay: " + fmt(e["holiday_pay"]))
                        if e["bonus"] > 0: st.markdown("- Bonus: " + fmt(e["bonus"]))
                        if e["other_earnings"] > 0: st.markdown("- Other: " + fmt(e["other_earnings"]) + (" (" + e["other_earnings_note"] + ")" if e["other_earnings_note"] else ""))
                        st.markdown("**Gross Pay: " + fmt(e["gross_pay"]) + "**")
                    with ps_c2:
                        st.markdown("**Deductions**")
                        if e["sss"] > 0: st.markdown("- SSS: " + fmt(e["sss"]))
                        if e["philhealth"] > 0: st.markdown("- PhilHealth: " + fmt(e["philhealth"]))
                        if e["pagibig"] > 0: st.markdown("- Pag-IBIG: " + fmt(e["pagibig"]))
                        if e["tax"] > 0: st.markdown("- Tax: " + fmt(e["tax"]))
                        if e["cash_advance"] > 0: st.markdown("- Cash Advance: " + fmt(e["cash_advance"]))
                        if e["absences"] > 0: st.markdown("- Absences: " + fmt(e["absences"]))
                        if e["late_deductions"] > 0: st.markdown("- Late: " + fmt(e["late_deductions"]))
                        if e["other_deductions"] > 0: st.markdown("- Other: " + fmt(e["other_deductions"]) + (" (" + e["other_deductions_note"] + ")" if e["other_deductions_note"] else ""))
                        st.markdown("**Total Deductions: " + fmt(e["total_deductions"]) + "**")

                    st.markdown("### NET PAY: " + fmt(e["net_pay"]))

                    # Print payslip
                    if st.button("Print Payslip", key="print_payslip"):
                        body = '<div style="border:2px solid #0a1e5e; border-radius:8px; padding:20px;">'
                        body += '<div style="text-align:center; margin-bottom:15px; border-bottom:2px solid #e8872a; padding-bottom:10px;">'
                        body += '<div style="font-size:11px; color:#888;">PAYSLIP</div></div>'

                        body += '<div class="row"><div class="col">'
                        body += '<div class="label">Employee</div><div class="value">' + emp_name + '</div>'
                        body += '<div class="label">Position</div><div class="value">' + (e["position"] or "N/A") + '</div>'
                        body += '<div class="label">Rate</div><div class="value">' + fmt(e["rate_amount"]) + '/' + ("mo" if e["rate_type"] == "monthly" else "day") + '</div>'
                        body += '</div><div class="col">'
                        body += '<div class="label">Pay Period</div><div class="value">' + e["period_name"] + '</div>'
                        body += '<div class="label">Period</div><div class="value">' + e["start_date"] + ' to ' + e["end_date"] + '</div>'
                        body += '<div class="label">Pay Date</div><div class="value">' + (e["pay_date"] or "N/A") + '</div>'
                        body += '</div></div>'

                        body += '<div class="row" style="margin-top:15px;"><div class="col">'
                        body += '<table><tr><th colspan="2">EARNINGS</th></tr>'
                        body += '<tr><td>Basic Pay</td><td class="amount">' + fmt(e["basic_pay"]) + '</td></tr>'
                        if e["overtime_pay"] > 0: body += '<tr><td>Overtime</td><td class="amount">' + fmt(e["overtime_pay"]) + '</td></tr>'
                        if e["holiday_pay"] > 0: body += '<tr><td>Holiday Pay</td><td class="amount">' + fmt(e["holiday_pay"]) + '</td></tr>'
                        if e["bonus"] > 0: body += '<tr><td>Bonus</td><td class="amount">' + fmt(e["bonus"]) + '</td></tr>'
                        if e["other_earnings"] > 0: body += '<tr><td>Other</td><td class="amount">' + fmt(e["other_earnings"]) + '</td></tr>'
                        body += '<tr style="background:#0a1e5e; color:white;"><td><strong>Gross Pay</strong></td><td><strong>' + fmt(e["gross_pay"]) + '</strong></td></tr>'
                        body += '</table></div><div class="col">'

                        body += '<table><tr><th colspan="2">DEDUCTIONS</th></tr>'
                        if e["sss"] > 0: body += '<tr><td>SSS</td><td class="amount">' + fmt(e["sss"]) + '</td></tr>'
                        if e["philhealth"] > 0: body += '<tr><td>PhilHealth</td><td class="amount">' + fmt(e["philhealth"]) + '</td></tr>'
                        if e["pagibig"] > 0: body += '<tr><td>Pag-IBIG</td><td class="amount">' + fmt(e["pagibig"]) + '</td></tr>'
                        if e["tax"] > 0: body += '<tr><td>Tax</td><td class="amount">' + fmt(e["tax"]) + '</td></tr>'
                        if e["cash_advance"] > 0: body += '<tr><td>Cash Advance</td><td class="amount">' + fmt(e["cash_advance"]) + '</td></tr>'
                        if e["absences"] > 0: body += '<tr><td>Absences</td><td class="amount">' + fmt(e["absences"]) + '</td></tr>'
                        if e["late_deductions"] > 0: body += '<tr><td>Late</td><td class="amount">' + fmt(e["late_deductions"]) + '</td></tr>'
                        if e["other_deductions"] > 0: body += '<tr><td>Other</td><td class="amount">' + fmt(e["other_deductions"]) + '</td></tr>'
                        body += '<tr style="background:#0a1e5e; color:white;"><td><strong>Total Deductions</strong></td><td><strong>' + fmt(e["total_deductions"]) + '</strong></td></tr>'
                        body += '</table></div></div>'

                        body += '<div style="text-align:center; margin-top:20px; padding:15px; background:#0a1e5e; color:white; border-radius:8px; font-size:20px;">'
                        body += '<strong>NET PAY: ' + fmt(e["net_pay"]) + '</strong></div>'

                        body += '<div class="row" style="margin-top:30px;"><div class="col" style="border-top:1px solid #333; padding-top:5px; text-align:center;"><div class="label">Employee Signature</div></div>'
                        body += '<div class="col" style="border-top:1px solid #333; padding-top:5px; text-align:center;"><div class="label">Authorized Signature</div></div></div>'

                        body += '</div>'
                        print_html("Payslip — " + emp_name, body)


# ═══════════════════════════════════════════════════════════════════════════════
#  LIABILITIES
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Liabilities":
    st.title("Liabilities")
    tab_ov, tab_al, tab_rp = st.tabs(["Overview", "Add Liability", "Record Payment"])

    with tab_ov:
        liabs = run_query("""
            SELECT * FROM liabilities
            ORDER BY CASE WHEN status='active' THEN 0 ELSE 1 END, due_date ASC
        """)

        if len(liabs) > 0:
            active = liabs[liabs["status"] == "active"]
            m1, m2, m3 = st.columns(3)
            m1.metric("Active Liabilities", len(active))
            m2.metric("Total Owed", fmt(active["remaining_balance"].sum()))
            m3.metric("Monthly Payments", fmt(active["monthly_payment"].sum()))
            st.markdown("---")

            for _, lb in liabs.iterrows():
                icon = "🟢" if lb["status"] == "active" else "✅"
                with st.expander(f"{icon} {lb['name']} — {fmt(lb['remaining_balance'])} remaining"):
                    lc1, lc2 = st.columns(2)
                    with lc1:
                        st.markdown(f"**Type:** {lb['type'].title()}")
                        st.markdown(f"**Creditor:** {lb['creditor'] or 'N/A'}")
                        st.markdown(f"**Principal:** {fmt(lb['principal_amount'])}")
                        st.markdown(f"**Interest Rate:** {lb['interest_rate']}%")
                    with lc2:
                        st.markdown(f"**Remaining:** {fmt(lb['remaining_balance'])}")
                        st.markdown(f"**Monthly Payment:** {fmt(lb['monthly_payment'])}")
                        st.markdown(f"**Due Date:** {lb['due_date'] or 'N/A'}")
                        st.markdown(f"**Status:** {lb['status'].title()}")
                    if lb["notes"]:
                        st.markdown(f"**Notes:** {lb['notes']}")

                    paid = lb["principal_amount"] - lb["remaining_balance"]
                    pct = paid / lb["principal_amount"] if lb["principal_amount"] > 0 else 0
                    st.progress(min(pct, 1.0),
                                text=f"{pct:.0%} paid ({fmt(paid)} of {fmt(lb['principal_amount'])})")

                    pays = run_query(
                        "SELECT date, amount, notes FROM liability_payments WHERE liability_id=? ORDER BY date DESC",
                        (int(lb["id"]),))
                    if len(pays) > 0:
                        st.markdown("**Payment History:**")
                        st.dataframe(pays, use_container_width=True, hide_index=True)

                    if lb["status"] == "active":
                        if st.button("Mark as Paid Off", key=f"po_{lb['id']}"):
                            run_query(
                                "UPDATE liabilities SET status='paid_off', remaining_balance=0 WHERE id=?",
                                (int(lb["id"]),), fetch=False)
                            st.success("Marked as paid off!"); st.rerun()
        else:
            st.info("No liabilities recorded.")

    with tab_al:
        with st.form("add_liab", clear_on_submit=True):
            st.subheader("New Liability")
            a1, a2 = st.columns(2)
            with a1:
                ln = st.text_input("Name *", placeholder="e.g., Casket Supplier Credit")
                lt = st.selectbox("Type", ["supplier_credit", "loan", "credit_card", "lease", "other"])
                lc = st.text_input("Creditor / Lender")
                lp = st.number_input("Principal Amount (₱) *", min_value=0.01, step=100.0, format="%.2f")
            with a2:
                lr = st.number_input("Current Balance (₱) *", min_value=0.0, step=100.0, format="%.2f")
                li = st.number_input("Interest Rate (%)", min_value=0.0, step=0.1, format="%.2f")
                lm = st.number_input("Monthly Payment (₱)", min_value=0.0, step=100.0, format="%.2f")
                ld = st.date_input("Due Date", value=None, key="ld")
            lnotes = st.text_area("Notes", height=80, key="lnotes")

            if st.form_submit_button("Add Liability", type="primary", use_container_width=True):
                if ln and lp > 0:
                    run_insert(
                        "INSERT INTO liabilities (name,type,creditor,principal_amount,remaining_balance,interest_rate,due_date,monthly_payment,notes) VALUES (?,?,?,?,?,?,?,?,?)",
                        (ln, lt, lc, lp, lr if lr > 0 else lp, li,
                         ld.isoformat() if ld else None, lm, lnotes))
                    st.success(f"Liability '{ln}' added!"); st.rerun()
                else:
                    st.error("Fill in the required fields.")

    with tab_rp:
        st.subheader("Record Liability Payment")
        active_l = run_query("SELECT id, name, remaining_balance FROM liabilities WHERE status='active'")
        if len(active_l) > 0:
            with st.form("pay_liab", clear_on_submit=True):
                opts = dict(zip(
                    active_l.apply(lambda r: f"{r['name']} ({fmt(r['remaining_balance'])} left)", axis=1),
                    active_l["id"]))
                sl = st.selectbox("Liability", list(opts.keys()))
                pd_ = st.date_input("Payment Date", date.today(), key="lpd")
                pa = st.number_input("Amount (₱)", min_value=0.01, step=100.0, format="%.2f", key="lpa")
                pn = st.text_input("Notes", key="lpn")

                if st.form_submit_button("Record Payment", type="primary", use_container_width=True):
                    lid = int(opts[sl])
                    run_insert(
                        "INSERT INTO liability_payments (liability_id,date,amount,notes) VALUES (?,?,?,?)",
                        (lid, pd_.isoformat(), pa, pn))
                    run_query("UPDATE liabilities SET remaining_balance=MAX(0,remaining_balance-?) WHERE id=?",
                              (pa, lid), fetch=False)
                    st.success(f"Payment of {fmt(pa)} recorded!"); st.rerun()
        else:
            st.info("No active liabilities.")


# ═══════════════════════════════════════════════════════════════════════════════
#  INVENTORY
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Inventory":
    st.title("Inventory")
    tab_items, tab_add, tab_stockin, tab_stockout, tab_log = st.tabs([
        "Current Stock", "Add Item", "Stock In", "Stock Out / Use", "Movement Log"])

    with tab_items:
        search_inv = st.text_input("Search items", key="inv_search")
        where_inv = "i.is_active=1"
        params_inv = []
        if search_inv:
            where_inv += " AND (i.name LIKE ? OR ic.name LIKE ?)"
            params_inv = [f"%{search_inv}%", f"%{search_inv}%"]

        items = run_query(f"""
            SELECT i.id, ic.name as category, i.name, i.description, i.unit,
                   i.quantity, i.reorder_level, i.cost_per_unit, i.selling_price, i.location
            FROM inventory i
            LEFT JOIN inventory_categories ic ON i.category_id = ic.id
            WHERE {where_inv}
            ORDER BY ic.name, i.name
        """, tuple(params_inv))

        if len(items) > 0:
            # Summary metrics
            total_items = len(items)
            low_stock = len(items[(items["quantity"] <= items["reorder_level"]) & (items["reorder_level"] > 0)])
            total_value = (items["quantity"] * items["cost_per_unit"]).sum()

            im1, im2, im3 = st.columns(3)
            im1.metric("Total Items", total_items)
            im2.metric("Low Stock Alerts", low_stock, delta=f"-{low_stock}" if low_stock > 0 else None,
                        delta_color="inverse")
            im3.metric("Inventory Value", fmt(total_value))

            st.markdown("---")

            # Low stock warnings
            low = items[(items["quantity"] <= items["reorder_level"]) & (items["reorder_level"] > 0)]
            if len(low) > 0:
                st.warning(f"**{len(low)} item(s) at or below reorder level:**")
                for _, r in low.iterrows():
                    st.markdown(f"- **{r['name']}** — {r['quantity']:.0f} {r['unit']} left (reorder at {r['reorder_level']:.0f})")
                st.markdown("---")

            # Full stock table
            display_items = items.copy()
            display_items["value"] = display_items["quantity"] * display_items["cost_per_unit"]
            display_items["value"] = display_items["value"].apply(fmt)
            display_items["cost_per_unit"] = display_items["cost_per_unit"].apply(fmt)
            display_items["selling_price"] = display_items["selling_price"].apply(fmt)
            st.dataframe(display_items[["id", "category", "name", "unit", "quantity",
                                         "reorder_level", "cost_per_unit", "selling_price", "location", "value"]],
                         use_container_width=True, hide_index=True)

            # Print inventory
            if st.button("Print Inventory List", key="print_inv"):
                print_df = display_items[["category", "name", "unit", "quantity",
                                           "reorder_level", "cost_per_unit", "selling_price", "location", "value"]].copy()
                body = f"<h2>Inventory List</h2>"
                body += f"<p><strong>Total Items:</strong> {total_items} &bull; "
                body += f"<strong>Low Stock:</strong> {low_stock} &bull; "
                body += f"<strong>Total Value:</strong> {fmt(total_value)}</p>"
                if len(low) > 0:
                    body += "<h3 style='color:#e74c3c;'>Low Stock Items</h3><ul>"
                    for _, lr in low.iterrows():
                        body += f"<li><strong>{lr['name']}</strong> — {lr['quantity']:.0f} {lr['unit']} left (reorder at {lr['reorder_level']:.0f})</li>"
                    body += "</ul>"
                body += df_to_html_table(print_df)
                print_html("Inventory Report", body)
        else:
            st.info("No inventory items yet. Add items in the **Add Item** tab.")

    with tab_add:
        with st.form("add_inv_item", clear_on_submit=True):
            st.subheader("Add Inventory Item")
            inv_cats = run_query("SELECT id, name FROM inventory_categories WHERE is_active=1")
            inv_cat_map = dict(zip(inv_cats["name"], inv_cats["id"])) if len(inv_cats) > 0 else {}

            ai1, ai2 = st.columns(2)
            with ai1:
                inv_name = st.text_input("Item Name *", placeholder="e.g., Wooden Casket - Standard")
                inv_cat = st.selectbox("Category", list(inv_cat_map.keys()) if inv_cat_map else ["None"])
                inv_desc = st.text_input("Description", placeholder="e.g., White cloth lining, brass handles")
                inv_unit = st.selectbox("Unit", ["pcs", "bottles", "liters", "gallons", "boxes", "packs", "rolls", "sets", "kg"])
            with ai2:
                inv_qty = st.number_input("Initial Quantity", min_value=0.0, step=1.0, format="%.1f")
                inv_reorder = st.number_input("Reorder Level", min_value=0.0, step=1.0, format="%.1f",
                                               help="Alert when stock falls to this level")
                inv_cost = st.number_input("Cost per Unit (₱)", min_value=0.0, step=10.0, format="%.2f")
                inv_sell = st.number_input("Selling Price (₱)", min_value=0.0, step=10.0, format="%.2f")
            inv_loc = st.text_input("Storage Location", placeholder="e.g., Warehouse A, Chapel Storage")

            if st.form_submit_button("Add Item", type="primary", use_container_width=True):
                if inv_name and inv_cat_map:
                    item_id = run_insert("""
                        INSERT INTO inventory (category_id, name, description, unit, quantity,
                            reorder_level, cost_per_unit, selling_price, location)
                        VALUES (?,?,?,?,?,?,?,?,?)
                    """, (inv_cat_map[inv_cat], inv_name.strip(), inv_desc, inv_unit,
                          inv_qty, inv_reorder, inv_cost, inv_sell, inv_loc))
                    # Record initial stock as a movement
                    if inv_qty > 0:
                        run_insert(
                            "INSERT INTO inventory_movements (item_id, date, type, quantity, unit_cost, notes) VALUES (?,?,?,?,?,?)",
                            (item_id, date.today().isoformat(), "stock_in", inv_qty, inv_cost, "Initial stock"))
                    st.success(f"'{inv_name}' added to inventory!")
                    st.rerun()
                else:
                    st.error("Item name is required.")

    with tab_stockin:
        st.subheader("Stock In — Receive Items")
        inv_items = run_query("SELECT id, name, unit, quantity FROM inventory WHERE is_active=1 ORDER BY name")
        if len(inv_items) > 0:
            with st.form("stock_in", clear_on_submit=True):
                item_map = dict(zip(
                    inv_items.apply(lambda r: f"{r['name']} (current: {r['quantity']:.0f} {r['unit']})", axis=1),
                    inv_items["id"]))
                sel_item = st.selectbox("Item *", list(item_map.keys()))
                si1, si2 = st.columns(2)
                with si1:
                    si_date = st.date_input("Date", date.today(), key="si_date")
                    si_qty = st.number_input("Quantity Received *", min_value=0.1, step=1.0, format="%.1f")
                with si2:
                    si_cost = st.number_input("Cost per Unit (₱)", min_value=0.0, step=10.0, format="%.2f")
                    si_ref = st.text_input("Supplier / Reference")
                si_notes = st.text_input("Notes", key="si_notes")

                if st.form_submit_button("Record Stock In", type="primary", use_container_width=True):
                    iid = int(item_map[sel_item])
                    run_insert(
                        "INSERT INTO inventory_movements (item_id, date, type, quantity, unit_cost, reference, notes) VALUES (?,?,?,?,?,?,?)",
                        (iid, si_date.isoformat(), "stock_in", si_qty, si_cost, si_ref, si_notes))
                    run_query("UPDATE inventory SET quantity = quantity + ?, cost_per_unit = CASE WHEN ? > 0 THEN ? ELSE cost_per_unit END WHERE id = ?",
                              (si_qty, si_cost, si_cost, iid), fetch=False)
                    st.success(f"Added {si_qty} units to stock!")
                    st.rerun()
        else:
            st.info("Add inventory items first.")

    with tab_stockout:
        st.subheader("Stock Out — Use / Consume Items")
        inv_items = run_query("SELECT id, name, unit, quantity FROM inventory WHERE is_active=1 AND quantity > 0 ORDER BY name")
        if len(inv_items) > 0:
            with st.form("stock_out", clear_on_submit=True):
                item_map = dict(zip(
                    inv_items.apply(lambda r: f"{r['name']} (available: {r['quantity']:.0f} {r['unit']})", axis=1),
                    inv_items["id"]))
                sel_item = st.selectbox("Item *", list(item_map.keys()))
                so1, so2 = st.columns(2)
                with so1:
                    so_date = st.date_input("Date", date.today(), key="so_date")
                    so_qty = st.number_input("Quantity Used *", min_value=0.1, step=1.0, format="%.1f")
                    so_type = st.selectbox("Reason", ["used_for_service", "damaged", "expired", "returned_to_supplier", "other"])
                with so2:
                    # Optionally link to a service
                    svc_df = run_query("""
                        SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as d
                        FROM services s JOIN clients c ON s.client_id = c.id WHERE s.status='active'
                    """)
                    svc_map = {"(None)": None}
                    for _, r in svc_df.iterrows():
                        svc_map[f"#{r['id']} — {r['d']}"] = r["id"]
                    so_svc = st.selectbox("Link to Service (optional)", list(svc_map.keys()))
                    so_ref = st.text_input("Reference", key="so_ref")
                so_notes = st.text_input("Notes", key="so_notes")

                if st.form_submit_button("Record Stock Out", type="primary", use_container_width=True):
                    iid = int(item_map[sel_item])
                    # Check available quantity
                    current = run_query("SELECT quantity FROM inventory WHERE id=?", (iid,)).iloc[0]["quantity"]
                    if so_qty > current:
                        st.error(f"Only {current:.0f} available. Cannot remove {so_qty:.0f}.")
                    else:
                        run_insert(
                            "INSERT INTO inventory_movements (item_id, date, type, quantity, service_id, reference, notes) VALUES (?,?,?,?,?,?,?)",
                            (iid, so_date.isoformat(), so_type, so_qty, svc_map[so_svc], so_ref, so_notes))
                        run_query("UPDATE inventory SET quantity = quantity - ? WHERE id = ?",
                                  (so_qty, iid), fetch=False)
                        st.success(f"Removed {so_qty} units from stock.")
                        st.rerun()
        else:
            st.info("No items with available stock.")

    with tab_log:
        st.subheader("Movement History")
        lf1, lf2 = st.columns(2)
        with lf1:
            ml_start = st.date_input("From", date.today().replace(day=1), key="ml_from")
        with lf2:
            ml_end = st.date_input("To", date.today(), key="ml_to")

        movements = run_query("""
            SELECT m.id, m.date, i.name as item, ic.name as category,
                   m.type, m.quantity, i.unit, m.unit_cost, m.reference, m.notes
            FROM inventory_movements m
            JOIN inventory i ON m.item_id = i.id
            LEFT JOIN inventory_categories ic ON i.category_id = ic.id
            WHERE m.date BETWEEN ? AND ?
            ORDER BY m.date DESC, m.id DESC
        """, (ml_start.isoformat(), ml_end.isoformat()))

        if len(movements) > 0:
            # Color-code types
            st.caption(f"{len(movements)} movements")
            st.dataframe(movements, use_container_width=True, hide_index=True)

            # Summary
            stock_in = movements[movements["type"] == "stock_in"]["quantity"].sum()
            stock_out = movements[movements["type"] != "stock_in"]["quantity"].sum()
            st.markdown(f"**Period Summary:** Stock In: {stock_in:.0f} units | Stock Out: {stock_out:.0f} units")
        else:
            st.info("No movements for this period.")


# ═══════════════════════════════════════════════════════════════════════════════
#  SERVICE PACKAGES
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Service Packages":
    st.title("Service Packages")
    tab_view, tab_add = st.tabs(["View Packages", "Add Package"])

    with tab_view:
        pkgs = run_query("SELECT * FROM service_packages ORDER BY base_price")
        if len(pkgs) > 0:
            for _, p in pkgs.iterrows():
                status = "🟢" if p["is_active"] else "🔴"
                st.markdown(
                    f"{status} **{p['name']}** — {fmt(p['base_price'])}\n\n"
                    f"{p['description'] or ''}"
                )
                st.markdown("---")

            with st.expander("Edit Package Price"):
                pkg_map = dict(zip(pkgs["name"], pkgs["id"]))
                sel = st.selectbox("Package", list(pkg_map.keys()))
                new_price = st.number_input("New Base Price (₱)", min_value=0.0, step=100.0, format="%.2f")
                if st.button("Update Price"):
                    run_query("UPDATE service_packages SET base_price=? WHERE id=?",
                              (new_price, int(pkg_map[sel])), fetch=False)
                    st.success("Updated!"); st.rerun()

    with tab_add:
        with st.form("add_pkg", clear_on_submit=True):
            st.subheader("New Service Package")
            pn = st.text_input("Package Name *")
            pd_ = st.text_area("Description", height=80)
            pp = st.number_input("Base Price (₱)", min_value=0.0, step=100.0, format="%.2f")
            if st.form_submit_button("Add Package", type="primary", use_container_width=True):
                if pn:
                    run_insert("INSERT INTO service_packages (name, description, base_price) VALUES (?,?,?)",
                               (pn, pd_, pp))
                    st.success(f"Package '{pn}' added!"); st.rerun()
                else:
                    st.error("Name required.")


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Reports":
    st.title("Reports")

    rc1, rc2 = st.columns(2)
    with rc1:
        rs = st.date_input("From", date.today().replace(month=1, day=1), key="rs")
    with rc2:
        re_ = st.date_input("To", date.today(), key="re")

    tab_monthly, tab_summary, tab_svc_report, tab_exp_report, tab_csv = st.tabs([
        "Monthly Report", "Financial Summary", "Service Report", "Expense Report", "Export Data"])

    with tab_monthly:
        st.subheader("Monthly Business Report")
        st.caption(f"{rs.strftime('%B %d, %Y')} to {re_.strftime('%B %d, %Y')}")

        rsi = rs.isoformat()
        rei = re_.isoformat()

        # ── 1. SALES / REVENUE ──
        mr_revenue = run_query(
            "SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE date BETWEEN ? AND ?",
            (rsi, rei)).iloc[0]["t"]
        mr_expenses = run_query(
            "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE date BETWEEN ? AND ?",
            (rsi, rei)).iloc[0]["t"]
        mr_net = mr_revenue - mr_expenses

        # Services created this period
        mr_services = run_query("""
            SELECT COUNT(*) as total,
                   COALESCE(SUM(CASE WHEN status='active' THEN 1 ELSE 0 END),0) as active,
                   COALESCE(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END),0) as completed,
                   COALESCE(SUM(total_amount),0) as billed,
                   COALESCE(SUM(discount),0) as discounts
            FROM services WHERE created_at BETWEEN ? AND ?
        """, (rsi, rei + " 23:59:59"))
        ms = mr_services.iloc[0]

        # Outstanding balances (all active services)
        active_svcs = run_query("SELECT id FROM services WHERE status='active'")
        mr_outstanding = sum(max(0, get_service_balance(r["id"])) for _, r in active_svcs.iterrows())

        # Revenue by method
        mr_by_method = run_query("""
            SELECT method, SUM(amount) as total, COUNT(*) as count
            FROM payments WHERE date BETWEEN ? AND ? GROUP BY method ORDER BY total DESC
        """, (rsi, rei))

        # Revenue by service/client
        mr_by_client = run_query("""
            SELECT c.deceased_first_name || ' ' || c.deceased_last_name as client,
                   sp.name as package, SUM(p.amount) as paid
            FROM payments p
            JOIN services s ON p.service_id = s.id
            JOIN clients c ON s.client_id = c.id
            LEFT JOIN service_packages sp ON s.package_id = sp.id
            WHERE p.date BETWEEN ? AND ?
            GROUP BY client, package ORDER BY paid DESC
        """, (rsi, rei))

        # ── 2. EXPENSES ──
        mr_exp_by_cat = run_query("""
            SELECT ec.name as category, SUM(e.amount) as total, COUNT(*) as count
            FROM expenses e JOIN expense_categories ec ON e.category_id = ec.id
            WHERE e.date BETWEEN ? AND ?
            GROUP BY ec.name ORDER BY total DESC
        """, (rsi, rei))

        # Top individual expenses
        mr_top_expenses = run_query("""
            SELECT e.date, ec.name as category, e.amount, e.description
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category_id = ec.id
            WHERE e.date BETWEEN ? AND ?
            ORDER BY e.amount DESC LIMIT 10
        """, (rsi, rei))

        # ── 3. INVENTORY ──
        mr_inv_in = run_query("""
            SELECT i.name, ic.name as category, SUM(m.quantity) as qty, i.unit,
                   COALESCE(SUM(m.quantity * m.unit_cost),0) as cost
            FROM inventory_movements m
            JOIN inventory i ON m.item_id = i.id
            LEFT JOIN inventory_categories ic ON i.category_id = ic.id
            WHERE m.type = 'stock_in' AND m.date BETWEEN ? AND ?
            GROUP BY i.name, ic.name, i.unit ORDER BY cost DESC
        """, (rsi, rei))

        mr_inv_out = run_query("""
            SELECT i.name, ic.name as category, m.type as reason, SUM(m.quantity) as qty, i.unit
            FROM inventory_movements m
            JOIN inventory i ON m.item_id = i.id
            LEFT JOIN inventory_categories ic ON i.category_id = ic.id
            WHERE m.type != 'stock_in' AND m.date BETWEEN ? AND ?
            GROUP BY i.name, ic.name, m.type, i.unit ORDER BY qty DESC
        """, (rsi, rei))

        mr_inv_total_in = mr_inv_in["qty"].sum() if len(mr_inv_in) > 0 else 0
        mr_inv_total_out = mr_inv_out["qty"].sum() if len(mr_inv_out) > 0 else 0
        mr_inv_cost_in = mr_inv_in["cost"].sum() if len(mr_inv_in) > 0 else 0

        # Current stock snapshot
        mr_stock = run_query("""
            SELECT i.name, ic.name as category, i.quantity, i.unit,
                   i.cost_per_unit, (i.quantity * i.cost_per_unit) as value
            FROM inventory i
            LEFT JOIN inventory_categories ic ON i.category_id = ic.id
            WHERE i.is_active=1 AND i.quantity > 0
            ORDER BY value DESC
        """)
        mr_stock_value = mr_stock["value"].sum() if len(mr_stock) > 0 else 0

        # Low stock
        mr_low_stock = run_query("""
            SELECT name, quantity, unit, reorder_level
            FROM inventory
            WHERE is_active=1 AND reorder_level > 0 AND quantity <= reorder_level
        """)

        # ── 4. LIABILITIES ──
        mr_liabilities = run_query("""
            SELECT name, type, creditor, remaining_balance, monthly_payment, status
            FROM liabilities WHERE status='active'
            ORDER BY remaining_balance DESC
        """)
        mr_total_owed = mr_liabilities["remaining_balance"].sum() if len(mr_liabilities) > 0 else 0
        mr_monthly_dues = mr_liabilities["monthly_payment"].sum() if len(mr_liabilities) > 0 else 0

        mr_liab_payments = run_query("""
            SELECT l.name, SUM(lp.amount) as paid
            FROM liability_payments lp
            JOIN liabilities l ON lp.liability_id = l.id
            WHERE lp.date BETWEEN ? AND ?
            GROUP BY l.name ORDER BY paid DESC
        """, (rsi, rei))
        mr_liab_paid = mr_liab_payments["paid"].sum() if len(mr_liab_payments) > 0 else 0

        # ── DISPLAY ──
        st.markdown("### Overview")
        ov1, ov2, ov3, ov4, ov5 = st.columns(5)
        ov1.metric("Revenue", fmt(mr_revenue))
        ov2.metric("Expenses", fmt(mr_expenses))
        ov3.metric("Net Profit/Loss", fmt(mr_net))
        ov4.metric("Outstanding", fmt(mr_outstanding))
        ov5.metric("Inventory Value", fmt(mr_stock_value))

        st.markdown("---")

        mr1, mr2 = st.columns(2)
        with mr1:
            st.markdown("### Sales & Revenue")
            st.markdown(f"- **Total Collected:** {fmt(mr_revenue)}")
            st.markdown(f"- **Services Created:** {int(ms['total'])} (Active: {int(ms['active'])}, Completed: {int(ms['completed'])})")
            st.markdown(f"- **Total Billed:** {fmt(ms['billed'])} | Discounts: {fmt(ms['discounts'])}")
            st.markdown(f"- **Outstanding Balance (all active):** {fmt(mr_outstanding)}")
            if len(mr_by_method) > 0:
                st.markdown("**By Payment Method:**")
                for _, r in mr_by_method.iterrows():
                    st.markdown(f"  - {r['method'].title()}: {fmt(r['total'])} ({int(r['count'])} payments)")
            if len(mr_by_client) > 0:
                st.markdown("**By Client:**")
                for _, r in mr_by_client.iterrows():
                    st.markdown(f"  - {r['client']} ({r['package'] or 'Custom'}): {fmt(r['paid'])}")

        with mr2:
            st.markdown("### Expenses Breakdown")
            st.markdown(f"- **Total Expenses:** {fmt(mr_expenses)}")
            if len(mr_exp_by_cat) > 0:
                for _, r in mr_exp_by_cat.iterrows():
                    st.markdown(f"  - {r['category']}: {fmt(r['total'])} ({int(r['count'])} items)")
            if len(mr_top_expenses) > 0:
                st.markdown("**Top Expenses:**")
                for _, r in mr_top_expenses.head(5).iterrows():
                    st.markdown(f"  - {r['date']} — {r['category']}: {fmt(r['amount'])} ({r['description'] or ''})")

        st.markdown("---")

        mr3, mr4 = st.columns(2)
        with mr3:
            st.markdown("### Inventory Summary")
            st.markdown(f"- **Stock In:** {mr_inv_total_in:.0f} units (cost: {fmt(mr_inv_cost_in)})")
            st.markdown(f"- **Stock Out / Used:** {mr_inv_total_out:.0f} units")
            st.markdown(f"- **Current Stock Value:** {fmt(mr_stock_value)}")
            if len(mr_low_stock) > 0:
                st.markdown(f"**Low Stock ({len(mr_low_stock)} items):**")
                for _, r in mr_low_stock.iterrows():
                    st.markdown(f"  - {r['name']}: {r['quantity']:.0f} {r['unit']} (reorder at {r['reorder_level']:.0f})")

        with mr4:
            st.markdown("### Liabilities")
            st.markdown(f"- **Total Owed:** {fmt(mr_total_owed)}")
            st.markdown(f"- **Monthly Dues:** {fmt(mr_monthly_dues)}")
            st.markdown(f"- **Paid This Period:** {fmt(mr_liab_paid)}")
            if len(mr_liabilities) > 0:
                for _, r in mr_liabilities.iterrows():
                    st.markdown(f"  - {r['name']}: {fmt(r['remaining_balance'])} ({r['creditor'] or 'N/A'})")

        st.markdown("---")
        st.markdown("### Profit & Loss Summary")
        pnl_data = [
            ("Revenue (Payments Received)", fmt(mr_revenue)),
            ("(-) Business Expenses", fmt(mr_expenses)),
            ("(-) Liability Payments", fmt(mr_liab_paid)),
            ("(-) Inventory Purchases", fmt(mr_inv_cost_in)),
            ("", ""),
            ("**Net Cash Flow**", f"**{fmt(mr_revenue - mr_expenses - mr_liab_paid - mr_inv_cost_in)}**"),
        ]
        for label, val in pnl_data:
            if label:
                st.markdown(f"| {label} | {val} |")
            else:
                st.markdown("| --- | --- |")

        # ── PRINT BUTTON ──
        if st.button("Print Monthly Report", type="primary", key="print_monthly", use_container_width=True):
            period_str = f"{rs.strftime('%B %d, %Y')} to {re_.strftime('%B %d, %Y')}"
            net_cash = mr_revenue - mr_expenses - mr_liab_paid - mr_inv_cost_in

            body = f"<h2>Monthly Business Report</h2><p><strong>Period:</strong> {period_str}</p>"

            # Overview table
            body += """<table>
                <tr><th>Metric</th><th>Amount</th></tr>
                <tr><td>Total Revenue</td><td class="amount">""" + fmt(mr_revenue) + """</td></tr>
                <tr><td>Total Expenses</td><td class="amount">""" + fmt(mr_expenses) + """</td></tr>
                <tr><td>Net Profit/Loss</td><td class="amount"><strong>""" + fmt(mr_net) + """</strong></td></tr>
                <tr><td>Outstanding Balances</td><td class="amount">""" + fmt(mr_outstanding) + """</td></tr>
                <tr><td>Inventory Value</td><td class="amount">""" + fmt(mr_stock_value) + """</td></tr>
            </table>"""

            # Sales
            body += "<h2>Sales & Revenue</h2>"
            body += f"<p>Services Created: {int(ms['total'])} | Total Billed: {fmt(ms['billed'])} | Discounts: {fmt(ms['discounts'])}</p>"
            if len(mr_by_method) > 0:
                body += "<h3>By Payment Method</h3>"
                pm = mr_by_method.copy()
                pm["total"] = pm["total"].apply(fmt)
                body += df_to_html_table(pm)
            if len(mr_by_client) > 0:
                body += "<h3>By Client</h3>"
                pc = mr_by_client.copy()
                pc["paid"] = pc["paid"].apply(fmt)
                body += df_to_html_table(pc)

            # Expenses
            body += "<h2>Expenses Breakdown</h2>"
            body += f"<p><strong>Total:</strong> {fmt(mr_expenses)}</p>"
            if len(mr_exp_by_cat) > 0:
                ec = mr_exp_by_cat.copy()
                ec["total"] = ec["total"].apply(fmt)
                body += df_to_html_table(ec)
            if len(mr_top_expenses) > 0:
                body += "<h3>Top Expenses</h3>"
                te = mr_top_expenses.copy()
                te["amount"] = te["amount"].apply(fmt)
                body += df_to_html_table(te)

            # Inventory
            body += "<h2>Inventory Summary</h2>"
            body += f"<p>Stock In: {mr_inv_total_in:.0f} units (Cost: {fmt(mr_inv_cost_in)}) | Stock Out: {mr_inv_total_out:.0f} units | Current Value: {fmt(mr_stock_value)}</p>"
            if len(mr_inv_in) > 0:
                body += "<h3>Stock Received</h3>"
                si = mr_inv_in.copy()
                si["cost"] = si["cost"].apply(fmt)
                body += df_to_html_table(si)
            if len(mr_inv_out) > 0:
                body += "<h3>Stock Used / Out</h3>"
                body += df_to_html_table(mr_inv_out)
            if len(mr_stock) > 0:
                body += "<h3>Current Stock on Hand</h3>"
                cs = mr_stock.copy()
                cs["cost_per_unit"] = cs["cost_per_unit"].apply(fmt)
                cs["value"] = cs["value"].apply(fmt)
                body += df_to_html_table(cs)
            if len(mr_low_stock) > 0:
                body += "<h3 style='color:#e74c3c;'>Low Stock Alerts</h3><ul>"
                for _, r in mr_low_stock.iterrows():
                    body += f"<li><strong>{r['name']}</strong>: {r['quantity']:.0f} {r['unit']} (reorder at {r['reorder_level']:.0f})</li>"
                body += "</ul>"

            # Liabilities
            body += "<h2>Liabilities</h2>"
            body += f"<p>Total Owed: {fmt(mr_total_owed)} | Monthly Dues: {fmt(mr_monthly_dues)} | Paid This Period: {fmt(mr_liab_paid)}</p>"
            if len(mr_liabilities) > 0:
                lb = mr_liabilities.copy()
                lb["remaining_balance"] = lb["remaining_balance"].apply(fmt)
                lb["monthly_payment"] = lb["monthly_payment"].apply(fmt)
                body += df_to_html_table(lb)
            if len(mr_liab_payments) > 0:
                body += "<h3>Liability Payments Made</h3>"
                lp = mr_liab_payments.copy()
                lp["paid"] = lp["paid"].apply(fmt)
                body += df_to_html_table(lp)

            # P&L
            body += "<h2>Profit & Loss Summary</h2>"
            body += """<table>
                <tr><th>Item</th><th>Amount</th></tr>
                <tr><td>Revenue (Payments Received)</td><td class="amount">""" + fmt(mr_revenue) + """</td></tr>
                <tr><td>(-) Business Expenses</td><td class="amount">""" + fmt(mr_expenses) + """</td></tr>
                <tr><td>(-) Liability Payments</td><td class="amount">""" + fmt(mr_liab_paid) + """</td></tr>
                <tr><td>(-) Inventory Purchases</td><td class="amount">""" + fmt(mr_inv_cost_in) + """</td></tr>
                <tr style="background:#1a1a2e; color:white;"><td><strong>Net Cash Flow</strong></td><td><strong>""" + fmt(net_cash) + """</strong></td></tr>
            </table>"""

            print_html(f"Monthly Report — {period_str}", body)

    with tab_summary:
        st.subheader("Financial Summary")
        st.caption(f"{rs.strftime('%B %d, %Y')} to {re_.strftime('%B %d, %Y')}")

        total_revenue = run_query(
            "SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE date BETWEEN ? AND ?",
            (rs.isoformat(), re_.isoformat())).iloc[0]["t"]
        total_expense = run_query(
            "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE date BETWEEN ? AND ?",
            (rs.isoformat(), re_.isoformat())).iloc[0]["t"]
        net = total_revenue - total_expense

        r1, r2, r3 = st.columns(3)
        r1.metric("Total Revenue", fmt(total_revenue))
        r2.metric("Total Expenses", fmt(total_expense))
        r3.metric(f"Net {'Profit' if net >= 0 else 'Loss'}", fmt(net))

        st.markdown("---")

        # Revenue by payment method
        by_method = run_query("""
            SELECT method, SUM(amount) as total, COUNT(*) as count
            FROM payments WHERE date BETWEEN ? AND ?
            GROUP BY method ORDER BY total DESC
        """, (rs.isoformat(), re_.isoformat()))

        if len(by_method) > 0:
            st.subheader("Revenue by Payment Method")
            fig = px.pie(by_method, values="total", names="method", hole=0.4)
            fig.update_layout(margin=dict(t=20, b=20, l=20, r=20), height=300)
            st.plotly_chart(fig, use_container_width=True)

        # Expense breakdown
        exp_summ = run_query("""
            SELECT ec.name as category, SUM(e.amount) as total
            FROM expenses e JOIN expense_categories ec ON e.category_id = ec.id
            WHERE e.date BETWEEN ? AND ?
            GROUP BY ec.name ORDER BY total DESC
        """, (rs.isoformat(), re_.isoformat()))

        if len(exp_summ) > 0:
            st.subheader("Expense Breakdown")
            for _, r in exp_summ.iterrows():
                st.markdown(f"- {r['category']}: **{fmt(r['total'])}**")
            st.markdown(f"**Total Expenses: {fmt(exp_summ['total'].sum())}**")

        # Print financial summary
        if st.button("Print Financial Summary", key="print_fin"):
            period_str = f"{rs.strftime('%B %d, %Y')} to {re_.strftime('%B %d, %Y')}"
            body = f"<h2>Financial Summary</h2><p>{period_str}</p>"
            body += "<table><tr><th>Metric</th><th>Amount</th></tr>"
            body += f"<tr><td>Total Revenue</td><td class='amount'>{fmt(total_revenue)}</td></tr>"
            body += f"<tr><td>Total Expenses</td><td class='amount'>{fmt(total_expense)}</td></tr>"
            body += f"<tr><td><strong>Net {'Profit' if net >= 0 else 'Loss'}</strong></td><td class='amount'><strong>{fmt(net)}</strong></td></tr>"
            body += "</table>"
            if len(by_method) > 0:
                body += "<h2>Revenue by Payment Method</h2>"
                by_method_print = by_method.copy()
                by_method_print["total"] = by_method_print["total"].apply(fmt)
                body += df_to_html_table(by_method_print)
            if len(exp_summ) > 0:
                body += "<h2>Expense Breakdown</h2>"
                exp_print = exp_summ.copy()
                exp_print["total"] = exp_print["total"].apply(fmt)
                body += df_to_html_table(exp_print)
            print_html("Financial Summary", body)

    with tab_svc_report:
        st.subheader("Service Report")
        svc_report = run_query("""
            SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
                   sp.name as package, s.total_amount, s.discount, s.status,
                   s.burial_date, s.created_at
            FROM services s
            JOIN clients c ON s.client_id = c.id
            LEFT JOIN service_packages sp ON s.package_id = sp.id
            WHERE s.created_at BETWEEN ? AND ?
            ORDER BY s.created_at DESC
        """, (rs.isoformat(), re_.isoformat() + " 23:59:59"))

        if len(svc_report) > 0:
            # Summary
            sm1, sm2, sm3, sm4 = st.columns(4)
            sm1.metric("Total Services", len(svc_report))
            sm2.metric("Active", len(svc_report[svc_report["status"] == "active"]))
            sm3.metric("Completed", len(svc_report[svc_report["status"] == "completed"]))
            sm4.metric("Total Billed", fmt(svc_report["total_amount"].sum()))

            st.dataframe(svc_report, use_container_width=True, hide_index=True)

            # Package popularity
            pkg_count = svc_report.groupby("package").size().reset_index(name="count").sort_values("count", ascending=False)
            if len(pkg_count) > 0:
                st.subheader("Most Popular Packages")
                fig = px.bar(pkg_count, x="package", y="count", color="package")
                fig.update_layout(showlegend=False, margin=dict(t=10, b=10), height=250)
                st.plotly_chart(fig, use_container_width=True)

            # Print service report
            if st.button("Print Service Report", key="print_svc_rpt"):
                n_active = len(svc_report[svc_report["status"] == "active"])
                n_completed = len(svc_report[svc_report["status"] == "completed"])
                body = f"<h2>Service Report</h2>"
                body += f"<p>{rs.strftime('%B %d, %Y')} to {re_.strftime('%B %d, %Y')}</p>"
                body += f"<p><strong>Total:</strong> {len(svc_report)} services &bull; "
                body += f"<strong>Active:</strong> {n_active} &bull; "
                body += f"<strong>Completed:</strong> {n_completed} &bull; "
                body += f"<strong>Total Billed:</strong> {fmt(svc_report['total_amount'].sum())}</p>"
                print_df = svc_report[["deceased", "package", "total_amount", "discount", "status", "burial_date"]].copy()
                print_df["total_amount"] = print_df["total_amount"].apply(fmt)
                print_df["discount"] = print_df["discount"].apply(fmt)
                body += df_to_html_table(print_df)
                if len(pkg_count) > 0:
                    body += "<h2>Package Popularity</h2>" + df_to_html_table(pkg_count)
                print_html("Service Report", body)
        else:
            st.info("No services in this period.")

    with tab_exp_report:
        st.subheader("Detailed Expense Report")
        dexp = run_query("""
            SELECT e.date, ec.name as category, a.name as account, e.amount,
                   e.description, e.reference
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category_id = ec.id
            LEFT JOIN accounts a ON e.account_id = a.id
            WHERE e.date BETWEEN ? AND ?
            ORDER BY e.date DESC
        """, (rs.isoformat(), re_.isoformat()))
        if len(dexp) > 0:
            st.caption(f"Total: {fmt(dexp['amount'].sum())} across {len(dexp)} expenses")
            st.dataframe(dexp, use_container_width=True, hide_index=True)

            if st.button("Print Expense Report", key="print_exp_rpt"):
                body = f"<h2>Expense Report</h2>"
                body += f"<p>{rs.strftime('%B %d, %Y')} to {re_.strftime('%B %d, %Y')}</p>"
                body += f"<p><strong>Total:</strong> {fmt(dexp['amount'].sum())} across {len(dexp)} expenses</p>"
                print_df = dexp.copy()
                print_df["amount"] = print_df["amount"].apply(fmt)
                body += df_to_html_table(print_df)
                # Category summary
                cat_summ = dexp.groupby("category")["amount"].sum().sort_values(ascending=False).reset_index()
                cat_summ["amount"] = cat_summ["amount"].apply(fmt)
                body += "<h2>By Category</h2>" + df_to_html_table(cat_summ)
                print_html("Expense Report", body)
        else:
            st.info("No expenses in this range.")

    with tab_csv:
        st.subheader("Export Data")
        export = st.selectbox("What to export", [
            "All Clients", "All Services", "Payments", "Expenses", "Liabilities"])

        if st.button("Generate Export", type="primary"):
            if export == "All Clients":
                df = run_query("""
                    SELECT deceased_first_name, deceased_last_name, deceased_age, deceased_gender,
                           deceased_date_of_death, contact_name, contact_phone, contact_relationship, created_at
                    FROM clients ORDER BY created_at DESC
                """)
            elif export == "All Services":
                df = run_query("""
                    SELECT s.id, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
                           c.contact_name, sp.name as package, s.total_amount, s.discount,
                           s.status, s.wake_start_date, s.burial_date
                    FROM services s
                    JOIN clients c ON s.client_id = c.id
                    LEFT JOIN service_packages sp ON s.package_id = sp.id
                    ORDER BY s.created_at DESC
                """)
            elif export == "Payments":
                df = run_query("""
                    SELECT p.date, c.deceased_first_name || ' ' || c.deceased_last_name as deceased,
                           c.contact_name, p.amount, p.method, p.reference
                    FROM payments p
                    JOIN services s ON p.service_id = s.id
                    JOIN clients c ON s.client_id = c.id
                    WHERE p.date BETWEEN ? AND ?
                    ORDER BY p.date DESC
                """, (rs.isoformat(), re_.isoformat()))
            elif export == "Expenses":
                df = run_query("""
                    SELECT e.date, ec.name as category, a.name as account, e.amount, e.description
                    FROM expenses e
                    LEFT JOIN expense_categories ec ON e.category_id = ec.id
                    LEFT JOIN accounts a ON e.account_id = a.id
                    WHERE e.date BETWEEN ? AND ?
                    ORDER BY e.date DESC
                """, (rs.isoformat(), re_.isoformat()))
            else:
                df = run_query("""
                    SELECT name, type, creditor, principal_amount, remaining_balance,
                           interest_rate, due_date, monthly_payment, status
                    FROM liabilities
                """)

            if len(df) > 0:
                buf = io.StringIO()
                df.to_csv(buf, index=False)
                st.download_button(
                    f"Download {export} CSV", buf.getvalue(),
                    f"barroquillo_{export.lower().replace(' ', '_')}_{rs}_{re_}.csv", "text/csv")
                st.dataframe(df, use_container_width=True, hide_index=True)
            else:
                st.info("No data to export.")


# ═══════════════════════════════════════════════════════════════════════════════
#  ADMIN PANEL
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Admin Panel":
    if USER_ROLE != "admin":
        st.error("Access denied. Admin only.")
        st.stop()

    st.title("Admin Panel")
    tab_users, tab_add_user, tab_pw = st.tabs(["Manage Users", "Add User", "Change Password"])

    with tab_users:
        st.subheader("User Accounts")
        users = run_query("SELECT id, username, display_name, role, is_active, created_at FROM users ORDER BY role, username")

        if len(users) > 0:
            st.dataframe(users, use_container_width=True, hide_index=True)

            st.markdown("---")

            # Edit user role
            with st.expander("Change User Role"):
                non_admin_users = users[users["username"] != "admin"]  # protect main admin
                if len(non_admin_users) > 0:
                    user_map = dict(zip(
                        non_admin_users.apply(lambda r: f"{r['display_name']} (@{r['username']}) — {r['role']}", axis=1),
                        non_admin_users["id"]))
                    sel_user = st.selectbox("Select User", list(user_map.keys()), key="role_user")
                    new_role = st.selectbox("New Role", ["staff", "manager", "admin"], key="new_role")
                    if st.button("Update Role", key="upd_role"):
                        run_query("UPDATE users SET role=? WHERE id=?",
                                  (new_role, int(user_map[sel_user])), fetch=False)
                        st.success("Role updated!"); st.rerun()
                else:
                    st.info("No other users to manage.")

            # Toggle active status
            with st.expander("Enable / Disable User"):
                non_admin_users = users[users["username"] != "admin"]
                if len(non_admin_users) > 0:
                    user_map2 = dict(zip(
                        non_admin_users.apply(
                            lambda r: f"{r['display_name']} (@{r['username']}) — {'Active' if r['is_active'] else 'Disabled'}",
                            axis=1),
                        non_admin_users["id"]))
                    sel_user2 = st.selectbox("Select User", list(user_map2.keys()), key="toggle_user")
                    if st.button("Toggle Active Status", key="toggle_active"):
                        run_query(
                            "UPDATE users SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?",
                            (int(user_map2[sel_user2]),), fetch=False)
                        st.success("Updated!"); st.rerun()

            # Reset password
            with st.expander("Reset User Password"):
                user_map3 = dict(zip(
                    users.apply(lambda r: f"{r['display_name']} (@{r['username']})", axis=1),
                    users["id"]))
                sel_user3 = st.selectbox("Select User", list(user_map3.keys()), key="reset_user")
                new_pw = st.text_input("New Password", type="password", key="reset_pw")
                confirm_pw = st.text_input("Confirm Password", type="password", key="reset_pw2")
                if st.button("Reset Password", key="reset_btn"):
                    if new_pw and new_pw == confirm_pw:
                        if len(new_pw) < 4:
                            st.error("Password must be at least 4 characters.")
                        else:
                            run_query("UPDATE users SET password_hash=? WHERE id=?",
                                      (hash_pw(new_pw), int(user_map3[sel_user3])), fetch=False)
                            st.success("Password reset!")
                    else:
                        st.error("Passwords don't match.")

    with tab_add_user:
        with st.form("add_user", clear_on_submit=True):
            st.subheader("Create New User")
            nu_display = st.text_input("Full Name *", placeholder="e.g., Maria Santos")
            nu_username = st.text_input("Username *", placeholder="e.g., maria")
            nu_password = st.text_input("Password *", type="password")
            nu_password2 = st.text_input("Confirm Password *", type="password")
            nu_role = st.selectbox("Role", ["staff", "manager", "admin"])

            st.markdown("---")
            st.markdown("**Role Permissions:**")
            st.markdown("""
            - **Staff** — Dashboard, Clients, Services, Payments, Inventory
            - **Manager** — Everything except Admin Panel
            - **Admin** — Full access + user management
            """)

            if st.form_submit_button("Create User", type="primary", use_container_width=True):
                if nu_display and nu_username and nu_password:
                    if nu_password != nu_password2:
                        st.error("Passwords don't match.")
                    elif len(nu_password) < 4:
                        st.error("Password must be at least 4 characters.")
                    else:
                        # Check if username exists
                        existing = run_query("SELECT id FROM users WHERE username=?",
                                             (nu_username.strip().lower(),))
                        if len(existing) > 0:
                            st.error("Username already exists.")
                        else:
                            run_insert(
                                "INSERT INTO users (username, password_hash, display_name, role) VALUES (?,?,?,?)",
                                (nu_username.strip().lower(), hash_pw(nu_password),
                                 nu_display.strip(), nu_role))
                            st.success(f"User '{nu_display}' created! They can now log in.")
                            st.rerun()
                else:
                    st.error("Fill in all required fields.")

    with tab_pw:
        st.subheader("Change My Password")
        with st.form("change_pw"):
            current_pw = st.text_input("Current Password", type="password")
            new_pw1 = st.text_input("New Password", type="password", key="my_new_pw")
            new_pw2 = st.text_input("Confirm New Password", type="password", key="my_new_pw2")

            if st.form_submit_button("Change Password", type="primary", use_container_width=True):
                # Verify current password
                uid = st.session_state.get("user_id")
                check = run_query("SELECT id FROM users WHERE id=? AND password_hash=?",
                                  (uid, hash_pw(current_pw)))
                if len(check) == 0:
                    st.error("Current password is incorrect.")
                elif new_pw1 != new_pw2:
                    st.error("New passwords don't match.")
                elif len(new_pw1) < 4:
                    st.error("Password must be at least 4 characters.")
                else:
                    run_query("UPDATE users SET password_hash=? WHERE id=?",
                              (hash_pw(new_pw1), uid), fetch=False)
                    st.success("Password changed!")
