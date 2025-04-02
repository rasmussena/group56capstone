from langsmith import Client
import csv
import os
from dotenv import load_dotenv

load_dotenv()
client = Client()

project_name = os.environ["PROJECT_NAME"]
runs = sorted(
    client.list_runs(project_name=project_name, execution_order=1),
    key=lambda r: r.start_time
)

# Map each thread_id to its latest run
latest_runs_by_thread = {}
for run in runs:
    thread_id = run.metadata.get("thread_id") or run.name or str(run.id)
    latest_runs_by_thread[thread_id] = run  # overwrites older with newer

# Write CSV with only final snapshot per thread
with open("chat_threads.csv", mode="w", newline='', encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(["Thread ID", "Turn", "Role", "Message"])

    for thread_id, run in latest_runs_by_thread.items():
        print(f"Exporting final run for thread: {thread_id}")
        turn = 1
        messages = run.outputs.get("messages", [])

        for msg in messages:
            msg_type = msg.get("type")
            if msg_type not in ["human", "ai"]:
                continue

            role = "User" if msg_type == "human" else "AI"
            content = msg.get("content", "").strip()
            if content:
                writer.writerow([thread_id, turn, role, content])
                turn += 1
