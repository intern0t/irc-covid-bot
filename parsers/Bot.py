import socket, threading, json, requests
from bs4 import BeautifulSoup
from datetime import datetime
from timeit import default_timer as timer
from covid import *

# Settings & Formatters
TIMESTAMP_FORMAT = '%Y-%m-%d %H:%M:%S'

# Data setup
COVID_DATA_SOURCE = "https://www.worldometers.info/coronavirus/"
COVID_DATA_FILE = "./data/coviddata.json"
UPDATE_INTERVAL_MINUTES = 15
COVID_SOUP = None

# Convienence setup
THREADS = []
THREADS_SLEEP = 1

def initializeSoup():
    global COVID_SOUP
    req = requests.get(COVID_DATA_SOURCE)
    res = req.text
    COVID_SOUP = BeautifulSoup(res, "html5lib")
    # print(COVID_SOUP)
    return True if COVID_SOUP != None else False

def getMinutesDiff(standardTime):
    covidLastUpdated = datetime.strptime(COVID_LAST_UPDATED, TIMESTAMP_FORMAT) if COVID_LAST_UPDATED != "" else ""
    currentTime = datetime.strptime(standardTime, TIMESTAMP_FORMAT)

    if covidLastUpdated != "":
        td = abs(covidLastUpdated - currentTime) or 0
        td_minutes = int(round(td.total_seconds() / 60)) if td != 0 else UPDATE_INTERVAL_MINUTES
        return td_minutes
    else:
        return UPDATE_INTERVAL_MINUTES

def getCovidInfo(country=True, state=False):
    global COVID_LAST_UPDATED

    _startTimer = timer()
    now = datetime.now().strftime(TIMESTAMP_FORMAT)

    if initializeSoup() == True:
        if buildDataSet(COVID_SOUP, COVID_DATA_FILE) == True:
            print("Data set is built @ " + now)
        else:
            print("Data set build unsuccessful!")
    else:
        print("Initialization unsuccessful!")
    
    # if COVID_LAST_UPDATED == "" or COVID_SOUP == None:
    #     # Initialize it.
    #     if initializeSoup() == True:
    #         # Build the data & get confirmation.
    #         if buildDataSet(COVID_SOUP, COVID_DATA_FILE) == True:
    #             _endTimer = timer()
    #             print(dataByCountry("USA") + " | ~{}s".format(str(_endTimer - _startTimer)) )
    # else:
    #     # Already initialized, check if data exists.
    #     if getMinutesDiff(now) > UPDATE_INTERVAL_MINUTES:
    #         # Re-build the data set.
    #         print("Minutes > 15.")
    #     else:
    #         with open(COVID_DATA_FILE, 'r') as f:
    #             covidData = json.load(f)
    #         if covidData != None and len(covidData['countries']) > 0:
    #             _endTimer = timer()
    #             print(dataByCountry("USA") + " | ~{}s".format(str(_endTimer - _startTimer)) )

def main():
    t = threading.Thread(target=getCovidInfo)
    THREADS.append(t)
    t.start()
main()

# Wrapping up all the threads.
for thread in THREADS:
    thread.join()
