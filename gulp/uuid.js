var gulp = require('gulp');
var uuid = require('uuid');

gulp.task('uuid', function () {
    console.log(uuid.v4());
});