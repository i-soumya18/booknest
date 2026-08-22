import asyncio

from scripts.seed import seed_data

if __name__ == "__main__":
    asyncio.run(seed_data())
