import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import asyncio
from contextlib import asynccontextmanager
#test
from app.login_back import login
from app.otp_verification import apis
from app.routes import webs, rest
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from app import db_init

# Initialize DB
db_init.init_db()

from app.order_book import recover_active_orders
recover_active_orders()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start market websocket background task
    task = asyncio.create_task(webs.start_market_ws())
    yield
    # Shutdown: Cancel the task
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print("Market WS task cancelled")

app = FastAPI(title="CrypSim Crypto Trading Simulator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # or specify domains like ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(login.Router, tags=["login"])
app.include_router(apis.router, tags=["otp"])
app.include_router(rest.router)
app.include_router(webs.router)  # <-- expose websocket routes (/ws/market, /ws/user/trades)

@app.get("/ping")
async def ping():
    return {"status": "ok"}

# Mount frontend files and define web routes if Frontend directory exists
frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Frontend")
if os.path.isdir(frontend_dir):
    @app.get("/login")
    async def get_login_page():
        return FileResponse(os.path.join(frontend_dir, "login_page.html"))

    @app.get("/home")
    async def get_home_page():
        return FileResponse(os.path.join(frontend_dir, "home.html"))

    @app.get("/portfolio")
    async def get_portfolio_page():
        return FileResponse(os.path.join(frontend_dir, "portfolio.html"))

    # Mount entire Frontend folder for static assets (.css, .js, .png, etc.) and root index.html
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
