var git = require('./git'),
    step = require('step');

exports.createReader = (function() {

    function getIndex(reader, callback) {

        step(
            function retrieveFileList() {

                reader.gitRepo.listFiles(this);
            },
            function resolveIndex(error, files) {

                if(error)
                    callback(error);
                else {

                    var index = [];

                    files.forEach(
                        function(file, index) {
                            
                            index.push(file.name);
                        }
                    );

                    callback(0, index);
                }
            }
        );
    }

    function getConfig(reader, callback) {

        step(
            function retrieveFile() {

                reader.gitRepo.readFile('package.json', this);
            },
            function parseConfig(error, contents) {

                if(error)
                    callback(error);
                else {

                    try {

                        callback(0, JSON.parse(contents.toString()));
                    } catch(e) {

                        callback(e);
                    }
                }
            }
        );
    }

    function getEntry(reader, filename, callback) {

        var entry = {};

        step(
            function retrieveMetadata() {

                reader.gitRepo.resolveFileMetadata(filename, this);
            },
            function retrieveFile(error, meta) {

                if(error)
                    callback(error);
                else {

                    entry.meta = meta;
                    reader.gitRepo.readFile(filename, this);
                }
            },
            function resolveEntry(error, contents) {

                if(error)
                    callback(error);
                else {

                    entry.contents = contents.toString();
                    callback(0, entry);
                }
            }
        );
    }

    function forward(func, reader) {

        return function() {

            var args = Array.prototype.slice.call(arguments);
            args.unshift(reader);
            func.apply(func, args);
        }
    }

    return function(repositoryPath, callback) {

        step(
            function() {

                git.openRepository(repositoryPath, this);
            },
            function(error, gitRepo) {

                if(error)
                    callback(error);
                else {

                    var reader = { gitRepo: gitRepo };

                    callback(
                        0,
                        {
                            getIndex: forward(getIndex, reader),
                            getEntry: forward(getEntry, reader),
                            getConfig: forward(getConfig, reader)
                        }
                    );
                }
            }
        );
    }
})();
