import os
import re
import sqlite3
from flask import Flask, request, redirect, url_for, g, render_template_string

app = Flask(__name__)
PORT = int(os.environ.get('PORT', 3000))
DB_PATH = os.path.join(os.path.dirname(__file__), 'farmers.db')
PATTERN = re.compile(r'^[A-Za-z ]{2,50}$')

# HTML templates
HOMEPAGE = """<!DOCTYPE html>
<html>
<head>
  <title>Farmer Directory</title>
  <style>
    body { font-family: Arial; max-width: 800px; margin: 0 auto; padding: 20px; }
    input { margin: 10px 0; padding: 5px; width: 200px; }
    button { padding: 10px; background: #4CAF50; color: white; border: none; }
  </style>
</head>
<body>
  <h1>Add Farmer</h1>
  <form action="{{ url_for('add') }}" method="POST" onsubmit="return validateForm()">
    <input name="name" placeholder="Name" pattern="[A-Za-z ]{2,50}" required><br>
    <input name="location" placeholder="Location" pattern="[A-Za-z ]{2,50}" required><br>
    <input name="crop" placeholder="Crop" pattern="[A-Za-z ]{2,50}" required><br>
    <button type="submit">Add Farmer</button>
  </form>
  <br>
  <a href="{{ url_for('farmers') }}">View Farmers</a>
  <script>
    function validateForm() {
      const inputs = document.getElementsByTagName('input');
      for(let input of inputs) {
        if(!/^[A-Za-z ]{2,50}$/.test(input.value)) {
          alert('Please enter valid ' + input.name + ' (2-50 letters only)');
          return false;
        }
      }
      return true;
    }
  </script>
</body>
</html>
"""

FARMERS_PAGE = """<!DOCTYPE html>
<html>
<head>
  <title>Registered Farmers</title>
  <style> body { font-family: Arial; max-width: 800px; margin: 0 auto; padding: 20px; } li { margin: 10px 0; } </style>
</head>
<body>
  <h1>Registered Farmers</h1>
  <ul>
    {% for f in farmers %}
      <li>{{ f['name'] }} from {{ f['location'] }} grows {{ f['crop'] }}</li>
    {% endfor %}
  </ul>
  <a href="{{ url_for('home') }}">Back</a>
</body>
</html>"""

# Database helpers
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    os.makedirs(os.path.dirname(DB_PATH) or '.', exist_ok=True)
    with sqlite3.connect(DB_PATH) as db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS farmers ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "name TEXT NOT NULL, "
            "location TEXT NOT NULL, "
            "crop TEXT NOT NULL, "
            "created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        )

# Security headers
@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

# Routes
@app.route('/', methods=['GET'])
def home():
    return render_template_string(HOMEPAGE)

@app.route('/add', methods=['POST'])
def add():
    name = (request.form.get('name') or '').strip()
    location = (request.form.get('location') or '').strip()
    crop = (request.form.get('crop') or '').strip()

    if not (PATTERN.match(name) and PATTERN.match(location) and PATTERN.match(crop)):
        return "Invalid input. Please use only letters (2-50 characters).", 400

    db = get_db()
    try:
        db.execute(
            "INSERT INTO farmers (name, location, crop) VALUES (?, ?, ?)",
            (name, location, crop)
        )
        db.commit()
    except Exception:
        app.logger.exception("DB insert failed")
        return "Error saving farmer", 500

    return redirect(url_for('farmers'))

@app.route('/farmers', methods=['GET'])
def farmers():
    db = get_db()
    try:
        cur = db.execute("SELECT name, location, crop FROM farmers ORDER BY created_at DESC")
        rows = cur.fetchall()
        return render_template_string(FARMERS_PAGE, farmers=rows)
    except Exception:
        app.logger.exception("DB read failed")
        return "Error loading farmers", 500

# Error handlers
@app.errorhandler(404)
def not_found(e):
    return "Page not found", 404

@app.errorhandler(500)
def server_error(e):
    return "Something went wrong!", 500

# Run the app
if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=PORT)
