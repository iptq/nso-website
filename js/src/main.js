var app = angular.module("nsoweb", ["ngRoute"]);
var $http = angular.injector(["ng"]).get("$http");

var authToken;
var baseUrl = "https://localhost:3000";

app.config([
	"$compileProvider",
	function ($compileProvider) {
		$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|osu):/);
	}
]);

app.factory("logout", function () {
	return function () {
		localStorage.removeItem("authToken");
		$.removeCookie("authToken");
		location.href = "/";
	};
});

app.filter("mods", function () {
	return function (curMods) {
		var modMap = [
			["NF", 1],
			["EZ", 2],
			["HD", 8],
			["HR", 16],
			["SD", 32],
			["DT", 64],
			["RX", 128],
			["HT", 256],
			["NC", 512],
			["FL", 1024],
			["AU", 2048],
			["SO", 4096],
			["AP", 8192],
			["PF", 16384]
		];
		if (curMods & 512) curMods -= 64;
		if (curMods & 16384) curMods -= 32;
		var mods = [];
		for (var i = modMap.length - 1; i >= 0; i--) {
			var arr = modMap[i];
			var mod = arr[0];
			var val = arr[1];
			if (curMods & val) mods.push(mod);
		}

		mods.reverse();
		return (mods.length > 0 ? "+" : "") + mods.join(",");
	};
});

app.filter("weight", function () {
	return function (base, index) {
		return base * Math.pow(0.95, index);
	};
});

app.filter("ordinal", function () {
	return function (n) {
		return n + ([, "st", "nd", "rd"][~~(n / 10 % 10) - 1 ? n % 10 : 0] || "th");
	};
});

app.filter("difficultyImage", function () {
	return function (stars) {
		if (stars < 1.5) return "easy";
		if (stars < 2.25) return "normal";
		if (stars < 3.75) return "hard";
		if (stars < 5.25) return "insane";
		return "expert";
	};
});

app.filter("timeFormat", function () {
	return function (seconds) {
		var hours = Math.floor(seconds / 3600);
		seconds %= 3600;
		var minutes = Math.floor(seconds / 60);
		seconds %= 60;
		var str = "";
		if (hours > 0) {
			str += hours + ":";
			if (minutes < 10) minutes = "0" + minutes;
		}
		return str + minutes + ":" + seconds;
	};
});

app.config(function ($routeProvider, $locationProvider) {
	$routeProvider
		.when("/", {
			"templateUrl": "/pages/leaderboard.html",
			"controller": "leaderboardController",
			"resolve": {
				"leaderboard": function () {
					return $http({ "url": "/ranks" }).then(function (result) { return result.data; });
				}
			}
		})
		.when("/beatmap/:id", {
			"redirectTo": function (routeParams) {
				return "/b/" + routeParams.id;
			}
		})
		.when("/b/:id", {
			"templateUrl": "/pages/beatmappage.html",
			"controller": "beatmapController",
			"resolve": {
				"info": function ($route) {
					return $http({ "url": "/beatmapsets?beatmap_id=" + $route.current.params.id }).then(function (result) { return result.data; });
				}
			}
		})
		.when("/login", {
			"templateUrl": "/pages/login.html",
			"controller": "loginController",
		})
		.when("/logout", {
			"resolve": {
				"logout": ["logout", function (logout) {
					logout();
				}]
			}
		})
		.when("/register", {
			"templateUrl": "/pages/register.html",
			"controller": "registerController",
		})
		.when("/user/:id", {
			"redirectTo": function (routeParams) {
				return "/u/" + routeParams.id;
			}
		})
		.when("/u/:id", {
			"templateUrl": "/pages/userpage.html",
			"controller": "profileController",
			"resolve": {
				"info": function ($route) {
					return $http({ "url": "/users/" + $route.current.params.id }).then(function (result) { return result.data; });
				}
			}
		})
		.otherwise({
			"templateUrl": "/pages/404.html",
			"controller": "mainController"
		});
	$locationProvider.html5Mode(true);
});

var resend_verification = function () {
	var handler = function (response) {
		if (response.status == 200) {
			$("#resend_notice").html("Done! Check your email.");
		}
	};
	$http({
		"method": "POST",
		"url": "/resend-verification-email",
		"headers": { "Authorization": authToken }
	}).then(handler, handler);
};

app.controller("mainController", function ($scope, $rootScope) {
	$rootScope.user = { "logged_in": undefined };
	if (localStorage) authToken = localStorage.getItem("authToken");
	else authToken = $.cookie("authToken");
	if (authToken) {
		var handler = function (response) {
			if (response.status == 200) {
				response.data.logged_in = true;
				$rootScope.user = response.data;
			} else {
				$rootScope.user = { "logged_in": false };
			}
			$rootScope.$apply();
		};
		$http({
			"method": "GET",
			"url": "/current-user",
			"headers": { "Authorization": authToken }
		}).then(handler, handler);
	} else {
		$rootScope.user = { "logged_in": false };
	}
});

app.controller("loginController", function ($scope, $controller) {
	$controller("mainController", { $scope: $scope });
	$scope.formData = {};
	$scope.login = function () {
		var handler = function (response) {
			console.log(response);
			if (response.status != 201 && response.data.error) {
				$scope.error = response.data.error;
				$scope.$apply();
			} else {
				if (response.data.jwt) {
					localStorage.setItem("authToken", response.data.jwt);
					$.cookie("authToken", response.data.jwt);
					location.href = "/u/" + response.data.user.id;
				}
			}
		};
		$http({
			"method": "POST",
			"url": "/sessions",
			"data": { "session": $scope.formData }
		}).then(handler, handler);
	};
});

app.controller("registerController", function ($scope, $controller) {
	$controller("mainController", { $scope: $scope });
	$scope.formData = {};
	$scope.register = function () {
		var handler = function (response) {
			console.log(response);
			if (response.status != 201 && response.data.errors) {
				$scope.errors = response.data.errors;
				$scope.$apply();
			} else {
				if (response.data.jwt) {
					localStorage.setItem("authToken", response.data.jwt);
					$.cookie("authToken", response.data.jwt);
					location.href = "/u/" + response.data.user.id;
				}
			}
		};
		$http({
			"method": "POST",
			"url": "/registrations",
			"data": { "user": $scope.formData }
		}).then(handler, handler);
	};
});

app.controller("leaderboardController", function ($scope, $controller, leaderboard) {
	$controller("mainController", { $scope: $scope });
	$scope.leaderboard = leaderboard;
});

app.controller("profileController", function ($scope, $controller, info) {
	$controller("mainController", { $scope: $scope });
	$scope.info = info;

	var dates = [], values = [];
	var points = info.stats[0].graphs.pp.points;
	var now = Date.now() / 1000;
	for (var i = 0; i < points.length; i++) {
		// if (now - points[i].unix_time > 30 * 24 * 60 * 60) continue;
		dates.push(points[i].date);
		values.push(Math.round(points[i].value * 100) / 100);
	}
	var chart = c3.generate({
		data: {
			x: 'x',
			columns: [
				['x'].concat(dates),
				['Performance'].concat(values)
			]
		},
		axis: {
			x: {
				type: 'timeseries',
				tick: {
					format: '%Y-%m-%d'
				}
			}
		}
	});
});

app.controller("beatmapController", function ($scope, $controller, info) {
	$controller("mainController", { $scope: $scope });
	$scope.info = info;
	$scope.current_bid = parseInt(window.location.pathname.split("/")[2]);
	$scope.Math = window.Math;
});