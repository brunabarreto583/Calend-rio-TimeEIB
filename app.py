from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import datetime, json, os
import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import Flow

app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY")
CALENDAR_ID = os.environ.get("CALENDAR_ID")

SCOPES = ['https://www.googleapis.com/auth/calendar']

CONFIG_FILE = os.path.join("json", "event_config.json")

@app.route("/criar_evento", methods=["POST"])
def criar_evento():
    service = get_service()
    if isinstance(service, dict) and service.get("login_required"):
        return jsonify({"status": "login_required"})
    
    if not isinstance(service, dict):  
        evento = {
            "summary": request.json.get("titulo"),
            "description": request.json.get("descricao"),
            "start": {"dateTime": request.json.get("inicio"), "timeZone": "America/Sao_Paulo"},
            "end": {"dateTime": request.json.get("fim"), "timeZone": "America/Sao_Paulo"},
            "colorId": request.json.get("cor", "2"),
        }
        novo_evento = service.events().insert(calendarId=CALENDAR_ID, body=evento).execute()
        return jsonify(novo_evento)
    return service


@app.route("/login")
def login():
    flow = Flow.from_client_secrets_file(
        os.path.join("json", "credentials.json"),
        scopes=SCOPES,
        redirect_uri=url_for("callback", _external=True)
    )
    auth_url, state = flow.authorization_url(prompt="consent")
    session["state"] = state
    return redirect(auth_url)


@app.route("/callback")
def callback():
    flow = Flow.from_client_secrets_file(
        os.path.join("json", "credentials.json"),
        scopes=SCOPES,
        redirect_uri=url_for("callback", _external=True)
    )
    flow.fetch_token(authorization_response=request.url)

    credentials = flow.credentials
    session["credentials"] = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes
    }
    return redirect(url_for("index"))


def get_service():
    if "credentials" not in session:
        return {"login_required": True}
    
    creds = Credentials(**session["credentials"])
    service = build("calendar", "v3", credentials=creds)
    return service


def carregar_cores():
    config = {"default": {"cor_p0": "2", "cor_outras": "4"}, "sobrescritas": {}}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    config["default"] = loaded.get("default", config["default"])
                    config["sobrescritas"] = loaded.get("sobrescritas", {})
        except json.JSONDecodeError:
            pass
    return config


def salvar_cores(cor_p0, cor_outras):
    config = {"default": {"cor_p0": cor_p0, "cor_outras": cor_outras}, "sobrescritas": {}}
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def get_cor_evento(nome_caixa, evento):
    config = carregar_cores()
    sobrescritas = config.get("sobrescritas", {}).get(nome_caixa, {})

    if evento in sobrescritas:
        return sobrescritas[evento]

    if evento == "P0":
        return config["default"].get("cor_p0", "2")
    return config["default"].get("cor_outras", "4")


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/get_colors")
def get_colors():
    cores = carregar_cores()
    return jsonify(cores)


DIAS_EVENTOS = [3, 6, 7, 10, 15, 18, 21, 25, 28, 30, 35, 42, 49, 56, 60]

@app.route("/add_event", methods=["POST"])
def add_event():
    try:
        data = request.json
        nome_caixa = data.get("nome_caixa") 
        data_p0 = datetime.datetime.strptime(data.get("data_p0"), "%Y-%m-%dT%H:%M")
        cor_p0 = data.get("cor_p0", "2")
        cor_outras = data.get("cor_outras", "4")

        service = get_service()
        if isinstance(service, dict) and service.get("login_required"):
            return jsonify({"status": "login_required"})

        infos_por_dia = {
            3: ["Infecção", "Pesagem mãe"],
            6: ["Pesagem", "Coleta"],
            7: ["Trocas"],
            10: ["Pesagem"],
            15: ["Pesagem", "Trocas", "Coleta", "Swab"],
            18: ["Pesagem"],
            21: ["Pesagem", "Trocas"],
            25: ["Pesagem"],
            28: ["Pesagem"],
            30: ["Pesagem", "Coleta"],
            35: ["Pesagem"],
            42: ["Pesagem"],
            49: ["Pesagem"],
            56: ["Pesagem"],
            60: ["Pesagem", "Coleta"]
        }

        cores_procedimentos = {
            "Infecção": "6",       
            "Pesagem mãe": "6",    
            "Pesagem": "3",        
            "Coleta": "11",        
            "Trocas": "4",        
            "Swab": "4"            
        }

        event_p0 = {
            "summary": f"{nome_caixa} P0",
            "start": {"dateTime": data_p0.isoformat(), "timeZone": "America/Sao_Paulo"},
            "end": {"dateTime": (data_p0 + datetime.timedelta(hours=1)).isoformat(), "timeZone": "America/Sao_Paulo"},
            "colorId": str(cor_p0)
        }
        e_p0 = service.events().insert(calendarId=CALENDAR_ID, body=event_p0).execute()
        eventos_criados = {"P0": e_p0.get("htmlLink")}

        for dia, procedimentos in infos_por_dia.items():
            data_evento = data_p0 + datetime.timedelta(days=dia)
            procs_restantes = set(procedimentos)  

            if "Infecção" in procs_restantes and "Pesagem mãe" in procs_restantes:
                summary = f"{nome_caixa} P{dia} Infecção + Pesagem mãe"
                cor = "6"
                event = {
                    "summary": summary,
                    "start": {"dateTime": data_evento.isoformat(), "timeZone": "America/Sao_Paulo"},
                    "end": {"dateTime": (data_evento + datetime.timedelta(hours=1)).isoformat(), "timeZone": "America/Sao_Paulo"},
                    "colorId": cor
                }
                e = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()
                eventos_criados[f"P{dia}_Infecção+PesagemMãe"] = e.get("htmlLink")

                procs_restantes -= {"Infecção", "Pesagem mãe"}

            if "Trocas" in procs_restantes and "Swab" in procs_restantes:
                summary = f"{nome_caixa} P{dia} Trocas + Swab"
                cor = "4"
                event = {
                    "summary": summary,
                    "start": {"dateTime": data_evento.isoformat(), "timeZone": "America/Sao_Paulo"},
                    "end": {"dateTime": (data_evento + datetime.timedelta(hours=1)).isoformat(), "timeZone": "America/Sao_Paulo"},
                    "colorId": cor
                }
                e = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()
                eventos_criados[f"P{dia}_Trocas+Swab"] = e.get("htmlLink")

                procs_restantes -= {"Trocas", "Swab"}

            for proc in procs_restantes:
                cor = cores_procedimentos.get(proc, cor_outras)
                summary = f"{nome_caixa} P{dia} {proc}"
                event = {
                    "summary": summary,
                    "start": {"dateTime": data_evento.isoformat(), "timeZone": "America/Sao_Paulo"},
                    "end": {"dateTime": (data_evento + datetime.timedelta(hours=1)).isoformat(), "timeZone": "America/Sao_Paulo"},
                    "colorId": cor
                }
                e = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()
                eventos_criados[f"P{dia}_{proc}"] = e.get("htmlLink")


        return jsonify({
            "status": "success",
            "eventos": eventos_criados
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})



@app.route("/delete_events", methods=["POST"])
def delete_events():
    try:
        data = request.json
        nome_caixa = data.get("nome_caixa")
        if not nome_caixa:
            return jsonify({"status": "error", "message": "Nome da caixa não fornecido."})

        service = get_service()
        if isinstance(service, dict) and service.get("login_required"):
            return jsonify({"status": "login_required"})
        
        time_min = "2000-01-01T00:00:00Z"  
        events_result = service.events().list(calendarId=CALENDAR_ID, timeMin=time_min, singleEvents=True).execute()

        events = events_result.get("items", [])

        deleted_count = 0
        for event in events:
            if event.get("summary", "").startswith(nome_caixa):
                service.events().delete(calendarId=CALENDAR_ID, eventId=event["id"]).execute()
                deleted_count += 1

        return jsonify({"status": "success", "deleted_count": deleted_count})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})



if __name__ == "__main__":
    app.run(debug=True)
