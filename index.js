/**
 * Copyright (c) 2020, IRC Covid Bot
 * Document: index.js
 * Developer: Prashant Shrestha (https://prashant.me)
 * Date: Sat 28 Mar 2020 11:51:45 AM EDT
 */

//  https://node-irc.readthedocs.io/en/latest/API.html#client
var irc = require('irc');
var fs = require('fs');
var moment = require('moment');

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
	channels: IRC_CONFIGURATIONS.IRC_DEFAULT_CHANNELS,
	autoConnect: false,
	floodProtection: false,
	floodProtectionDelay: 1000
});

client.connect();

client.addListener('message', function(from, to, message) {
	if (message && message.length > 0) {
		let messagesSplitted = message.split(' ');
		let trailingMessage = '';
		var updatedDate = '';
		let sendTo = '';

		sendTo = to.indexOf('#') != -1 ? to : from;

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
					'First Case',
					'Updated'
				];
				trailingMessage = message.substr(6).trim().toLowerCase();

				if (trailingMessage.length < 1) {
					const searchWorld = jsonFormatted['global'];
					updatedDate = moment(new Date(jsonFormatted['updated']['countries'])).fromNow() ||
						jsonFormatted['updated']['countries'];

					client.say(
						sendTo,
						`Global statistics for COVID-19 - Total Cases: ${searchWorld[
							'cases'
						]} | Total Recovered: ${searchWorld['recovered']} | Total Deaths: ${searchWorld[
							'deaths'
						]} | ACTIVE CASES - Mild Condition: ${jsonFormatted['global']['breakdown']['active'][
							'mildCondition'
						]['cases']} (${jsonFormatted['global']['breakdown']['active']['mildCondition'][
							'percent'
						]}%), Critical Condition: ${jsonFormatted['global']['breakdown']['active']['criticalCondition'][
							'cases'
						]} (${jsonFormatted['global']['breakdown']['active']['criticalCondition'][
							'percent'
						]}%) | CLOSED CASES - Outcome: ${jsonFormatted['global']['breakdown']['closed'][
							'outcome'
						]}, Recovered: ${jsonFormatted['global']['breakdown']['closed']['recovered'][
							'cases'
						]} (${jsonFormatted['global']['breakdown']['closed']['recovered'][
							'percent'
						]}%), Deaths: ${jsonFormatted['global']['breakdown']['closed']['deaths'][
							'cases'
						]} (${jsonFormatted['global']['breakdown']['closed']['deaths'][
							'percent'
						]}%) | Updated: ${updatedDate}`
					);
					break;
				} else {
					const searchForCountry = jsonFormatted['countries'].find(
						(country) => country[0].toLowerCase().indexOf(trailingMessage) != -1
					);
					// console.log(searchForCountry);

					// Found one.
					let toReturn = [];
					updatedDate =
						moment(new Date(jsonFormatted['updated']['countries'])).fromNow() ||
						jsonFormatted['updated']['countries'];
					if (searchForCountry && searchForCountry.length > 1) {
						for (var i = 0; i < title.length; i++) {
							toReturn[i] = `${title[i]}: ${searchForCountry[i]}`;
						}
						toReturn[toReturn.length - 1] = 'Updated: ' + updatedDate;
						toReturn[toReturn.length - 2] = 'First Case: ' + searchForCountry[searchForCountry.length - 1];
					}
					client.say(sendTo, toReturn.join(' | '));
				}
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
						(o['usps'] && o['usps'].toLowerCase() === trailingMessage)
				);

				updatedDate = moment(jsonFormatted['updated']['state']).fromNow();
				if (searchForState) {
					client.say(
						sendTo,
						`State: ${searchForState['name']} (${searchForState['usps']}) | Cases: ${searchForState[
							'cases'
						]} | Deaths: ${searchForState['deaths']} | Deaths per Cases: ${searchForState[
							'deathspercases'
						]} | Updated: ${updatedDate}`
					);
				}
				break;
			case '!help':
				client.say(sendTo, 'Two commands are functional so far, !covid <country> and !covidstate <state>');
				break;
			case '!part':
				client.disconnect();
				break;
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
