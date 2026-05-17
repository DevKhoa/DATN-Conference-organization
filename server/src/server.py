import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import papers, sessions, users, reviews, conferences, common, checkin, registrations, subscriptions, payments, assistance, web_socket, proceedings, notifications
from packages.scheduler import start_scheduler, stop_scheduler

# HOST = '0.0.0.0'
HOST = 'localhost'
PORT = 8080


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background scheduler on startup; stop it on shutdown."""
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Conference Paper API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(papers.router)
app.include_router(sessions.router)
app.include_router(users.router)
app.include_router(reviews.router)
app.include_router(conferences.router)
app.include_router(common.router)
app.include_router(checkin.router)
app.include_router(registrations.router)
app.include_router(subscriptions.router)
app.include_router(payments.router)
app.include_router(assistance.router)
app.include_router(web_socket.router)
app.include_router(proceedings.router)
app.include_router(notifications.router)

if __name__ == "__main__":
    uvicorn.run("server:app", host=HOST, port=PORT, reload=True)
