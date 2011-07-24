var git = require('./git'),
    utility = require('./utility'),
    step = require('step');

exports.createReader = (function() {

    function getIndex(reader, callback) {

        var index = [];

        step(
            function retrieveFileList() {

                reader.gitRepo.listFiles(this);
            },
            function retrieveMetadata(error, files) {

                if(error)
                    callback(error);
                else {
                    
                    var group = this.group();

                    files.forEach(
                        function(file) {
                            
                            if(file.name !== 'package.json') {

                                var composit = {};

                                index.push(
                                    {
                                        title: utility.fileToTitle(file.name),
                                        filename: file.name
                                    }
                                );
                                
                                reader.gitRepo.resolveFileMetadata(file.name, group());
                            }
                        }
                    );
                }
            },
            function resolveIndex(error, metadata) {

                if(error)
                    callback(error);
                else {

                    index.forEach(
                        function(composit, index) {

                            composit.meta = metadata[index];
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

        var entry;

        step(
            function retrieveMetadata() {

                reader.gitRepo.resolveFileMetadata(filename, this);
            },
            function retrieveFile(error, meta) {

                if(error)
                    callback(error);
                else {

                    entry = {
                        meta: meta,
                        id: utility.fileToPath(filename),
                        title: utility.fileToTitle(filename)
                    };

                    reader.gitRepo.readFile(filename, this);
                }
            },
            function resolveEntry(error, contents) {

                if(error)
                    callback(error);
                else {

                    entry.contents = utility.markdownToHTML(contents.toString());
                    callback(0, entry);
                }
            }
        );
    }

    function getEntryByTitle(reader, title, callback) {

        var found;

        step(
            function retrieveIndex() {

                getIndex(reader, this);
            },
            function retrieveEntry(error, index) {

                if(error)
                    callback(error);
                else {

                    index.forEach(
                        function(file) {

                            if(file.title === title) {

                                found = file;
                                return false;
                            }
                        }
                    );

                    if(found)
                        getEntry(reader, found.filename, callback)
                    else
                        callback(new Error('Entry does not exist.'));
                }
            }
        );
    }

    function getEntriesForPage(reader, page, callback) {

        step(
            function loadData() {

                getConfig(reader, this.parallel());
                getIndex(reader, this.parallel());
            },
            function parseIndex(error, package, index) {

                if(error)
                    callback(error);
                else {

                    var pageSize = package.config.entriesPerPage || 5,
                        startIndex = page * pageSize,
                        endIndex = Math.min(startIndex + pageSize, index.length);
                        pageIndex = index.slice(startIndex, Math.max(startIndex, endIndex)),
                        group = this.group();

                    if(pageIndex.length) {

                        pageIndex.forEach(
                            function(entry) {

                                getEntry(reader, entry.filename, group());
                            }
                        );
                    } else 
                        callback(new Error('Page is out of bounds'));
                }
            },
            function resolveEntries(error, entries) {

                if(error)
                    callback(error);
                else
                    callback(0, entries);
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

                    var forward = utility.forward,
                        cache = utility.cache,
                        reader = { 
                            gitRepo: gitRepo
                        };

                    callback(
                        0,
                        {
                            getIndex: forward(cache(getIndex, 21600000), reader), 
                            getEntry: forward(cache(getEntry), reader),
                            getEntryByTitle: forward(cache(getEntryByTitle), reader),
                            getEntriesForPage: forward(cache(getEntriesForPage), reader),
                            getConfig: forward(cache(getConfig), reader)
                        }
                    );
                }
            }
        );
    }
})();
