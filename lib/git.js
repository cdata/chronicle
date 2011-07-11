var Gitteh = require('gitteh'),
    step = require('step'),
    path = require('path'),
    fs = require('fs'),
    child_process = require('child_process');

var gitProcess = (function() {

    var executionQueue = {},
        executionCache = {};

    function open(fullPath, callback) {

        step(
            function checkDirectory() {

                fs.stat(fullPath, this);
            },
            function checkIsWorking(error) {

                if(error)
                    callback(error);
                else
                    fs.stat(path.join(fullPath, '.git'), this);
            },
            function setOptions(error) {

                var options = [];

                options.push('--git-dir=' + fullPath);

                if(!error) {

                    options.push('--work-tree=' + path.join(fullPath, '.git'));
                }

                callback(0, options);
            }
        );
    }

    function execute(commands, callback) {

        var exe = child_process.spawn('git', commands),
            stdout = [],
            stderr = [];

        exe.stdout.setEncoding('binary');
        exe.stdout.addListener('data', function(text) { stdout.push(text); });
        exe.stderr.addListener('data', function(text) { stderr.push(text); });
        exe.addListener(
            'exit',
            function(code) {

                if(code)
                    callback(new Error('Git execution failed with code ' + code));
                else {

                    callback(0, stdout.join(''));
                }

                exe.stdout.removeAllListeners('data');
                exe.stderr.removeAllListeners('data');
                exe.removeAllListeners('exit');
            }
        );

        exe.stdin.end();
    }

    function queue(commands, callback) {

        var commandSignature = commands.join(' ');

        if(executionCache[commandSignature] && executionCache[commandSignature].expires < Date.now())
            process.nextTick(function() { callback(0, executionCache[commandSignature].output) });
        else if(executionQueue[commandSignature])
            executionQueue[commandSignature].push(callback);
        else {

            executionQueue[commandSignature] = [callback];

            step(
                function executeGit() {

                    execute(commands, this);
                },
                function handleOutput(error, output) {

                    var respond = function() { 
                            
                            var args = arguments;

                            executionQueue[commandSignature].forEach(
                                function(queued) {

                                    queued.apply(this, args); 
                                }
                            );
                        };

                    if(error)
                        respond(error);
                    else {

                        respond(0, output);
                        executionCache[commandSignature] = {
                            expires: Date.now() + 36300000,
                            output: output
                        };
                    }

                    delete executionQueue[commandSignature];
                }
            );
        }
    }

    function log(options, head, path, callback) {

        step(
            function getRawLog() {

                queue(options.concat(['log', '-z', '--summary', head, '--', path]), this);
            },
            function resolveLog(error, log) {

                if(error)
                    callback(error);
                else {

                    var logs = log.split('\0'),
                        commit = /^commit\s*(.*)/,
                        author = /Author:\s*(.*)/,
                        date = /Date:\s*(.*)/,
                        message = /\n\n\s*(.*)/;

                    logs.forEach(
                        function(log, index) {

                            var parsed = {},
                                commitMatch = log.match(commit),
                                authorMatch = log.match(author),
                                dateMatch = log.match(date),
                                messageMatch = log.match(message);

                            if(commitMatch) parsed.commit = commitMatch[1];
                            if(authorMatch) parsed.author = authorMatch[1];
                            if(dateMatch) parsed.date = new Date(dateMatch[1]);
                            if(messageMatch) parsed.message = messageMatch[1];

                            logs[index] = parsed;
                        }
                    );

                    callback(0, logs);
                }
            }
        );
    }

    function forward(func, options) {

        return function() {
            
            var args = Array.prototype.slice.call(arguments);
            args.unshift(options);
            func.apply(func, args);
        }
    }

    return function(fullPath, callback) {

        step(
            function() {

                open(fullPath, this);
            },
            function(error, options) {

                if(error)
                    callback(error);
                else {

                    callback(
                        0,
                        {
                            log: forward(log, options)
                        }
                    );
                }
            }
        );
    }
})();

exports.openRepository = (function() {

    function open(originalPath, callback) {

        var git = {},
            fullPath = path.resolve(originalPath),
            processPath = fullPath.split('/.git')[0];

        if(!callback) throw new Error('Callback is undefined!');

        step(
            function initializeGitteh() {
                
                Gitteh.openRepository(fullPath, this);
            },
            function initializeGitProcess(error, gitteh) {

                if(error)
                    callback(error);
                else {

                    git.gitteh = gitteh;

                    gitProcess(processPath, this);
                }
            },
            function store(error, exe) {
                
                if(error)
                    callback(error);
                else {

                    git.process = exe;
                    callback(0, git);
                }
            }
        );
    }

    function resolveHead(git, callback) {

        if(!callback) throw new Error('Callback is undefined!');

        step(
            function gethead() {

                git.gitteh.getReference('HEAD', this);
            },
            function resolve(error, head) {

                if(error)
                    callback(error);
                else
                    head.resolve(this);
            },
            function respond(error, head) {

                if(error)
                    callback(error);
                else
                    callback(0, head);
            }
        );
    }

    function listFiles(git, callback) {

        if(!callback) throw new Error('Callback is undefined!');

        step(
            function getHead() {

                resolveHead(git, this);
            },
            function getCommit(error, head) {

                if(error)
                    callback(error);
                else
                    git.gitteh.getCommit(head.target, this);
            },
            function getTree(error, commit) {

                if(error)
                    callback(error);
                else
                    git.gitteh.getTree(commit.tree, this);
            },
            function resolveList(error, tree) {

                if(error)
                    callback(error);
                else
                    callback(0, tree.entries);
            }
        );
    }

    function fileExists(git, filename, callback) {

        var found = false;
        
        if(!callback) throw new Error('Callback is undefined!');

        step(
            function getFiles() {

                listFiles(git, this);
            },
            function checkForFile(error, files) {

                if(error)
                    callback(error);
                else {

                    files.forEach(
                        function(file, index) {

                            if(file.name === filename) {

                                found = file;
                                return false;
                            }
                        }
                    );

                    git.gitteh.exists(found.id, this);
                }
            },
            function resolveExists(error, exists) {

                if(error)
                    callback(error);
                else
                    callback(0, exists && found);
            }
        );
    }

    function readFile(git, filename, callback) {

        if(!callback) throw new Error('Callback is undefined!');

        step(
            function getFile() {

                fileExists(git, filename, this);
            },
            function getBlob(error, file) {

                if(error)
                    callback(error);
                else if(!file)
                    callback('File does not exist!');
                else
                    git.gitteh.getBlob(file.id, this);
            },
            function resolveContents(error, blob) {

                if(error)
                    callback(error);
                else
                    callback(0, blob.data);
            }
        );
    }

    function resolveFileMetadata(git, filename, callback) {

        if(!callback) throw new Error('Callback is undefined!');

        var meta = {};

        step(
            function getHeadSha() {

                resolveHead(git, this);
            },
            function retrieveLogs(error, head) {

                if(error)
                    callback(error);
                else
                    git.process.log(head.target, filename, this);

            },
            function parseLogs(error, logs) {

                if(error)
                    callback(error);
                else {

                    meta.editors = {};
                    meta.filename = filename;

                    logs.forEach(
                        function(log, index) {

                            if((index === 0) && log.date)
                                meta.lastModified = log.date;

                            if((index === logs.length - 1) && log.date) {

                                meta.created = log.date;
                                meta.author = log.author;
                            }

                            meta.editors[log.author] = meta.editors[log.author] || [];
                            meta.editors[log.author].push(log.message.split('\n\n')[0]);
                        }
                    );

                    callback(0, meta);
                }
            }
        );
    }

    function forward(func, git) {

        return function() {

            var args = Array.prototype.slice.call(arguments);
            args.unshift(git);
            func.apply(func, args);
        };
    }

    return function(path, callback) {

        step(
            function() {

                open(path, this);
            },
            function(error, git) {

                if(error)
                    callback(error);
                else {

                    callback(
                        0,
                        {
                            path: git.gitteh.path,
                            fileExists: forward(fileExists, git),
                            listFiles: forward(listFiles, git),
                            resolveFileMetadata: forward(resolveFileMetadata, git),
                            readFile: forward(readFile, git)
                        }
                    );
                }
                
            }
        );
    };

})();
