import os
from functools import lru_cache
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/encrypted_cms")
    return MongoClient(uri)

def get_db():
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/encrypted_cms")
    db_name = uri.rsplit("/", 1)[-1] or "encrypted_cms"
    return get_client()[db_name]
