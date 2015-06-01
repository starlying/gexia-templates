var gulp = require('gulp');
var replace = require('gulp-replace');
var uglify = require('gulp-uglify');
var rimraf = require('rimraf');
var runSequence = require('run-sequence').use(gulp);
var mime = require('mime');
var fs = require('fs');
var qiniu = require('qiniu');

var uploadDirectoryPath = './posterh5site';

function getDirectoryFiles(directory, callback) {
    fs.readdir(directory, function (err, files) {
        files.forEach(function (file) {
            fs.stat(directory + '/' + file, function (err, stats) {
                if (stats.isFile()) {
                    callback(directory + '/' + file);
                }
                if (stats.isDirectory()) {
                    if (file !== '_original' && file !== 'static' && file !== 'node_modules' && file !== 'bin' && file !== 'aspnet_client' && file !== 'gulp' && file !== 'obj') {
                        getDirectoryFiles(directory + '/' + file, callback);
                    }
                }
            });
        });
    });
}

gulp.task('pro-publish', function () {
    var content = fs.readFileSync('./config/qiniu.json');
    var config = JSON.parse(content);
    
    qiniu.conf.ACCESS_KEY = config.accessKey;
    qiniu.conf.SECRET_KEY = config.secretKey;
    
    var errKey = [];
    getDirectoryFiles(uploadDirectoryPath, function (file_with_path) {
        var key = file_with_path.replace("./", "");
        key = key.replace('//', '/');
        if (key.indexOf('/') === -1) return;
        key = key.toLowerCase();
        file_with_path = file_with_path.toLowerCase();
        var putPolicy = new qiniu.rs.PutPolicy("templates:" + key);
        var upToken = putPolicy.token();
        var extra = new qiniu.io.PutExtra();
        extra.mimeType = mime.lookup(file_with_path);

        qiniu.io.putFile(upToken, key, file_with_path, extra, function (err, ret) {
            if (!err) {
                console.log("upload:" + ret.key);
            } else {
                errKey.push(key + ',' + file_with_path);
            }
        });
    });

    var logKey = [];
    if (errKey.length > 0) {
        errKey.forEach(function (err) {
            var key = err.split(',')[0];
            var file_with_path = err.split(',')[1];

            var putPolicy = new qiniu.rs.PutPolicy("templates:" + key);
            var upToken = putPolicy.token();
            var extra = new qiniu.io.PutExtra();
            extra.mimeType = mime.lookup(file_with_path);

            qiniu.io.putFile(upToken, key, file_with_path, extra, function (err, ret) {
                if (!err) {
                    console.log("upload:" + ret.key);
                } else {
                    logKey.push(key);
                }
            });
        })
    }

    if (logKey.length > 0) {
        console.log('error:' + logKey.join(','));
    }
});