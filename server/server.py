import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import papers, sessions, users, reviews, conferences, common, checkin, registrations, proceedings, qa

# HOST = '0.0.0.0'
HOST = 'localhost'
PORT = 8080

app = FastAPI(title="Conference Paper API")
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
app.include_router(proceedings.router)
app.include_router(qa.router)


if __name__ == "__main__":
    uvicorn.run("server:app", host=HOST, port=PORT, reload=True)
