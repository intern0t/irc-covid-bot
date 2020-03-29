/**
 * Copyright (c) 2020, IRC Covid Bot
 * Document: index.js
 * Developer: Prashant Shrestha (https://prashant.me)
 * Date: Sat 28 Mar 2020 11:51:45 AM EDT
 */

//  https://node-irc.readthedocs.io/en/latest/API.html#client
var irc = require('irc');
var fs = require('fs');
// var shell = require('shelljs');

var jsonFormatted = null;

const { COVID_DATA, IRC_CONFIGURATIONS } = require('./config');

/**
 * Try and load the data.
 */
var covidData = '';
function fetchCovidData() {
	covidData = fs.readFile(COVID_DATA.COVID_DATA_FILE, (err, data) => {
		if (err) throw err;
		jsonFormatted = JSON.parse(data);
		console.log('JSON updated.');
	});
}

fetchCovidData();
var timed = setInterval(fetchCovidData, 900000);

/**
 * Create an instance of Client configuration & connect to the IRC.
 */
var client = new irc.Client(`${IRC_CONFIGURATIONS.IRC_SERVER}`, `${IRC_CONFIGURATIONS.IRC_NICKNAME}`, {
	password: `${IRC_CONFIGURATIONS.IRC_PASSWORD}`,
	channels: [ '#bots' ],
	autoConnect: false,
	floodProtection: false,
	floodProtectionDelay: 1000
});

client.connect();

client.addListener('message', function(from, to, message) {
	if (message && message.length > 0) {
		let messagesSplitted = message.split(' ');
		let trailingMessage = '';

		// Got to trail the messages, to not miss out on combination of words.
		switch (messagesSplitted[0].toLowerCase()) {
			case '!covid':
				const title = [
					'Country',
					'Total Cases',
					'New Cases',
					'Total Deaths',
					'New Deaths',
					'Total Recovered',
					'Active Cases',
					'Critical Cases',
					'Updated',
					'First Case'
				];
				trailingMessage = message.substr(6).trim().toLowerCase();

				if (trailingMessage.length < 1) {
					const searchWorld = jsonFormatted['global'];
					client.say(
						from,
						`Global statistics for COVID-19 - Total Cases: ${searchWorld[
							'cases'
						]} | Total Recovered: ${searchWorld['recovered']} | Total Deaths: ${searchWorld[
							'deaths'
						]} | Rank #1: ${jsonFormatted['countries'][0][0]}`
					);
					break;
				}

				const searchForCountry = jsonFormatted['countries'].filter(
					(country) => country[0].toLowerCase().indexOf(trailingMessage) != -1
				);

				// Found one.
				let toReturn = [];
				if (searchForCountry && searchForCountry.length == 1) {
					for (var i = 0; i < title.length; i++) {
						toReturn[i] = `${title[i]}: ${searchForCountry[0][i]}`;
					}
					toReturn[toReturn.length - 2] = 'Updated: ' + jsonFormatted['updated']['countries'];
					toReturn[toReturn.length - 1] =
						'First Case: ' + searchForCountry[0][searchForCountry[0].length - 1];
				}
				client.say(from, toReturn.join(' | '));
				break;
			case '!covidstate':
				trailingMessage = message.substr(11).trim();

				if (trailingMessage.length < 1) {
					client.say(from, 'Please provide state after !covidstate. !covidstate New York or !covidstate ny');
					break;
				}
				trailingMessage = trailingMessage.toLowerCase();

				const searchForState = jsonFormatted['state'].find(
					(o) =>
						o['name'].capitalize(true) === trailingMessage.capitalize(true) ||
						o['usps'].toLowerCase() === trailingMessage
				);

				if (searchForState) {
					client.say(
						from,
						`State: ${searchForState['name']} (${searchForState['usps']}) | Cases: ${searchForState[
							'cases'
						]} | Deaths: ${searchForState['deaths']} | Deaths per Cases: ${searchForState[
							'deathspercases'
						]} | Updated: ${jsonFormatted['updated']['state']}`
					);
				}
				break;
			case '!help':
				client.say(from, 'Two commands are functional so far, !covid <country> and !covid <state>');
			case '!part':
				client.disconnect();
		}
	}
	console.log(`${from} => ${to} : ${message}`);
});

client.addListener('notice', function(nick, to, text, message) {
	console.log(`${nick} => ${to} => ${text}: ${message}`);
});

client.addListener('registered', function(message) {
	console.log(message);
});

client.addListener('error', function(message) {
	console.log('error: ', message);
});

String.prototype.capitalize = function(lower) {
	return (lower ? this.toLowerCase() : this).replace(/(?:^|\s)\S/g, function(a) {
		return a.toUpperCase();
	});
};
