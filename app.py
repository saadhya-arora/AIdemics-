
from flask import Flask, request, jsonify
from model import train_model, predict_priority

app = Flask(__name__)

# Train the model locally when the API starts.
model = train_model()


# Allow your local Next.js website to communicate with Flask.
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "message": "AIdemics local AI service is ready"
    })


@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Please send task data as JSON."}), 400

    required_fields = [
        "difficulty",
        "importance",
        "urgency",
        "available_time"
    ]

    if not all(field in data for field in required_fields):
        return jsonify({
            "error": "Missing required task information."
        }), 400

    try:
        values = []

        for field in required_fields:
            value = data[field]

            if isinstance(value, bool):
                raise ValueError()

            number = int(value)

            if number not in (1, 2, 3) or str(value).strip() != str(number):
                raise ValueError()

            values.append(number)

        result = predict_priority(model, *values)

        return jsonify(result)

    except (ValueError, TypeError):
        return jsonify({
            "error": "Each input must be 1, 2, or 3."
        }), 400


if __name__ == "__main__":
    print("AIdemics AI service: http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)
