import io
import os
from dotenv import load_dotenv
import random

# ============= Load environment variables =============
load_dotenv()

# Get API keys as a list
API_KEYS = os.getenv("OPENAI_API_KEYS").split(",")
def get_random_api_key():
    """Selects a random API key from the list."""
    return random.choice(API_KEYS)

selected_api_key = get_random_api_key()
print("Selected API Key:", selected_api_key)
os.environ["OPENAI_API_KEY"] = selected_api_key

from flask import Flask, render_template, request, session, send_file, jsonify, Response, stream_with_context, redirect
from langchain_openai import ChatOpenAI
from graph import build_graph
from dotenv import load_dotenv
from bookmark import initialize_bookmarks, get_page_ranges, get_num_buttons, save_section_pdf
from PyPDF2 import PdfReader, PdfWriter


import time
import re
import json


from datetime import datetime

import data


answers = []  # Store user quiz answers in memory (global list)

app = Flask(__name__)

app.secret_key = "I_got_a_secret"#os.urandom(24)

thread_id = "participant_"


# ============= Initialize LLM & Graph =============
llm = ChatOpenAI(model="gpt-4o", temperature=0, streaming=True)
graph = build_graph(llm)

# ============= PDF & Bookmark Setup =============
PDF_PATH = "../data/wholeTextbookPsych.pdf"
PAGE_RANGE_PATH = "../data/page_ranges.json"
SECTION_PATH = "../data/sections"

initialize_bookmarks(PDF_PATH, PAGE_RANGE_PATH)
PAGE_RANGES = get_page_ranges(PAGE_RANGE_PATH)
sub_chapter = get_num_buttons(PAGE_RANGE_PATH)
if not os.path.exists(SECTION_PATH):
    save_section_pdf(PDF_PATH, PAGE_RANGE_PATH, SECTION_PATH)


MAX_SESSION_SIZE = 10000

def trim_chat_history():
    """Trims the chat history to fit within the session size limit."""
    print("Len of session chat history" , len(str(session.get("chat_history", ""))))
    while len(str(session.get("chat_history", ""))) > MAX_SESSION_SIZE:
        
        print("removing message", session["chat_history"].pop(0))  # Remove the oldest message

@app.route("/", methods=["GET", "POST"])
def home():
    """
    Home page. Used to correlate Qualtrics ID to chatlogs in Langsmith and our own logs.
    Now this page allows the user to enter a four-digit code which is stored in the session
    (as 'user_id'). Upon valid entry, the user is redirected to /chapter/6/1.
    """
    if request.method == "POST":
        session.clear()
        code = request.form.get("code", "").strip()
        
        if not (code.isdigit() and len(code) == 4):
            error = "Please enter a valid 4-digit code."
            
            return render_template("home.html", error=error)
        session["user_code"] = code
        now = datetime.now()
        date_str = "_" + now.strftime("%H:%M:%S")
        session["user_id"] = thread_id + str(code)
        
        print("Current session: ", session["user_id"])
        
        print("="*40)
        print(f'Detected ID: {session["user_id"]}')
        return redirect("/chapter/6")
    return render_template("home.html", error=None)

@app.route("/chapter_pdf/<int:chapter_number>", methods=["GET"])
def serve_chapter_pdf(chapter_number):
    """
    Serve the entire PDF for a given chapter (by slicing the big PDF).
    """
    idx = chapter_number - 1
    if idx < 0 or idx >= len(PAGE_RANGES):
        return f"Chapter {chapter_number} not found.", 404

    start_page, end_page = PAGE_RANGES[idx]
    output_pdf = io.BytesIO()
    reader = PdfReader(PDF_PATH)
    writer = PdfWriter()
    for i in range(start_page - 1, end_page):
        writer.add_page(reader.pages[i])
    writer.write(output_pdf)
    output_pdf.seek(0)

    return send_file(output_pdf, as_attachment=False, mimetype="application/pdf")

@app.route("/chapter_pdf/<int:chapter_number>/<int:section_number>", methods=["GET"])
def serve_section_pdf_route(chapter_number, section_number):
    """
    Serve a sub-chapter's PDF from the pre-saved PDFs in data/sections/.
    """
    pdf_path = f"../data/sections/chapter {chapter_number}/{section_number}.pdf"
    if not os.path.exists(pdf_path):
        return f"Section PDF not found at: {pdf_path}", 404
    return send_file(pdf_path, as_attachment=False, mimetype="application/pdf")

@app.route("/chapter/<int:chapter_number>", methods=["GET", "POST"])
def serve_chapter(chapter_number):
    """
    Renders chapter_viewer.html and handles chat logic.
    """

    idx = chapter_number - 1
    
    if idx < 0 or idx >= len(sub_chapter):
        return f"Chapter {chapter_number} not found.", 404
    
    user_code = session.get("user_code")
    session["user_id"] = thread_id + str(user_code)

    button_count = sub_chapter[idx]-1
    
    if "user_id" not in session:
        print("USER ID NOT IN SESSION", session["user_id"])
    

    if "chat_history" not in session:
        print("Chat history not found in session. Initializing...")
        pre_message = (
            f"Introduce yourself and how you hope to help the user. We will be going through chapter {chapter_number}. "
            f"Summarize briefly the main idea of chapter {chapter_number}, you must reference the text book at all times. Tell the to take the chapter pre quiz on the right side of the screen. "
            f"Use the results of this quiz to understand the user's knowledge of the chapter. Prepare them for the first sub-section quiz."
            f"Keep this greeting message concise and true to chapter 6 of the textbook"
        
        )
        session["chat_history"] = []
        bot_response = ""

        # Stream the LLM's answer
        for event in graph.stream({"messages": [("user", pre_message)]}, {"configurable":{"thread_id":session["user_id"]}}):
            for value in event.values():
                bot_response = value["messages"][-1].content

        # Store in session
        session["chat_history"].append({"sender": "bot", "message": bot_response})
        trim_chat_history()
        

    
    if request.method == "POST":
        user_question = request.form.get("question", "").strip()
        if user_question:
            session["chat_history"].append({"sender": "user", "message": user_question})
            final_response = ""

            # Process LLM response before streaming
            for event in graph.stream(
                {"messages": [("user", user_question)]},
                {"configurable": {"thread_id": session["user_id"]}}
            ):
                for value in event.values():
                    final_response = value["messages"][-1].content

            session["chat_history"].append({"sender": "bot", "message": final_response})
            session.modified = True
            trim_chat_history()

            def generate():
                # Stream out the cleaned final_response char by char
                for char in final_response:
                    yield char
                    time.sleep(0.01)

            return Response(stream_with_context(generate()), mimetype="text/plain")

        

    # If GET request, show chapter_viewer.html
    if request.method == "GET":
        print("GET request received.")
        return render_template(
            "chapter_viewer.html",
            chapter_number=chapter_number,
            button_count=button_count,
            chat_history=session["chat_history"]
        )


@app.route("/home")
def go_home():
    # Clears the session and returns to home
    session.clear()
    chapters = [
        {"number": i + 1, "start_page": start, "end_page": end}
        for i, (start, end) in enumerate(PAGE_RANGES)
    ]
    return render_template("home.html", chapters=chapters)

@app.route("/submit-answer", methods=["POST"])
def submit_answers():
    """
    Receives quiz answers, extends the global 'answers' list,
    then calls our 'evaluate_quiz_answers' tool using the CORRECT sub-chapter quiz.
    """
    request_data = request.json
    submitted_answers = request_data["answers"]
    current_chapter = request_data["chapter"]
    current_subchapter = request_data["subchapter"]

    prompt = (
        "Evaluate the following quiz answers, according to the given instructions."
        "After evaluation is done, prepare the user to move onto the next sub-section, only if another sub-section exists. In chapter 6 there is 6.0 6.1 6.2 6.3 and 6.4."
        f"The user is currently on chapter {current_chapter}.{current_subchapter}."
        "Provide a summary of the sub-section and engage with the user about its topics to prepare them from the next MCQ quiz. "
        "If no other sub-section exists, congratuate the user on completing the chapter and tell them that you remain open to discussion."
        f"{json.dumps(submitted_answers)}"
    )
    session["chat_history"] = session.get("chat_history")
    bot_response = ""
    session["chat_history"].append({"sender": "user", "message": prompt})
    # Stream the LLM's answer
    for event in graph.stream({"messages": [("user", prompt)]}, {"configurable":{"thread_id":session["user_id"]}}):
        for value in event.values():
            bot_response = value["messages"][-1].content

    # Store in session
    session["chat_history"].append({"sender": "bot", "message": bot_response})
    
    def generate():
        # Stream out the cleaned final_response char by char
        for char in bot_response:
            yield char
            time.sleep(0.01)
    
    
    return Response(stream_with_context(generate()), mimetype="text/plain")

@app.route("/get-next-quiz", methods=["POST"]) 
def get_next_quiz():
    """
    Returns the next quiz to be displayed to the user.
    """
    request_data = request.json
    subchapter = request_data["subchapter"]

    if subchapter == 0:
        return jsonify(data.ch6_pre_quiz)

    try:
        quiz = getattr(data, f"ch6_{subchapter}_reinforcement", {})
    except AttributeError:
        quiz = {}
    
    return jsonify(quiz)
    


if __name__ == "__main__":
    app.run(debug=True)
