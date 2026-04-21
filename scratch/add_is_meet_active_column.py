import sys
import os
import asyncio

# Add server directory to path
sys.path.append(os.path.abspath("server"))

from utils import supabase_client, logger

def run_sql(sql: str):
    logger.info(f"Executing SQL: {sql}")
    # Unfortunately supabase-py client does not have a raw query method easily exposed when lacking postgres access.
    # We will try to use the `rpc` function if there's a generic one, or use REST payload.
    # Alternatively, we can just fetch all rows, check if it exists, and skip if it errors out from lacking column.
    
    pass

async def main():
    try:
        # Check if the column exists by trying to select it.
        res = supabase_client.table("sessions").select("is_meet_active").limit(1).execute()
        logger.info("Column 'is_meet_active' seems to already exist.")
    except Exception as e:
        logger.warning(f"Error selecting 'is_meet_active': {e}. Need to add the column.")
        
        try:
            # We must use raw postgres connection if possible, but python client handles REST.
            logger.error("WARNING: To add a column through REST API is not natively supported by supabase client without RPC. Please manually execute this SQL in Supabase Dashboard:")
            logger.error("ALTER TABLE sessions ADD COLUMN is_meet_active BOOLEAN DEFAULT true;")
        except Exception as e:
            logger.error(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
