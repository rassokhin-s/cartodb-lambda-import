var gulp = require('gulp');
var zip = require('gulp-zip');
var del = require('del');
var install = require('gulp-install');
var runSequence = require('run-sequence');
var awsLambda = require("node-aws-lambda");

gulp.task('clean', ['clean:src', 'clean:zip']);

gulp.task('clean:src', function() {
  return del(['./dist']);
});

gulp.task('clean:zip', function() {
  return del(['./dist.zip']);
});

gulp.task('js', function() {
  return gulp.src(['app.js', '*config/env_vars.js'])
    .pipe(gulp.dest('dist/'));
});

gulp.task('node-mods', function() {
  return gulp.src('./package.json')
    .pipe(gulp.dest('dist/'))
    .pipe(install({production: true}));
});

gulp.task('zip', function() {
  return gulp.src(['dist/**/*', '!dist/package.json'])
    .pipe(zip('dist.zip'))
    .pipe(gulp.dest('./'));
});

gulp.task('upload', function(callback) {
  awsLambda.deploy('./dist.zip', require("./lambda-config.js"), callback);
});

gulp.task('pack', function() {
  return runSequence(
    ['clean'],
    ['js', 'node-mods'],
    ['zip'],
    ['clean:src']
  )
});

gulp.task('deploy', function(callback) {
  return runSequence(
    ['clean'],
    ['js', 'node-mods'],
    ['zip'],
    ['upload'],
    ['clean'],
    callback
  );
});