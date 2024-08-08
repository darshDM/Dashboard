from flask import Flask, jsonify
from flask_socketio import SocketIO
import redis
import json
import time
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
redis_client = redis.Redis(host='localhost', port=6379, db=0)

def background_task():
    log_keys = redis_client.keys("*-logs-*")
    cpu_metrics_keys = redis_client.keys("*cpu-metrics")
    memory_metrics_keys = redis_client.keys("*memory-metrics")
    cpu_usage = {}
    memory_usage = {}
    while True:
        
        for key in cpu_metrics_keys:
            cpu_usage[key] = redis_client.get(key)

        for key in memory_metrics_keys:
            memory_usage[key] = redis_client.get(key)

        
        cpu_usage = redis_client.get('vivobook-cpu-metrics')
        memory_usage = redis_client.get('vivobook-memory-metrics')
        latest_log = redis_client.lpop('apps-logs')
        print(latest_log)
        socketio.emit('metrics_update', {
            'cpu_usage': float(cpu_usage) if cpu_usage else None,
            'memory_usage': float(memory_usage) if memory_usage else None
        })
        if latest_log:
            socketio.emit('log_update', latest_log.decode('utf-8'))
        socketio.sleep(1)

@socketio.on('connect')
def handle_connect():
    socketio.start_background_task(background_task)

if __name__ == '__main__':
    socketio.run(app, debug=True,port=4999)