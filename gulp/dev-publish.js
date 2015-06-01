var gulp = require('gulp');
var replace = require('gulp-replace');
var uglify = require('gulp-uglify');
var rimraf = require('rimraf');
var fs = require('fs');
var mime = require('mime');
var aws = require('aws-sdk');
var zip = require('gulp-zip');
var runSequence = require('run-sequence').use(gulp);
aws.config.loadFromPath('./config/aws-dev.json');

var uploadDirectoryPath = './posterh5show';
var BUCKET_NAME = "templates.gex.im";

function s3_getDirectoryFiles(directory, callback) {
    fs.readdir(directory, function (err, files) {
        files.forEach(function (file) {
            fs.stat(directory + '/' + file, function (err, stats) {
                if (stats.isFile()) {
                    callback(directory + '/' + file);
                }
                if (stats.isDirectory()) {
                    if (file !== '_original' && file !== 'static' && file !== 'node_modules' && file !== 'bin' && file !== 'aspnet_client' && file !== 'gulp' && file !== 'obj') {
                        s3_getDirectoryFiles(directory + '/' + file, callback);
                    }
                }
            });
        });
    });
}

function s3_uploadFiles(remoteFilename, fileName, isTryAgain) {
    var fileBuffer = fs.readFileSync(fileName);
    var metaData = mime.lookup(fileName);
    var s3 = new aws.S3();
    s3.putObject({
        ACL: 'public-read',
        Bucket: BUCKET_NAME,
        Key: remoteFilename,
        Body: fileBuffer,
        ContentType: metaData
    }, function (error, response) {
        if (error) {
            if (isTryAgain) {
                s3_uploadFiles(remoteFilename, fileName, false);
            }
            else {
                console.error(error);
            }
        }
        else {
            console.log('uploaded file[' + fileName + '] to [' + remoteFilename + '] as [' + metaData + ']');
        }
    });
}

gulp.task('dev-publish', function () {
    s3_getDirectoryFiles(uploadDirectoryPath, function (file_with_path) {
        var remoteFilename = file_with_path.replace("./", "");
        var fileName = file_with_path;
        s3_uploadFiles(remoteFilename, fileName, true);
    });
});