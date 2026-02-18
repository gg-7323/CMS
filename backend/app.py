from datetime import timedelta
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, jwt_required
from flask_sock import Sock
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
from dotenv import load_dotenv

from .db import get_db

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)

    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

    JWTManager(app)
    sock = Sock(app)

    db = get_db()
    users = db["users"]
    shares = db["shares"]
    docs = db["docs"]
    try:
        users.create_index("email", unique=True)
    except Exception:
        # Mongo may not be up during app init; ensure on first request
        pass
    try:
        shares.create_index("doc_id", unique=True)
    except Exception:
        pass
    try:
        docs.create_index([("doc_id", 1), ("owner", 1)], unique=True)
    except Exception:
        pass

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    @app.post("/api/auth/register")
    def register():
        data = request.get_json(force=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        if not email or not password:
            return jsonify({"error": "email and password required"}), 400
        try:
            users.insert_one({
                "email": email,
                "password_hash": generate_password_hash(password),
                "created_at": __import__("datetime").datetime.utcnow(),
            })
        except Exception:
            return jsonify({"error": "email already registered"}), 409
        token = create_access_token(identity=email)
        return jsonify({"access_token": token})

    @app.post("/api/auth/login")
    def login():
        data = request.get_json(force=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        user = users.find_one({"email": email})
        if not user or not check_password_hash(user.get("password_hash", ""), password):
            return jsonify({"error": "invalid credentials"}), 401
        token = create_access_token(identity=email)
        return jsonify({"access_token": token})

    @app.post("/api/sync/push")
    @jwt_required()
    def sync_push():
        identity = get_jwt_identity()
        data = request.get_json(force=True) or {}
        updates = data.get("updates", [])
        if not isinstance(updates, list):
            return jsonify({"error": "updates must be a list"}), 400
        if updates:
            # Enforce that the caller is allowed to edit the target documents.
            doc_ids = {
                u.get("doc_id")
                for u in updates
                if isinstance(u, dict) and u.get("doc_id") is not None
            }
            for doc_id in doc_ids:
                share = shares.find_one({"doc_id": doc_id})
                if share:
                    owner = share.get("owner")
                    editors = set(share.get("editors") or [])
                    allowed = set()
                    if owner:
                        allowed.add(owner)
                    allowed.update(editors)
                    if identity not in allowed:
                        return jsonify({"error": "not allowed to edit this document"}), 403

            db["updates"].insert_many([
                {
                    "u": identity,
                    "doc_id": u.get("doc_id"),
                    "cursor": u.get("cursor"),
                    "payload": u.get("payload"),
                    "ts": __import__("datetime").datetime.utcnow(),
                }
                for u in updates
                if isinstance(u, dict)
            ])
        return jsonify({"ok": True})

    @app.post("/api/sync/pull")
    @jwt_required()
    def sync_pull():
        identity = get_jwt_identity()
        data = request.get_json(force=True) or {}
        since_cursor = data.get("since_cursor")
        doc_id = data.get("doc_id")
        if doc_id:
            # Allow reading updates from shared docs where the user is
            # the owner, an editor, or a viewer.
            allowed = {identity}
            share = shares.find_one({"doc_id": doc_id})
            if share:
                owner = share.get("owner")
                if owner:
                    allowed.add(owner)
                for e in share.get("editors") or []:
                    allowed.add(e)
                for v in share.get("viewers") or []:
                    allowed.add(v)
            q = {"doc_id": doc_id, "u": {"$in": list(allowed)}}
        else:
            q = {"u": identity}
        if since_cursor is not None:
            q["cursor"] = {"$gt": since_cursor}
        items = list(db["updates"].find(q).sort("cursor", 1))
        for it in items:
            it["_id"] = str(it["_id"])  # stringify for JSON
        return jsonify({"updates": items})

    @app.post("/api/docs/meta")
    @jwt_required()
    def docs_meta():
        identity = get_jwt_identity()
        data = request.get_json(force=True) or {}
        doc_id = data.get("doc_id")
        if not doc_id:
            return jsonify({"error": "doc_id required"}), 400

        record = {
            "doc_id": doc_id,
            "owner": identity,
            "title": data.get("title") or "",
            "updatedAt": data.get("updatedAt"),
            "type": data.get("type"),
            "template": data.get("template"),
            "mode": data.get("mode"),
            "slug": data.get("slug"),
            "status": data.get("status"),
            "tags": data.get("tags") or [],
            "language": data.get("language"),
            "coverUrl": data.get("coverUrl"),
        }
        docs.update_one(
            {"doc_id": doc_id, "owner": identity},
            {"$set": record},
            upsert=True,
        )
        return jsonify({"ok": True})

    @app.post("/api/docs/share")
    @jwt_required()
    def docs_share():
        identity = get_jwt_identity()
        data = request.get_json(force=True) or {}
        doc_id = data.get("doc_id")
        target = (data.get("target") or "").strip().lower()
        role = (data.get("role") or "editor").strip().lower()

        if not doc_id or not target or role not in ("editor", "viewer"):
            return jsonify({"error": "doc_id, target, and valid role required"}), 400

        # Ensure target user exists
        if not users.find_one({"email": target}):
            return jsonify({"error": "user not found"}), 404

        share = shares.find_one({"doc_id": doc_id})
        if share is None:
            share = {"doc_id": doc_id, "owner": identity, "editors": [], "viewers": []}
        elif share.get("owner") != identity:
            return jsonify({"error": "only owner can change sharing"}), 403

        editors = set(share.get("editors") or [])
        viewers = set(share.get("viewers") or [])
        editors.discard(target)
        viewers.discard(target)
        if role == "editor":
            editors.add(target)
        else:
            viewers.add(target)
        share["editors"] = sorted(editors)
        share["viewers"] = sorted(viewers)

        shares.update_one({"doc_id": doc_id}, {"$set": share}, upsert=True)
        latest = shares.find_one({"doc_id": doc_id}) or share
        if latest.get("_id") is not None:
            latest["_id"] = str(latest["_id"])
        return jsonify(latest)

    @app.get("/api/docs/share/<doc_id>")
    @jwt_required()
    def docs_share_info(doc_id):
        identity = get_jwt_identity()
        share = shares.find_one({"doc_id": doc_id})
        if not share:
            data = {
                "doc_id": doc_id,
                "owner": identity,
                "editors": [],
                "viewers": [],
                "me_role": "owner",
            }
            return jsonify(data)
        owner = share.get("owner")
        editors = share.get("editors") or []
        viewers = share.get("viewers") or []
        if identity == owner:
            me_role = "owner"
        elif identity in editors:
            me_role = "editor"
        elif identity in viewers:
            me_role = "viewer"
        else:
            me_role = "none"
        data = {
            "doc_id": share.get("doc_id"),
            "owner": owner,
            "editors": editors,
            "viewers": viewers,
            "me_role": me_role,
        }
        if share.get("_id") is not None:
            data["_id"] = str(share["_id"])
        return jsonify(data)

    # Media upload and static serve
    UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    @app.post("/api/media/upload")
    @jwt_required()
    def media_upload():
        if "file" not in request.files:
            return jsonify({"error": "file field is required"}), 400
        f = request.files["file"]
        if not f or f.filename is None:
            return jsonify({"error": "empty filename"}), 400
        filename = secure_filename(f.filename)
        # prefix with uuid to avoid collisions
        import uuid
        root, ext = os.path.splitext(filename)
        final_name = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(UPLOAD_DIR, final_name)
        f.save(path)
        url = f"/uploads/{final_name}"
        return jsonify({"url": url})

    @app.get("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(UPLOAD_DIR, filename)

    rooms = {}

    @sock.route("/ws")
    def ws(ws):
        # Very simple room handling: /ws?doc_id=...
        from urllib.parse import urlparse, parse_qs
        try:
            q = parse_qs(urlparse(ws.environ.get('REQUEST_URI') or ws.environ.get('RAW_URI') or ws.environ.get('PATH_INFO','')).query)
            doc_id = (q.get('doc_id') or [None])[0]
        except Exception:
            doc_id = None
        if not doc_id:
            # no room; echo
            while True:
                msg = ws.receive()
                if msg is None:
                    break
                ws.send(msg)
            return
        room = rooms.setdefault(doc_id, set())
        room.add(ws)
        try:
            while True:
                msg = ws.receive()
                if msg is None:
                    break
                # broadcast to peers in same room
                dead = []
                for peer in list(room):
                    if peer is ws:
                        continue
                    try:
                        peer.send(msg)
                    except Exception:
                        dead.append(peer)
                for d in dead:
                    room.discard(d)
        finally:
            room.discard(ws)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
