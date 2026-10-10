
"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Task = {
  id: string;
  subject: string;
  topic: string;
  deadline: string;
  hours: number;
  difficulty: "Easy" | "Medium" | "Hard";
  importance: "Low" | "Medium" | "High";
  completed: boolean;
};

type Filter = "All" | "Pending" | "Completed";

type AIResult = {
  taskId: string;
  priority: string;
  confidence: number;
};

const STORAGE_KEY = "aidemics-tasks-v1";

function getPriority(task: Task): number {
  const difficultyScore = {
    Easy: 1,
    Medium: 2,
    Hard: 3,
  }[task.difficulty];

  const importanceScore = {
    Low: 1,
    Medium: 2,
    High: 3,
  }[task.importance];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(`${task.deadline}T00:00:00`);
  const daysLeft = Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const urgencyScore =
    daysLeft < 0 ? 4 : daysLeft === 0 ? 3 : daysLeft <= 2 ? 2 : 1;

  return difficultyScore + importanceScore + urgencyScore;
}

function formatDeadline(deadline: string): string {
  if (!deadline) return "No deadline";

  const date = new Date(`${deadline}T00:00:00`);

  if (Number.isNaN(date.getTime())) return deadline;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");
  const [planned, setPlanned] = useState(false);
  const [dailyGoal, setDailyGoal] = useState("3");
  const [today, setToday] = useState("");

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hours, setHours] = useState("1");
  const [difficulty, setDifficulty] =
    useState<Task["difficulty"]>("Medium");
  const [importance, setImportance] =
    useState<Task["importance"]>("Medium");
  const [showForm, setShowForm] = useState(false);

  // AI recommendation state
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiLoadingTaskId, setAiLoadingTaskId] = useState<string | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiErrorTaskId, setAiErrorTaskId] = useState<string | null>(null);

  // Load the date only after the component mounts.
  // This avoids the current-time prerendering warning.
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  // Load previously saved tasks from this browser.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setTasks(parsed as Task[]);
        }
      }
    } catch {
      console.error("Could not load saved AIdemics tasks.");
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save tasks whenever they change, after initial loading.
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      console.error("Could not save AIdemics tasks.");
    }
  }, [tasks, loaded]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = tasks.length - completedCount;

  const progress =
    tasks.length === 0
      ? 0
      : Math.round((completedCount / tasks.length) * 100);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (filter === "Pending") return !task.completed;
        if (filter === "Completed") return task.completed;
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) {
          return Number(a.completed) - Number(b.completed);
        }

        return getPriority(b) - getPriority(a);
      });
  }, [tasks, filter]);

  const todayPlan = useMemo(() => {
    const budget = Number(dailyGoal);
    let remaining = budget;

    const pending = tasks
      .filter((task) => !task.completed)
      .sort((a, b) => {
        const priorityDifference = getPriority(b) - getPriority(a);

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return a.deadline.localeCompare(b.deadline);
      });

    const plan: {
      task: Task;
      allocated: number;
      partial: boolean;
    }[] = [];

    for (const task of pending) {
      if (remaining <= 0) break;

      const allocated = Math.min(task.hours, remaining);

      plan.push({
        task,
        allocated,
        partial: allocated < task.hours,
      });

      remaining = Math.round((remaining - allocated) * 100) / 100;
    }

    return {
      tasks: plan,
      budget,
      used: Math.round((budget - remaining) * 100) / 100,
      remaining,
    };
  }, [tasks, dailyGoal]);

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subject.trim() || !topic.trim() || !deadline) return;

    const newTask: Task = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subject: subject.trim(),
      topic: topic.trim(),
      deadline,
      hours: Number(hours),
      difficulty,
      importance,
      completed: false,
    };

    setTasks((previous) => [...previous, newTask]);
    setSubject("");
    setTopic("");
    setDeadline("");
    setHours("1");
    setDifficulty("Medium");
    setImportance("Medium");
    setShowForm(false);
    setFilter("All");
    setPlanned(false);
  }

  function toggleTask(id: string) {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );

    setPlanned(false);
  }

  function deleteTask(id: string) {
    setTasks((previous) => previous.filter((task) => task.id !== id));
    setPlanned(false);

    if (aiResult?.taskId === id) {
      setAiResult(null);
    }

    if (aiErrorTaskId === id) {
      setAiError("");
      setAiErrorTaskId(null);
    }
  }

  function generatePlan() {
    setFilter("Pending");
    setPlanned(true);
  }

  // Ask the locally running Python ML service for a prediction.
  async function getAIRecommendation(task: Task) {
    setAiLoadingTaskId(task.id);
    setAiError("");
    setAiErrorTaskId(null);
    setAiResult(null);

    const difficultyValue = {
      Easy: 1,
      Medium: 2,
      Hard: 3,
    }[task.difficulty];

    const importanceValue = {
      Low: 1,
      Medium: 2,
      High: 3,
    }[task.importance];

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(`${task.deadline}T00:00:00`);

    const daysLeft = Math.ceil(
      (deadlineDate.getTime() - todayDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Map urgency to the model's 1–3 input scale.
    const urgencyValue =
      daysLeft <= 2 ? 3 : daysLeft <= 7 ? 2 : 1;

    // Convert today's available hours to the model's 1–3 scale.
    const goal = Number(dailyGoal);
    const availableTimeValue =
      goal <= 2 ? 1 : goal <= 4 ? 2 : 3;

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            difficulty: difficultyValue,
            importance: importanceValue,
            urgency: urgencyValue,
            available_time: availableTimeValue,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("The local AI service returned an error.");
      }

      const result: {
        priority: string;
        confidence: number;
      } = await response.json();

      if (
        !["High", "Normal"].includes(result.priority) ||
        typeof result.confidence !== "number" ||
        !Number.isFinite(result.confidence)
      ) {
        throw new Error("The AI service returned an invalid result.");
      }

      setAiResult({
        taskId: task.id,
        priority: result.priority,
        confidence: result.confidence,
      });
    } catch {
      setAiError(
        "Could not connect to the local AI. Check that Python app.py is running."
      );
      setAiErrorTaskId(task.id);
    } finally {
      setAiLoadingTaskId(null);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          aria-label="AIdemics home"
          onClick={(event) => {
            event.preventDefault();
            setFilter("All");
            setPlanned(false);
          }}
        >
          <span className="brand-icon">A</span>
          <span>
            <strong>AIdemics</strong>
            <small>YOUR STUDY COMPANION</small>
          </span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <button
          className={`nav-item ${filter === "All" && !planned ? "active" : ""}`}
          onClick={() => {
            setFilter("All");
            setPlanned(false);
          }}
        >
          <span>▦</span>
          Dashboard
        </button>

        <button
          className={`nav-item ${filter === "Pending" && !planned ? "active" : ""}`}
          onClick={() => {
            setFilter("Pending");
            setPlanned(false);
          }}
        >
          <span>◷</span>
          Pending tasks
          <span className="nav-count">{pendingCount}</span>
        </button>

        <button
          className={`nav-item ${filter === "Completed" ? "active" : ""}`}
          onClick={() => {
            setFilter("Completed");
            setPlanned(false);
          }}
        >
          <span>✓</span>
          Completed
          <span className="nav-count">{completedCount}</span>
        </button>

        <div className="sidebar-bottom">
          <div className="offline-card">
            <span className="offline-dot" />
            <div>
              <strong>Offline-first</strong>
              <p>Your tasks stay in this browser.</p>
            </div>
          </div>

          <p className="sidebar-footer">Made for focused learning ✦</p>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR PERSONAL STUDY SPACE</p>
            <h1>Study smarter, not harder.</h1>
            <p className="subtitle">
              Organise your workload and make every study session count.
            </p>
          </div>

          <div className="date-pill">
            <span>◷</span>
            {today || "Loading date..."}
          </div>
        </header>

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-top">
              <span>Total tasks</span>
              <span className="stat-icon lavender">▤</span>
            </div>
            <strong className="stat-number">{tasks.length}</strong>
            <p>Across all your subjects</p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Still to do</span>
              <span className="stat-icon peach">◷</span>
            </div>
            <strong className="stat-number">{pendingCount}</strong>
            <p>One step at a time</p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Completed</span>
              <span className="stat-icon mint">✓</span>
            </div>
            <strong className="stat-number">{completedCount}</strong>
            <p>Look how far you have come</p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Overall progress</span>
              <span className="stat-icon blue">↗</span>
            </div>
            <strong className="stat-number">{progress}%</strong>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </article>
        </section>

        <section className="planner-card">
          <div className="planner-heading">
            <div className="planner-symbol">✦</div>
            <div>
              <p className="eyebrow">PERSONALISED PLANNING</p>
              <h2>Your study plan</h2>
              <p className="section-description">
                Choose your available time. Your recommended sessions will
                adjust automatically.
              </p>
            </div>
          </div>

          <div className="planner-controls">
            <label className="goal-field" htmlFor="daily-goal">
              <span>Available study time today</span>
              <select
                id="daily-goal"
                value={dailyGoal}
                onChange={(event) => {
                  setDailyGoal(event.target.value);
                  setPlanned(true);
                }}
              >
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
                <option value="4">4 hours</option>
                <option value="5">5 hours</option>
                <option value="6">6 hours</option>
              </select>
            </label>

            <button className="primary-button" onClick={generatePlan}>
              ✦ Organise my plan
            </button>
          </div>

          {planned && (
            <div className="plan-results">
              <div className="plan-time-summary">
                <div>
                  <span>Daily goal</span>
                  <strong>{todayPlan.budget}h</strong>
                </div>
                <div>
                  <span>Scheduled</span>
                  <strong>{todayPlan.used}h</strong>
                </div>
                <div>
                  <span>Available</span>
                  <strong>{todayPlan.remaining}h</strong>
                </div>
              </div>

              {todayPlan.tasks.length === 0 ? (
                <div className="empty-plan">
                  <span>☀</span>
                  <strong>No pending tasks to schedule</strong>
                  <p>
                    Add a task or mark a completed task as pending to build
                    your study plan.
                  </p>
                </div>
              ) : (
                <>
                  <div className="plan-list-heading">
                    <h3>Recommended sessions</h3>
                    <span>
                      {todayPlan.tasks.length}{" "}
                      {todayPlan.tasks.length === 1 ? "session" : "sessions"}
                    </span>
                  </div>

                  <div className="plan-schedule">
                    {todayPlan.tasks.map(
                      ({ task, allocated, partial }, index) => (
                        <div className="plan-step" key={task.id}>
                          <span className="plan-step-number">{index + 1}</span>

                          <div className="plan-step-info">
                            <strong>
                              {task.subject}: {task.topic}
                            </strong>
                            <span>
                              {allocated}h study time
                              {partial ? ` of ${task.hours}h estimated` : ""}
                              {" · "}Priority {getPriority(task)}
                            </span>
                            <span>
                              Deadline: {formatDeadline(task.deadline)}
                            </span>
                          </div>

                          <button
                            className="session-done"
                            onClick={() => toggleTask(task.id)}
                            title="Mark this task completed"
                            aria-label={`Mark ${task.topic} completed`}
                          >
                            ✓
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {todayPlan.remaining > 0 && (
                    <p className="remaining-note">
                      You have {todayPlan.remaining}h left. Add more pending
                      tasks to fill your study time.
                    </p>
                  )}
                </>
              )}

              <p className="plan-disclaimer">
                Recommendations are calculated locally using task priority,
                deadlines and estimated study hours.
              </p>
            </div>
          )}
        </section>

        <section className="tasks-section">
          <div className="tasks-heading">
            <div>
              <p className="eyebrow">STAY ON TRACK</p>
              <h2>Your tasks</h2>
              <p className="section-description">
                Keep everything you need to learn in one place.
              </p>
            </div>

            <button
              className="primary-button add-button"
              onClick={() => setShowForm((previous) => !previous)}
            >
              {showForm ? "− Close form" : "+ Add task"}
            </button>
          </div>

          {showForm && (
            <form className="task-form" onSubmit={addTask}>
              <h3>Add a new task</h3>

              <div className="form-grid">
                <label>
                  Subject
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="e.g. Data Structures"
                    required
                  />
                </label>

                <label>
                  Topic
                  <input
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="e.g. Binary search tree"
                    required
                  />
                </label>

                <label>
                  Deadline
                  <input
                    type="date"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Estimated study time
                  <select
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                  >
                    <option value="0.5">30 minutes</option>
                    <option value="1">1 hour</option>
                    <option value="1.5">1.5 hours</option>
                    <option value="2">2 hours</option>
                    <option value="3">3 hours</option>
                    <option value="4">4 hours</option>
                    <option value="5">5 hours</option>
                    <option value="6">6 hours</option>
                  </select>
                </label>

                <label>
                  Difficulty
                  <select
                    value={difficulty}
                    onChange={(event) =>
                      setDifficulty(event.target.value as Task["difficulty"])
                    }
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </label>

                <label>
                  Importance
                  <select
                    value={importance}
                    onChange={(event) =>
                      setImportance(event.target.value as Task["importance"])
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </label>
              </div>

              <button className="primary-button submit-button" type="submit">
                Save task
              </button>
            </form>
          )}

          <div className="task-toolbar">
            <div className="filter-tabs">
              {(["All", "Pending", "Completed"] as Filter[]).map((item) => (
                <button
                  key={item}
                  className={`filter-tab ${filter === item ? "selected" : ""}`}
                  onClick={() => setFilter(item)}
                >
                  {item}
                  {item === "All" && (
                    <span className="filter-count">{tasks.length}</span>
                  )}
                  {item === "Pending" && (
                    <span className="filter-count">{pendingCount}</span>
                  )}
                  {item === "Completed" && (
                    <span className="filter-count">{completedCount}</span>
                  )}
                </button>
              ))}
            </div>

            <span className="sort-note">Sorted by priority</span>
          </div>

          {!loaded ? (
            <div className="empty-state">
              <p>Loading your saved tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                {filter === "Completed" ? "✓" : "✦"}
              </div>
              <h3>
                {filter === "Completed"
                  ? "No completed tasks yet"
                  : filter === "Pending"
                    ? "You are all caught up!"
                    : "Your study journey starts here"}
              </h3>
              <p>
                {filter === "Completed"
                  ? "Finish a task and it will appear here."
                  : filter === "Pending"
                    ? "Add a new task whenever you have something to study."
                    : "Add your first task to start building your plan."}
              </p>

              {filter !== "Completed" && (
                <button
                  className="secondary-button"
                  onClick={() => setShowForm(true)}
                >
                  + Add your first task
                </button>
              )}
            </div>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => {
                const priority = getPriority(task);

                return (
                  <article
                    className={`task-card ${task.completed ? "is-completed" : ""}`}
                    key={task.id}
                  >
                    <button
                      className={`task-check ${task.completed ? "checked" : ""}`}
                      onClick={() => toggleTask(task.id)}
                      aria-label={
                        task.completed
                          ? "Mark task as pending"
                          : "Mark task as completed"
                      }
                    >
                      {task.completed ? "✓" : ""}
                    </button>

                    <div className="task-main">
                      <div className="task-title-row">
                        <h3>{task.topic}</h3>
                        <span
                          className={`priority-badge ${
                            priority >= 8
                              ? "priority-high"
                              : priority >= 6
                                ? "priority-medium"
                                : "priority-low"
                          }`}
                        >
                          P{priority}
                        </span>
                      </div>

                      <p className="task-subject">{task.subject}</p>

                      <div className="task-meta">
                        <span>◷ {formatDeadline(task.deadline)}</span>
                        <span>⌛ {task.hours}h</span>
                        <span>{task.difficulty}</span>
                        <span>{task.importance} importance</span>
                      </div>

                      <div className="ai-controls">
                        <button
                          className="secondary-button"
                          onClick={() => void getAIRecommendation(task)}
                          disabled={aiLoadingTaskId === task.id}
                        >
                          {aiLoadingTaskId === task.id
                            ? "Asking AI..."
                            : "✦ Ask AI"}
                        </button>

                        {aiResult?.taskId === task.id && (
                          <p className="ai-result" role="status">
                            Experimental AI prediction:{" "}
                            <strong>{aiResult.priority} priority</strong>
                            {" · "}
                            Model confidence:{" "}
                            {(aiResult.confidence * 100).toFixed(0)}%
                          </p>
                        )}

                        {aiErrorTaskId === task.id && aiError && (
                          <p className="ai-error" role="alert">
                            {aiError}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      className="delete-button"
                      onClick={() => deleteTask(task.id)}
                      aria-label={`Delete ${task.topic}`}
                      title="Delete task"
                    >
                      ×
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>✦ AIdemics</span>
          <span>Small steps. Consistent progress.</span>
          <span className="local-label">
            <span className="offline-dot" />
            Stored locally
          </span>
        </footer>
      </section>
    </main>
  );
}
