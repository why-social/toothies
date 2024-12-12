from dash import Dash, dcc, html, Input, Output, callback
from os import getenv
from dotenv import load_dotenv
import paho.mqtt.client as mqtt
import threading
import json
import time
from collections import defaultdict, deque

HEARTBEAT_INTERVAL = 10 # secondes
CRITICAL_DEVIATION = 0.5 # %

# Define the structures
# Log heartbeats
# {
#   serviceType: {
#     serviceId: []
#   }, ...
# }
heartbeats = defaultdict(lambda: defaultdict(lambda: deque(maxlen=120)))

# Log requests
# { <req_id>: {'req_time': <int>, 'res_time': <int | None>},...}
req_res = defaultdict(lambda: defaultdict())

def on_connect(client, userdata, flags, rc, properties):
    print("Connected to MQTT broker with result code", rc)
    client.subscribe('#')

def on_message(client, userdata, message):
    global heartbeats, req_res
    payload = json.loads(message.payload.decode())
    print(f"MQTT [{message.topic}]: {payload}")

    if message.topic.startswith('heartbeat/'):
        service_type = message.topic.split('/')[1]
        service_id = payload["serviceId"]
        heartbeats[service_type][service_id].append(time.time())

    elif message.topic.startswith('res/'):
        req_id = str(message.topic.split('/')[1])
        print(req_id)
        print(req_res.get(req_id))
        print(payload.get('timestamp'))
        if req_res.get(req_id) and payload.get('timestamp'):
            print("here1")
            req_res[str(req_id)]['res_time'] = int(payload['timestamp'])
            print("here2")

    else: #request
        print(payload.get('reqId'))
        print(payload.get('timestamp'))
        try:
            if payload.get('reqId') and payload.get('timestamp'):
                req_res[str(payload.get('reqId'))]['req_time'] = int(payload['timestamp'])
                req_res[str(payload.get('reqId'))]['res_time'] = None
        except Exception as e:
            print(f"Invalid requesting ja. {e}")

    print(req_res)


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
    html.Div([
        dcc.Graph(id="heartbeats-graph"),
    ]),
    html.Div([
        dcc.Graph(id="responses-graph"),
    ]),
    dcc.Interval(
        id="interval-component",
        interval=1000,  # Refresh every second
        n_intervals=0
    )
])

# Dash Callback to Update Graphs
@callback(
    Output("heartbeats-graph", "figure"),
    Input("interval-component", "n_intervals")
)
def update_hearbeats_graph(n):
    if not heartbeats:
        return {'data': [], 'layout': {'title': 'No data available'}}

    lower_warning = HEARTBEAT_INTERVAL * (1 - CRITICAL_DEVIATION / 100)
    upper_warning = HEARTBEAT_INTERVAL * (1 + CRITICAL_DEVIATION / 100)
    lower_limit = HEARTBEAT_INTERVAL * (1 - (CRITICAL_DEVIATION * 1.5) / 100)
    upper_limit = HEARTBEAT_INTERVAL * (1 +  (CRITICAL_DEVIATION * 1.5) / 100)

    # Create a single figure with multiple traces
    figure = {
        'data': [],
        'layout': {
            'title': 'Heartbeat Intervals by Service',
            'xaxis': {'title': 'Time'},
            'yaxis': {
                'title': 'Interval (s)',
                'range': [lower_limit, upper_limit],  # Sets y-axis range from 0 to 20, centering on 10
            },
            'showlegend': True,
            'shapes': [
                # Solid vertical line at y = HEARTBEAT_INTERVAL
                {
                    'type': 'line',
                    'x0': 0,
                    'x1': 1,
                    'xref': 'paper',
                    'y0': HEARTBEAT_INTERVAL,
                    'y1': HEARTBEAT_INTERVAL,
                    'line': {
                        'color': 'gray',
                        'width': 1,
                        'dash': 'solid'
                    }
                },
                # Dotted red line at y = lower_limit
                {
                    'type': 'line',
                    'x0': 0,
                    'x1': 1,
                    'xref': 'paper',
                    'y0': lower_warning,
                    'y1': lower_warning,
                    'line': {
                        'color': 'red',
                        'width': 1,
                        'dash': 'dot'
                    }
                },
                # Dotted red line at y = upper_limit
                {
                    'type': 'line',
                    'x0': 0,
                    'x1': 1,
                    'xref': 'paper',
                    'y0': upper_warning,
                    'y1': upper_warning,
                    'line': {
                        'color': 'red',
                        'width': 1,
                        'dash': 'dot'
                    }
                }
            ]
        }
    }

    for service_type in heartbeats:
        for service_id in heartbeats[service_type]:
            data = list(heartbeats[service_type][service_id])
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


@callback(
    Output("responses-graph", "figure"),
    Input("interval-component", "n_intervals")
)
def update_responses_graph(n):
    if not req_res:
        return {'data': [], 'layout': {'title': 'No data available'}}

    # Create a single figure with multiple traces
    figure = {
        'data': [],
        'layout': {
            'title': 'Response Times',
            'xaxis': {'title': 'Time of request'},
            'yaxis': {'title': 'Time to process (s)'},
            'showlegend': True
        }
    }

    differences = []
    timestamps = []
    for req_id, times in req_res.items():
        # req = { 'req_time': <int>, 'res_time': <int | None> }
        req_time = times.get('req_time')
        res_time = times.get('res_time')
        if req_time and res_time:
            # Calculate time differences between req and res
            differences.append(res_time - req_time)
            # Use timestamps for x-axis formatted as dates
            timestamps.append(time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(req_time)))

            # Add trace to the figure
            figure['data'].append({
                'x': timestamps,
                'y': differences,
                'type': 'scatter',
                'mode': 'lines+markers',
                'name': f'req-{req_id}'
            })

    return figure

if __name__ == '__main__':
    mqtt_thread = threading.Thread(target=start_mqtt)
    mqtt_thread.daemon = True
    mqtt_thread.start()
    app.run(debug=False)
