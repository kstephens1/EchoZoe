"use strict";

let https = require("https");

let token, vin, zoeUsername, zoePassword, loginFailureCallback;

function sendRequest(action, requestData, successCallback, failureCallback) {
	const options = {
		hostname: "www.services.renault-ze.com",
		port: 443,
		path: "/api" + action,
		method: requestData ? "POST" : "GET",
		headers: {
			"Content-Type": "application/json",
			"Authorization": (token ? "Bearer " + token : "")
		}
	};

	const req = https.request(options, resp => {
		if (resp.statusCode < 200 || resp.statusCode > 300) {
			console.log(`Failed to send request ${action} (${resp.statusCode}: ${resp.statusMessage})`);
			if (failureCallback)
				failureCallback();
			return;
		}

		console.log(`Successful request ${action} (${resp.statusCode}: ${resp.statusMessage})`);
		let respData = "";

		resp.on("data", c => {
			//console.log("<== " + c.toString());
			respData += c.toString();
		});
		resp.on("end", () => {
			if (successCallback)
				successCallback(respData && respData.length ? JSON.parse(respData) : null);
		});
	});
	if (requestData && JSON.stringify(requestData) !== '{}')
		req.write(JSON.stringify(requestData));
	req.end();
}

function login(successCallback) {
	sendRequest("/user/login", {
		username: zoeUsername,
		password: zoePassword
	}, loginResponse => {
		token = loginResponse.token;
		vin = loginResponse.user.vehicle_details.VIN;
		successCallback();
	}, loginFailureCallback);
}

exports.setLogin = (username, password, failureCallback) => {
	zoeUsername = username;
	zoePassword = password;
	loginFailureCallback = failureCallback;
}

exports.getBatteryStatus = (successCallback, failureCallback) => {
	login(() => sendRequest("/vehicle/" + vin + "/battery", null, successCallback, failureCallback));
}

exports.sendPreheatCommand = (successCallback, failureCallback) => {
	login(() => sendRequest("/vehicle/" + vin + "/air-conditioning", {}, successCallback, failureCallback));
}