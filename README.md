# DATN-Conference-organization
### How to install
Insatall UV package manager:  docs.astral.sh/uv/getting-started/installation/


1. Create virtual environment
```
cd server
uv venv .venv
```
2. Activate virtual environemtn
```
.venv/Scripts/activate # for Window
source .venv/bin/activate # for Linux/Mac 
```
3. Install dependencies
```
uv sync
```
4. Run Backend Server
```
uv run server.py
```
5. Start the web 
```
cd client
npm install 
npm run dev
```
