"use strict";

const AlexaApp = "amzn1.ask.skill.2ae2b2c0-8299-49cf-a290-2f2ed07671b1";

let car = require("./car");

function buildResponse(output, card, shouldEndSession) {
	return {
		version: "1.0",
		response: {
			outputSpeech: {
				type: "PlainText",
				text: output,
			},
			card,
			shouldEndSession
		}
	};
}

// Helper to build the text response from battery information.
function buildBatteryStatus(battery) {
	let response = `You have ${battery.charge_level}% battery which will get you approximately ${Math.round(battery.remaining_range * 0.621371)} miles. `;

	if (battery.plugged)
		response += "The car is plugged in";
	else
		response += "The car is not plugged in";

	if (battery.charging)
		response += " and charging";

	return response + ".";
}

exports.handler = (event, context) => {
	// Helper to return a response with a card.
	const sendResponse = (title, text) => {
		context.succeed(buildResponse(text, {
			"type": "Simple",
			"title": title,
			"content": text
		}));
	};

	try {
		console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

		// Shared callbacks.
		const exitCallback = () => context.succeed(buildResponse("Goodbye Keith"));
		const helpCallback = () => context.succeed(buildResponse("Hi Keith. You can preheat the car or ask for battery status.", null, false));
		const loginFailureCallback = () => sendResponse("Authorisation Failure", "Unable to login to Renault Z.E. Services, please check your login credentials.");

		if (event.session.application.applicationId === AlexaApp) {
			car.setLogin('EMAIL', 'PASSWORD', loginFailureCallback);
        } else {
			sendResponse("Invalid Application ID", "You are not allowed to use this service.");
			return;
		}

		// Handle launches without intents by just asking what to do.
		if (event.request.type === "LaunchRequest") {
			helpCallback();
		} else if (event.request.type === "IntentRequest") {
			// Handle different intents by sending commands to the API and providing callbacks.
			switch (event.request.intent.name) {
				case "PreheatIntent":
					car.sendPreheatCommand(
						response => sendResponse("Car Preheat", "The car will begin preheating shortly."),
						() => sendResponse("Car Preheat", "Unable to begin preheating. Have you already done this recently?")
					);
					break;
				case "GetBatteryStatusIntent":
					car.getBatteryStatus(
						battery => sendResponse("Car Battery Status", buildBatteryStatus(battery)),
						() => sendResponse("Car Battery Status", "Unable to get car battery status, please check your login details.")
					);
					break;
				case "AMAZON.HelpIntent":
					helpCallback();
					break;
				case "AMAZON.StopIntent":
				case "AMAZON.CancelIntent":
					exitCallback();
					break;
			}
		} else if (event.request.type === "SessionEndedRequest") {
			exitCallback();
		}
	} catch (err) {
		console.error(err.message);
		sendResponse("Error Occurred", "An error occurred. Fire the programmer! " + err.message);
	}
};
