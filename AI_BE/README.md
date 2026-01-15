# DATN-Conference-organization

### Setup AI Backend Server
+ Create virtual environment

``` 
uv venv .venv --python=3.13
```
+ Activate environment
```
# For Linux
source .venv/bin/activate

#For Window
.venv/Scripts/activate
```
+ Start the server
``` 
uv run server.py
```

+ Request to the server
    + Example request methods are in the test_client.ipynb