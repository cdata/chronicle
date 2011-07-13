var git = require('./git'),
    utility = require('./utility'),
    step = require('step'),
    cache = {};

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
                            // TODO: Mix in meta data here 
                            index.push(file.name.replace(/\.(markdown|md)$/i, ""));
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

    return function(repositoryPath, callback) {

        step(
            function() {

                git.openRepository(repositoryPath, this);
            },
            function(error, gitRepo) {

                if(error)
                    callback(error);
                else {

                    var cache = utility.cache,
                        forward = utility.forward,
                        reader = { 
                            gitRepo: gitRepo,
                            cache: cache
                        };

                    callback(
                        0,
                        {
                            getIndex: cache(forward(getIndex, reader), 108900000), 
                            getEntry: cache(forward(getEntry, reader)),
                            getConfig: cache(forward(getConfig, reader))
                        }
                    );
                }
            }
        );
    }
})();
