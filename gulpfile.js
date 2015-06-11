// Gulpfile.js
var gulp = require('gulp'),
    gulpCopy = require('gulp-copy'),
    watch = require('gulp-watch'),
    nodemon = require('gulp-nodemon')

var testEntryFile = 'test/test.js';
var sourceFiles = 'src/**/*.js';
var destJsDir = 'test/public/js/build';

gulp.task('copy', function () {
    gulp.src([sourceFiles], {
        base: 'src'
    }).pipe(gulp.dest(destJsDir));
});
gulp.task('default', ['copy'], function () {

    nodemon({ 
        script: testEntryFile,
        watch: ['service', testEntryFile]
      , ext: 'js'
      , ignore: []
    }) .on('restart', function () {})

    gulp.watch(sourceFiles, ['copy']);
})
