var gulp = require("gulp");
var cssmin = require("gulp-cssmin");
var concatcss = require("gulp-concat-css");
var concatjs = require("gulp-concat");
var rename = require("gulp-rename");
var runsequence = require("run-sequence");
var watch = require("gulp-watch");
var uglify = require("gulp-uglifyjs");

gulp.task("concat-js", function () {
	gulp.src([
		"js/src/jquery.js",
		"js/src/d3.js",
		"js/src/c3.js",
		"js/src/moment.js",
		"js/src/bootstrap.js",
		"js/src/angular.js",
		"js/src/angular-route.js",
		"js/src/livestamp.js",
		"js/src/jquery.cookie.js",
		"js/src/main.js",
	])
		.pipe(concatjs("nsoweb.js"))
		.pipe(gulp.dest("js"));
});

gulp.task("uglify-js", function () {
	gulp.src("js/nsoweb.js")
		.pipe(uglify("nsoweb.min.js", { "mangle": false }))
		.pipe(gulp.dest("js"));
});

gulp.task("concat-css", function () {
	gulp.src("css/src/*.css")
		.pipe(concatcss("nsoweb.css"))
		.pipe(gulp.dest("css"));
});

gulp.task("minify-css", function () {
	gulp.src("css/nsoweb.css")
		.pipe(cssmin())
		.pipe(rename({ suffix: ".min" }))
		.pipe(gulp.dest("css"));
});

gulp.task("gen-404", function () {
	gulp.src("index.html")
		.pipe(rename("404.html"))
		.pipe(gulp.dest("."));
});

gulp.task("watch", function () {
	watch("js/src/*.js", function () {
		runsequence("concat-js", "uglify-js");
	});
	watch("css/src/*.css", function () {
		runsequence("concat-css", "minify-css");
	});
	watch("index.html", function () {
		runsequence("gen-404");
	});
});

gulp.task("default", function () {
	gulp.start("concat-js", "uglify-js", "concat-css", "minify-css");
});