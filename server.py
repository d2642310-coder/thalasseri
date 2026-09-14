from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
from datetime import datetime

app = Flask(__name__, static_folder=".")
app.secret_key = os.environ.get(
    "SECRET_KEY",
    "thalasseri-change-this-secret-key"
)

CORS(app, supports_credentials=True)

DB_NAME = "database.db"

# Temporary in-memory OTP storage for customer registration
OTP_STORE = {}
OTP_EXPIRY_SECONDS = 300  # OTP valid for 5 minutes


# =========================================================
# DATABASE
# =========================================================

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            credit_limit REAL DEFAULT 500,
            credit_used REAL DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)

    # Safe migration: add password_hash to existing customer database
    customer_columns = [
        row["name"]
        for row in cur.execute("PRAGMA table_info(customers)").fetchall()
    ]

    if "password_hash" not in customer_columns:
        cur.execute(
            "ALTER TABLE customers ADD COLUMN password_hash TEXT"
        )


    cur.execute("""
        CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            image TEXT,
            available INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            total REAL NOT NULL,
            payment_method TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at TEXT NOT NULL,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            menu_item_id INTEGER,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS credit_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            order_id INTEGER,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )
    """)

    # Default owner
    admin = cur.execute(
        "SELECT id FROM admins WHERE username = ?",
        ("admin",)
    ).fetchone()

    if not admin:
        cur.execute(
            "INSERT INTO admins (username, password) VALUES (?, ?)",
            (
                "admin",
                generate_password_hash("thalasseri123")
            )
        )

    # Default menu
    count = cur.execute(
        "SELECT COUNT(*) AS count FROM menu_items"
    ).fetchone()["count"]

    if count == 0:
        now = datetime.now().isoformat()

        menu = [
            (
                "Chicken Biriyani",
                "Thalasseri style dum biriyani",
                "biriyani",
                12,
                "🍛"
            ),
            (
                "Beef Biriyani",
                "Traditional spicy beef biriyani",
                "biriyani",
                14,
                "🍗"
            ),
            (
                "Chicken Fry",
                "Crispy Kerala style chicken",
                "chicken",
                10,
                "🍗"
            ),
            (
                "Kerala Meals",
                "Authentic homestyle Kerala meals",
                "meals",
                9,
                "🍚"
            ),
            (
                "Chicken Roll",
                "Fresh and spicy chicken roll",
                "snacks",
                6,
                "🥙"
            ),
            (
                "Fresh Lime",
                "Freshly prepared lime drink",
                "drinks",
                4,
                "🍋"
            )
        ]

        for item in menu:
            cur.execute("""
                INSERT INTO menu_items
                (name, description, category, price, image, available, created_at)
                VALUES (?, ?, ?, ?, ?, 1, ?)
            """, (*item, now))

    conn.commit()
    conn.close()


# =========================================================
# FRONTEND
# =========================================================

@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/admin")
def admin_page():
    return send_from_directory(".", "admin.html")


@app.route("/<path:path>")
def static_files(path):
    if os.path.isfile(path):
        return send_from_directory(".", path)

    return jsonify({
        "error": "File not found"
    }), 404


# =========================================================
# MENU
# =========================================================

@app.route("/api/menu", methods=["GET"])
def get_menu():

    conn = get_db()

    items = conn.execute("""
        SELECT *
        FROM menu_items
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    return jsonify([
        dict(item)
        for item in items
    ])


# =========================================================
# CUSTOMER
# =========================================================



# =========================================================
# CUSTOMER OTP
# =========================================================

@app.route("/api/customer/request-otp", methods=["POST"])
def request_customer_otp():

    data = request.get_json() or {}

    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()

    if not name:
        return jsonify({
            "error": "Name is required"
        }), 400

    if not phone:
        return jsonify({
            "error": "Phone number is required"
        }), 400

    import random
    import time

    otp = str(random.randint(100000, 999999))

    OTP_STORE[phone] = {
        "otp": otp,
        "name": name,
        "created": time.time()
    }

    # DEVELOPMENT MODE:
    # OTP is printed in the Codespaces terminal.
    print("")
    print("=" * 55)
    print("📱 THALASSERY CUSTOMER OTP")
    print("Phone:", phone)
    print("OTP:", otp)
    print("=" * 55)
    print("")

    return jsonify({
        "success": True,
        "message": "OTP generated successfully"
    })


@app.route("/api/customer/verify-otp", methods=["POST"])
def verify_customer_otp():

    data = request.get_json() or {}

    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    password = str(data.get("password", "") or "")
    confirm_password = str(data.get("confirm_password", "") or "")
    otp = str(data.get("otp", "")).strip()

    if not phone or not otp:
        return jsonify({
            "error": "Phone and OTP are required"
        }), 400

    if not name:
        return jsonify({
            "error": "Name is required"
        }), 400

    if len(password) < 6:
        return jsonify({
            "error": "Password must be at least 6 characters"
        }), 400

    if password != confirm_password:
        return jsonify({
            "error": "Passwords do not match"
        }), 400

    import time

    record = OTP_STORE.get(phone)

    if not record:
        return jsonify({
            "error": "OTP expired or not requested"
        }), 400

    if time.time() - record["created"] > OTP_EXPIRY_SECONDS:
        OTP_STORE.pop(phone, None)

        return jsonify({
            "error": "OTP expired. Please request a new OTP."
        }), 400

    if str(record["otp"]) != otp:
        return jsonify({
            "error": "Invalid OTP"
        }), 400

    conn = get_db()

    existing = conn.execute(
        "SELECT * FROM customers WHERE phone = ?",
        (phone,)
    ).fetchone()

    if existing:
        conn.close()
        OTP_STORE.pop(phone, None)

        return jsonify({
            "error": "An account with this phone number already exists. Please login."
        }), 409

    password_hash = generate_password_hash(password)
    now = datetime.now().isoformat()

    cur = conn.execute("""
        INSERT INTO customers
        (name, phone, password_hash, credit_limit, credit_used, created_at)
        VALUES (?, ?, ?, 500, 0, ?)
    """, (
        name,
        phone,
        password_hash,
        now
    ))

    customer_id = cur.lastrowid
    conn.commit()

    customer = conn.execute(
        "SELECT * FROM customers WHERE id = ?",
        (customer_id,)
    ).fetchone()

    conn.close()

    OTP_STORE.pop(phone, None)

    session["customer_id"] = customer_id

    return jsonify({
        "success": True,
        "customer_id": customer_id,
        "id": customer_id,
        "name": customer["name"],
        "phone": customer["phone"],
        "message": "Account created successfully"
    })

@app.route("/api/customer/register", methods=["POST"])
def register_customer():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    password = str(data.get("password", ""))
    confirm_password = str(data.get("confirm_password", ""))
    otp = str(data.get("otp", "")).strip()

    if not name:
        return jsonify({"error": "Please enter your name."}), 400

    if len(name) < 2:
        return jsonify({"error": "Name must contain at least 2 characters."}), 400

    if not phone:
        return jsonify({"error": "Please enter your phone number."}), 400

    if not password:
        return jsonify({"error": "Please create a password."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    if password != confirm_password:
        return jsonify({"error": "Passwords do not match."}), 400

    if not otp or not otp.isdigit() or len(otp) != 6:
        return jsonify({"error": "Please enter the 6-digit OTP."}), 400

    # Check OTP generated by the existing OTP system
    otp_data = OTP_STORE.get(phone)

    if not otp_data:
        return jsonify({
            "error": "OTP not found. Please request a new OTP."
        }), 400

    if datetime.now().timestamp() > otp_data["expires"]:
        OTP_STORE.pop(phone, None)
        return jsonify({
            "error": "OTP expired. Please request a new OTP."
        }), 400

    if str(otp_data["otp"]) != otp:
        return jsonify({"error": "Invalid OTP."}), 400

    conn = get_db()
    cur = conn.cursor()

    existing = cur.execute(
        "SELECT * FROM customers WHERE phone = ?",
        (phone,)
    ).fetchone()

    if existing:
        conn.close()
        return jsonify({
            "error": "An account with this phone number already exists. Please login."
        }), 409

    password_hash = generate_password_hash(password)

    cur.execute("""
        INSERT INTO customers
        (name, phone, password_hash, credit_limit, credit_used, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        name,
        phone,
        password_hash,
        500,
        0,
        datetime.now().isoformat()
    ))

    customer_id = cur.lastrowid

    conn.commit()

    customer = cur.execute(
        "SELECT id, name, phone, credit_limit, credit_used, created_at "
        "FROM customers WHERE id = ?",
        (customer_id,)
    ).fetchone()

    conn.close()

    # OTP can no longer be reused
    OTP_STORE.pop(phone, None)

    session["customer_id"] = customer_id

    return jsonify({
        "success": True,
        "message": "Account created successfully.",
        "customer_id": customer_id,
        "customer": dict(customer)
    }), 201


@app.route("/api/customer/login", methods=["POST"])
def login_customer():
    data = request.get_json(silent=True) or {}

    identifier = str(
        data.get("identifier", data.get("phone", ""))
    ).strip()

    password = str(data.get("password", ""))

    if not identifier:
        return jsonify({
            "error": "Please enter your phone number or username."
        }), 400

    if not password:
        return jsonify({
            "error": "Please enter your password."
        }), 400

    conn = get_db()
    cur = conn.cursor()

    # Current customer accounts use phone as the unique login identifier.
    # Name is also accepted for convenience.
    customer = cur.execute("""
        SELECT *
        FROM customers
        WHERE phone = ? OR name = ?
        ORDER BY id DESC
        LIMIT 1
    """, (identifier, identifier)).fetchone()

    if not customer:
        conn.close()
        return jsonify({
            "error": "Account not found. Please create an account first."
        }), 404

    password_hash = customer["password_hash"]

    if not password_hash:
        conn.close()
        return jsonify({
            "error": "This account was created with the old OTP system. Please create a new account or use the old OTP login."
        }), 400

    if not check_password_hash(password_hash, password):
        conn.close()
        return jsonify({
            "error": "Incorrect password."
        }), 401

    session["customer_id"] = customer["id"]

    result = {
        "id": customer["id"],
        "customer_id": customer["id"],
        "name": customer["name"],
        "phone": customer["phone"],
        "credit_limit": customer["credit_limit"],
        "credit_used": customer["credit_used"],
        "created_at": customer["created_at"]
    }

    conn.close()

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "customer_id": customer["id"],
        "customer": result
    }), 200


@app.route("/api/customer/logout", methods=["POST"])
def customer_logout():
    session.pop("customer_id", None)

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    }), 200


@app.route("/api/customer", methods=["POST"])
def create_customer():

    data = request.get_json() or {}

    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()

    if not name or not phone:
        return jsonify({
            "error": "Name and phone are required"
        }), 400

    conn = get_db()

    existing = conn.execute(
        "SELECT * FROM customers WHERE phone = ?",
        (phone,)
    ).fetchone()

    if existing:
        conn.close()

        return jsonify({
            "id": existing["id"],
            "name": existing["name"],
            "phone": existing["phone"],
            "credit_limit": existing["credit_limit"],
            "credit_used": existing["credit_used"],
            "available_credit":
                existing["credit_limit"] - existing["credit_used"]
        })

    now = datetime.now().isoformat()

    cur = conn.execute("""
        INSERT INTO customers
        (name, phone, credit_limit, credit_used, created_at)
        VALUES (?, ?, 500, 0, ?)
    """, (name, phone, now))

    customer_id = cur.lastrowid

    conn.commit()

    customer = conn.execute(
        "SELECT * FROM customers WHERE id = ?",
        (customer_id,)
    ).fetchone()

    conn.close()

    return jsonify({
        "id": customer["id"],
        "name": customer["name"],
        "phone": customer["phone"],
        "credit_limit": customer["credit_limit"],
        "credit_used": customer["credit_used"],
        "available_credit":
            customer["credit_limit"] - customer["credit_used"]
    })


@app.route("/api/customer/<int:customer_id>", methods=["GET"])
def get_customer(customer_id):

    conn = get_db()

    customer = conn.execute(
        "SELECT * FROM customers WHERE id = ?",
        (customer_id,)
    ).fetchone()

    conn.close()

    if not customer:
        return jsonify({
            "error": "Customer not found"
        }), 404

    data = dict(customer)

    data["available_credit"] = (
        data["credit_limit"] -
        data["credit_used"]
    )

    return jsonify(data)


# =========================================================
# CREATE ORDER
# =========================================================

@app.route("/api/orders", methods=["POST"])
def create_order():

    data = request.get_json() or {}

    customer_id = data.get("customer_id")
    items = data.get("items", [])
    payment_method = data.get("payment_method")

    if not customer_id:
        return jsonify({
            "error": "Customer required"
        }), 400

    if not items:
        return jsonify({
            "error": "Cart is empty"
        }), 400

    if payment_method not in ["pay", "credit"]:
        return jsonify({
            "error": "Invalid payment method"
        }), 400

    conn = get_db()

    customer = conn.execute(
        "SELECT * FROM customers WHERE id = ?",
        (customer_id,)
    ).fetchone()

    if not customer:
        conn.close()

        return jsonify({
            "error": "Customer not found"
        }), 404

    total = 0
    verified_items = []

    for item in items:

        menu_id = item.get("id")
        quantity = int(item.get("quantity", 1))

        menu = conn.execute(
            "SELECT * FROM menu_items WHERE id = ?",
            (menu_id,)
        ).fetchone()

        if not menu:
            continue

        if not menu["available"]:
            conn.close()

            return jsonify({
                "error":
                    f'{menu["name"]} is currently unavailable'
            }), 400

        item_total = menu["price"] * quantity
        total += item_total

        verified_items.append({
            "id": menu["id"],
            "name": menu["name"],
            "price": menu["price"],
            "quantity": quantity
        })

    if not verified_items:
        conn.close()

        return jsonify({
            "error": "No valid items"
        }), 400

    # Credit check
    if payment_method == "credit":

        available = (
            customer["credit_limit"] -
            customer["credit_used"]
        )

        if total > available:
            conn.close()

            return jsonify({
                "error": "Credit limit exceeded",
                "available_credit": available,
                "order_total": total
            }), 400

    now = datetime.now().isoformat()

    cur = conn.execute("""
        INSERT INTO orders
        (customer_id, total, payment_method, status, created_at)
        VALUES (?, ?, ?, 'Pending', ?)
    """, (
        customer_id,
        total,
        payment_method,
        now
    ))

    order_id = cur.lastrowid

    for item in verified_items:

        conn.execute("""
            INSERT INTO order_items
            (order_id, menu_item_id, name, price, quantity)
            VALUES (?, ?, ?, ?, ?)
        """, (
            order_id,
            item["id"],
            item["name"],
            item["price"],
            item["quantity"]
        ))

    # Credit order
    if payment_method == "credit":

        new_used = customer["credit_used"] + total

        conn.execute("""
            UPDATE customers
            SET credit_used = ?
            WHERE id = ?
        """, (
            new_used,
            customer_id
        ))

        conn.execute("""
            INSERT INTO credit_transactions
            (customer_id, order_id, amount, type, note, created_at)
            VALUES (?, ?, ?, 'credit', ?, ?)
        """, (
            customer_id,
            order_id,
            total,
            "Order added to credit",
            now
        ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "order_id": order_id,
        "total": total,
        "status": "Pending",
        "payment_method": payment_method
    })


# =========================================================
# CUSTOMER ORDERS
# =========================================================

@app.route("/api/customer/<int:customer_id>/orders", methods=["GET"])
def customer_orders(customer_id):

    conn = get_db()

    orders = conn.execute("""
        SELECT *
        FROM orders
        WHERE customer_id = ?
        ORDER BY id DESC
    """, (customer_id,)).fetchall()

    result = []

    for order in orders:

        items = conn.execute("""
            SELECT *
            FROM order_items
            WHERE order_id = ?
        """, (order["id"],)).fetchall()

        order_data = dict(order)

        order_data["items"] = [
            dict(item)
            for item in items
        ]

        result.append(order_data)

    conn.close()

    return jsonify(result)


# =========================================================
# ADMIN LOGIN
# =========================================================

@app.route("/api/admin/login", methods=["POST"])
def admin_login():

    data = request.get_json() or {}

    username = data.get("username", "")
    password = data.get("password", "")

    conn = get_db()

    admin = conn.execute(
        "SELECT * FROM admins WHERE username = ?",
        (username,)
    ).fetchone()

    conn.close()

    if not admin:
        return jsonify({
            "error": "Invalid username or password"
        }), 401

    if not check_password_hash(
        admin["password"],
        password
    ):
        return jsonify({
            "error": "Invalid username or password"
        }), 401

    session["admin_id"] = admin["id"]

    return jsonify({
        "success": True
    })


@app.route("/api/admin/logout", methods=["POST"])
def admin_logout():

    session.pop("admin_id", None)

    return jsonify({
        "success": True
    })


def admin_required():

    return session.get("admin_id") is not None


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@app.route("/api/admin/dashboard", methods=["GET"])
def admin_dashboard():

    if not admin_required():
        return jsonify({
            "error": "Unauthorized"
        }), 401

    conn = get_db()

    today = datetime.now().strftime("%Y-%m-%d")

    orders_today = conn.execute("""
        SELECT COUNT(*) AS count
        FROM orders
        WHERE date(created_at) = ?
    """, (today,)).fetchone()["count"]

    sales_today = conn.execute("""
        SELECT COALESCE(SUM(total), 0) AS total
        FROM orders
        WHERE date(created_at) = ?
        AND status != 'Cancelled'
    """, (today,)).fetchone()["total"]

    customers = conn.execute("""
        SELECT COUNT(*) AS count
        FROM customers
    """).fetchone()["count"]

    outstanding = conn.execute("""
        SELECT COALESCE(SUM(credit_used), 0) AS total
        FROM customers
    """).fetchone()["total"]

    conn.close()

    return jsonify({
        "orders_today": orders_today,
        "sales_today": sales_today,
        "customers": customers,
        "outstanding_credit": outstanding
    })


# =========================================================
# ADMIN ORDERS
# =========================================================

@app.route("/api/admin/orders", methods=["GET"])
def admin_orders():

    if not admin_required():
        return jsonify({
            "error": "Unauthorized"
        }), 401

    conn = get_db()

    orders = conn.execute("""
        SELECT
            orders.*,
            customers.name AS customer_name,
            customers.phone AS customer_phone
        FROM orders
        JOIN customers
        ON orders.customer_id = customers.id
        ORDER BY orders.id DESC
    """).fetchall()

    result = []

    for order in orders:

        order_data = dict(order)

        items = conn.execute("""
            SELECT *
            FROM order_items
            WHERE order_id = ?
        """, (order["id"],)).fetchall()

        order_data["items"] = [
            dict(item)
            for item in items
        ]

        result.append(order_data)

    conn.close()

    return jsonify(result)


# =========================================================
# UPDATE ORDER STATUS
# =========================================================

@app.route("/api/admin/orders/<int:order_id>/status", methods=["PUT"])
def update_order_status(order_id):

    if not admin_required():
        return jsonify({
            "error": "Unauthorized"
        }), 401

    data = request.get_json() or {}

    status = data.get("status")

    allowed = [
        "Pending",
        "Confirmed",
        "Preparing",
        "Ready",
        "Delivered",
        "Cancelled"
    ]

    if status not in allowed:
        return jsonify({
            "error": "Invalid status"
        }), 400

    conn = get_db()

    conn.execute("""
        UPDATE orders
        SET status = ?
        WHERE id = ?
    """, (
        status,
        order_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True
    })


# =========================================================
# ADMIN MENU
# =========================================================

@app.route("/api/admin/menu", methods=["POST"])
def add_menu():

    if not admin_required():
        return jsonify({
            "error": "Unauthorized"
        }), 401

    data = request.get_json() or {}

    name = data.get("name", "").strip()
    description = data.get("description", "")
    category = data.get("category", "other")
    price = float(data.get("price", 0))
    image = data.get("image", "🍽️")

    if not name or price <= 0:
        return jsonify({
            "error": "Name and valid price required"
        }), 400

    now = datetime.now().isoformat()

    conn = get_db()

    cur = conn.execute("""
        INSERT INTO menu_items
        (name, description, category, price, image, available, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
    """, (
        name,
        description,
        category,
        price,
        image,
        now
    ))

    conn.commit()

    menu_id = cur.lastrowid

    conn.close()

    return jsonify({
        "success": True,
        "id": menu_id
    })


@app.route("/api/admin/menu/<int:item_id>", methods=["PUT"])
def edit_menu(item_id):

    if not admin_required():
        return jsonify({
            "error": "Unauthorized"
        }), 401

    data = request.get_json() or {}

    conn = get_db()

    current = conn.execute(
        "SELECT * FROM menu_items WHERE id = ?",
        (item_id,)
    ).fetchone()

    if not current:
        conn.close()

        return jsonify({
            "error": "Menu item not found"
        }), 404

    name = data.get("name", current["name"])
    description = data.get(
        "description",
        current["description"]
    )
    category = data.get(
        "category",
        current["category"]
    )
    price = float(
        data.get("price", current["price"])
    )
    image = data.get(
        "image",
        current["image"]
    )
    available = int(
        data.get(
            "available",
            current["available"]
        )
    )

    conn.execute("""
        UPDATE menu_items
        SET name = ?,
            description = ?,
            category = ?,
            price = ?,
            image = ?,
            available = ?
        WHERE id = ?
    """, (
        name,
        description,
        category,
        price,
        image,
        available,
        item_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True
    })


@app.route("/api/admin/menu/<int:item_id>", methods=["DELETE"])
def delete_menu(item_id):

    if not admin_required():
        return jsonify({
            "error": "Unauthorized"
        }), 401

    conn = get_db()

    conn.execute(
        "DELETE FROM menu_items WHERE id = ?",
        (item_id,)
    )

    conn.commit()
    conn.close()

    return jsonify({
        "success": True
    })


# =========================================================
# CUSTOMERS
# =========================================================

@app.route("/api/admin/customers", methods=["GET"])
def admin_customers():

    if not admin_required():
        return jsonify({
            "error": "Unauthorized"
        }), 401

    conn = get_db()

    customers = conn.execute("""
        SELECT *
        FROM customers
        ORDER BY id DESC
    """).fetchall()

    result = []

    for customer in customers:

        data = dict(customer)

        data["available_credit"] = (
            data["credit_limit"] -
            data["credit_used"]
        )

        result.append(data)

    conn.close()

    return jsonify(result)


# =========================================================
# CUSTOMER CREDIT UPDATE
# =========================================================

@app.route(
    "/api/admin/customers/<int:customer_id>/credit",
    methods=["PUT"]
)
def update_customer_credit(customer_id):

    if not admin_required():
        return jsonify({
            "error": "Unauthorized"
        }), 401

    data = request.get_json() or {}

    credit_limit = float(
        data.get("credit_limit", 500)
    )

    conn = get_db()

    customer = conn.execute(
        "SELECT * FROM customers WHERE id = ?",
        (customer_id,)
    ).fetchone()

    if not customer:
        conn.close()

        return jsonify({
            "error": "Customer not found"
        }), 404

    if credit_limit < customer["credit_used"]:
        conn.close()

        return jsonify({
            "error":
                "Credit limit cannot be lower than used credit"
        }), 400

    conn.execute("""
        UPDATE customers
        SET credit_limit = ?
        WHERE id = ?
    """, (
        credit_limit,
        customer_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True
    })


# =========================================================
# CREDIT PAYMENT
# =========================================================

@app.route(
    "/api/admin/customers/<int:customer_id>/payment",
    methods=["POST"]
)
def record_payment(customer_id):

    if not admin_required():
        return jsonify({
            "error": "Unauthorized"
        }), 401

    data = request.get_json() or {}

    amount = float(data.get("amount", 0))
    note = data.get("note", "Credit payment")

    if amount <= 0:
        return jsonify({
            "error": "Invalid amount"
        }), 400

    conn = get_db()

    customer = conn.execute(
        "SELECT * FROM customers WHERE id = ?",
        (customer_id,)
    ).fetchone()

    if not customer:
        conn.close()

        return jsonify({
            "error": "Customer not found"
        }), 404

    new_used = max(
        0,
        customer["credit_used"] - amount
    )

    actual_payment = (
        customer["credit_used"] -
        new_used
    )

    now = datetime.now().isoformat()

    conn.execute("""
        UPDATE customers
        SET credit_used = ?
        WHERE id = ?
    """, (
        new_used,
        customer_id
    ))

    conn.execute("""
        INSERT INTO credit_transactions
        (customer_id, order_id, amount, type, note, created_at)
        VALUES (?, NULL, ?, 'payment', ?, ?)
    """, (
        customer_id,
        actual_payment,
        note,
        now
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "paid": actual_payment,
        "remaining":
            new_used
    })


# =========================================================
# START
# =========================================================


# THALASSERY PREMIUM CUSTOMER PAGES

@app.route("/home")
def premium_home():
    return send_from_directory(".", "home.html")

@app.route("/menu")
def premium_menu():
    return send_from_directory(".", "menu.html")

@app.route("/cart")
def premium_cart():
    return send_from_directory(".", "cart.html")

@app.route("/checkout")
def premium_checkout():
    return send_from_directory(".", "checkout.html")

@app.route("/orders")
def premium_orders():
    return send_from_directory(".", "orders.html")

@app.route("/account")
def premium_account():
    return send_from_directory(".", "account.html")

@app.route("/order-success")
def premium_order_success():
    return send_from_directory(".", "order-success.html")

@app.route("/premium.css")
def premium_css():
    return send_from_directory(".", "premium.css")

@app.route("/premium.js")
def premium_js():
    return send_from_directory(".", "premium.js")


if __name__ == "__main__":

    init_db()

    print("")
    print("====================================")
    print("       THALASSERI FOOD SYSTEM")
    print("====================================")
    print("Customer : http://127.0.0.1:5000/")
    print("Owner    : http://127.0.0.1:5000/admin")
    print("Admin    : admin / thalasseri123")
    print("====================================")
    print("")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )
