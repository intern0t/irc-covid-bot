import json
import requests

covidData = {'countries': [], 'global': {}, 'updated': {
    'countries': '',
    'state': ''
}, 'state': []}

def buildDataSet(soup, writeToFile):
    # Building the dataset.
    table = soup.find('table', { 'class': 'table table-bordered table-hover main_table_countries'})
    tbody = table.find('tbody')
    for tr in tbody.find_all('tr'):
        countryData = []
        for td in tr.find_all('td'):
            data = td.text.strip()
            # Check for empty data, pad with N/A.
            countryData.append(data if len(data) > 0 else "-")
        # Add the country to the bigger object.
        covidData['countries'].append(countryData)
    
    # Retrieving the last updated date & time.
    counter = soup.find('div', { 'class': 'label-counter'})
    lastUpdated = counter.findNext('div').text or "Unknown"
    covidData['updated']['countries'] = lastUpdated.replace("Last updated: ", "")

    # Building the world/global COVID statistics.
    worldData = []
    for wd in soup.find_all('div', { 'class': 'maincounter-number'}):
        worldData.append(wd.text.strip())
    if len(worldData) == 3:
        covidData['global']['cases'] = worldData[0]
        covidData['global']['deaths'] = worldData[1]
        covidData['global']['recovered'] = worldData[2]
    else:
        return False
        print("Mismatched data.")

    # Fetching additional global statistics.
    globalStats = soup.find_all('div', {'class': 'panel_front'})
    counter = 0
    globalStat = {
        'active': {
            'currentlyInfected': '',
            'mildCondition': {
                'cases': '',
                'percent': ''
            },
            'criticalCondition': {
                'cases': '',
                'percent': ''
            }
        },
        'closed': {
            'outcome': '',
            'recovered': {
                'cases': '',
                'percent': '',
            },
            'deaths': {
                'cases': '',
                'percent': ''
            }
        }
    }

    builtStr = ""
    base = 0
    for gStat in globalStats:
        base += 1
        _one = gStat.find('div', {'class': 'number-table-main'})
        counter = 0
        for _two in gStat.find_all('span', {'class': 'number-table'}):
            counter += 1
            _three = _two.next_sibling.next_sibling
            if base == 1 and counter == 1:
                globalStat['active']['currentlyInfected'] = _one.text.strip()
                globalStat['active']['mildCondition']['cases'] = _two.text.strip()
                globalStat['active']['mildCondition']['percent'] = _three.text.strip()
            elif base == 1 and counter == 2:
                globalStat['active']['currentlyInfected'] = _one.text.strip()
                globalStat['active']['criticalCondition']['cases'] = _two.text.strip()
                globalStat['active']['criticalCondition']['percent'] = _three.text.strip()
            elif base == 2 and counter == 1:
                globalStat['closed']['outcome'] = _one.text.strip()
                globalStat['closed']['recovered']['cases'] = _two.text.strip()
                globalStat['closed']['recovered']['percent'] = _three.text.strip()
            elif base == 2 and counter == 2:
                globalStat['closed']['outcome'] = _one.text.strip()
                globalStat['closed']['deaths']['cases'] = _two.text.strip()
                globalStat['closed']['deaths']['percent'] = _three.text.strip()
    covidData['global']['breakdown'] = globalStat
    # print(globalStat)
    print("Global breakdown statistics done!")

    # State data. 
    req = requests.get("https://ix.cnn.io/dailygraphics/graphics/20200306-us-covid19/data.json")
    jsonFormatted = json.loads(req.text)
    covidData['state'] = jsonFormatted['data']
    covidData['updated']['state'] = jsonFormatted['lastUpdated']

    # Write the data to file to conserve the requests made to the site.
    with open(writeToFile, 'w') as f:
        json.dump(covidData, f)
    return True

def dataByCountry(country):
    title = ["Country", "Total Cases", "New Cases", "Total Deaths", "New Deaths", "Total Recovered", "Active Cases", "Critical Cases", "Updated"]

    unformatted = []
    if covidData != None and len(covidData['countries']) > 0:
        for countryEntry in covidData['countries']:
            if countryEntry[0].lower().strip().find(country.lower().strip()) != -1:
                unformatted = countryEntry
                # del unformatted[-1]
                break
            else:
                continue
    else:
        print("Nothing to see here.")
    
    if len(unformatted) > 1:
        unformatted = unformatted[:-3]
        # print(unformatted)
        for i in range(0, len(title) - 1):
            unformatted[i] = "{}: {}".format(title[i], unformatted[i])
        unformatted.append(title[-1] + ": " + covidData['updated'].split("Last updated: ")[1])
    else:
        return "No data available for Country : {}".format(country.title())
    return " | ".join(unformatted)