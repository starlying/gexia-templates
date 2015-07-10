var gulp = require('gulp');
var replace = require('gulp-replace');
var fs = require('fs');
var mime = require('mime');
var aws = require('aws-sdk');
var uuid = require('uuid');
var args = require('yargs').usage('Usage: $0 --production|--dev --dir=[dir]').argv;
var runSequence = require('run-sequence').use(gulp);

var releaseType = 'dev';
var domain = "gexia.com";

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
    remoteFilename = remoteFilename.toLowerCase();
    var fileBuffer = fs.readFileSync(fileName);
    var metaData = mime.lookup(fileName);
    var s3 = new aws.S3();
    s3.putObject({
        ACL: 'public-read',
        Bucket: 'templates.' + domain,
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

gulp.task('publish', function () {
    aws.config.loadFromPath('./config/aws.json');
    if (args.production) {
        releaseType = 'production';
        domain = "gexia.com";
    } else {
        releaseType = 'dev';
        domain = "dev.gexia.com";
    }
    if (args.dir){
        s3_getDirectoryFiles('./' + args.dir, function (file_with_path) {
            var remoteFilename = file_with_path.replace("./", "");
            var fileName = file_with_path;
            s3_uploadFiles(remoteFilename, fileName, true);
        });
    }
});