# AIdemics – AI-Based Study Planner

AIdemics is a study planner designed to help students organize their academic tasks, prioritize their work, and manage their study time efficiently.

## Project Purpose

The purpose of AIdemics is to help students manage their academic workload, identify important and urgent tasks, and plan their study time more effectively. By combining task management features with machine learning-based priority prediction, the project aims to make study planning simpler and help students stay organized.

## Features

- Add, complete, and delete tasks
- Prioritize tasks based on difficulty, importance, and urgency
- Generate a daily study plan
- Track completed and pending tasks
- Predict task priority using machine learning

## Technologies Used

- Next.js
- React
- TypeScript
- Python
- Flask
- Scikit-learn

## Machine Learning Workflow

1. **Data Collection:** Sample task data is created using attributes such as difficulty, importance, and urgency.
2. **Data Preparation:** Task attributes are represented as numerical values for the machine learning model.
3. **Model Training:** A Decision Tree classifier is trained using sample data with assigned priority labels.
4. **User Input:** Students enter task details, including difficulty, importance, and deadline.
5. **Priority Prediction:** The task details are sent from the frontend to the Python Flask service, which uses the trained model to predict task priority.
6. **Result Display:** The predicted priority is returned to the website and displayed to the user.

## About the Project

AIdemics is a web-based study planner that helps students manage their academic tasks and organize their study schedules. Students can add tasks, set their difficulty, importance, and deadlines, track completed and pending work, and view a daily study plan. The project also incorporates a machine-learning model that predicts task priority based on task attributes, helping students identify which tasks may need more attention. Built using Next.js, TypeScript, Python, Flask, and Scikit-learn, AIdemics combines task management with machine learning to make academic planning simpler and more organized.
