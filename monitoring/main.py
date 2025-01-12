from dash import Dash, dcc, html, Input, Output, State, callback
import plotly.express as px
import pandas as pd
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
# { <req_id>: {'topic': <string>, 'req_time': <int>, 'res_time': <int | None>},...}
req_res = defaultdict(lambda: defaultdict())

def on_connect(client, userdata, flags, rc, properties):
    print("Connected to MQTT broker with result code", rc)
    client.subscribe('#')

def on_message(client, userdata, message):
    global heartbeats, req_res
    payload = json.loads(message.payload.decode())

    if message.topic.startswith('heartbeat/'):
        service_type = message.topic.split('/')[1]
        service_id = payload["serviceId"]
        heartbeats[service_type][service_id].append(time.time())

    elif message.topic.startswith('res/'):
        req_id = str(message.topic.split('/')[1])
        if req_res.get(req_id) and payload.get('timestamp'):
            req_res[str(req_id)]['res_time'] = int(payload['timestamp'])

    else: #request
        try:
            if payload.get('reqId') and payload.get('timestamp'):
                req_res[str(payload.get('reqId'))]['req_time'] = int(payload['timestamp'])
                req_res[str(payload.get('reqId'))]['topic'] = message.topic[message.topic.index('/')+1:]
                req_res[str(payload.get('reqId'))]['res_time'] = None
        except Exception as e:
            print(f"Invalid requesting ja. {e}")



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
    html.Button("toggle interval", id="button"),
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
    ),
    dcc.Store(id="data-store"),
])


@callback(
    [Output("interval-component", "disabled"),
     Output("button", "children")],
    [Input("button", "n_clicks")],
    [State("interval-component", "disabled")],
)
def toggle_interval(n, disabled):
    if n:
        return not disabled, "Resume Updates" if not disabled else "Pause Updates"
    return disabled, "Pause Updates"

@callback(
    Output("data-store", "data"),
    Input("interval-component", "n_intervals")
)
def update_data_store(n):
    records = []
    for req_id, details in req_res.items():
        if details["res_time"] is not None:  # Exclude entries with no response
            delay = details["res_time"] - details["req_time"]
            records.append({
                "Request ID": req_id,
                "Topic": details["topic"],
                "Request Time": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(details['req_time'] / 1000)),
                "Delay": delay,
            })
    return records

# Dash Callback to Update Graphs
@callback(
    Output("heartbeats-graph", "figure"),
    Input("interval-component", "n_intervals"),
    State("responses-graph", "relayoutData")
)
def update_hearbeats_graph(n, relayout_data):
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
    Input("data-store", "data"),
    State("responses-graph", "relayoutData")
)
def update_responses_graph(data, relayout_data):
    df = pd.DataFrame(data)


    # Create a Plotly figure
    if not df.empty:
        fig = px.scatter(
            df,
            x="Request Time",
            y="Delay",
            color="Topic",
            # line_group="Topic",
            title="MQTT Request-Response Delays",
            labels={"Delay": "Response Delay (ms)", "Time of Request": "Timestamp"},
        )
        fig.update_traces(mode="lines+markers")
    else:
        fig = px.scatter(title="No data available", labels={"x": "Request Time", "y": "Delay"})

    # Retain the user's current zoom/pan state
    if relayout_data:
        pass
        # fig.update_layout(relayout_data)
        # TODO: retain state but also update data

    return fig

server = app.server  # This line is crucial for Gunicorn

if __name__ == '__main__':
    mqtt_thread = threading.Thread(target=start_mqtt)
    mqtt_thread.daemon = True
    mqtt_thread.start()
    app.run(debug=False)
