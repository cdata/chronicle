var connect = require('connect'),
    step = require('step'),
    argv = require('optimist').argv,
    createReader = require('./reader').createReader,
    createRenderer = require('./renderer').createRenderer;

step(
    function initializeReader() {

        createReader(argv._[0], this);
    },
    function initializeRenderer(error, reader) {

        if(error)
            throw error;
        else {
            reader.getConfig(this.parallel())
            createRenderer(reader, this.parallel());
        }
    },
    function startServer(error, package, renderer) {

        if(error)
            throw error
        else {

            connect(
                connect.profiler(),
                connect.logger(),
                connect.favicon(package.config.favicon),
                connect.router(
                    function(app) {

                        function send(error, req, res, page) {

                            if(error) {
                                res.writeHead(404, { 'Content-Type' : 'text/plain' });
                                res.end(error.stack || error.tostring());
                            } else {
                                res.writeHead(200, { 'Content-Type' : req.params.format === 'json' ? 'application/json' : 'text/html' });
                                res.end(page);
                            }
                        }

                        function sendIndexPage(req, res) {

                            step(
                                function() {

                                    renderer.getIndexPage(Math.max(req.params.number - 1, 0) || 0, req.params.format || 'html', this);
                                },
                                function(error, page) {

                                    send(error, req, res, page);
                                }
                            );
                        }

                        function sendEntryPage(req, res) {

                            step(
                                function() {

                                    renderer.getEntryPage(req.params.id, req.params.format || 'html', this);
                                },
                                function(error, page) {

                                    send(error, req, res, page);
                                }
                            );
                        }

                        app.get(
                            '/page/:number.:format?',
                            function(req, res) {

                                sendIndexPage(req, res);
                            }
                        );
                        
                        app.get(
                            '/:id?.:format?',
                            function(req, res) {

                                if(req.params.id)
                                    sendEntryPage(req, res);
                                else
                                    sendIndexPage(req, res);
                                
                            }
                        );
                    }
                )
            ).listen(package.config.port || 80);

            console.log('Chronicle server started on port ' + (package.config.port || 80));
        }
    }
);


