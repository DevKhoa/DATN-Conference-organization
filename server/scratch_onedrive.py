import asyncio
import httpx

async def test():
    redir_url = "https://onedrive.live.com/redir?cid=f5e612a5d6ebb59e&resid=F5E612A5D6EBB59E!sa862a4a9e2dd434e9e3fe33388d319c7&ithint=file%2cpdf&e=2g3xBO"
    download_url = redir_url.replace("/redir?", "/download?")
    
    print("Download URL:", download_url)
    async with httpx.AsyncClient(follow_redirects=True) as client:
        r = await client.get(download_url)
        print("Status:", r.status_code)
        print("Headers:", r.headers)
        if r.status_code == 200:
            print("Bytes (first 10):", r.content[:10])

asyncio.run(test())
