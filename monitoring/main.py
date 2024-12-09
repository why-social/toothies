from dash import Dash, dcc, html, Input, Output, callback
from os import getenv
from dotenv import load_dotenv
import paho.mqtt.client as mqtt
import threading
import json
import time
from collections import defaultdict, deque

# Define the structure
metrics = defaultdict(lambda: defaultdict(lambda: deque(maxlen=120)))

def on_connect(client, userdata, flags, rc, properties):
    print("Connected to MQTT broker with result code", rc)
    client.subscribe('heartbeat/+')

def on_message(client, userdata, message):
    global metrics
    payload = json.loads(message.payload.decode())
    print(f"MQTT [{message.topic}]: {payload}")

    if message.topic.startswith('heartbeat/'):
        service_type = message.topic.split('/')[1]
        service_id = payload["serviceId"]
        metrics[service_type][service_id].append(time.time())

# Start MQTT Client in a separate thread
def start_mqtt():
    load_dotenv()
    MQTT_USERNAME = getenv('MQTT_USERNAME')
    if MQTT_USERNAME == None:
        print("No MQTT_USERNAME in env")
        exit(1)
    MQTT_PASSWORD = getenv('MQTT_PASSWORD')
    if MQTT_PASSWORD == None:
        print("No MQTT_PASSWORD in env")
        exit(1)
    MQTT_HOST = getenv('MQTT_HOST')
    if MQTT_HOST == None:
        print("No MQTT_HOST in env")
        exit(1)
    MQTT_PORT = getenv('MQTT_PORT')
    if MQTT_PORT == None:
        print("No MQTT_PORT in env")
        exit(1)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.tls_set()
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.connect(MQTT_HOST, int(MQTT_PORT), 60)
    try:
        client.loop_forever()
    except Exception as e:
        print(f"Error in MQTT thread: {e}")


app = Dash()
app.title = "Toothies Monitoring"
# Dash Layout
app.layout = html.Div([
    html.H1("MQTT Stats", style={"textAlign": "center"}),
    dcc.Graph(id="graphs"),
    dcc.Interval(
        id="interval-component",
        interval=1000,  # Refresh every second
        n_intervals=0
    )
])

# Dash Callback to Update Graphs
@callback(
    Output("graphs", "figure"),
    Input("interval-component", "n_intervals")
)
def update_graphs(n):
    if not metrics:
        return {'data': [], 'layout': {'title': 'No data available'}}

    # Create a single figure with multiple traces
    figure = {
        'data': [],
        'layout': {
            'title': 'Heartbeat Intervals by Service',
            'xaxis': {'title': 'Time'},
            'yaxis': {'title': 'Interval (s)'},
            'showlegend': True
        }
    }

    for service_type in metrics:
        for service_id in metrics[service_type]:
            data = list(metrics[service_type][service_id])
            if len(data) >= 2:
                # Calculate time differences between consecutive heartbeats
                differences = [data[i+1] - data[i] for i in range(len(data)-1)]
                # Use actual timestamps for x-axis formatted as dates
                timestamps = [time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(t)) for t in data[:-1]]

                # Add trace to the figure
                figure['data'].append({
                    'x': timestamps,
                    'y': differences,
                    'type': 'scatter',
                    'mode': 'lines+markers',
                    'name': f'{service_type} - {service_id}'
                })

    return figure

if __name__ == '__main__':
    mqtt_thread = threading.Thread(target=start_mqtt)
    mqtt_thread.daemon = True
    mqtt_thread.start()
    app.run(debug=False)
