
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

# Features:
# difficulty:      1 = Easy, 2 = Medium, 3 = Hard
# importance:      1 = Low, 2 = Medium, 3 = High
# urgency:         1 = Low, 2 = Medium, 3 = High
# available_time:  1 = Short, 2 = Medium, 3 = Long
#
# Labels:
# 0 = Normal priority
# 1 = High priority
#
# These are synthetic examples for a prototype, not real student data.

X = np.array([
    [1, 1, 1, 3],
    [1, 2, 1, 3],
    [2, 1, 1, 2],
    [3, 3, 3, 1],
    [2, 3, 3, 2],
    [3, 2, 3, 1],
    [1, 3, 3, 2],
    [2, 2, 2, 2],
    [3, 1, 1, 3],
    [1, 1, 3, 1],
    [2, 3, 2, 2],
    [3, 3, 2, 1],
    [1, 2, 3, 1],
    [2, 1, 3, 2],
    [3, 2, 2, 2],
    [1, 3, 1, 3],
    [2, 2, 3, 1],
    [3, 1, 3, 1],
    [2, 3, 1, 3],
    [3, 3, 1, 2],
    [1, 2, 2, 2],
    [2, 1, 2, 1],
    [3, 2, 1, 3],
    [1, 1, 2, 1],
    [2, 2, 1, 3],
    [3, 1, 2, 2],
    [1, 3, 2, 2],
    [2, 3, 3, 1],
    [3, 3, 3, 2],
    [1, 2, 3, 2],
], dtype=int)


def make_priority_label(row):
    difficulty, importance, urgency, available_time = row

    # Give more weight to importance and deadline urgency.
    score = (
        difficulty
        + (importance * 2)
        + (urgency * 2)
    )

    # Tasks with a high score need more attention.
    return 1 if score >= 11 else 0


# Generate consistent labels from the features.
# This makes the prototype internally consistent,
# but does not establish real-world accuracy.
y = np.array([make_priority_label(row) for row in X])


def train_model():
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.25,
        random_state=42,
        stratify=y
    )

    model = DecisionTreeClassifier(
        max_depth=4,
        random_state=42
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)

    print("AIdemics local ML model trained successfully!")
    print(f"Test accuracy against generated labels: {accuracy:.2%}")
    print("Note: this is a synthetic prototype, not real-world validation.")

    return model


def predict_priority(model, difficulty, importance, urgency, available_time):
    features = np.array([[
        difficulty,
        importance,
        urgency,
        available_time
    ]], dtype=int)

    prediction = int(model.predict(features)[0])
    probabilities = model.predict_proba(features)[0]
    confidence = float(max(probabilities))

    return {
        "priority": "High" if prediction == 1 else "Normal",
        "confidence": round(confidence, 2)
    }


if __name__ == "__main__":
    model = train_model()

    test_tasks = [
        ("Easy, low importance, distant deadline", 1, 1, 1, 3),
        ("Hard, high importance, urgent deadline", 3, 3, 3, 1),
        ("Medium difficulty, high importance", 2, 3, 2, 2),
    ]

    print("\nExample predictions:")

    for name, difficulty, importance, urgency, available_time in test_tasks:
        result = predict_priority(
            model,
            difficulty,
            importance,
            urgency,
            available_time
        )
        print(f"{name}: {result}")
