import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)

_mongo_client = None
_mongo_db = None

def get_mongo_uri():
    """Returns MongoDB Atlas URI, reloading from .env if needed."""
    uri = getattr(settings, 'MONGODB_URI', '').strip()
    if not uri:
        base_dir = getattr(settings, 'BASE_DIR', Path(__file__).resolve().parent.parent)
        env_file = Path(base_dir) / '.env'
        load_dotenv(env_file, override=True)
        uri = os.getenv('MONGODB_URI', '').strip()
    return uri

def get_mongo_client():
    """
    Returns a singleton instance of MongoClient.
    """
    global _mongo_client
    if _mongo_client is None:
        uri = get_mongo_uri()
        if not uri:
            return None
        try:
            # Set an 8-second server selection timeout
            _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=8000)
        except ConfigurationError as e:
            logger.error(f"MongoDB Configuration Error: {e}")
            return None
        except Exception as e:
            logger.error(f"MongoDB Client Init Error: {e}")
            return None
    return _mongo_client

def get_db():
    """
    Returns the CineMatch MongoDB database instance.
    """
    global _mongo_db
    client = get_mongo_client()
    if client is None:
        return None
    
    if _mongo_db is None:
        db_name = getattr(settings, 'MONGODB_DB_NAME', 'cinematch_db')
        _mongo_db = client[db_name]
    return _mongo_db

def get_collection(collection_name):
    """
    Returns a collection from the CineMatch database.
    """
    db = get_db()
    if db is None:
        return None
    return db[collection_name]

def check_connection():
    """
    Tests MongoDB Atlas connection.
    Returns (status: bool, message: str)
    """
    uri = get_mongo_uri()
    if not uri:
        return False, "MONGODB_URI is not set in .env"
    
    try:
        client = get_mongo_client()
        if client is None:
            return False, "Could not initialize MongoDB client. Check your MONGODB_URI format."
        # Ping command sends a lightweight roundtrip to MongoDB Atlas
        client.admin.command('ping')
        return True, "Successfully connected to MongoDB Atlas!"
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        return False, f"Connection to MongoDB failed: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"
