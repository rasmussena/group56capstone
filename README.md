# HackaThon-25
HackaThon'25

### Getting The Project Running

Here's a step-by-step guide to get both the frontend and backend running:

## Frontend (Next.js) Setup

1. **Install dependencies**:

```shellscript
npm install --legacy-peer-deps
```


2. **Start the development server**:

```shellscript
npm run dev
```

This will start the Next.js server, typically on [http://localhost:3000](http://localhost:3000)


## Redis Setup
Enable Redis persistence
Make sure in your redis.conf:

# Get to redis.conf
```shellscript
nano /usr/local/etc/redis.conf
```
I then exit without changing anything and follow the link to edit and find in the document the following changes

# For AOF (recommended for chat apps)
```shellscript
appendonly yes
appendfsync everysec
```




## Backend (FastAPI) Setup
In a new terminal

1. **Create a virtual environment** (recommended):

```shellscript
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```


2. **Navigate to the backend directory**:

```shellscript
cd backend
```


3. **Install dependencies**:

```shellscript
pip install -r requirements.txt
```


4. **Start the FastAPI server**:

```shellscript
# If you're using the modular structure I provided
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# If you're using a simpler structure
python main.py
```

This will start the FastAPI server on [http://localhost:8000](http://localhost:8000)




## Configuration (Optional)

For a complete setup, you might want to:

1. **Create a `.env` file in the backend directory** with:

```plaintext
SECRET_KEY=your-secret-key
DATABASE_URL=your-database-connection-string
```


2. **Create a `.env.local` file in the root directory** with:

```plaintext
NEXT_PUBLIC_API_URL=http://localhost:8000
```




## Testing the Application

1. Open your browser to [http://localhost:3000](http://localhost:3000)
2. You should see the application running
3. The chat functionality should work without authentication
4. You can test the authentication flow (it will use the mock implementation)


## Troubleshooting

If you encounter issues:

1. **Frontend errors**:

1. Check the browser console for errors
2. Verify that all dependencies installed correctly
3. Make sure you're using Node.js 14+ and npm 7+



2. **Backend errors**:

1. Check the terminal where you're running the FastAPI server
2. Verify that all Python dependencies installed correctly
3. Make sure you're using Python 3.7+



3. **Connection issues**:

1. Verify that both servers are running
2. Check that the frontend is correctly configured to connect to the backend
3. Look for CORS errors in the browser console


