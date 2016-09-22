var fs = require('fs');
var gulp = require('gulp');
var zip = require('gulp-zip');
var del = require('del');
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
    .pipe(gulp.dest('dist'));
});

// Function which get names of production dependencies in package.json file and copies these directories into
// dist directory
gulp.task('node-mods', function() {
  // parsed object of package.json file
  var packageJsonParsed = JSON.parse(fs.readFileSync('./package.json')),
    // object to store src paths to required node modules
      srcPaths = [];
  // if there are any production dependencies them combine src paths for them
  if (packageJsonParsed.dependencies && Object.keys(packageJsonParsed.dependencies).length) {
    var dependencies = Object.keys(packageJsonParsed.dependencies);
    dependencies.forEach(function(dependency) {
      srcPaths.push('./node_modules/' + dependency + '/**/*');
    });
  }
  return gulp.src(srcPaths, {base: './'})
    .pipe(gulp.dest('dist'));
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